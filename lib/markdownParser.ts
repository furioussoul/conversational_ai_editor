import { Agent, Tool, Term, Journey, Guideline, Observation, ParseResult } from '@/types';
import { generateId } from './utils';

/**
 * AI 解析器 - 将 Markdown 文档解析为 Agent 结构
 *
 * 这是一个模拟的 AI 解析器。在生产环境中，应该调用真实的 LLM API（如 OpenAI GPT-4）
 * 来进行智能解析。
 */

interface Section {
  title: string;
  content: string;
  level: number;
}

export async function parseMarkdownToAgent(markdown: string): Promise<ParseResult> {
  try {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 解析 Markdown 为章节
    const sections = parseMarkdownSections(markdown);

    // 初始化 Agent
    const agent: Partial<Agent> = {
      id: generateId('agent'),
      name: '',
      description: '',
      tools: [],
      terms: [],
      journeys: [],
      guidelines: [],
      observations: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // 提取 Agent 基本信息
    extractAgentInfo(sections, agent, errors);

    // 提取工具定义
    extractTools(sections, agent, warnings);

    // 提取术语定义
    extractTerms(sections, agent, warnings);

    // 提取旅程定义
    extractJourneys(sections, agent, warnings);

    // 提取指导原则
    extractGuidelines(sections, agent, warnings);

    // 提取观察点
    extractObservations(sections, agent, warnings);

    // 验证必填字段
    if (!agent.name) {
      errors.push('缺少 Agent 名称。请在文档开头使用一级标题定义 Agent 名称。');
    }

    if (!agent.description) {
      warnings.push('建议添加 Agent 描述，说明其性格特征和行为风格。');
    }

    return {
      success: errors.length === 0,
      agent: agent as Agent,
      errors: errors.length > 0 ? errors : undefined,
      warnings: warnings.length > 0 ? warnings : undefined,
      parsedAt: new Date(),
      confidence: calculateConfidence(agent, errors, warnings),
    };
  } catch (error) {
    return {
      success: false,
      errors: [`解析失败: ${error instanceof Error ? error.message : '未知错误'}`],
      parsedAt: new Date(),
      confidence: 0,
    };
  }
}

/**
 * 解析 Markdown 为章节
 */
function parseMarkdownSections(markdown: string): Section[] {
  const sections: Section[] = [];
  const lines = markdown.split('\n');
  let currentSection: Section | null = null;

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headingMatch) {
      // 保存上一个章节
      if (currentSection) {
        sections.push(currentSection);
      }

      // 创建新章节
      currentSection = {
        level: headingMatch[1].length,
        title: headingMatch[2].trim(),
        content: '',
      };
    } else if (currentSection) {
      currentSection.content += line + '\n';
    }
  }

  // 保存最后一个章节
  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

/**
 * 提取 Agent 基本信息
 */
function extractAgentInfo(sections: Section[], agent: Partial<Agent>, errors: string[]) {
  // 第一个一级标题作为 Agent 名称
  const mainTitle = sections.find((s) => s.level === 1);
  if (mainTitle) {
    agent.name = mainTitle.title;

    // 第一段内容作为描述
    const firstParagraph = mainTitle.content.trim().split('\n\n')[0];
    if (firstParagraph) {
      agent.description = firstParagraph.trim();
    }
  }
}

/**
 * 提取工具定义
 * 识别模式：
 * ## 工具：XXX
 * 或
 * ## XXX 工具
 */
