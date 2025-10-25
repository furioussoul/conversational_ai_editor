'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { Compass } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface GuidelineBlockProps {
  block: DocumentBlock;
}

export default function GuidelineBlock({ block }: GuidelineBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value, updatedAt: new Date() },
    });
  };

  return (
    <BlockWrapper
      icon={<Compass className="h-5 w-5" />}
      title="指导原则 (Guideline)"
      onDelete={() => removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">触发条件</label>
          <textarea
            value={block.content.condition || ''}
            onChange={(e) => handleUpdate('condition', e.target.value)}
            placeholder="例如: 患者询问保险相关问题"
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">应采取的行动</label>
          <textarea
            value={block.content.action || ''}
            onChange={(e) => handleUpdate('action', e.target.value)}
            placeholder="例如: 列出我们接受的保险提供商，并告知患者拨打办公室电话了解更多详情"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">优先级</label>
          <input
            type="number"
            value={block.content.priority || 0}
            onChange={(e) => handleUpdate('priority', parseInt(e.target.value))}
            min="0"
            max="100"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </BlockWrapper>
  );
}
