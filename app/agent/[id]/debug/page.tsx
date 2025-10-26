'use client';

import { ArrowLeft, Loader2, Search, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import type { Agent, Journey } from '@/lib/data/types';

const fetcher = (url: string) =>
  fetch(url).then((res) => {
    if (!res.ok) {
      throw new Error(`加载失败: ${res.statusText}`);
    }
    return res.json();
  });

const createId = () => {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'pending' | 'done' | 'error';
  error?: string;
};

type SerializedJourney = Journey & {
  logicText: string;
};

export default function AgentDebugPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const { data, error, isLoading } = useSWR<Agent>(
    `/api/agents/${params.id}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [journeyQuery, setJourneyQuery] = useState('');
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const agent = data ?? null;

  const journeysWithPlainText = useMemo<SerializedJourney[]>(() => {
    if (!agent) return [];
    return agent.journeys.map((journey) => ({
      ...journey,
      logicText: extractPlainText(journey.logic),
    }));
  }, [agent]);

  const filteredJourneys = useMemo(() => {
    if (!journeyQuery.trim()) return journeysWithPlainText;
    const keyword = journeyQuery.trim().toLowerCase();
    return journeysWithPlainText.filter((journey) => {
      return [
        journey.title,
        journey.description ?? '',
        journey.logicText,
        journey.triggerConditions.join(','),
      ]
        .join('\n')
        .toLowerCase()
        .includes(keyword);
    });
  }, [journeyQuery, journeysWithPlainText]);

  const debugContext = useMemo(() => {
    if (!agent) return '';
    return buildAgentContext(agent, journeysWithPlainText);
  }, [agent, journeysWithPlainText]);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!agent || !prompt || isSending) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId(),
      role: 'user',
      content: prompt,
      status: 'done',
    };
    const assistantPlaceholder: ChatMessage = {
      id: createId(),
      role: 'assistant',
      content: '',
      status: 'pending',
    };

    const conversationHistory = [...messages, userMessage]
      .filter((message) => message.status !== 'error')
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((prev) => [...prev, userMessage, assistantPlaceholder]);
    setInput('');
    setIsSending(true);

    try {
      const response = await fetch(`/api/agents/${agent.id}/debug`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: debugContext,
          messages: conversationHistory,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(
          payload?.message || `LLM 调用失败（HTTP ${response.status}）`,
        );
      }

      const payload = (await response.json()) as {
        message: string;
      };

      setMessages((prev) =>
        prev.map((message) =>
          message.id === assistantPlaceholder.id
            ? {
                ...message,
                content: payload.message,
                status: 'done',
              }
            : message,
        ),
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : '未知错误';
      setMessages((prev) =>
        prev.map((item) =>
          item.id === assistantPlaceholder.id
            ? {
                ...item,
                status: 'error',
                error: message,
                content: message,
              }
            : item,
        ),
      );
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载调试上下文…
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>加载 Agent 失败。</p>
        <Button
          variant="outline"
          onClick={() => router.push(`/agent/${params.id}`)}
        >
          返回详情
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => router.push(`/agent/${agent.id}`)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            返回
          </Button>
          <div>
            <h1 className="text-xl font-semibold">{agent.name} · 调试工作台</h1>
            <p className="text-sm text-muted-foreground">
              聚合角色描述、系统提示、Excel 表格与 Journeys，向 LLM
              发送上下文进行对话调试。
            </p>
          </div>
        </div>
      </header>

      <main className="grid flex-1 gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <section className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">上下文预览</h2>
            <p className="text-xs text-muted-foreground">
              发送给模型的上下文会包含以下部分，便于复现当前 Agent 场景。
            </p>
          </div>
          <div className="flex-1 overflow-y-auto rounded-md border border-dashed border-muted bg-background p-3">
            <pre className="whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">
              {debugContext}
            </pre>
          </div>
          <Separator />
        </section>

        <section className="flex h-full flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">对话调试</h2>
            <p className="text-sm text-muted-foreground">
              支持异步输入/输出，消息会自动附带当前 Agent 上下文。
            </p>
          </div>
          <div
            ref={scrollRef}
            className="flex-1 space-y-4 overflow-y-auto rounded-md border border-muted bg-background p-4"
          >
            {messages.length === 0 && (
              <div className="text-sm text-muted-foreground">
                还没有对话，输入问题后点击发送即可开始调试。
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={
                  message.role === 'user'
                    ? 'ml-auto max-w-[85%] rounded-lg bg-primary px-3 py-2 text-sm text-primary-foreground'
                    : 'max-w-[85%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground'
                }
              >
                <pre className="whitespace-pre-wrap break-words text-sm">
                  {message.content}
                </pre>
                {message.status === 'pending' && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    等待模型响应…
                  </div>
                )}
                {message.status === 'error' && (
                  <div className="mt-2 text-xs text-destructive">
                    调用失败：{message.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="space-y-3">
            <Textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="输入你的调试问题，Shift+Enter 换行…"
              rows={3}
              className="resize-none"
              onKeyDown={(event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                  event.preventDefault();
                  handleSend();
                }
              }}
            />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                请求通过后端代理发送至
                DeepSeek（模型：deepseek-v3）。请在服务器环境变量中配置
                <code className="mx-1 rounded bg-muted px-1">
                  ONEAI_API_KEY
                </code>
                。
              </span>
              <Button
                onClick={handleSend}
                disabled={isSending || !input.trim()}
                className="gap-2"
              >
                {isSending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                发送
              </Button>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

function buildAgentContext(
  agent: Agent,
  journeys: SerializedJourney[],
): string {
  const parts: string[] = [];

  parts.push(`Agent 标识: ${agent.id}`);
  parts.push(`名称: ${agent.name}`);

  if (agent.description) {
    parts.push(`角色描述: ${agent.description}`);
  }

  if (agent.constraints) {
    parts.push(`约束: ${agent.constraints}`);
  }

  if (agent.systemPromptJson) {
    parts.push(
      `系统提示（Excel / 富文本内容展开）:\n${extractPlainText(agent.systemPromptJson)}`,
    );
  }

  if (agent.tools.length) {
    const toolsBlock = agent.tools
      .map((tool) => {
        const params = tool.parameters
          ? JSON.stringify(tool.parameters, null, 2)
          : '无';
        return `- ${tool.name}: ${tool.description ?? '未补充描述'}\n  参数: ${params}`;
      })
      .join('\n');
    parts.push(`工具列表:\n${toolsBlock}`);
  }

  if (agent.glossary.length) {
    const glossaryBlock = agent.glossary
      .map(
        (term) =>
          `- ${term.name}: ${term.description} (同义词: ${term.synonyms.join(', ') || '无'})`,
      )
      .join('\n');
    parts.push(`专业术语:\n${glossaryBlock}`);
  }

  if (agent.guidelines.length) {
    const guidelineBlock = agent.guidelines
      .map(
        (guideline) =>
          `- 条件: ${guideline.condition}\n  行动: ${guideline.action}\n  工具建议: ${guideline.toolIds.join(', ') || '无'}`,
      )
      .join('\n');
    parts.push(`全局指南:\n${guidelineBlock}`);
  }

  if (journeys.length) {
    const journeysBlock = journeys
      .map((journey, index) => {
        const lines: string[] = [];
        lines.push(`${index + 1}. ${journey.title || '未命名流程'}`);
        if (journey.description) {
          lines.push(`   描述: ${journey.description}`);
        }
        if (journey.triggerConditions.length) {
          lines.push(`   触发条件: ${journey.triggerConditions.join(', ')}`);
        }
        if (journey.logicText) {
          lines.push(`   逻辑: ${journey.logicText}`);
        }
        return lines.join('\n');
      })
      .join('\n');
    parts.push(`流程:\n${journeysBlock}`);
  }

  return parts.join('\n\n').trim();
}

function extractPlainText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node
      .map((child) => extractPlainText(child))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof node === 'object') {
    const record = node as Record<string, unknown> & { type?: string };
    if (record.type === 'hardBreak') {
      return '\n';
    }
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (Array.isArray(record.content)) {
      const childTexts = record.content
        .map((child) => extractPlainText(child))
        .filter((value) => value !== '');

      if (record.type === 'bulletList' || record.type === 'orderedList') {
        return childTexts.join('\n');
      }

      if (record.type === 'table') {
        return childTexts.join('\n');
      }

      if (record.type === 'tableRow') {
        return childTexts.join('\t');
      }

      if (record.type === 'tableCell' || record.type === 'tableHeader') {
        return childTexts.join(' ');
      }

      if (record.type === 'paragraph' || record.type === 'heading') {
        const content = childTexts.join('');
        return content ? `${content}\n` : '';
      }

      return childTexts.join('');
    }
  }
  return '';
}
