export type Tool = {
  id: string;
  agentId: string;
  name: string;
  description?: string;
  parameters?: unknown;
};

export type Term = {
  id: string;
  agentId: string;
  name: string;
  description: string;
  synonyms: string[];
};

export type Guideline = {
  id: string;
  agentId: string;
  condition: string;
  action: string;
  toolIds: string[];
};

export type JourneyNode = {
  id: string;
  type: 'start' | 'chat' | 'tool' | 'end';
  position: { x: number; y: number };
  data: Record<string, unknown> & {
    label?: string;
    content?: string;
    toolId?: string;
  };
};

export type JourneyEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type JourneyLogicDoc = {
  type: 'doc';
  content?: unknown;
  [key: string]: unknown;
};

export type Journey = {
  id: string;
  agentId: string;
  title: string;
  description?: string;
  triggerConditions: string[];
  logic: JourneyLogicDoc;
  nodes?: JourneyNode[];
  edges?: JourneyEdge[];
};

export type Agent = {
  id: string;
  name: string;
  description?: string;
  constraints?: string;
  systemPromptJson?: unknown;
  createdAt: string;
  updatedAt: string;
  tools: Tool[];
  glossary: Term[];
  guidelines: Guideline[];
  journeys: Journey[];
};

export type AgentCreatePayload = {
  name: string;
  description?: string;
  constraints?: string;
};

export type AgentUpdatePayload = Partial<
  Omit<Agent, 'id' | 'createdAt' | 'updatedAt'>
> & {
  id?: never;
};
