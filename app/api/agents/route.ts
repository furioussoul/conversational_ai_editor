import { createAgent, getAgents } from '@/lib/data/agent-store';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const agents = await getAgents();
    return NextResponse.json(agents);
  } catch (error) {
    console.error('Failed to load agents', error);
    return NextResponse.json(
      { message: '无法加载 Agent 列表' },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    if (!payload?.name || typeof payload.name !== 'string') {
      return NextResponse.json(
        { message: '创建 Agent 需要提供名称' },
        { status: 400 },
      );
    }

    const agent = await createAgent({
      name: payload.name,
      description:
        typeof payload.description === 'string'
          ? payload.description
          : undefined,
      constraints:
        typeof payload.constraints === 'string'
          ? payload.constraints
          : undefined,
    });

    return NextResponse.json(agent, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent', error);
    return NextResponse.json({ message: '创建 Agent 失败' }, { status: 500 });
  }
}
