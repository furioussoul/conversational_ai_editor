'use client';

import { cn } from '@/lib/utils';
import { Extension, type Editor, type Range } from '@tiptap/core';
import { ReactRenderer } from '@tiptap/react';
import Suggestion, {
  type SuggestionKeyDownProps,
  type SuggestionProps,
} from '@tiptap/suggestion';
import { forwardRef, useEffect, useImperativeHandle } from 'react';

type VariableCommandListHandle = {
  onKeyDown: (event: KeyboardEvent) => boolean;
};

type VariableCommandListProps = SuggestionProps<
  VariableCommandItem,
  VariableCommandItem
> & {
  selectedIndex?: number;
  setSelectedIndex?: (index: number) => void;
};

const VariableCommandList = forwardRef<
  VariableCommandListHandle,
  VariableCommandListProps
>(({ items, command, selectedIndex = 0, setSelectedIndex }, ref) => {
  useEffect(() => {
    if (!items.length) {
      setSelectedIndex?.(0);
    } else if (selectedIndex >= items.length) {
      setSelectedIndex?.(items.length - 1);
    }
  }, [items, selectedIndex, setSelectedIndex]);

  useImperativeHandle(ref, () => ({
    onKeyDown: (event: KeyboardEvent) => {
      if (!items.length) {
        return false;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        const nextIndex = (selectedIndex + 1) % items.length;
        setSelectedIndex?.(nextIndex);
        return true;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        const nextIndex = (selectedIndex + items.length - 1) % items.length;
        setSelectedIndex?.(nextIndex);
        return true;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        command(items[selectedIndex]);
        return true;
      }

      return false;
    },
  }));

  if (!items.length) {
    return (
      <div className="px-3 py-2 text-xs text-muted-foreground">
        没有匹配的变量
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1 p-1">
      {items.map((item: VariableCommandItem, index: number) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'flex w-full flex-col items-start gap-1 rounded-md px-3 py-2 text-left text-xs transition-colors',
            index === selectedIndex
              ? 'bg-primary/10 text-primary'
              : 'text-foreground hover:bg-muted',
          )}
          onMouseEnter={() => setSelectedIndex?.(index)}
          onMouseDown={(event) => {
            event.preventDefault();
            command(item);
          }}
        >
          <span className="font-medium">{item.label}</span>
          <span className="font-mono text-[11px] text-muted-foreground">
            {item.insert}
          </span>
          {item.description && (
            <span className="text-[11px] text-muted-foreground">
              {item.description}
            </span>
          )}
        </button>
      ))}
    </div>
  );
});

VariableCommandList.displayName = 'VariableCommandList';

export type VariableCommandItem = {
  id: string;
  label: string;
  insert: string;
  description?: string;
};

type ExtensionOptions = {
  items: VariableCommandItem[];
};

export const VariableSlashCommand = Extension.create<ExtensionOptions>({
  name: 'variableSlashCommand',

  addOptions() {
    return {
      items: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion<VariableCommandItem, VariableCommandItem>({
        editor: this.editor,
        char: '/',
        allowSpaces: true,
        allowedPrefixes: null,
        startOfLine: false,
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const parent = $from.parent;

          if (parent.type.name === 'codeBlock') {
            return false;
          }

          const textBefore = parent.textBetween(0, $from.parentOffset);
          if (textBefore.endsWith('{{')) {
            return false;
          }

          return true;
        },
        command: ({
          editor,
          range,
          props,
        }: {
          editor: Editor;
          range: Range;
          props: VariableCommandItem;
        }) => {
          editor
            .chain()
            .focus()
            .deleteRange(range)
            .insertContent(props.insert)
            .run();
        },
        items: ({ query }: { query: string }) => {
          const normalized = query.trim().toLowerCase();
          const source = this.options.items;
          if (!normalized) {
            return source.slice(0, 8);
          }
          return source
            .filter((item) => {
              const haystack =
                `${item.label} ${item.insert} ${item.id}`.toLowerCase();
              return haystack.includes(normalized);
            })
            .slice(0, 8);
        },
        render: () => {
          let component: ReactRenderer<
            VariableCommandListHandle,
            VariableCommandListProps
          > | null = null;
          let container: HTMLDivElement | null = null;

          const updatePosition = (
            props: SuggestionProps<VariableCommandItem, VariableCommandItem>,
          ) => {
            const rect = props.clientRect?.();
            if (!container || !rect) return;
            container.style.left = `${rect.left + window.scrollX}px`;
            container.style.top = `${rect.bottom + window.scrollY + 6}px`;
          };

          return {
            onStart: (
              props: SuggestionProps<VariableCommandItem, VariableCommandItem>,
            ) => {
              component = new ReactRenderer(VariableCommandList, {
                editor: props.editor,
                props,
              });

              container = document.createElement('div');
              container.className =
                'z-[9999] w-72 rounded-md border border-border bg-popover shadow-lg';
              container.style.position = 'absolute';
              container.style.left = '0px';
              container.style.top = '0px';
              container.style.pointerEvents = 'auto';

              container.appendChild(component.element);
              document.body.appendChild(container);

              updatePosition(props);
            },
            onUpdate: (
              props: SuggestionProps<VariableCommandItem, VariableCommandItem>,
            ) => {
              component?.updateProps(props);
              updatePosition(props);
            },
            onKeyDown: (props: SuggestionKeyDownProps) => {
              if (props.event.key === 'Escape') {
                props.event.preventDefault();
                return true;
              }
              return component?.ref?.onKeyDown?.(props.event) ?? false;
            },
            onExit: () => {
              component?.destroy();
              component = null;
              if (container) {
                container.remove();
                container = null;
              }
            },
          };
        },
      }),
    ];
  },
});
