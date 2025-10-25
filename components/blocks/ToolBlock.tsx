'use client';

import { useDocumentStore } from '@/store/documentStore';
import { DocumentBlock, ToolParameter } from '@/types';
import { Wrench, Plus, X } from 'lucide-react';
import BlockWrapper from './BlockWrapper';

interface ToolBlockProps {
  block: DocumentBlock;
}

export default function ToolBlock({ block }: ToolBlockProps) {
  const { updateBlock } = useDocumentStore();

  const handleUpdate = (field: string, value: any) => {
    updateBlock(block.id, {
      content: { ...block.content, [field]: value, updatedAt: new Date() },
    });
  };

  const addParameter = () => {
    const newParam: ToolParameter = {
      name: '',
      type: 'string',
      description: '',
      required: false,
    };
    handleUpdate('parameters', [...(block.content.parameters || []), newParam]);
  };

  const updateParameter = (index: number, field: string, value: any) => {
    const params = [...block.content.parameters];
    params[index] = { ...params[index], [field]: value };
    handleUpdate('parameters', params);
  };

  const removeParameter = (index: number) => {
    const params = block.content.parameters.filter((_: any, i: number) => i !== index);
    handleUpdate('parameters', params);
  };

  return (
    <BlockWrapper
      icon={<Wrench className="h-5 w-5" />}
      title="工具 (Tool)"
      onDelete={() => useDocumentStore.getState().removeBlock(block.id)}
    >
      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium">工具名称</label>
          <input
            type="text"
            value={block.content.name || ''}
            onChange={(e) => handleUpdate('name', e.target.value)}
            placeholder="例如: get_insurance_providers"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">工具描述</label>
          <textarea
            value={block.content.description || ''}
            onChange={(e) => handleUpdate('description', e.target.value)}
            placeholder="描述这个工具的功能..."
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <label className="text-sm font-medium">参数</label>
            <button
              onClick={addParameter}
              className="flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="h-3 w-3" />
              添加参数
            </button>
          </div>

          <div className="space-y-2">
            {(block.content.parameters || []).map((param: ToolParameter, index: number) => (
              <div key={index} className="rounded-md border p-3">
                <div className="mb-2 flex items-start gap-2">
                  <input
                    type="text"
                    value={param.name}
                    onChange={(e) => updateParameter(index, 'name', e.target.value)}
                    placeholder="参数名"
                    className="flex-1 rounded-md border bg-background px-2 py-1 text-sm"
                  />
                  <select
                    value={param.type}
                    onChange={(e) => updateParameter(index, 'type', e.target.value)}
                    className="rounded-md border bg-background px-2 py-1 text-sm"
                  >
                    <option value="string">字符串</option>
                    <option value="number">数字</option>
                    <option value="boolean">布尔值</option>
                    <option value="datetime">日期时间</option>
                    <option value="object">对象</option>
                    <option value="array">数组</option>
                  </select>
                  <button
                    onClick={() => removeParameter(index)}
                    className="rounded-md p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <input
                  type="text"
                  value={param.description}
                  onChange={(e) => updateParameter(index, 'description', e.target.value)}
                  placeholder="参数描述"
                  className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                />
                <label className="mt-1 flex items-center gap-1 text-sm">
                  <input
                    type="checkbox"
                    checked={param.required || false}
                    onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                  />
                  必填参数
                </label>
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium">返回类型</label>
          <input
            type="text"
            value={block.content.returnType || ''}
            onChange={(e) => handleUpdate('returnType', e.target.value)}
            placeholder="例如: List[str]"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>
    </BlockWrapper>
  );
}
