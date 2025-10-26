import { randomUUID } from 'crypto';
import { getDb } from './db';
import type {
  Agent,
  AgentCreatePayload,
  AgentUpdatePayload,
  Journey,
  JourneyEdge,
  JourneyLogicDoc,
  JourneyNode,
} from './types';

type AgentRow = {
  id: string;
  name: string;
  description: string | null;
  constraints: string | null;
  systemPromptJson: string | null;
  createdAt: string;
  updatedAt: string;
};

type JourneyRow = {
  id: string;
  agentId: string;
  title: string;
  description: string | null;
  triggerConditions: string;
  logic: string | null;
};

let initialized = false;

function serializeJson(value: unknown): string | null {
  if (value === undefined) return null;
  return JSON.stringify(value);
}

function deserializeJson<T>(value: string | null): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch (error) {
    console.warn('Failed to parse JSON column', error);
    return undefined;
  }
}

function ensureSeedData() {
  if (initialized) {
    return;
  }

  const db = getDb();
  const countRow = db.prepare('SELECT COUNT(1) AS count FROM agents').get() as {
    count: number;
  };
  if (countRow.count === 0) {
    const now = new Date().toISOString();
    const agentId = randomUUID();

    const defaultAgent: Agent = {
      id: agentId,
      name: 'Virtual Clinic Assistant',
      description: '帮助患者预约、查询化验结果以及解答常见问题的智能助手。',
      createdAt: now,
      updatedAt: now,
      systemPromptJson: {
        type: 'doc',
        content: [
          {
            type: 'heading',
            attrs: { level: 2 },
            content: [{ type: 'text', text: 'Agent 概述' }],
          },
          {
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: '欢迎使用 Virtual Clinic Assistant，我可以帮助患者预约门诊、查询化验结果，并回答常见问题。',
              },
            ],
          },
        ],
      },
      tools: [
        {
          id: randomUUID(),
          agentId,
          name: 'get_upcoming_slots',
          description: '获取未来 7 天内可预约的时间段。',
        },
        {
          id: randomUUID(),
          agentId,
          name: 'schedule_appointment',
          description: '根据患者选择的时间安排预约。',
          parameters: {
            type: 'object',
            properties: {
              patientId: { type: 'string' },
              slotId: { type: 'string' },
            },
            required: ['patientId', 'slotId'],
          },
        },
      ],
      glossary: [
        {
          id: randomUUID(),
          agentId,
          name: 'Office Hours',
          description: '诊所的办公时间，通常为周一至周五 9:00-18:00。',
          synonyms: ['办公时间', '营业时间'],
        },
      ],
      guidelines: [
        {
          id: randomUUID(),
          agentId,
          condition: 'The patient asks to talk to a human agent',
          action:
            '告知患者可以拨打诊所电话 400-123-456 获取人工服务，并在需要时提供邮件支持。',
          toolIds: [],
        },
      ],
      journeys: [createSampleJourney(agentId)],
    };

    insertAgentGraph(defaultAgent);
  }

  initialized = true;
}

