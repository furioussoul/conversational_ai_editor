'use client';

import type { JSONContent } from '@tiptap/core';
import HardBreak from '@tiptap/extension-hard-break';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { useEffect, useMemo, useRef } from 'react';

import type { JourneyLogicDoc } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import {
  VariableSlashCommand,
  type VariableCommandItem,
} from './variable-slash-command';

type JourneyLogicEditorProps = {
  value: JourneyLogicDoc;
  onChange: (doc: JourneyLogicDoc) => void;
  className?: string;
  variables?: VariableCommandItem[];
};

const EMPTY_DOC: JourneyLogicDoc = createPlainTextDoc('');

const BUILT_IN_VARIABLES: VariableCommandItem[] = [
  {
    id: 'user.name',
    label: '用户姓名',
    insert: '{{user.name}}',
    description: '当前用户的姓名。',
  },
  {
    id: 'user.phone',
    label: '用户手机号',
    insert: '{{user.phone}}',
    description: '来自 CRM 的手机号。',
  },
  {
    id: 'tool.cancel_order',
    label: '取消订单',
    insert: '{{tool.cancel_order}}',
    description: '取消订单工具',
  },
  {
    id: 'tool.end',
    label: '结束会话',
    insert: '{{tool.end}}',
    description: '结束会话',
  },
];

const toJsonContent = (doc: JourneyLogicDoc): JSONContent => doc as JSONContent;

export function JourneyLogicEditor({
  value,
  onChange,
  className,
  variables,
}: JourneyLogicEditorProps) {
  const serializedRef = useRef<string>('');
  const onChangeRef = useRef(onChange);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const mergedVariables = useMemo(() => {
    const merged = new Map<string, VariableCommandItem>();
    BUILT_IN_VARIABLES.forEach((item) => merged.set(item.id, item));
    (variables ?? []).forEach((item) => merged.set(item.id, item));
    return Array.from(merged.values());
  }, [variables]);

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          blockquote: false,
          bold: false,
          bulletList: false,
          code: false,
          codeBlock: false,
          gapcursor: false,
          hardBreak: false,
          heading: false,
          horizontalRule: false,
          italic: false,
          listItem: false,
          orderedList: false,
          strike: false,
        }),
        HardBreak.extend({
          addKeyboardShortcuts() {
            return {
              Enter: () => this.editor.commands.setHardBreak(),
            };
          },
        }),
        Placeholder.configure({
          placeholder: '用纯文本描述流程逻辑，输入 / 插入变量…',
        }),
        VariableSlashCommand.configure({
          items: mergedVariables,
        }),
      ],
      content: toJsonContent(normalizePlainTextDoc(value)),
      editorProps: {
        attributes: {
          class:
            'min-h-[280px] w-full rounded-md bg-background text-sm leading-6 focus:outline-none font-mono whitespace-pre-wrap',
        },
        handlePaste: (view, event) => {
          const text = event.clipboardData?.getData('text/plain');
          if (typeof text !== 'string') {
            return false;
          }
          event.preventDefault();
          const transaction = view.state.tr.insertText(text);
          view.dispatch(transaction);
          return true;
        },
      },
      onUpdate: ({ editor: instance }) => {
        const json = instance.getJSON() as JourneyLogicDoc;
        const serialized = JSON.stringify(json);
        if (serialized === serializedRef.current) {
          return;
        }
        serializedRef.current = serialized;
        onChangeRef.current?.(json);
      },
    },
    [mergedVariables],
  );

  useEffect(() => {
    if (!editor) return;
    const nextDoc = normalizePlainTextDoc(value);
    const serialized = JSON.stringify(nextDoc);
    if (serialized === serializedRef.current) {
      return;
    }
    serializedRef.current = serialized;
    editor.commands.setContent(toJsonContent(nextDoc), false);
  }, [editor, value]);

  return (
    <div
      className={cn(
        'journey-logic-editor rounded-md border border-border bg-card p-3 shadow-sm',
        className,
      )}
    >
      <EditorContent editor={editor} />
    </div>
  );
}

function normalizePlainTextDoc(doc?: JourneyLogicDoc): JourneyLogicDoc {
  const text = docToPlainText(doc ?? EMPTY_DOC).replace(/\u0000/g, '');
  return createPlainTextDoc(text);
}

function docToPlainText(node: unknown): string {
  if (!node) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) {
    return node
      .map((child) => docToPlainText(child))
      .filter(Boolean)
      .join('\n');
  }
  if (typeof node === 'object') {
    const record = node as Record<string, unknown> & { type?: string };
    if (record.type === 'hardBreak') {
      return '\n';
    }
    if (typeof record.text === 'string') {
      return record.text;
    }
    if (Array.isArray(record.content)) {
      const childTexts = record.content
        .map((child) => docToPlainText(child))
        .filter((value) => value !== '');

      if (record.type === 'orderedList' || record.type === 'bulletList') {
        return childTexts.join('\n');
      }

      if (record.type === 'paragraph' || record.type === 'heading') {
        return childTexts.join('');
      }

      if (record.type === 'listItem') {
        return childTexts.join('');
      }

      return childTexts.join(' ');
    }
  }
  return '';
}

function createPlainTextDoc(text: string): JourneyLogicDoc {
  const normalized = text.replace(/\r\n?/g, '\n');
  const lines = normalized.split('\n');

  const paragraphContent = lines.flatMap((line, index) => {
    const segments: Array<{ type: 'text' | 'hardBreak'; text?: string }> = [];
    if (line.length) {
      segments.push({ type: 'text', text: line });
    }
    if (index < lines.length - 1) {
      segments.push({ type: 'hardBreak' });
    }
    return segments;
  });

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: paragraphContent.length
          ? paragraphContent
          : [{ type: 'text', text: '' }],
      },
    ],
  } satisfies JourneyLogicDoc;
}