function extractTools(sections: Section[], agent: Partial<Agent>, warnings: string[]) {
  const toolSections = sections.filter(
    (s) =>
      s.title.includes('工具') ||
      s.title.toLowerCase().includes('tool') ||
      s.title.includes('函数') ||
      s.title.includes('API')
  );

  for (const section of toolSections) {
    const tool: Tool = {
      id: generateId('tool'),
      name: extractToolName(section.title),
      description: section.content.trim().split('\n')[0] || '',
      parameters: extractParameters(section.content),
      returnType: extractReturnType(section.content),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    agent.tools?.push(tool);
  }
}

/**
 * 提取术语定义
 */
function extractTerms(sections: Section[], agent: Partial<Agent>, warnings: string[]) {
  const termSections = sections.filter(
    (s) =>
      s.title.includes('术语') ||
      s.title.includes('词汇') ||
      s.title.toLowerCase().includes('term') ||
      s.title.includes('定义')
  );

  for (const section of termSections) {
    // 从列表项中提取术语
    const listItems = section.content.match(/^[-*]\s+(.+)$/gm);
    if (listItems) {
      for (const item of listItems) {
        const cleanItem = item.replace(/^[-*]\s+/, '').trim();
        const [nameAndSynonyms, ...descParts] = cleanItem.split(':');

        // 提取同义词
        const synonymMatch = nameAndSynonyms.match(/(.+?)\s*[\(（](.+?)[\)）]/);
        const name = synonymMatch ? synonymMatch[1].trim() : nameAndSynonyms.trim();
        const synonyms = synonymMatch ? synonymMatch[2].split(/[,，、]/).map((s) => s.trim()) : [];

        const term: Term = {
          id: generateId('term'),
          name,
          description: descParts.join(':').trim(),
          synonyms,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        agent.terms?.push(term);
      }
    }
  }
}

/**
 * 提取旅程定义
 */
function extractJourneys(sections: Section[], agent: Partial<Agent>, warnings: string[]) {
  const journeySections = sections.filter(
    (s) =>
      s.title.includes('旅程') ||
      s.title.includes('流程') ||
      s.title.toLowerCase().includes('journey') ||
      s.title.includes('场景')
  );

  for (const section of journeySections) {
    const journey: Journey = {
      id: generateId('journey'),
      title: section.title.replace(/旅程|流程|journey|场景/gi, '').trim() || section.title,
      description: section.content.split('\n')[0].trim(),
      conditions: extractConditions(section.content),
      states: [], // 简化版本，实际应该解析状态
      transitions: [],
      initialStateId: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    agent.journeys?.push(journey);
  }
}

/**
 * 提取指导原则
 */
function extractGuidelines(sections: Section[], agent: Partial<Agent>, warnings: string[]) {
  const guidelineSections = sections.filter(
    (s) =>
      s.title.includes('原则') ||
      s.title.includes('规则') ||
      s.title.toLowerCase().includes('guideline') ||
      s.title.includes('准则')
  );

  for (const section of guidelineSections) {
    // 从列表项中提取原则
    const listItems = section.content.match(/^[-*]\s+(.+)$/gm);
    if (listItems) {
      for (const item of listItems) {
        const cleanItem = item.replace(/^[-*]\s+/, '').trim();
        const [condition, action] = cleanItem.split(/[→\->]/);

        if (condition && action) {
          const guideline: Guideline = {
            id: generateId('guideline'),
            condition: condition.trim(),
            action: action.trim(),
            toolIds: [],
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          agent.guidelines?.push(guideline);
        }
      }
    }
  }
}

/**
 * 提取观察点
 */
function extractObservations(sections: Section[], agent: Partial<Agent>, warnings: string[]) {
  const observationSections = sections.filter(
    (s) => s.title.includes('观察') || s.title.toLowerCase().includes('observation')
  );

  for (const section of observationSections) {
    const observation: Observation = {
      id: generateId('observation'),
      description: section.content.trim(),
      disambiguateJourneys: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    agent.observations?.push(observation);
  }
}

/**
 * 辅助函数
 */

function extractToolName(title: string): string {
  return title
    .replace(/工具|函数|API|tool|function/gi, '')
    .replace(/[:：]/g, '')
    .trim();
}

function extractParameters(content: string): any[] {
  // 简化版：从列表中提取参数
  const params: any[] = [];
  const paramMatch = content.match(/参数[：:]\s*\n((?:[-*]\s+.+\n?)+)/);

  if (paramMatch) {
    const items = paramMatch[1].match(/^[-*]\s+(.+)$/gm);
    if (items) {
      for (const item of items) {
        const cleanItem = item.replace(/^[-*]\s+/, '').trim();
        const [name, ...rest] = cleanItem.split(':');
        params.push({
          name: name.trim(),
          type: 'string',
          description: rest.join(':').trim(),
          required: !cleanItem.includes('可选'),
        });
      }
    }
  }

  return params;
}

function extractReturnType(content: string): string {
  const returnMatch = content.match(/返回[：:]?\s*(.+)/);
  return returnMatch ? returnMatch[1].trim() : 'string';
}

function extractConditions(content: string): string[] {
  const conditions: string[] = [];
  const condMatch = content.match(/(?:触发条件|条件)[：:]\s*\n((?:[-*]\s+.+\n?)+)/);

  if (condMatch) {
    const items = condMatch[1].match(/^[-*]\s+(.+)$/gm);
    if (items) {
      conditions.push(...items.map((item) => item.replace(/^[-*]\s+/, '').trim()));
    }
  }

  return conditions;
}

function calculateConfidence(agent: Partial<Agent>, errors: string[], warnings: string[]): number {
  let confidence = 1.0;

  // 每个错误降低 0.2
  confidence -= errors.length * 0.2;

  // 每个警告降低 0.05
  confidence -= warnings.length * 0.05;

  // 没有名称直接 0
  if (!agent.name) confidence = 0;

  // 有内容加分
  if ((agent.tools?.length || 0) > 0) confidence += 0.1;
  if ((agent.journeys?.length || 0) > 0) confidence += 0.1;

  return Math.max(0, Math.min(1, confidence));
}
