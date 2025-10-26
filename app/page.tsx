'use client';

import { Edit3, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import type { Agent } from '@/lib/data/types';

const DEFAULT_AGENT_NAME = '未命名 Agent';

export default function AgentListPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingDeletion, setPendingDeletion] = useState<Agent | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const dateFormatter = useMemo(() => {
    return new Intl.DateTimeFormat('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }, []);

  const formatDate = useCallback(
    (value?: string) => (value ? dateFormatter.format(new Date(value)) : '—'),
    [dateFormatter],
  );

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/agents');
      if (!response.ok) {
        throw new Error(`请求失败，状态码 ${response.status}`);
      }
      const data = (await response.json()) as Agent[];
      setAgents(data);
    } catch (err) {
      console.error(err);
      setError('加载 Agent 列表失败，请稍后重试。');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAgents();
  }, [fetchAgents]);

  const handleEdit = useCallback(
    (id: string) => {
      router.push(`/agent/${id}`);
    },
    [router],
  );

  const handleCreateAgent = useCallback(async () => {
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: `${DEFAULT_AGENT_NAME} ${agents.length + 1}`,
        }),
      });
      if (!response.ok) {
        throw new Error('创建 Agent 失败');
      }
      const created = (await response.json()) as Agent;
      setAgents((prev: Agent[]) => [...prev, created]);
      router.push(`/agent/${created.id}`);
    } catch (err) {
      console.error(err);
      setError('创建 Agent 失败，请稍后再试。');
    }
  }, [agents.length, router]);

  const handleConfirmDelete = useCallback(async () => {
    if (!pendingDeletion) return;
    setIsDeleting(true);
    try {
      const response = await fetch(`/api/agents/${pendingDeletion.id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('删除 Agent 失败');
      }
      setAgents((prev: Agent[]) =>
        prev.filter((agentItem: Agent) => agentItem.id !== pendingDeletion.id),
      );
      setPendingDeletion(null);
    } catch (err) {
      console.error(err);
      setError('删除 Agent 失败，请稍后再试。');
    } finally {
      setIsDeleting(false);
    }
  }, [pendingDeletion]);

  return (
    <div className="relative flex min-h-screen flex-col bg-slate-950">
      <div className="absolute right-6 top-6 z-10 flex items-center gap-3">
        <Button onClick={handleCreateAgent} size="sm">
          创建新 Agent
        </Button>
        <Button
          variant="outline"
          onClick={fetchAgents}
          size="sm"
          disabled={loading}
        >
          刷新
        </Button>
      </div>

      <main className="flex-1 overflow-auto p-8 mt-20">
        <div className="mx-auto w-full max-w-6xl">
          {loading ? (
            <div className="flex h-64 items-center justify-center text-sm text-slate-400">
              正在加载 Agent 列表…
            </div>
          ) : error ? (
            <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-lg border border-slate-800 bg-slate-900/40 p-8 text-center">
              <p className="text-sm text-slate-300">{error}</p>
              <Button size="sm" onClick={fetchAgents}>
                重试
              </Button>
            </div>
          ) : agents.length === 0 ? (
            <div className="flex h-64 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-800 bg-slate-900/40 p-8 text-center">
              <p className="text-base text-slate-200">还没有任何 Agent</p>
              <p className="text-sm text-slate-400">
                点击右上角的“创建新 Agent”开始构建。
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-slate-800 bg-slate-900/40 shadow-lg">
              <table className="min-w-full divide-y divide-slate-800">
                <thead className="bg-slate-900/60">
                  <tr className="text-left text-xs font-medium uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3">Agent</th>
                    <th className="px-6 py-3">描述</th>
                    <th className="px-6 py-3">最近更新</th>
                    <th className="px-6 py-3">创建时间</th>
                    <th className="px-6 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-sm text-slate-200">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-900/70">
                      <td className="px-6 py-4 font-medium text-slate-100">
                        {agent.name || DEFAULT_AGENT_NAME}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {agent.description?.trim() || '—'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {formatDate(agent.updatedAt)}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {formatDate(agent.createdAt)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="编辑 Agent"
                            onClick={() => handleEdit(agent.id)}
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label="删除 Agent"
                            onClick={() => setPendingDeletion(agent)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      <AlertDialog
        open={Boolean(pendingDeletion)}
        onOpenChange={(open: boolean) => !open && setPendingDeletion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              确认后将永久删除 Agent“{pendingDeletion?.name ?? ''}
              ”，该操作不可撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? '删除中…' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
