'use client';

import { useState, useEffect } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { parseMarkdownToAgent } from '@/lib/markdownParser';
import { Sparkles, Eye, FileText, AlertCircle, CheckCircle, Network } from 'lucide-react';
import MarkdownEditor from './MarkdownEditor';
import AgentPreview from './AgentPreview';
import AgentFlowCanvas from './AgentFlowCanvas';

type PreviewMode = 'none' | 'list' | 'canvas';

export default function DocumentEditor() {
  const { currentDocument, updateDocument } = useDocumentStore();
  const [previewMode, setPreviewMode] = useState<PreviewMode>('none');
  const [isParsing, setIsParsing] = useState(false);

  // 自动解析 Markdown
  useEffect(() => {
    if (!currentDocument?.markdown) return;

    const parseTimeout = setTimeout(async () => {
      setIsParsing(true);
      const result = await parseMarkdownToAgent(currentDocument.markdown);

      updateDocument({
        parsedAgent: result.agent,
        parseErrors: result.errors,
        parseWarnings: result.warnings,
        lastParsedAt: result.parsedAt,
      });

      setIsParsing(false);
    }, 1000); // 防抖：1秒后解析

    return () => clearTimeout(parseTimeout);
  }, [currentDocument?.markdown]);

  if (!currentDocument) return null;

  const handleMarkdownChange = (markdown: string) => {
    updateDocument({ markdown });
  };

  const handleUpdateAgent = (agent: any) => {
    updateDocument({ parsedAgent: agent });
  };

  return (
    <div className="flex h-full">
      {/* Markdown 编辑区 */}
      <div className={`transition-all ${previewMode !== 'none' ? 'w-1/2' : 'w-full'}`}>
        <div className="flex h-full flex-col">
          {/* 编辑器工具栏 */}
          <div className="border-b bg-muted/30 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <span className="font-medium">Markdown 文档</span>
                {isParsing && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    AI 解析中...
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(previewMode === 'list' ? 'none' : 'list')}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    previewMode === 'list'
                      ? 'bg-blue-500 text-white border-blue-600'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  <Eye className="h-4 w-4" />
                  列表预览
                </button>
                <button
                  onClick={() => setPreviewMode(previewMode === 'canvas' ? 'none' : 'canvas')}
                  className={`flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors ${
                    previewMode === 'canvas'
                      ? 'bg-purple-500 text-white border-purple-600'
                      : 'bg-background hover:bg-accent'
                  }`}
                >
                  <Network className="h-4 w-4" />
                  画布预览
                </button>
              </div>
            </div>

            {/* 解析状态指示器 */}
            {currentDocument.lastParsedAt && (
              <div className="mt-2 flex items-center gap-4 text-sm">
                {currentDocument.parseErrors && currentDocument.parseErrors.length > 0 ? (
                  <div className="flex items-center gap-1 text-red-600">
                    <AlertCircle className="h-4 w-4" />
                    {currentDocument.parseErrors.length} 个错误
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    解析成功
                  </div>
                )}

                {currentDocument.parseWarnings && currentDocument.parseWarnings.length > 0 && (
                  <div className="flex items-center gap-1 text-yellow-600">
                    <AlertCircle className="h-4 w-4" />
                    {currentDocument.parseWarnings.length} 个警告
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Markdown 编辑器 */}
          <div className="flex-1 overflow-auto">
            <MarkdownEditor
              value={currentDocument.markdown || ''}
              onChange={handleMarkdownChange}
            />
          </div>
        </div>
      </div>

      {/* 预览区 */}
      {previewMode === 'list' && (
        <div className="w-1/2 border-l">
          <AgentPreview
            agent={currentDocument.parsedAgent}
            errors={currentDocument.parseErrors}
            warnings={currentDocument.parseWarnings}
          />
        </div>
      )}

      {previewMode === 'canvas' && (
        <div className="w-1/2 border-l bg-gray-50 dark:bg-gray-900">
          <AgentFlowCanvas
            agent={currentDocument.parsedAgent || null}
            onUpdateAgent={handleUpdateAgent}
          />
        </div>
      )}
    </div>
  );
}