function insertAgentGraph(agent: Agent) {
  const db = getDb();
  const insertAgent = db.prepare(
    `INSERT INTO agents (id, name, description, systemPromptJson, createdAt, updatedAt)
     VALUES (@id, @name, @description, @systemPromptJson, @createdAt, @updatedAt)`,
  );

  insertAgent.run({
    id: agent.id,
    name: agent.name,
    description: agent.description ?? null,
    systemPromptJson: serializeJson(agent.systemPromptJson),
    createdAt: agent.createdAt,
    updatedAt: agent.updatedAt,
  });

  const insertTool = db.prepare(
    `INSERT INTO tools (id, agentId, name, description, parameters)
     VALUES (@id, @agentId, @name, @description, @parameters)`,
  );
  agent.tools.forEach((tool) => {
    insertTool.run({
      id: tool.id,
      agentId: agent.id,
      name: tool.name,
      description: tool.description ?? null,
      parameters: serializeJson(tool.parameters),
    });
  });

  const insertTerm = db.prepare(
    `INSERT INTO glossary_terms (id, agentId, name, description, synonyms)
     VALUES (@id, @agentId, @name, @description, @synonyms)`,
  );
  agent.glossary.forEach((term) => {
    insertTerm.run({
      id: term.id,
      agentId: agent.id,
      name: term.name,
      description: term.description,
      synonyms: serializeJson(term.synonyms) ?? '[]',
    });
  });

  const insertGuideline = db.prepare(
    `INSERT INTO guidelines (id, agentId, condition, action, toolIds)
     VALUES (@id, @agentId, @condition, @action, @toolIds)`,
  );
  agent.guidelines.forEach((guideline) => {
    insertGuideline.run({
      id: guideline.id,
      agentId: agent.id,
      condition: guideline.condition,
      action: guideline.action,
      toolIds: serializeJson(guideline.toolIds) ?? '[]',
    });
  });

  const insertJourney = db.prepare(
    `INSERT INTO journeys (id, agentId, title, description, triggerConditions, logic)
     VALUES (@id, @agentId, @title, @description, @triggerConditions, @logic)`,
  );
  const insertNode = db.prepare(
    `INSERT INTO journey_nodes (id, journeyId, type, positionX, positionY, data)
     VALUES (@id, @journeyId, @type, @positionX, @positionY, @data)`,
  );
  const insertEdge = db.prepare(
    `INSERT INTO journey_edges (id, journeyId, source, target, label)
     VALUES (@id, @journeyId, @source, @target, @label)`,
  );

  agent.journeys.forEach((journey) => {
    insertJourney.run({
      id: journey.id,
      agentId: agent.id,
      title: journey.title,
      description: journey.description ?? null,
      triggerConditions: serializeJson(journey.triggerConditions) ?? '[]',
      logic: serializeJson(resolveJourneyLogic(journey)) ?? null,
    });

    (journey.nodes ?? []).forEach((node) => {
      insertNode.run({
        id: node.id,
        journeyId: journey.id,
        type: node.type,
        positionX: node.position.x,
        positionY: node.position.y,
        data: serializeJson(node.data) ?? '{}',
      });
    });

    (journey.edges ?? []).forEach((edge) => {
      insertEdge.run({
        id: edge.id,
        journeyId: journey.id,
        source: edge.source,
        target: edge.target,
        label: edge.label ?? null,
      });
    });
  });
}

function createSampleJourney(agentId: string): Journey {
  const startId = randomUUID();
  const chatId = randomUUID();
  const endId = randomUUID();

  const nodes: JourneyNode[] = [
    {
      id: startId,
      type: 'start',
      position: { x: 50, y: 50 },
      data: { label: '开始' },
    },
    {
      id: chatId,
      type: 'chat',
      position: { x: 300, y: 50 },
      data: {
        label: 'Agent Says',
        content: '列出可预约时间，并询问患者希望的时间段。',
      },
    },
    {
      id: endId,
      type: 'end',
      position: { x: 550, y: 50 },
      data: { label: '结束' },
    },
  ];

  const edges: JourneyEdge[] = [
    {
      id: randomUUID(),
      source: startId,
      target: chatId,
      label: '患者需要预约',
    },
    {
      id: randomUUID(),
      source: chatId,
      target: endId,
      label: '预约完成',
    },
  ];

  return {
    id: randomUUID(),
    agentId,
    title: '预约门诊',
    description: '帮助患者完成门诊预约流程。',
    triggerConditions: ['schedule appointment', 'book visit'],
    logic: defaultJourneyLogic({
      title: '预约门诊',
      description: '帮助患者完成门诊预约流程。',
      triggerConditions: ['schedule appointment', 'book visit'],
      nodes,
      edges,
    }),
    nodes,
    edges,
  };
}

