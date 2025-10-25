'use client';

import { useState, useRef, useCallback } from 'react';
import { Book, HelpCircle } from 'lucide-react';
import TemplateSelector from './TemplateSelector';

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export default function MarkdownEditor({ value, onChange }: MarkdownEditorProps) {
  const [showHelp, setShowHelp] = useState(false);
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [selectorPosition, setSelectorPosition] = useState({ x: 0, y: 0 });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const cursorPositionRef = useRef<number>(0);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      // 监听 '/' 键
      if (e.key === '/' && !e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const cursorPos = textarea.selectionStart;
        const beforeCursor = value.substring(0, cursorPos);

        // 检查是否在行首或前一个字符是空格/换行
        const isAtLineStart =
          cursorPos === 0 || beforeCursor.endsWith('\n') || beforeCursor.endsWith(' ');

        if (isAtLineStart) {
          e.preventDefault();

          // 保存光标位置
          cursorPositionRef.current = cursorPos;

          // 计算浮窗位置
          const rect = textarea.getBoundingClientRect();
          const lineHeight = 24; // 估算行高
          const lines = beforeCursor.split('\n').length;

          setSelectorPosition({
            x: rect.left + 100,
            y: rect.top + lines * lineHeight + 30,
          });

          setShowTemplateSelector(true);
        }
      }
    },
    [value]
  );

  const handleTemplateSelect = useCallback(
    (template: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const cursorPos = cursorPositionRef.current;
      const before = value.substring(0, cursorPos);
      const after = value.substring(cursorPos);

      // 插入模板
      const newValue = before + template + after;
      onChange(newValue);

      // 恢复焦点并移动光标到模板末尾
      setTimeout(() => {
        textarea.focus();
        const newCursorPos = cursorPos + template.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, onChange]
  );

  return (
    <div className="flex h-full flex-col">
      {/* 工具提示 */}
      {!value && (
        <div className="border-b bg-blue-50 p-4">
          <div className="flex items-start gap-3">
            <Book className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900">开始编写 AI Agent 文档</h4>
              <p className="mt-1 text-sm text-blue-700">
                使用自然语言和 Markdown 格式描述你的 Agent。AI 会自动解析并生成对应的配置。
              </p>
              <button
                onClick={() => setShowHelp(!showHelp)}
                className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
              >
                <HelpCircle className="h-4 w-4" />
                查看编写指南
              </button>
            </div>
          </div>

          {showHelp && (
            <div className="mt-3 space-y-2 rounded-md bg-white p-3 text-sm">
              <p className="font-medium">文档结构建议：</p>
              <ul className="ml-4 list-disc space-y-1 text-blue-700">
                <li>
                  <code># Agent 名称</code> - 使用一级标题定义 Agent 名称
                </li>
                <li>首段描述 Agent 的性格和能力</li>
                <li>
                  <code>## 术语定义</code> - 定义领域专业术语
                </li>
                <li>
                  <code>## 工具：XXX</code> - 定义可调用的工具函数
                </li>
                <li>
                  <code>## 旅程：XXX</code> - 定义对话流程和场景
                </li>
                <li>
                  <code>## 指导原则</code> - 定义行为准则
                </li>
              </ul>
              <p className="mt-2">
                <a href="/examples/healthcare-agent.md" className="text-blue-600 hover:underline">
                  查看完整示例 →
                </a>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Markdown 编辑区 */}
      <div className="flex-1 p-6">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="# 我的 AI Agent

一个友好、专业的助手...

按 '/' 键快速插入模块模板

## 术语定义

- **专业术语**: 术语的详细解释
- **另一个术语 (同义词1, 同义词2)**: 说明...

## 工具：获取信息

这个工具用于获取特定信息。

参数：
- param1: 参数说明
- param2: 参数说明

返回：返回值类型

## 旅程：完成任务

帮助用户完成特定任务。

触发条件：
- 用户想要做某事
- 用户说了某句话

流程描述：
1. 第一步...
2. 第二步...

## 指导原则

- 当用户问 A → 回答 B
- 当用户问 C → 做 D"
          className="h-full w-full resize-none font-mono text-sm leading-relaxed outline-none"
          spellCheck={false}
        />
      </div>

      {/* 模板选择浮窗 */}
      <TemplateSelector
        isOpen={showTemplateSelector}
        position={selectorPosition}
        onClose={() => setShowTemplateSelector(false)}
        onSelect={handleTemplateSelect}
      />
    </div>
  );
}
