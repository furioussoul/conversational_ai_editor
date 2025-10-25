// 预定义的工具库
export interface PredefinedTool {
  name: string;
  description: string;
  parameters: string;
  returnType: string;
  category: string;
}

export const PREDEFINED_TOOLS: PredefinedTool[] = [
  // 数据查询类
  {
    name: 'query_database',
    description: '查询数据库获取信息',
    parameters: 'query: string, table?: string',
    returnType: 'Array<Record>',
    category: '数据查询',
  },
  {
    name: 'search_documents',
    description: '搜索文档内容',
    parameters: 'keywords: string, limit?: number',
    returnType: 'Array<Document>',
    category: '数据查询',
  },
  {
    name: 'get_user_info',
    description: '获取用户信息',
    parameters: 'user_id: string',
    returnType: 'UserProfile',
    category: '数据查询',
  },

  // API 调用类
  {
    name: 'call_external_api',
    description: '调用外部 API',
    parameters: 'url: string, method: string, data?: object',
    returnType: 'APIResponse',
    category: 'API调用',
  },
  {
    name: 'send_email',
    description: '发送邮件',
    parameters: 'to: string, subject: string, body: string',
    returnType: 'boolean',
    category: 'API调用',
  },
  {
    name: 'send_sms',
    description: '发送短信',
    parameters: 'phone: string, message: string',
    returnType: 'boolean',
    category: 'API调用',
  },

  // 数据处理类
  {
    name: 'format_date',
    description: '格式化日期',
    parameters: 'date: Date, format: string',
    returnType: 'string',
    category: '数据处理',
  },
  {
    name: 'calculate_sum',
    description: '计算总和',
    parameters: 'numbers: number[]',
    returnType: 'number',
    category: '数据处理',
  },
  {
    name: 'parse_json',
    description: '解析 JSON 数据',
    parameters: 'json_string: string',
    returnType: 'object',
    category: '数据处理',
  },

  // 文件操作类
  {
    name: 'read_file',
    description: '读取文件内容',
    parameters: 'file_path: string',
    returnType: 'string',
    category: '文件操作',
  },
  {
    name: 'write_file',
    description: '写入文件',
    parameters: 'file_path: string, content: string',
    returnType: 'boolean',
    category: '文件操作',
  },
  {
    name: 'upload_file',
    description: '上传文件',
    parameters: 'file: File, destination: string',
    returnType: 'FileInfo',
    category: '文件操作',
  },

  // AI 相关类
  {
    name: 'generate_text',
    description: '生成文本内容',
    parameters: 'prompt: string, max_length?: number',
    returnType: 'string',
    category: 'AI功能',
  },
  {
    name: 'analyze_sentiment',
    description: '分析情感',
    parameters: 'text: string',
    returnType: 'SentimentResult',
    category: 'AI功能',
  },
  {
    name: 'translate_text',
    description: '翻译文本',
    parameters: 'text: string, target_lang: string',
    returnType: 'string',
    category: 'AI功能',
  },
];

export const TOOL_CATEGORIES = Array.from(new Set(PREDEFINED_TOOLS.map((tool) => tool.category)));

export function getToolsByCategory(category: string): PredefinedTool[] {
  return PREDEFINED_TOOLS.filter((tool) => tool.category === category);
}

export function searchTools(query: string): PredefinedTool[] {
  const lowerQuery = query.toLowerCase();
  return PREDEFINED_TOOLS.filter(
    (tool) =>
      tool.name.toLowerCase().includes(lowerQuery) ||
      tool.description.toLowerCase().includes(lowerQuery)
  );
}
