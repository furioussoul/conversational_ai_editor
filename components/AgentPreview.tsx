'use client';

import { Agent } from '@/types';
import {
  Bot,
  Wrench,
  BookOpen,
  Route,
  Compass,
  Eye,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

interface AgentPreviewProps {
  agent?: Agent;
  errors?: string[];
  warnings?: string[];
}

export default function AgentPreview({ agent, errors, warnings }: AgentPreviewProps) {
  if (!agent && (!errors || errors.length === 0)) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center text-muted-foreground">
          <Bot className="mx-auto h-12 w-12 opacity-50" />
          <p className="mt-2">开始编写文档，AI 会自动解析...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <div className="p-6 space-y-6">
        <div className="border-b pb-4">
          <h2 className="text-xl font-bold">AI 解析结果</h2>
          <p className="text-sm text-muted-foreground">实时预览 Agent 结构</p>
        </div>

        {/* 错误信息 */}
        {errors && errors.length > 0 && (
          <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-red-900">解析错误</h3>
                <ul className="mt-2 space-y-1 text-sm text-red-700">
                  {errors.map((error, i) => (
                    <li key={i}>• {error}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* 警告信息 */}
        {warnings && warnings.length > 0 && (
          <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-yellow-900">警告</h3>
                <ul className="mt-2 space-y-1 text-sm text-yellow-700">
                  {warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Agent 基本信息 */}
        {agent && (
          <>
            <PreviewSection
              icon={<Bot className="h-5 w-5" />}
              title="Agent 信息"
              badge={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            >
              <div className="space-y-2">
                <div>
                  <span className="text-sm font-medium text-muted-foreground">名称：</span>
                  <span className="font-semibold">{agent.name || '未定义'}</span>
                </div>
                {agent.description && (
                  <div>
                    <span className="text-sm font-medium text-muted-foreground">描述：</span>
                    <p className="text-sm">{agent.description}</p>
                  </div>
                )}
              </div>
            </PreviewSection>

            {/* 工具列表 */}
            {agent.tools && agent.tools.length > 0 && (
              <PreviewSection
                icon={<Wrench className="h-5 w-5" />}
                title="工具"
                count={agent.tools.length}
              >
                <div className="space-y-3">
                  {agent.tools.map((tool) => (
                    <div key={tool.id} className="rounded-md border bg-muted/30 p-3">
                      <div className="font-medium">{tool.name}</div>
                      {tool.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{tool.description}</p>
                      )}
                      {tool.parameters && tool.parameters.length > 0 && (
                        <div className="mt-2 text-xs text-muted-foreground">
                          参数: {tool.parameters.map((p) => p.name).join(', ')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}

            {/* 术语列表 */}
            {agent.terms && agent.terms.length > 0 && (
              <PreviewSection
                icon={<BookOpen className="h-5 w-5" />}
                title="术语"
                count={agent.terms.length}
              >
                <div className="space-y-2">
                  {agent.terms.map((term) => (
                    <div key={term.id} className="rounded-md border bg-muted/30 p-3">
                      <div className="font-medium">
                        {term.name}
                        {term.synonyms.length > 0 && (
                          <span className="ml-2 text-sm font-normal text-muted-foreground">
                            ({term.synonyms.join(', ')})
                          </span>
                        )}
                      </div>
                      {term.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{term.description}</p>
                      )}
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}

            {/* 旅程列表 */}
            {agent.journeys && agent.journeys.length > 0 && (
              <PreviewSection
                icon={<Route className="h-5 w-5" />}
                title="旅程"
                count={agent.journeys.length}
              >
                <div className="space-y-3">
                  {agent.journeys.map((journey) => (
                    <div key={journey.id} className="rounded-md border bg-muted/30 p-3">
                      <div className="font-medium">{journey.title}</div>
                      {journey.description && (
                        <p className="mt-1 text-sm text-muted-foreground">{journey.description}</p>
                      )}
                      {journey.conditions.length > 0 && (
                        <div className="mt-2">
                          <div className="text-xs font-medium text-muted-foreground">触发条件:</div>
                          <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                            {journey.conditions.map((cond, i) => (
                              <li key={i}>• {cond}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}

            {/* 指导原则列表 */}
            {agent.guidelines && agent.guidelines.length > 0 && (
              <PreviewSection
                icon={<Compass className="h-5 w-5" />}
                title="指导原则"
                count={agent.guidelines.length}
              >
                <div className="space-y-2">
                  {agent.guidelines.map((guideline) => (
                    <div key={guideline.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                      <div className="font-medium text-blue-700">{guideline.condition}</div>
                      <div className="mt-1 flex items-center gap-2 text-muted-foreground">
                        <span>→</span>
                        <span>{guideline.action}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}

            {/* 观察点列表 */}
            {agent.observations && agent.observations.length > 0 && (
              <PreviewSection
                icon={<Eye className="h-5 w-5" />}
                title="观察点"
                count={agent.observations.length}
              >
                <div className="space-y-2">
                  {agent.observations.map((obs) => (
                    <div key={obs.id} className="rounded-md border bg-muted/30 p-3 text-sm">
                      {obs.description}
                    </div>
                  ))}
                </div>
              </PreviewSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}

interface PreviewSectionProps {
  icon: React.ReactNode;
  title: string;
  count?: number;
  badge?: React.ReactNode;
  children: React.ReactNode;
}

function PreviewSection({ icon, title, count, badge, children }: PreviewSectionProps) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-primary">{icon}</div>
          <h3 className="font-semibold">{title}</h3>
          {count !== undefined && (
            <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              {count}
            </span>
          )}
        </div>
        {badge}
      </div>
      {children}
    </div>
  );
}
