'use client';

import { Bug, Loader2, Plus, Save } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ChangeEvent } from 'react';
import { useCallback, useMemo, useState } from 'react';
import useSWR from 'swr';

import { SystemPromptEditor } from '@/components/editor/system-prompt-editor';
import { JourneySheet } from '@/components/journeys/journey-sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type {
  Agent,
  Guideline,
  Journey,
  JourneyLogicDoc,
  Term,
} from '@/lib/data/types';

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export default function AgentDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR<Agent>(
    `/api/agents/${params.id}`,
    fetcher,
    {
      revalidateOnFocus: false,
    },
  );

  const [draftAgent, setDraftAgent] = useState<Agent | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [journeySheetOpen, setJourneySheetOpen] = useState(false);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(
    null,
  );

  const agent = draftAgent ?? data ?? null;

  const isDirty = draftAgent !== null;

  const deepClone = <T,>(value: T): T =>
    typeof structuredClone === 'function'
      ? structuredClone(value)
      : (JSON.parse(JSON.stringify(value)) as T);

  const updateDraft = useCallback(
    (updater: (agent: Agent) => Agent) => {
      setDraftAgent((current) => {
        const base = current ?? data;
        if (!base) return null;
        return updater(deepClone(base));
      });
    },
    [data],
  );

  const handleBasicFieldChange = useCallback(
    (field: 'name' | 'description' | 'constraints', value: string) => {
      updateDraft((current: Agent) => ({
        ...current,
        [field]: value,
      }));
    },
    [updateDraft],
  );

  const handleSystemPromptChange = useCallback(
    (content: unknown) => {
      updateDraft((current: Agent) => ({
        ...current,
        systemPromptJson: content,
      }));
    },
    [updateDraft],
  );

  const handleJourneyCellClick = useCallback(
    (journeyId: string | null) => {
      if (!agent) return;

      if (!journeyId) {
        const newJourney = createEmptyJourney(agent.id);
        updateDraft((current: Agent) => ({
          ...current,
          journeys: [...current.journeys, newJourney],
        }));
        setSelectedJourneyId(newJourney.id);
        setJourneySheetOpen(true);
        return;
      }

      const journey = agent.journeys.find(
        (item: Journey) => item.id === journeyId,
      );
      if (!journey) {
        const newJourney = createEmptyJourney(agent.id);
        updateDraft((current: Agent) => ({
          ...current,
          journeys: [...current.journeys, newJourney],
        }));
        setSelectedJourneyId(newJourney.id);
        setJourneySheetOpen(true);
        return;
      }

      setSelectedJourneyId(journey.id);
      setJourneySheetOpen(true);
    },
    [agent, updateDraft],
  );

  const selectedJourney = useMemo(() => {
    if (!agent || !selectedJourneyId) return null;
    return (
      agent.journeys.find(
        (journey: Journey) => journey.id === selectedJourneyId,
      ) ?? null
    );
  }, [agent, selectedJourneyId]);

  const handleJourneyChange = useCallback(
    (updatedJourney: Journey) => {
      updateDraft((current: Agent) => ({
        ...current,
        journeys: current.journeys.map((journey: Journey) =>
          journey.id === updatedJourney.id ? updatedJourney : journey,
        ),
      }));
    },
    [updateDraft],
  );

  const handleTermChange = useCallback(
    (termId: string, patch: Partial<Term>) => {
      updateDraft((current: Agent) => ({
        ...current,
        glossary: current.glossary.map((term: Term) =>
          term.id === termId
            ? {
                ...term,
                ...patch,
              }
            : term,
        ),
      }));
    },
    [updateDraft],
  );

  const handleAddTerm = useCallback(() => {
    if (!agent) return;
    const newTerm: Term = {
      id: crypto.randomUUID(),
      agentId: agent.id,
      name: '新术语',
      description: '',
      synonyms: [],
    };
    updateDraft((current: Agent) => ({
      ...current,
      glossary: [...current.glossary, newTerm],
    }));
  }, [agent, updateDraft]);

  const handleRemoveTerm = useCallback(
    (termId: string) => {
      updateDraft((current: Agent) => ({
        ...current,
        glossary: current.glossary.filter((term: Term) => term.id !== termId),
      }));
    },
    [updateDraft],
  );

  const handleGuidelineChange = useCallback(
    (guidelineId: string, patch: Partial<Guideline>) => {
      updateDraft((current: Agent) => ({
        ...current,
        guidelines: current.guidelines.map((guideline: Guideline) =>
          guideline.id === guidelineId
            ? {
                ...guideline,
                ...patch,
              }
            : guideline,
        ),
      }));
    },
    [updateDraft],
  );

  const handleAddGuideline = useCallback(() => {
    if (!agent) return;
    const newGuideline: Guideline = {
      id: crypto.randomUUID(),
      agentId: agent.id,
      condition: '',
      action: '',
      toolIds: [],
    };
    updateDraft((current: Agent) => ({
      ...current,
      guidelines: [...current.guidelines, newGuideline],
    }));
  }, [agent, updateDraft]);

  const handleRemoveGuideline = useCallback(
    (guidelineId: string) => {
      updateDraft((current: Agent) => ({
        ...current,
        guidelines: current.guidelines.filter(
          (item: Guideline) => item.id !== guidelineId,
        ),
      }));
    },
    [updateDraft],
  );

  const handleSheetOpenChange = useCallback((open: boolean) => {
    setJourneySheetOpen(open);
    if (!open) {
      setSelectedJourneyId(null);
    }
  }, []);

  const handleSave = useCallback(async () => {
    if (!draftAgent) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const response = await fetch(`/api/agents/${draftAgent.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(draftAgent),
      });
      if (!response.ok) {
        throw new Error(await response.text());
      }
      const updated = (await response.json()) as Agent;
      setDraftAgent(null);
      await mutate(updated, { revalidate: false });
    } catch (err) {
      console.error(err);
      setSaveError('保存失败，请检查输入后重试。');
    } finally {
      setIsSaving(false);
    }
  }, [draftAgent, mutate]);

  if (isLoading && !agent) {
    return (
      <div className="flex h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        正在加载 Agent…
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>加载 Agent 失败。</p>
        <Button variant="outline" onClick={() => router.push('/')}>
          返回列表
        </Button>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col gap-6 p-6">
      <header className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="grid gap-3 lg:flex-1">
          <div className="grid gap-2">
            <label className="text-lg font-semibold" htmlFor="agent-name">
              背景描述
            </label>
            <Input
              id="agent-name"
              value={agent.name}
              onChange={(event: ChangeEvent<HTMLInputElement>) =>
                handleBasicFieldChange('name', event.target.value)
              }
            />
          </div>
          <div className="grid gap-2">
            <label
              className="text-lg font-semibold"
              htmlFor="agent-description"
            >
              角色任务
            </label>
            <Textarea
              id="agent-description"
              value={agent.description ?? ''}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                handleBasicFieldChange('description', event.target.value)
              }
              placeholder="补充 Agent 的角色、语气等信息…"
            />
          </div>
          <div className="grid gap-2">
            <label
              className="text-lg font-semibold"
              htmlFor="agent-constraints"
            >
              约束
            </label>
            <Textarea
              id="agent-constraints"
              value={agent.constraints ?? ''}
              onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                handleBasicFieldChange('constraints', event.target.value)
              }
              placeholder="补充 Agent 约束…"
            />
          </div>
        </div>
        <div className="flex items-center gap-3 self-end lg:self-start">
          {saveError && (
            <span className="text-sm text-destructive">{saveError}</span>
          )}
          <Button
            variant="outline"
            onClick={() => router.push(`/agent/${agent.id}/debug`)}
            disabled={isSaving}
            className="gap-2"
          >
            <Bug className="h-4 w-4" />
            调试
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push('/')}
            disabled={isSaving}
          >
            返回
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || isSaving}
            className="gap-2"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            保存
          </Button>
        </div>
      </header>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">主流程</h2>
            <p className="text-sm text-muted-foreground">
              使用富文本编写 Agent 的系统提示，支持拖拽 XLSX 表格。
            </p>
          </div>
        </div>
        <SystemPromptEditor
          value={agent.systemPromptJson}
          journeys={agent.journeys}
          onChange={handleSystemPromptChange}
          onJourneyCellClick={handleJourneyCellClick}
        />
      </section>
      {/* 
      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">工具（Tools）</h2>
            <p className="text-sm text-muted-foreground">
              定义 Agent 可以调用的外部函数。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddTool}
          >
            <Plus className="h-4 w-4" />
            新增工具
          </Button>
        </div>
        <div className="grid gap-4">
          {agent.tools.map((tool: Tool) => (
            <div
              key={tool.id}
              className="grid gap-3 rounded-md border border-border p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <label
                    className="text-xs font-semibold text-muted-foreground"
                    htmlFor={`tool-name-${tool.id}`}
                  >
                    名称
                  </label>
                  <Input
                    id={`tool-name-${tool.id}`}
                    value={tool.name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleToolChange(tool.id, { name: event.target.value })
                    }
                    placeholder="例如：get_upcoming_slots"
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleRemoveTool(tool.id)}
                >
                  删除
                </Button>
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`tool-desc-${tool.id}`}
                >
                  描述
                </label>
                <Textarea
                  id={`tool-desc-${tool.id}`}
                  value={tool.description ?? ''}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleToolChange(tool.id, {
                      description: event.target.value,
                    })
                  }
                  placeholder="工具用途说明"
                />
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`tool-params-${tool.id}`}
                >
                  参数（JSON）
                </label>
                <Textarea
                  id={`tool-params-${tool.id}`}
                  value={JSON.stringify(tool.parameters ?? {}, null, 2)}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) => {
                    try {
                      const parsed = JSON.parse(event.target.value || '{}');
                      handleToolChange(tool.id, { parameters: parsed });
                    } catch {
                      handleToolChange(tool.id, {
                        parameters: event.target.value,
                      });
                    }
                  }}
                  className="font-mono text-xs"
                />
              </div>
            </div>
          ))}
          {!agent.tools.length && (
            <div className="rounded-md border border-dashed border-muted px-4 py-6 text-center text-sm text-muted-foreground">
              暂无工具，点击“新增工具”添加函数调用能力。
            </div>
          )}
        </div>
      </section> */}

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">专业术语</h2>
            <p className="text-sm text-muted-foreground">
              维护领域词汇及其同义词，帮助 Agent 理解上下文。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddTerm}
          >
            <Plus className="h-4 w-4" />
            新增术语
          </Button>
        </div>
        <div className="grid gap-4">
          {agent.glossary.map((term: Term) => (
            <div
              key={term.id}
              className="grid gap-3 rounded-md border border-border p-4"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="grid gap-1">
                  <label
                    className="text-xs font-semibold text-muted-foreground"
                    htmlFor={`term-name-${term.id}`}
                  >
                    术语
                  </label>
                  <Input
                    id={`term-name-${term.id}`}
                    value={term.name}
                    onChange={(event: ChangeEvent<HTMLInputElement>) =>
                      handleTermChange(term.id, { name: event.target.value })
                    }
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleRemoveTerm(term.id)}
                >
                  删除
                </Button>
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`term-desc-${term.id}`}
                >
                  描述
                </label>
                <Textarea
                  id={`term-desc-${term.id}`}
                  value={term.description}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleTermChange(term.id, {
                      description: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`term-syn-${term.id}`}
                >
                  同义词（逗号分隔）
                </label>
                <Input
                  id={`term-syn-${term.id}`}
                  value={term.synonyms.join(', ')}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleTermChange(term.id, {
                      synonyms: event.target.value
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          ))}
          {!agent.glossary.length && (
            <div className="rounded-md border border-dashed border-muted px-4 py-6 text-center text-sm text-muted-foreground">
              暂无术语，添加后可在提示词或流程中引用统一概念。
            </div>
          )}
        </div>
      </section>

      <section className="grid gap-4 rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">全局指南</h2>
            <p className="text-sm text-muted-foreground">
              定义跨流程的规则与工具策略。
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={handleAddGuideline}
          >
            <Plus className="h-4 w-4" />
            新增指南
          </Button>
        </div>
        <div className="grid gap-4">
          {agent.guidelines.map((guideline: Guideline) => (
            <div
              key={guideline.id}
              className="grid gap-3 rounded-md border border-border p-4"
            >
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`guide-condition-${guideline.id}`}
                >
                  触发条件
                </label>
                <Textarea
                  id={`guide-condition-${guideline.id}`}
                  value={guideline.condition}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleGuidelineChange(guideline.id, {
                      condition: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`guide-action-${guideline.id}`}
                >
                  行动建议
                </label>
                <Textarea
                  id={`guide-action-${guideline.id}`}
                  value={guideline.action}
                  onChange={(event: ChangeEvent<HTMLTextAreaElement>) =>
                    handleGuidelineChange(guideline.id, {
                      action: event.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-1">
                <label
                  className="text-xs font-semibold text-muted-foreground"
                  htmlFor={`guide-tools-${guideline.id}`}
                >
                  建议工具（逗号分隔工具 ID）
                </label>
                <Input
                  id={`guide-tools-${guideline.id}`}
                  value={guideline.toolIds.join(', ')}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    handleGuidelineChange(guideline.id, {
                      toolIds: event.target.value
                        .split(',')
                        .map((item: string) => item.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="flex justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleRemoveGuideline(guideline.id)}
                >
                  删除指南
                </Button>
              </div>
            </div>
          ))}
          {!agent.guidelines.length && (
            <div className="rounded-md border border-dashed border-muted px-4 py-6 text-center text-sm text-muted-foreground">
              暂无全局指南，可在此设置统一的对话策略与异常处理建议。
            </div>
          )}
        </div>
      </section>

      <JourneySheet
        open={journeySheetOpen}
        journey={selectedJourney}
        onOpenChange={handleSheetOpenChange}
        onJourneyChange={handleJourneyChange}
        availableTools={agent.tools}
      />
    </div>
  );
}

function createEmptyJourney(agentId: string): Journey {
  const logic: JourneyLogicDoc = {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '在此描述该流程的目标、触发条件以及核心步骤。',
          },
        ],
      },
    ],
  };

  return {
    id: crypto.randomUUID(),
    agentId,
    title: '新的流程',
    description: '',
    triggerConditions: [],
    logic,
  };
}
