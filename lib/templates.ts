// Markdown 模块模板

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  template: string;
}

export const MODULE_TEMPLATES: Template[] = [
  {
    id: 'tool',
    name: '工具定义',
    description: '定义一个新的工具函数',
    icon: '🔧',
    template: `
## 工具: [工具名称]

**功能描述**: [描述这个工具的作用]

**参数**:
- \`param1\`: [参数说明]
- \`param2\`: [参数说明]

**返回值**: [返回值类型和说明]

**示例**:
\`\`\`
调用工具_名称(参数1, 参数2)
\`\`\`
`,
  },
  {
    id: 'term',
    name: '术语定义',
    description: '定义领域专业术语',
    icon: '📖',
    template: `
## 术语

- **术语名称** (同义词1, 同义词2): 术语的详细解释说明
`,
  },
  {
    id: 'journey',
    name: '用户旅程',
    description: '定义用户交互流程',
    icon: '🗺️',
    template: `
## 用户旅程: [旅程名称]

**触发条件**: [什么情况下开始这个旅程]

**流程步骤**:
1. [第一步做什么]
2. [第二步做什么]
3. [第三步做什么]

**预期结果**: [旅程完成后的结果]
`,
  },
  {
    id: 'guideline',
    name: '行为指南',
    description: '定义条件和对应行为',
    icon: '📋',
    template: `
## 行为指南

**当** [条件描述] **时** → [执行的动作]

**示例**:
- 当用户询问价格时 → 查询数据库并返回最新价格
- 当检测到敏感信息时 → 提醒用户注意隐私保护
`,
  },
  {
    id: 'observation',
    name: '观察记录',
    description: '记录需要观察的指标',
    icon: '👁️',
    template: `
## 观察指标

**指标名称**: [要观察什么]

**观察目的**: [为什么要观察这个指标]

**数据来源**: [从哪里获取数据]

**阈值**: [超过多少需要告警]
`,
  },
  {
    id: 'agent-basic',
    name: '基础 Agent',
    description: '创建一个完整的基础 Agent',
    icon: '🤖',
    template: `
# [Agent 名称]

[Agent 的简短描述，说明它的主要用途]

---

## 核心能力

这个 Agent 能够:
- [能力1]
- [能力2]
- [能力3]

---

## 工具

### 工具1
**功能**: [工具描述]
**参数**: param1: string, param2: number
**返回**: ResultType

---

## 术语

- **专业术语1**: 解释说明
- **专业术语2**: 解释说明

---

## 行为指南

- 当[条件] → [行动]
- 当[条件] → [行动]
`,
  },
];

export function getTemplateById(id: string): Template | undefined {
  return MODULE_TEMPLATES.find((t) => t.id === id);
}

export function generateToolTemplate(
  toolName: string,
  description: string,
  params: string,
  returnType: string
): string {
  return `
## 工具: ${toolName}

**功能描述**: ${description}

**参数**: ${params}

**返回值**: ${returnType}
`;
}
