'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { Eye } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface ObservationBlockProps {
  block: DocumentBlock;
}

export default function ObservationBlock({ block }: ObservationBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value, updatedAt: new Date() },
    });
  };

  return (
    <BlockWrapper
      icon={<Eye className="h-5 w-5" />}
      title="观察点 (Observation)"
      onDelete={() => removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">观察描述</label>
          <textarea
            value={block.content.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="例如: 患者要求跟进访问，但不清楚以何种方式"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <strong>提示:</strong> 观察点用于在多个旅程之间进行消歧。关联的旅程将在构建时自动识别。
        </div>
      </div>
    </BlockWrapper>
  );
}
