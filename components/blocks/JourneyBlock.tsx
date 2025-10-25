'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { Route } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface JourneyBlockProps {
  block: DocumentBlock;
}

export default function JourneyBlock({ block }: JourneyBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value, updatedAt: new Date() },
    });
  };

  return (
    <BlockWrapper
      icon={<Route className="h-5 w-5" />}
      title="旅程 (Journey)"
      onDelete={() => removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">旅程标题</label>
          <input
            type="text"
            value={block.content.title || ''}
            onChange={(e) => handleUpdate('title', e.target.value)}
            placeholder="例如: Schedule an Appointment"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">旅程描述</label>
          <textarea
            value={block.content.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="描述这个旅程的目的..."
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">触发条件 (用换行分隔)</label>
          <textarea
            value={(block.content.conditions || []).join('\n')}
            onChange={(e) =>
              handleUpdate(
                'conditions',
                e.target.value.split('\n').filter((c: string) => c.trim())
              )
            }
            placeholder="例如:\n用户想要预约\n患者请求预约时间"
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm font-mono outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div className="rounded-md bg-blue-50 p-3 text-sm text-blue-800">
          <strong>提示:</strong> Journey
          的状态和转换需要在发布后通过自然语言描述自动生成，或使用高级编辑器手动配置。
        </div>
      </div>
    </BlockWrapper>
  );
}
