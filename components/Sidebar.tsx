'use client';

import { useState } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import { DocumentStatus } from '@/types';
import { FileText, Plus, Search } from 'lucide-react';
import { cn, formatDate } from '@/lib/utils';

export default function Sidebar() {
  const { documents, currentDocument, setCurrentDocument, createDocument } = useDocumentStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<DocumentStatus | 'all'>('all');

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch = doc.title.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || doc.status === filter;
    return matchesSearch && matchesFilter;
  });

  const handleCreateNew = () => {
    const title = prompt('请输入文档标题:');
    if (title) {
      createDocument(title, 'current-user'); // 实际应用中从用户会话获取
    }
  };

  const getStatusColor = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return 'bg-gray-100 text-gray-800';
      case DocumentStatus.REVIEWING:
        return 'bg-yellow-100 text-yellow-800';
      case DocumentStatus.PUBLISHED:
        return 'bg-green-100 text-green-800';
      case DocumentStatus.ARCHIVED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: DocumentStatus) => {
    switch (status) {
      case DocumentStatus.DRAFT:
        return '草稿';
      case DocumentStatus.REVIEWING:
        return '审核中';
      case DocumentStatus.PUBLISHED:
        return '已发布';
      case DocumentStatus.ARCHIVED:
        return '已归档';
      default:
        return '未知';
    }
  };

  return (
    <aside className="w-80 border-r bg-muted/30">
      <div className="flex h-full flex-col">
        {/* 头部 */}
        <div className="border-b p-4">
          <h1 className="text-xl font-bold">AI 知识库</h1>
          <p className="text-sm text-muted-foreground">可视化 Agent 编辑器</p>
        </div>

        {/* 搜索和过滤 */}
        <div className="border-b p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索文档..."
              className="w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            value={filter}
            onChange={(e) => setFilter(e.target.value as DocumentStatus | 'all')}
          >
            <option value="all">全部状态</option>
            <option value={DocumentStatus.DRAFT}>草稿</option>
            <option value={DocumentStatus.REVIEWING}>审核中</option>
            <option value={DocumentStatus.PUBLISHED}>已发布</option>
            <option value={DocumentStatus.ARCHIVED}>已归档</option>
          </select>
        </div>

        {/* 文档列表 */}
        <div className="flex-1 overflow-auto p-2">
          <button
            onClick={handleCreateNew}
            className="mb-2 flex w-full items-center gap-2 rounded-md border border-dashed border-primary/50 p-3 text-sm font-medium text-primary hover:bg-primary/5"
          >
            <Plus className="h-4 w-4" />
            创建新文档
          </button>

          <div className="space-y-1">
            {filteredDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => setCurrentDocument(doc)}
                className={cn(
                  'w-full rounded-md p-3 text-left transition-colors hover:bg-accent',
                  currentDocument?.id === doc.id && 'bg-accent'
                )}
              >
                <div className="flex items-start gap-2">
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{doc.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {formatDate(doc.updatedAt)}
                    </div>
                    <div className="mt-2">
                      <span
                        className={cn(
                          'inline-block rounded-full px-2 py-0.5 text-xs font-medium',
                          getStatusColor(doc.status)
                        )}
                      >
                        {getStatusText(doc.status)}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>

          {filteredDocs.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchTerm ? '未找到匹配的文档' : '暂无文档'}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
