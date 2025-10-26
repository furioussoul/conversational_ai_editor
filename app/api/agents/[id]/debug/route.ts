import { NextResponse } from 'next/server';

const LLM_ENDPOINT = process.env.OPENAI_BASE_URL;

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: { id: string };
  },
) {
  try {
    const body = (await request.json()) as {
      context?: string;
      messages?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!body?.messages || !Array.isArray(body.messages)) {
      return NextResponse.json({ message: '缺少消息数组。' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { message: '缺少 OPENAI_API_KEY 环境变量。' },
        { status: 500 },
      );
    }

    const systemContent = buildSystemPrompt(params.id, body.context ?? '');

    const response = await fetch(LLM_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        temperature: 0.2,
        messages: [
          { role: 'system', content: systemContent },
          ...body.messages,
        ],
      }),
    });

    if (!response.ok) {
      const detail = await safeReadText(response);
      return NextResponse.json(
        {
          message: '调用 LLM 失败。',
          detail,
        },
        { status: response.status },
      );
    }

    const payload: unknown = await response.json();
    const message = extractFirstMessage(payload);

    if (!message) {
      return NextResponse.json(
        { message: '模型未返回内容。' },
        { status: 502 },
      );
    }

    return NextResponse.json({ message });
  } catch (error) {
    const message = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      {
        message: '处理请求失败。',
        detail: message,
      },
      { status: 500 },
    );
  }
}

function buildSystemPrompt(agentId: string, context: string) {
  const header = `你是 AI 助理平台中的“Agent 调试助手”，帮助用户基于提供的上下文排查问题。Agent ID: ${agentId}`;
  const guardrails = [
    '务必参考上下文中的数据进行推理，不要臆造缺失信息。',
    '回答需要包含明确的推理过程与建议步骤。',
    '如果上下文不足以回答，提醒用户补充信息而不是虚构。',
  ];
  return `${header}\n\n调试上下文:\n${context}\n\n守则:\n${guardrails
    .map((rule, index) => `${index + 1}. ${rule}`)
    .join('\n')}`;
}

function extractFirstMessage(payload: unknown): string | null {
  if (
    payload &&
    typeof payload === 'object' &&
    'choices' in payload &&
    Array.isArray((payload as { choices: unknown[] }).choices)
  ) {
    const [firstChoice] = (payload as { choices: unknown[] }).choices;
    if (
      firstChoice &&
      typeof firstChoice === 'object' &&
      'message' in firstChoice &&
      (firstChoice as { message?: unknown }).message &&
      typeof (firstChoice as { message: { content?: unknown } }).message ===
        'object'
    ) {
      const content = (
        (firstChoice as { message: { content?: unknown } }).message || {}
      ).content;
      if (typeof content === 'string') {
        return content;
      }
    }
  }

  if (payload && typeof payload === 'object' && 'message' in payload) {
    const content = (payload as { message?: unknown }).message;
    if (typeof content === 'string') {
      return content;
    }
  }

  return null;
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    return error instanceof Error ? error.message : '无法读取响应。';
  }
}
