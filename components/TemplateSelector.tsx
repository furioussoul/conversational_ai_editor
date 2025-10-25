'use client';

import { useState, useEffect } from 'react';
import { MODULE_TEMPLATES, Template, generateToolTemplate } from '@/lib/templates';
import {
  PREDEFINED_TOOLS,
  TOOL_CATEGORIES,
  getToolsByCategory,
  PredefinedTool,
} from '@/lib/predefinedTools';
import { X, Search } from 'lucide-react';

interface TemplateSelectorProps {
  isOpen: boolean;
  position: { x: number; y: number };
  onClose: () => void;
  onSelect: (template: string) => void;
}

export default function TemplateSelector({
  isOpen,
  position,
  onClose,
  onSelect,
}: TemplateSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'templates' | 'tools'>('templates');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<PredefinedTool | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
      setActiveTab('templates');
      setSelectedCategory(null);
      setSelectedTool(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredTemplates = MODULE_TEMPLATES.filter(
    (template) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTools = selectedCategory
    ? getToolsByCategory(selectedCategory)
    : PREDEFINED_TOOLS.filter(
        (tool) =>
          tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          tool.description.toLowerCase().includes(searchTerm.toLowerCase())
      );

  const handleTemplateSelect = (template: Template) => {
    onSelect(template.template);
    onClose();
  };

  const handleToolSelect = (tool: PredefinedTool) => {
    setSelectedTool(tool);
  };

  const handleToolConfirm = () => {
    if (selectedTool) {
      const toolTemplate = generateToolTemplate(
        selectedTool.name,
        selectedTool.description,
        selectedTool.parameters,
        selectedTool.returnType
      );
      onSelect(toolTemplate);
      onClose();
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div className="fixed inset-0 bg-black/20 z-40" onClick={onClose} />

      {/* 浮窗 */}
      <div
        className="fixed z-50 bg-white dark:bg-gray-800 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 w-[600px] max-h-[500px] overflow-hidden flex flex-col"
        style={{
          left: Math.min(position.x, window.innerWidth - 620),
          top: Math.min(position.y, window.innerHeight - 520),
        }}
      >
        {/* 头部 */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">插入模块</h3>
            <button
              onClick={onClose}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* 搜索框 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索模板或工具..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
          </div>

          {/* 标签页 */}
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'templates'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              模块模板
            </button>
            <button
              onClick={() => setActiveTab('tools')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'tools'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              预定义工具
            </button>
          </div>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'templates' ? (
            <div className="p-4 space-y-2">
              {filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleTemplateSelect(template)}
                  className="w-full text-left p-4 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{template.icon}</span>
                    <div className="flex-1">
                      <h4 className="font-medium text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400">
                        {template.name}
                      </h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {template.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
              {filteredTemplates.length === 0 && (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  未找到匹配的模板
                </div>
              )}
            </div>
          ) : (
            <div className="flex h-full">
              {/* 左侧分类 */}
              <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 p-2 space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-3 py-2 rounded text-sm ${
                    selectedCategory === null
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  全部工具
                </button>
                {TOOL_CATEGORIES.map((category) => (
                  <button
                    key={category}
                    onClick={() => setSelectedCategory(category)}
                    className={`w-full text-left px-3 py-2 rounded text-sm ${
                      selectedCategory === category
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}
                  >
                    {category}
                  </button>
                ))}
              </div>

              {/* 右侧工具列表 */}
              <div className="flex-1 p-4 space-y-2 overflow-y-auto">
                {filteredTools.map((tool) => (
                  <button
                    key={tool.name}
                    onClick={() => handleToolSelect(tool)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedTool?.name === tool.name
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <h4 className="font-medium text-gray-900 dark:text-white text-sm">
                      {tool.name}
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {tool.description}
                    </p>
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      <div>参数: {tool.parameters}</div>
                      <div>返回: {tool.returnType}</div>
                    </div>
                  </button>
                ))}
                {filteredTools.length === 0 && (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400 text-sm">
                    未找到匹配的工具
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 底部操作栏（仅工具选择时显示） */}
        {activeTab === 'tools' && selectedTool && (
          <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                已选择:{' '}
                <span className="font-medium text-gray-900 dark:text-white">
                  {selectedTool.name}
                </span>
              </div>
              <button
                onClick={handleToolConfirm}
                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
              >
                插入工具
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
