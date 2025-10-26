import { NextResponse } from 'next/server';

const LLM_ENDPOINT = process.env.OPENAI_BASE_URL;
const MODEL_NAME = process.env.OPENAI_MODEL ?? 'gpt-4o';
const TEMPERATURE = (() => {
  const raw = Number(process.env.OPENAI_TEMPERATURE);
  if (Number.isFinite(raw)) {
    return raw;
  }
  return 0.2;
})();

type ConversationMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type QueueItem = {
  id: string;
  agentId: string;
  systemPrompt: string;
  messages: ConversationMessage[];
  endpoint: string;
  apiKey: string;
  model: string;
  temperature: number;
  writer: WritableStreamDefaultWriter<Uint8Array>;
  encoder: TextEncoder;
  closed: boolean;
};

type QueueState = {
  processing: boolean;
  queue: QueueItem[];
};

type SSEFrame = {
  event: string;
  data: string;
};

const globalWithQueue = globalThis as typeof globalThis & {
  __agentDebugQueues?: Map<string, QueueState>;
};

if (!globalWithQueue.__agentDebugQueues) {
  globalWithQueue.__agentDebugQueues = new Map<string, QueueState>();
}

const agentQueues = globalWithQueue.__agentDebugQueues;

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: { id: string };
  },
) {
  const endpoint = LLM_ENDPOINT;
  if (!endpoint) {
    return NextResponse.json(
      { message: '缺少 OPENAI_BASE_URL 环境变量。' },
      { status: 500 },
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { message: '缺少 OPENAI_API_KEY 环境变量。' },
      { status: 500 },
    );
  }

  let parsedBody: unknown;
  try {
    parsedBody = await request.json();
  } catch (error) {
    const message = error instanceof Error ? error.message : '无法解析请求体。';
    return NextResponse.json(
      { message: '请求体格式错误。', detail: message },
      { status: 400 },
    );
  }

  const body = parsedBody as {
    context?: string;
    messages?: ConversationMessage[];
  };

  if (!Array.isArray(body?.messages) || body.messages.length === 0) {
    return NextResponse.json({ message: '缺少消息数组。' }, { status: 400 });
  }

  const sanitizedMessages = body.messages
    .filter(
      (message): message is ConversationMessage =>
        Boolean(message) &&
        (message.role === 'user' || message.role === 'assistant') &&
        typeof message.content === 'string',
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));

  if (sanitizedMessages.length === 0) {
    return NextResponse.json({ message: '消息格式无效。' }, { status: 400 });
  }

  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  const queueItem: QueueItem = {
    id: generateId(),
    agentId: params.id,
    systemPrompt: buildSystemPrompt(params.id, body.context ?? ''),
    messages: sanitizedMessages,
    endpoint,
    apiKey,
    model: MODEL_NAME,
    temperature: TEMPERATURE,
    writer,
    encoder,
    closed: false,
  };

  enqueue(queueItem);

  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
  });

  return new Response(readable, { headers });
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

function enqueue(item: QueueItem) {
  const state = getQueueState(item.agentId);
  state.queue.push(item);

  const ahead = state.processing
    ? state.queue.length
    : Math.max(0, state.queue.length - 1);

  void sendSSE(item, 'queued', { ahead }).catch(() => undefined);
  void processQueue(item.agentId);
}

function getQueueState(agentId: string): QueueState {
  const state = agentQueues.get(agentId);
  if (state) {
    return state;
  }
  const initial: QueueState = {
    processing: false,
    queue: [],
  };
  agentQueues.set(agentId, initial);
  return initial;
}

async function processQueue(agentId: string): Promise<void> {
  const state = getQueueState(agentId);
  if (state.processing) {
    return;
  }

  const next = state.queue.shift();
  if (!next) {
    return;
  }

  state.processing = true;
  try {
    await handleQueueItem(next);
  } finally {
    state.processing = false;
    if (state.queue.length > 0) {
      void processQueue(agentId);
    }
  }
}