function hydrateAgent(row: AgentRow): Agent {
  const db = getDb();
  const agentId = row.id;

  const toolRows = db
    .prepare(
      'SELECT id, name, description, parameters FROM tools WHERE agentId = ? ORDER BY name ASC',
    )
    .all(agentId) as {
    id: string;
    name: string;
    description: string | null;
    parameters: string | null;
  }[];
  const tools = toolRows.map((toolRow) => ({
    id: toolRow.id,
    agentId,
    name: toolRow.name,
    description: toolRow.description ?? undefined,
    parameters: deserializeJson(toolRow.parameters),
  }));

  const glossaryRows = db
    .prepare(
      'SELECT id, name, description, synonyms FROM glossary_terms WHERE agentId = ? ORDER BY name ASC',
    )
    .all(agentId) as {
    id: string;
    name: string;
    description: string;
    synonyms: string | null;
  }[];
  const glossary = glossaryRows.map((termRow) => ({
    id: termRow.id,
    agentId,
    name: termRow.name,
    description: termRow.description,
    synonyms: deserializeJson<string[]>(termRow.synonyms) ?? [],
  }));

  const guidelineRows = db
    .prepare(
      'SELECT id, condition, action, toolIds FROM guidelines WHERE agentId = ? ORDER BY rowid ASC',
    )
    .all(agentId) as {
    id: string;
    condition: string;
    action: string;
    toolIds: string | null;
  }[];
  const guidelines = guidelineRows.map((guidelineRow) => ({
    id: guidelineRow.id,
    agentId,
    condition: guidelineRow.condition,
    action: guidelineRow.action,
    toolIds: deserializeJson<string[]>(guidelineRow.toolIds) ?? [],
  }));

  const journeyRows = db
    .prepare(
      'SELECT id, agentId, title, description, triggerConditions, logic FROM journeys WHERE agentId = ? ORDER BY title ASC',
    )
    .all(agentId) as JourneyRow[];
  const journeys = journeyRows.map((journeyRow) => hydrateJourney(journeyRow));

  return {
    id: agentId,
    name: row.name,
    description: row.description ?? undefined,
    constraints: row.constraints ?? undefined,
    systemPromptJson: deserializeJson(row.systemPromptJson),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    tools,
    glossary,
    guidelines,
    journeys,
  };
}

function hydrateJourney(row: JourneyRow): Journey {
  const db = getDb();
  const nodeRows = db
    .prepare(
      'SELECT id, type, positionX, positionY, data FROM journey_nodes WHERE journeyId = ? ORDER BY rowid ASC',
    )
    .all(row.id) as {
    id: string;
    type: JourneyNode['type'];
    positionX: number;
    positionY: number;
    data: string | null;
  }[];
  const nodes = nodeRows.map((nodeRow) => ({
    id: nodeRow.id,
    type: nodeRow.type,
    position: { x: Number(nodeRow.positionX), y: Number(nodeRow.positionY) },
    data: deserializeJson<Record<string, unknown>>(nodeRow.data) ?? {},
  }));

  const edgeRows = db
    .prepare(
      'SELECT id, source, target, label FROM journey_edges WHERE journeyId = ? ORDER BY rowid ASC',
    )
    .all(row.id) as {
    id: string;
    source: string;
    target: string;
    label: string | null;
  }[];
  const edges = edgeRows.map((edgeRow) => ({
    id: edgeRow.id,
    source: edgeRow.source,
    target: edgeRow.target,
    label: edgeRow.label ?? undefined,
  }));

  const triggerConditions =
    deserializeJson<string[]>(row.triggerConditions) ?? [];
  const logic =
    deserializeJson<JourneyLogicDoc>(row.logic) ??
    defaultJourneyLogic({
      title: row.title,
      description: row.description ?? undefined,
      triggerConditions,
      nodes,
      edges,
    });

  return {
    id: row.id,
    agentId: row.agentId,
    title: row.title,
    description: row.description ?? undefined,
    triggerConditions,
    logic,
    nodes,
    edges,
  };
}

export async function getAgents(): Promise<Agent[]> {
  ensureSeedData();
  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM agents ORDER BY createdAt ASC')
    .all() as AgentRow[];
  return rows.map(hydrateAgent);
}

export async function getAgent(id: string): Promise<Agent | null> {
  ensureSeedData();
  const db = getDb();
  const row = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as
    | AgentRow
    | undefined;
  if (!row) {
    return null;
  }
  return hydrateAgent(row);
}

