'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { BookOpen, Plus, X } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface TermBlockProps {
  block: DocumentBlock;
}

export default function TermBlock({ block }: TermBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value, updatedAt: new Date() },
    });
  };

  const addSynonym = () => {
    const synonym = prompt('输入同义词:');
    if (synonym) {
      handleUpdate('synonyms', [...(block.content.synonyms || []), synonym]);
    }
  };

  const removeSynonym = (index: number) => {
    const synonyms = block.content.synonyms.filter((_: any, i: number) => i !== index);
    handleUpdate('synonyms', synonyms);
  };

  return (
    <BlockWrapper
      icon={<BookOpen className="h-5 w-5" />}
      title="术语 (Term)"
      onDelete={() => removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">术语名称</label>
          <input
            type="text"
            value={block.content.name || ''}
            onChange={(e) => handleUpdate('name', e.target.value)}
            placeholder="例如: Office Phone Number"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">术语描述</label>
          <textarea
            value={block.content.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="详细描述这个术语..."
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">同义词</label>
            <button
              onClick={addSynonym}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3 w-3" />
              添加同义词
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {(block.content.synonyms || []).map((synonym: string, index: number) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
              >
                {synonym}
                <button
                  onClick={() => removeSynonym(index)}
                  className="rounded-full hover:bg-destructive/20"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </BlockWrapper>
  );
}