async function handleQueueItem(item: QueueItem): Promise<void> {
  try {
    await sendSSE(item, 'status', { state: 'processing' });

    const response = await fetch(item.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${item.apiKey}`,
      },
      body: JSON.stringify({
        model: item.model,
        temperature: item.temperature,
        stream: true,
        messages: [
          { role: 'system', content: item.systemPrompt },
          ...item.messages,
        ],
      }),
    });

    if (!response.ok || !response.body) {
      const detail = await safeReadText(response);
      await sendSSE(item, 'error', {
        message: detail ? `调用 LLM 失败：${detail}` : '调用 LLM 失败。',
      });
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let aggregated = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const parsed = splitSSEFrames(buffer);
      buffer = parsed.buffer;

      for (const frame of parsed.frames) {
        if (!frame.data) {
          continue;
        }

        if (frame.data === '[DONE]') {
          await sendSSE(item, 'done', { content: aggregated });
          await reader.cancel().catch(() => undefined);
          return;
        }

        const chunk = parseOpenAIChunk(frame.data);
        if (!chunk) {
          continue;
        }

        aggregated += chunk;
        await sendSSE(item, 'chunk', { content: chunk });

        if (item.closed) {
          await reader.cancel().catch(() => undefined);
          return;
        }
      }
    }

    await sendSSE(item, 'done', { content: aggregated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : '处理 LLM 流失败。';
    await sendSSE(item, 'error', { message });
  } finally {
    item.closed = true;
    try {
      await item.writer.close();
    } catch (closeError) {
      if (closeError instanceof Error) {
        console.error(closeError);
      }
    }
  }
}

function splitSSEFrames(buffer: string): {
  frames: SSEFrame[];
  buffer: string;
} {
  const frames: SSEFrame[] = [];
  let working = buffer;

  while (true) {
    const separatorIndex = working.indexOf('\n\n');
    if (separatorIndex === -1) {
      break;
    }

    const rawEvent = working.slice(0, separatorIndex);
    working = working.slice(separatorIndex + 2);

    if (!rawEvent.trim()) {
      continue;
    }

    const lines = rawEvent.split('\n');
    let event = 'message';
    const dataLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith(':')) {
        continue;
      }
      if (line.startsWith('event:')) {
        event = line.slice(6).trim();
        continue;
      }
      if (line.startsWith('data:')) {
        dataLines.push(line.slice(5).trimStart());
      }
    }

    frames.push({ event, data: dataLines.join('\n') });
  }

  return { frames, buffer: working };
}

function parseOpenAIChunk(data: string): string | null {
  if (!data) return null;

  try {
    const parsed = JSON.parse(data) as {
      choices?: Array<{
        delta?: {
          content?: string | unknown;
        };
        message?: {
          content?: string | unknown;
        };
      }>;
    };

    const choice = parsed.choices?.[0];
    if (!choice) return null;

    const delta = choice.delta;
    if (delta && delta.content !== undefined) {
      const text = normalizeContent(delta.content);
      if (text) {
        return text;
      }
    }

    if (choice.message && choice.message.content !== undefined) {
      const text = normalizeContent(choice.message.content);
      if (text) {
        return text;
      }
    }
  } catch {
    // 如果不是 JSON（有些服务会直接返回文本块），直接返回原始内容
    return data;
  }

  return null;
}

function normalizeContent(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part) return '';
        if (typeof part === 'string') {
          return part;
        }
        if (typeof part === 'object') {
          const fragment = part as { text?: unknown; content?: unknown };
          if (typeof fragment.text === 'string') {
            return fragment.text;
          }
          if (typeof fragment.content === 'string') {
            return fragment.content;
          }
        }
        return '';
      })
      .join('');
  }

  return '';
}

async function sendSSE(item: QueueItem, event: string, data: unknown) {
  if (item.closed) {
    return;
  }

  try {
    const payloadLines = [
      event ? `event: ${event}` : null,
      `data: ${typeof data === 'string' ? data : JSON.stringify(data)}`,
    ].filter((line): line is string => Boolean(line));

    const payload = `${payloadLines.join('\n')}\n\n`;

    await item.writer.write(item.encoder.encode(payload));
  } catch (error) {
    if (error instanceof Error) {
      console.error(error);
    }
    item.closed = true;
    try {
      await item.writer.close();
    } catch (closeError) {
      if (closeError instanceof Error) {
        console.error(closeError);
      }
    }
  }
}

function generateId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

async function safeReadText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch (error) {
    return error instanceof Error ? error.message : '无法读取响应。';
  }
}