export async function createAgent(payload: AgentCreatePayload): Promise<Agent> {
  ensureSeedData();
  const db = getDb();
  const now = new Date().toISOString();
  const id = randomUUID();
  const systemPrompt = defaultSystemPrompt();
  const systemPromptSerialized = serializeJson(systemPrompt);

  db.prepare(
    `INSERT INTO agents (id, name, description,constraints, systemPromptJson, createdAt, updatedAt)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    payload.name,
    payload.description ?? null,
    payload.constraints ?? null,
    systemPromptSerialized,
    now,
    now,
  );

  return hydrateAgent({
    id,
    name: payload.name,
    description: payload.description ?? null,
    constraints: payload.constraints ?? null,
    systemPromptJson: systemPromptSerialized,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateAgent(
  id: string,
  data: AgentUpdatePayload,
): Promise<Agent> {
  ensureSeedData();
  const db = getDb();
  const existing = db.prepare('SELECT * FROM agents WHERE id = ?').get(id) as
    | AgentRow
    | undefined;
  if (!existing) {
    throw new Error('Agent not found');
  }

  const systemPromptJson =
    data.systemPromptJson !== undefined
      ? serializeJson(data.systemPromptJson)
      : existing.systemPromptJson;
  const updatedAt = new Date().toISOString();
  const name = data.name ?? existing.name;
  const description = data.description ?? existing.description;
  const constraints = data.constraints ?? existing.constraints;

  const updateRelationGraph = db.transaction(() => {
    db.prepare(
      `UPDATE agents SET name = ?, description = ?, constraints = ?, systemPromptJson = ?, updatedAt = ? WHERE id = ?`,
    ).run(
      name,
      description ?? null,
      constraints ?? null,
      systemPromptJson,
      updatedAt,
      id,
    );

    if (data.tools) {
      db.prepare('DELETE FROM tools WHERE agentId = ?').run(id);
      const stmt = db.prepare(
        `INSERT INTO tools (id, agentId, name, description, parameters)
         VALUES (?, ?, ?, ?, ?)`,
      );
      data.tools.forEach((tool) => {
        stmt.run(
          tool.id ?? randomUUID(),
          id,
          tool.name,
          tool.description ?? null,
          serializeJson(tool.parameters),
        );
      });
    }

    if (data.glossary) {
      db.prepare('DELETE FROM glossary_terms WHERE agentId = ?').run(id);
      const stmt = db.prepare(
        `INSERT INTO glossary_terms (id, agentId, name, description, synonyms)
         VALUES (?, ?, ?, ?, ?)`,
      );
      data.glossary.forEach((term) => {
        stmt.run(
          term.id ?? randomUUID(),
          id,
          term.name,
          term.description,
          serializeJson(term.synonyms) ?? '[]',
        );
      });
    }

    if (data.guidelines) {
      db.prepare('DELETE FROM guidelines WHERE agentId = ?').run(id);
      const stmt = db.prepare(
        `INSERT INTO guidelines (id, agentId, condition, action, toolIds)
         VALUES (?, ?, ?, ?, ?)`,
      );
      data.guidelines.forEach((guideline) => {
        stmt.run(
          guideline.id ?? randomUUID(),
          id,
          guideline.condition,
          guideline.action,
          serializeJson(guideline.toolIds) ?? '[]',
        );
      });
    }

    if (data.journeys) {
      const journeyIds = db
        .prepare('SELECT id FROM journeys WHERE agentId = ?')
        .all(id) as { id: string }[];
      if (journeyIds.length) {
        const deleteNodes = db.prepare(
          'DELETE FROM journey_nodes WHERE journeyId = ?',
        );
        const deleteEdges = db.prepare(
          'DELETE FROM journey_edges WHERE journeyId = ?',
        );
        journeyIds.forEach((journey) => {
          deleteNodes.run(journey.id);
          deleteEdges.run(journey.id);
        });
      }
      db.prepare('DELETE FROM journeys WHERE agentId = ?').run(id);

      const insertJourney = db.prepare(
        `INSERT INTO journeys (id, agentId, title, description, triggerConditions, logic)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const insertNode = db.prepare(
        `INSERT INTO journey_nodes (id, journeyId, type, positionX, positionY, data)
         VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const insertEdge = db.prepare(
        `INSERT INTO journey_edges (id, journeyId, source, target, label)
         VALUES (?, ?, ?, ?, ?)`,
      );

      data.journeys.forEach((journey) => {
        const journeyId = journey.id ?? randomUUID();
        insertJourney.run(
          journeyId,
          id,
          journey.title,
          journey.description ?? null,
          serializeJson(journey.triggerConditions) ?? '[]',
          serializeJson(resolveJourneyLogic(journey)) ?? null,
        );

        (journey.nodes ?? []).forEach((node) => {
          insertNode.run(
            node.id ?? randomUUID(),
            journeyId,
            node.type,
            node.position.x,
            node.position.y,
            serializeJson(node.data) ?? '{}',
          );
        });

        (journey.edges ?? []).forEach((edge) => {
          insertEdge.run(
            edge.id ?? randomUUID(),
            journeyId,
            edge.source,
            edge.target,
            edge.label ?? null,
          );
        });
      });
    }
  });

  updateRelationGraph();

  return hydrateAgent({
    id,
    name,
    description: description ?? null,
    constraints: constraints ?? null,
    systemPromptJson: systemPromptJson ?? null,
    createdAt: existing.createdAt,
    updatedAt,
  });
}

export async function deleteAgent(id: string): Promise<void> {
  ensureSeedData();
  const db = getDb();
  const result = db.prepare('DELETE FROM agents WHERE id = ?').run(id);
  if (result.changes === 0) {
    throw new Error('Agent not found');
  }
}

function defaultSystemPrompt() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: '在这里编写系统提示，使用工具和术语帮助 Agent 更好完成任务。',
          },
        ],
      },
    ],
  };
}

type JourneyLike = {
  title: string;
  description?: string;
  triggerConditions: string[];
  logic?: JourneyLogicDoc;
  nodes?: JourneyNode[];
  edges?: JourneyEdge[];
};

function resolveJourneyLogic(journey: JourneyLike): JourneyLogicDoc {
  if (journey.logic && typeof journey.logic === 'object') {
    return journey.logic as JourneyLogicDoc;
  }
  return defaultJourneyLogic(journey);
}

function defaultJourneyLogic(journey: JourneyLike): JourneyLogicDoc {
  const content: unknown[] = [];

  content.push({
    type: 'heading',
    attrs: { level: 2 },
    content: [{ type: 'text', text: journey.title }],
  });

  content.push({
    type: 'paragraph',
    content: [
      {
        type: 'text',
        text:
          (journey.description?.trim() ?? '').length > 0
            ? journey.description
            : '请在此填写流程的描述与目标。',
      },
    ],
  });

  if (journey.triggerConditions.length) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: '触发条件：' }],
    });
    content.push({
      type: 'bulletList',
      content: journey.triggerConditions.map((condition) => ({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: condition }],
          },
        ],
      })),
    });
  }

  const nodeSummaries = (journey.nodes ?? []).map((node, index) => {
    const parts: string[] = [];
    const label =
      typeof node.data?.label === 'string' && node.data.label.trim()
        ? node.data.label
        : node.type;
    parts.push(`${index + 1}. ${label}`);

    if (node.type === 'chat' && typeof node.data?.content === 'string') {
      parts.push(`回应: ${node.data.content}`);
    }

    if (node.type === 'tool' && typeof node.data?.toolId === 'string') {
      parts.push(`调用工具: ${node.data.toolId}`);
    }

    return {
      type: 'listItem',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: parts.join(' ｜ ') }],
        },
      ],
    };
  });

  if (nodeSummaries.length) {
    content.push({
      type: 'paragraph',
      content: [{ type: 'text', text: '流程步骤：' }],
    });
    content.push({
      type: 'bulletList',
      content: nodeSummaries,
    });
  }

  return {
    type: 'doc',
    content,
  } satisfies JourneyLogicDoc;
}
