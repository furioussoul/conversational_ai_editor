'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentStatus } from '@/types';
import { Save, Send, Eye, Archive, CheckCircle } from 'lucide-react';

export default function Header() {
  const { currentDocument, saveDocument, submitForReview, publish, archive } = useDocumentStore();

  if (!currentDocument) return null;

  const handlePublish = async () => {
    const confirm = window.confirm('确定要发布此文档吗? 发布后将自动构建 Agent。');
    if (!confirm) return;

    const result = await publish('current-user');
    if (result.success) {
      alert('发布成功! Agent 已构建完成。');
      saveDocument();
    } else {
      alert(`发布失败:\n${result.errors?.join('\n')}`);
    }
  };

  const canEdit = currentDocument.status === DocumentStatus.DRAFT;
  const canReview = currentDocument.status === DocumentStatus.REVIEWING;

  return (
    <header className="border-b bg-background px-6 py-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h2 className="text-lg font-semibold">{currentDocument.title}</h2>
          <p className="text-sm text-muted-foreground">
            版本 {currentDocument.version} · 最后更新:{' '}
            {new Date(currentDocument.updatedAt).toLocaleString('zh-CN')}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* 保存按钮 */}
          {canEdit && (
            <button
              onClick={saveDocument}
              className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              <Save className="h-4 w-4" />
              保存
            </button>
          )}

          {/* 提交审核按钮 */}
          {canEdit && (
            <button
              onClick={() => {
                submitForReview();
                saveDocument();
                alert('已提交审核');
              }}
              className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              <Send className="h-4 w-4" />
              提交审核
            </button>
          )}

          {/* 发布按钮 */}
          {canReview && (
            <button
              onClick={handlePublish}
              className="inline-flex items-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <CheckCircle className="h-4 w-4" />
              审核通过并发布
            </button>
          )}

          {/* 预览按钮 */}
          <button className="inline-flex items-center gap-2 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-accent">
            <Eye className="h-4 w-4" />
            预览
          </button>

          {/* 归档按钮 */}
          {currentDocument.status === DocumentStatus.PUBLISHED && (
            <button
              onClick={() => {
                if (window.confirm('确定要归档此文档吗?')) {
                  archive();
                  saveDocument();
                }
              }}
              className="inline-flex items-center gap-2 rounded-md border border-red-200 bg-background px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <Archive className="h-4 w-4" />
              归档
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
