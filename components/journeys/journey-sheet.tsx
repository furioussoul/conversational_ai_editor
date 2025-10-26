'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import type { Journey, JourneyLogicDoc, Tool } from '@/lib/data/types';
import { JourneyLogicEditor } from './journey-logic-editor';

type JourneySheetProps = {
  open: boolean;
  journey: Journey | null;
  onOpenChange: (open: boolean) => void;
  onJourneyChange: (journey: Journey) => void;
  availableTools: Tool[];
};

export function JourneySheet({
  open,
  journey,
  onOpenChange,
  onJourneyChange,
  availableTools,
}: JourneySheetProps) {
  const handleLogicChange = (doc: JourneyLogicDoc) => {
    if (!journey) return;
    onJourneyChange({ ...journey, logic: doc });
  };

  const handleJourneyFieldUpdate = (patch: Partial<Journey>) => {
    if (!journey) return;
    onJourneyChange({ ...journey, ...patch });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex h-full flex-col gap-6 overflow-y-auto">
        {!journey ? (
          <div className="text-sm text-muted-foreground">
            请选择或创建一个 流程 进行编辑。
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{journey.title || '未命名 流程'}</SheetTitle>
              <SheetDescription>
                使用纯文本描述对话流程，支持 Slash Command 快速插入变量。
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-4">
              <div className="grid gap-2">
                <Label htmlFor="journey-title">流程 标题</Label>
                <Input
                  id="journey-title"
                  value={journey.title}
                  onChange={(event) =>
                    handleJourneyFieldUpdate({ title: event.target.value })
                  }
                  placeholder="例如：Schedule an Appointment"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="journey-description">描述</Label>
                <Textarea
                  id="journey-description"
                  value={journey.description ?? ''}
                  onChange={(event) =>
                    handleJourneyFieldUpdate({
                      description: event.target.value,
                    })
                  }
                  placeholder="描述此 流程 的业务目标…"
                />
              </div>

              <Separator />

              <div className="flex flex-col gap-3">
                <Label htmlFor="journey-logic">业务流程</Label>
                <div className="grid gap-2">
                  <JourneyLogicEditor
                    value={journey.logic}
                    onChange={handleLogicChange}
                  />
                  <p className="text-xs text-muted-foreground">
                    输入 <span className="font-mono text-[11px]">/</span>{' '}
                    呼出内置变量和工具。
                  </p>
                </div>
              </div>
            </div>

            <SheetFooter className="text-xs text-muted-foreground">
              所有更改会自动保存到当前 Agent
              的草稿中，点击页面顶部的“保存”按钮提交。
            </SheetFooter>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
