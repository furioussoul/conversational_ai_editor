'use client';

import { ArrowLeft, Loader2, Send } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import useSWR from 'swr';

import { Button } from '@/components/ui/button';
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

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status: 'queued' | 'streaming' | 'done' | 'error';
  error?: string;
  meta?: {
    queueAhead?: number;
  };
};

type SSEEvent = {
  event: string;
  data: string;
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

  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [activeStreams, setActiveStreams] = useState(0);
  const [queuedUserInput, setQueuedUserInput] = useState('');
  const [queuedMessageId, setQueuedMessageId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isFlushingQueuedRef = useRef(false);
  const flushQueuedRef = useRef<() => void>(() => {});
  const messagesRef = useRef<ChatMessage[]>([]);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const updateMessages = useCallback(
    (updater: (prev: ChatMessage[]) => ChatMessage[]) => {
      setMessagesState((prev) => {
        const next = updater(prev);
        messagesRef.current = next;
        return next;
      });
    },
    [],
  );

  const commitMessages = useCallback((next: ChatMessage[]) => {
    messagesRef.current = next;
    setMessagesState(next);
  }, []);

  const agent = data ?? null;

  const journeysWithPlainText = useMemo<SerializedJourney[]>(() => {
    if (!agent) return [];
    return agent.journeys.map((journey) => ({
      ...journey,
      logicText: extractPlainText(journey.logic),
    }));
  }, [agent]);

  const debugContext = useMemo(() => {
    if (!agent) return '';
    return buildAgentContext(agent, journeysWithPlainText);
  }, [agent, journeysWithPlainText]);

  const hasActiveStream = activeStreams > 0;

  const startAssistantCall = useCallback(
    async (rawPrompt: string, options?: { reuseMessageId?: string }) => {
      if (!agent) {
        return;
      }

      const prompt = rawPrompt.trim();
      if (!prompt) {
        return;
      }

      const reuseId = options?.reuseMessageId ?? null;
      const assistantPlaceholder: ChatMessage = {
        id: createId(),
        role: 'assistant',
        content: '',
        status: 'queued',
      };

      const baseMessages = messagesRef.current;
      let reusedMessageFound = false;

      const updatedMessages = baseMessages.map<ChatMessage>((message) => {
        if (reuseId && message.id === reuseId) {
          reusedMessageFound = true;
          const updated: ChatMessage = {
            ...message,
            role: 'user',
            content: prompt,
            status: 'done',
            error: undefined,
            meta: undefined,
          };
          return updated;
        }
        return message;
      });

      if (!reuseId) {
        const newMessage: ChatMessage = {
          id: createId(),
          role: 'user',
          content: prompt,
          status: 'done',
        };
        updatedMessages.push(newMessage);
      } else if (!reusedMessageFound) {
        const newMessage: ChatMessage = {
          id: reuseId,
          role: 'user',
          content: prompt,
          status: 'done',
        };
        updatedMessages.push(newMessage);
      }

      const conversationHistory: ConversationMessage[] = updatedMessages
        .filter((message) => message.status === 'done')
        .map((message) => ({
          role: message.role,
          content: message.content,
        }));

      const nextMessages: ChatMessage[] = [
        ...updatedMessages,
        assistantPlaceholder,
      ];
      commitMessages(nextMessages);

      if (reuseId) {
        setQueuedUserInput('');
        setQueuedMessageId(null);
      }

      setActiveStreams((prev) => prev + 1);

      let finished = false;
      let fullText = '';
      let reader: ReadableStreamDefaultReader<Uint8Array> | null = null;

      const finalize = (
        status: 'done' | 'error',
        content: string,
        errorMessage?: string,
      ) => {
        if (finished) return;
        finished = true;
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === assistantPlaceholder.id
              ? {
                  ...message,
                  status,
                  content: status === 'error' ? '' : content,
                  error:
                    status === 'error'
                      ? (errorMessage ?? '未知错误')
                      : undefined,
                  meta: undefined,
                }
              : message,
          ),
        );
        setActiveStreams((prev) => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            Promise.resolve().then(() => {
              flushQueuedRef.current();
            });
          }
          return next;
        });
      };

      try {
        const response = await fetch(`/api/agents/${agent.id}/debug`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'text/event-stream',
          },
          body: JSON.stringify({
            context: debugContext,
            messages: conversationHistory,
          }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => '');
          const message = detail
            ? `LLM 调用失败：${detail}`
            : `LLM 调用失败（HTTP ${response.status}）`;
          throw new Error(message);
        }

        reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let doneReceived = false;

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const parsed = extractSSEEvents(buffer);
          buffer = parsed.buffer;

          for (const { event, data } of parsed.events) {
            if (!data) continue;

            if (event === 'queued') {
              const payload = safeJsonParse<{ ahead?: number }>(data);
              updateMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantPlaceholder.id
                    ? {
                        ...message,
                        status: 'queued',
                        meta: {
                          ...message.meta,
                          queueAhead:
                            typeof payload?.ahead === 'number'
                              ? payload.ahead
                              : undefined,
                        },
                      }
                    : message,
                ),
              );
              continue;
            }

            if (event === 'status') {
              const payload = safeJsonParse<{ state?: string }>(data);
              if (payload?.state === 'processing') {
                updateMessages((prev) =>
                  prev.map((message) =>
                    message.id === assistantPlaceholder.id
                      ? {
                          ...message,
                          status: 'streaming',
                          meta: undefined,
                        }
                      : message,
                  ),
                );
              }
              continue;
            }

            if (event === 'chunk') {
              const payload = safeJsonParse<{ content?: string }>(data);
              const chunk = payload?.content ?? '';
              if (!chunk) continue;
              fullText += chunk;
              updateMessages((prev) =>
                prev.map((message) =>
                  message.id === assistantPlaceholder.id
                    ? {
                        ...message,
                        status: 'streaming',
                        meta: undefined,
                        content: fullText,
                      }
                    : message,
                ),
              );
              continue;
            }

            if (event === 'done') {
              const payload = safeJsonParse<{ content?: string }>(data);
              const finalContent = payload?.content ?? fullText;
              fullText = finalContent;
              doneReceived = true;
              finalize('done', finalContent);
              break;
            }

            if (event === 'error') {
              const payload = safeJsonParse<{ message?: string }>(data);
              const errorMessage = payload?.message ?? 'LLM 调用失败';
              throw new Error(errorMessage);
            }
          }

          if (doneReceived) {
            break;
          }
        }

        if (!finished) {
          finalize('done', fullText);
        }
      } catch (err) {
        if (reader) {
          try {
            await reader.cancel();
          } catch (cancelErr) {
            console.error(cancelErr);
          }
        }
        const message = err instanceof Error ? err.message : '未知错误';
        finalize('error', '', message);
      }
    },
    [agent, commitMessages, debugContext, updateMessages],
  );

  const flushPendingQueuedMessages = useCallback(() => {
    if (!queuedMessageId) {
      return;
    }
    const pendingText = queuedUserInput.trim();
    if (!pendingText) {
      return;
    }
    if (isFlushingQueuedRef.current) {
      return;
    }
    isFlushingQueuedRef.current = true;
    startAssistantCall(pendingText, {
      reuseMessageId: queuedMessageId,
    }).finally(() => {
      isFlushingQueuedRef.current = false;
    });
  }, [queuedMessageId, queuedUserInput, startAssistantCall]);

  useEffect(() => {
    flushQueuedRef.current = flushPendingQueuedMessages;
  }, [flushPendingQueuedMessages]);

  const handleSend = useCallback(() => {
    if (!agent) {
      return;
    }

    const trimmed = input.trim();
    if (!trimmed) {
      return;
    }

    if (hasActiveStream) {
      const combinedContent = queuedUserInput
        ? `${queuedUserInput}\n${trimmed}`
        : trimmed;

      setQueuedUserInput(combinedContent);
      setInput('');

      if (queuedMessageId) {
        updateMessages((prev) =>
          prev.map((message) =>
            message.id === queuedMessageId
              ? { ...message, content: combinedContent }
              : message,
          ),
        );
        return;
      }

      const messageId = createId();
      setQueuedMessageId(messageId);
      const queuedMessage: ChatMessage = {
        id: messageId,
        role: 'user',
        content: combinedContent,
        status: 'queued',
      };
      updateMessages((prev) => [...prev, queuedMessage]);
      return;
    }

    setInput('');
    if (queuedMessageId) {
      const combinedContent = queuedUserInput
        ? `${queuedUserInput}\n${trimmed}`
        : trimmed;
      setQueuedUserInput(combinedContent);
      updateMessages((prev) =>
        prev.map((message) =>
          message.id === queuedMessageId
            ? { ...message, content: combinedContent }
            : message,
        ),
      );
      void startAssistantCall(combinedContent, {
        reuseMessageId: queuedMessageId,
      });
      return;
    }
    void startAssistantCall(trimmed);
  }, [
    agent,
    hasActiveStream,
    input,
    queuedMessageId,
    queuedUserInput,
    startAssistantCall,
    updateMessages,
  ]);

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
            className="flex-1 space-y-4 overflow-y-auto rounded-md border border-muted bg-background p-4 pb-36"
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
                {message.role === 'assistant' &&
                  (message.status === 'queued' ||
                    message.status === 'streaming') && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      {message.status === 'queued'
                        ? message.meta?.queueAhead &&
                          message.meta.queueAhead > 0
                          ? `排队中，前方还有 ${message.meta.queueAhead} 个请求…`
                          : '排队中…'
                        : '等待模型响应…'}
                    </div>
                  )}
                {message.status === 'error' && message.error && (
                  <div className="mt-2 text-xs text-destructive">
                    调用失败：{message.error}
                  </div>
                )}
              </div>
            ))}
          </div>
          <div className="sticky bottom-0 z-10 -mx-4 -mb-4 border-t border-border bg-card/95 p-4 backdrop-blur">
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
              <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <span>
                  请求通过后端代理发送至
                  LLM（默认模型：gpt-4o）。请在服务器环境变量中配置
                  <code className="mx-1 rounded bg-muted px-1">
                    OPENAI_API_KEY
                  </code>
                  与
                  <code className="mx-1 rounded bg-muted px-1">
                    OPENAI_BASE_URL
                  </code>
                  。
                </span>
                <Button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="gap-2 self-start sm:self-auto"
                >
                  {hasActiveStream ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  发送
                </Button>
              </div>
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

function extractSSEEvents(buffer: string): {
  events: SSEEvent[];
  buffer: string;
} {
  const events: SSEEvent[] = [];
  let working = buffer.replace(/\r/g, '');

  while (true) {
    const separatorIndex = working.indexOf('\n\n');
    if (separatorIndex === -1) {
      break;
    }

    const rawEvent = working.slice(0, separatorIndex);
    working = working.slice(separatorIndex + 2);

    if (!rawEvent.trim()) {
      continue;
    }

    const lines = rawEvent.split('\n');
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) {
        continue;
      }
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trim());
      }
    }

    events.push({ event, data: dataLines.join('\n') });
  }

  return { events, buffer: working };
}

function safeJsonParse<T>(input: string): T | null {
  try {
    return JSON.parse(input) as T;
  } catch {
    return null;
  }
}
