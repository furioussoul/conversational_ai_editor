/**
 * 文档状态
 */
export enum DocumentStatus {
  DRAFT = 'draft', // 草稿
  REVIEWING = 'reviewing', // 审核中
  PUBLISHED = 'published', // 已发布
  ARCHIVED = 'archived', // 已归档
}

/**
 * 工具参数定义
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'datetime' | 'object' | 'array';
  description: string;
  required?: boolean;
  default?: any;
}

/**
 * AI 工具定义 (对应 @p.tool)
 */
export interface Tool {
  id: string;
  name: string;
  description: string;
  parameters: ToolParameter[];
  returnType: string;
  implementation?: string; // 可选的实现代码或说明
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 术语定义 (对应 create_term)
 */
export interface Term {
  id: string;
  name: string;
  description: string;
  synonyms: string[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 状态类型
 */
export type StateType = 'chat' | 'tool' | 'end';

/**
 * Journey 状态节点
 */
export interface JourneyState {
  id: string;
  type: StateType;
  label: string; // chat_state 的描述或 tool 的名称
  toolId?: string; // 如果是 tool_state，关联的 tool ID
}

/**
 * Journey 状态转换
 */
export interface JourneyTransition {
  id: string;
  fromStateId: string;
  toStateId: string;
  condition?: string; // 转换条件
}

/**
 * Journey 定义 (对应 create_journey)
 */
export interface Journey {
  id: string;
  title: string;
  description: string;
  conditions: string[]; // 触发条件
  states: JourneyState[];
  transitions: JourneyTransition[];
  initialStateId: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 指导原则 (对应 create_guideline)
 */
export interface Guideline {
  id: string;
  condition: string;
  action: string;
  toolIds: string[]; // 关联的工具 ID 列表
  priority?: number; // 优先级
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 观察点 (对应 create_observation)
 */
export interface Observation {
  id: string;
  description: string;
  disambiguateJourneys: string[]; // 需要消歧的 Journey ID 列表
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Agent 定义 (对应 create_agent)
 */
export interface Agent {
  id: string;
  name: string;
  description: string;
  tools: Tool[];
  terms: Term[];
  journeys: Journey[];
  guidelines: Guideline[];
  observations: Observation[];
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 文档块类型
 */
export enum BlockType {
  AGENT_INFO = 'agent_info', // Agent 基本信息
  TOOL = 'tool', // 工具定义
  TERM = 'term', // 术语定义
  JOURNEY = 'journey', // Journey 定义
  GUIDELINE = 'guideline', // 指导原则
  OBSERVATION = 'observation', // 观察点
  RICH_TEXT = 'rich_text', // 富文本说明
}

/**
 * 文档块
 */
export interface DocumentBlock {
  id: string;
  type: BlockType;
  content: any; // 根据类型存储不同的内容
  order: number;
}

/**
 * 知识库文档 (AI Native - Markdown 驱动)
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  status: DocumentStatus;

  // Markdown 内容 - 用户直接编写的自然语言文档
  markdown: string;

  // AI 解析结果
  agentId?: string; // 关联的 Agent ID (发布后生成)
  parsedAgent?: Agent; // AI 解析后的 Agent 结构
  parseErrors?: string[]; // 解析错误
  parseWarnings?: string[]; // 解析警告
  lastParsedAt?: Date; // 最后解析时间

  // 文档元数据
  version: number;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
  reviewedBy?: string;
  reviewedAt?: Date;

  // 保留旧的 blocks 字段以兼容（可选）
  blocks?: DocumentBlock[];
}

/**
 * AI 解析结果
 */
export interface ParseResult {
  success: boolean;
  agent?: Agent;
  errors?: string[];
  warnings?: string[];
  parsedAt: Date;
  confidence?: number; // AI 解析的置信度 0-1
}

/**
 * 构建结果
 */
export interface BuildResult {
  success: boolean;
  agentId?: string;
  agent?: Agent;
  errors?: string[];
  warnings?: string[];
  buildAt: Date;
}
