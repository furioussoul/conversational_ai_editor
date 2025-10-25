'use client';

import { ReactNode } from 'react';
import { Trash2, GripVertical } from 'lucide-react';

interface BlockWrapperProps {
  icon: ReactNode;
  title: string;
  onDelete: () => void;
  children: ReactNode;
}

export default function BlockWrapper({ icon, title, onDelete, children }: BlockWrapperProps) {
  return (
    <div className="group relative rounded-lg border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
      {/* 拖拽手柄 */}
      <div className="absolute left-2 top-6 opacity-0 transition-opacity group-hover:opacity-100">
        <GripVertical className="h-5 w-5 cursor-grab text-muted-foreground" />
      </div>

      {/* 头部 */}
      <div className="mb-4 flex items-center justify-between pl-6">
        <div className="flex items-center gap-2">
          <div className="text-primary">{icon}</div>
          <h3 className="font-semibold">{title}</h3>
        </div>

        <button
          onClick={onDelete}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          title="删除此块"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* 内容 */}
      <div className="pl-6">{children}</div>
    </div>
  );
}
