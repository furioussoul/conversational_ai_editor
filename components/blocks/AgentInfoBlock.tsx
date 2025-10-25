'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { Trash2, Bot } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface AgentInfoBlockProps {
  block: DocumentBlock;
}

export default function AgentInfoBlock({ block }: AgentInfoBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value },
    });
  };

  return (
    <BlockWrapper
      icon={<Bot className="h-5 w-5" />}
      title="Agent 基本信息"
      onDelete={() => removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">
            Agent 名称 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={block.content.name || ''}
            onChange={(e) => handleUpdate('name', e.target.value)}
            placeholder="例如: Healthcare Agent"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">
            Agent 描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={block.content.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="例如: 富有同理心、能安抚患者情绪的医疗助手"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </BlockWrapper>
  );
}
