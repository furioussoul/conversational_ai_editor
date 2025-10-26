import { z } from 'zod';

const journeyNodeSchema = z.object({
  id: z.string(),
  type: z.enum(['start', 'chat', 'tool', 'end']),
  position: z.object({
    x: z.number(),
    y: z.number(),
  }),
  data: z.record(z.unknown()),
});

const journeyEdgeSchema = z.object({
  id: z.string(),
  source: z.string(),
  target: z.string(),
  label: z.string().optional(),
});

const journeyLogicSchema = z
  .object({
    type: z.literal('doc'),
    content: z.unknown().optional(),
  })
  .catchall(z.unknown());

const toolSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: z.string(),
  description: z.string().optional(),
  parameters: z.unknown().optional(),
});

const termSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  synonyms: z.array(z.string()),
});

const guidelineSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  condition: z.string(),
  action: z.string(),
  toolIds: z.array(z.string()),
});

const journeySchema = z.object({
  id: z.string(),
  agentId: z.string(),
  title: z.string(),
  description: z.string().optional(),
  triggerConditions: z.array(z.string()),
  logic: journeyLogicSchema,
  nodes: z.array(journeyNodeSchema).optional(),
  edges: z.array(journeyEdgeSchema).optional(),
});

export const agentSchema = z.object({
  id: z.string(),
  name: z.string().min(1, 'Agent 名称不能为空'),
  description: z.string().optional(),
  constraints: z.string().optional(),
  systemPromptJson: z.unknown().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
  tools: z.array(toolSchema),
  glossary: z.array(termSchema),
  guidelines: z.array(guidelineSchema),
  journeys: z.array(journeySchema),
});

export const agentUpdateSchema = agentSchema.partial({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type AgentInput = z.infer<typeof agentSchema>;
export type AgentUpdateInput = z.infer<typeof agentUpdateSchema>;
