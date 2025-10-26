'use client';

import { Textarea } from '@/components/ui/textarea';
import type { Tool } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import type { ChangeEvent } from 'react';
import { Handle, Position, type NodeProps } from 'reactflow';

export type StartNodeData = {
  label?: string;
};

export type ChatNodeData = {
  label?: string;
  content?: string;
  onContentChange?: (value: string) => void;
};

export type ToolNodeData = {
  label?: string;
  toolId?: string;
  tools: Tool[];
  onToolChange?: (toolId: string) => void;
};

export type EndNodeData = {
  label?: string;
};

const baseNodeClass =
  'rounded-lg border border-border bg-card p-3 shadow-sm transition-shadow hover:shadow-md';

export function StartNode({ data }: NodeProps<StartNodeData>) {
  return (
    <div className={cn(baseNodeClass, 'w-40 text-center text-sm font-semibold text-primary')}>
      {data?.label ?? '开始'}
      <Handle type="source" position={Position.Right} className="!h-3 !w-3" />
    </div>
  );
}

export function ChatNode({ data }: NodeProps<ChatNodeData>) {
  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    data?.onContentChange?.(event.target.value);
  };

  return (
    <div className={cn(baseNodeClass, 'w-56 space-y-2 text-sm')}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-primary">聊天节点</span>
      </div>
      <Textarea
        value={data?.content ?? ''}
        onChange={handleChange}
        className="min-h-[120px] text-xs"
        placeholder="Agent 应该回复的内容…"
      />
      <Handle type="target" position={Position.Left} className="!h-3 !w-3" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3" />
    </div>
  );
}

export function ToolNode({ data }: NodeProps<ToolNodeData>) {
  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    data?.onToolChange?.(event.target.value);
  };

  return (
    <div className={cn(baseNodeClass, 'w-56 space-y-2 text-sm')}>
      <div className="flex items-center justify-between">
        <span className="font-semibold text-primary">工具节点</span>
      </div>
      <label className="text-xs text-muted-foreground" htmlFor="tool-select">
        选择工具
      </label>
      <select
        id="tool-select"
        className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        value={data?.toolId ?? ''}
        onChange={handleChange}
      >
        <option value="">未选择</option>
        {data?.tools?.map((tool) => (
          <option key={tool.id} value={tool.id}>
            {tool.name}
          </option>
        ))}
      </select>
      <Handle type="target" position={Position.Left} className="!h-3 !w-3" />
      <Handle type="source" position={Position.Right} className="!h-3 !w-3" />
    </div>
  );
}

export function EndNode({ data }: NodeProps<EndNodeData>) {
  return (
    <div className={cn(baseNodeClass, 'w-40 text-center text-sm font-semibold text-muted-foreground')}>
      {data?.label ?? '结束'}
      <Handle type="target" position={Position.Left} className="!h-3 !w-3" />
    </div>
  );
}
