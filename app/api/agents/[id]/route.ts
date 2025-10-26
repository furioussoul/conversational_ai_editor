import { deleteAgent, getAgent, updateAgent } from '@/lib/data/agent-store';
import { agentUpdateSchema } from '@/lib/validation/agent';
import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  context: { params: { id: string } },
) {
  try {
    const agent = await getAgent(context.params.id);
    if (!agent) {
      return NextResponse.json({ message: 'Agent 不存在' }, { status: 404 });
    }
    return NextResponse.json(agent);
  } catch (error) {
    console.error('Failed to load agent', error);
    return NextResponse.json({ message: '加载 Agent 失败' }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: { id: string } },
) {
  const { id } = context.params;
  try {
    const payload = await request.json();
    const parseResult = agentUpdateSchema.safeParse(payload);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          message: '请求数据格式不正确',
          issues: parseResult.error.flatten(),
        },
        { status: 400 },
      );
    }
    const updated = await updateAgent(id, parseResult.data);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to update agent', error);
    return NextResponse.json({ message: '更新 Agent 失败' }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
) {
  try {
    await deleteAgent(context.params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Failed to delete agent', error);
    return NextResponse.json({ message: '删除 Agent 失败' }, { status: 500 });
  }
}
