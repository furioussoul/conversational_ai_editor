'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock } from '@/types';
import { FileText } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface RichTextBlockProps {
  block: DocumentBlock;
}

export default function RichTextBlock({ block }: RichTextBlockProps) {
  const { updateBlock, removeBlock } = useDocumentStore();

  const handleUpdate = (value: string) => {
    updateBlock(block.id, {
      content: { ...block.content, html: value },
    });
  };

  return (
    <BlockWrapper
      icon={<FileText className="h-5 w-5" />}
      title="富文本说明"
      onDelete={() => removeBlock(block.id)}
    >
      <div>
        <textarea
          value={block.content.html || ''}
          onChange={(e) => handleUpdate(e.target.value)}
          placeholder="在此添加说明、注释或其他自由格式的文本..."
          rows={6}
          className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="mt-2 text-xs text-muted-foreground">支持 Markdown 格式</p>
      </div>
    </BlockWrapper>
  );
}
