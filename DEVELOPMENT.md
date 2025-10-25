# 开发说明

## 环境要求

- Node.js 18+
- npm 或 yarn

## 安装和运行

1. 安装依赖:

```bash
npm install
```

2. 启动开发服务器:

```bash
npm run dev
```

3. 打开浏览器访问: http://localhost:3000

## 关键概念

### 文档块 (DocumentBlock)

每个文档由多个块组成，每个块代表 Agent 的一个组件:

- **AgentInfoBlock**: Agent 基本信息（必填，每个文档只能有一个）
- **ToolBlock**: 工具定义
- **TermBlock**: 术语定义
- **JourneyBlock**: 对话旅程
- **GuidelineBlock**: 指导原则
- **ObservationBlock**: 观察点
- **RichTextBlock**: 富文本说明

### 状态管理

使用 Zustand 进行全局状态管理，主要包括:

- `currentDocument`: 当前编辑的文档
- `documents`: 所有文档列表
- `addBlock/updateBlock/removeBlock`: 块操作方法
- `submitForReview/publish/archive`: 状态转换方法

### 构建流程

发布文档时会触发构建流程:

1. 验证必填字段（Agent 名称、描述等）
2. 收集所有块的内容
3. 转换为 Agent 数据结构
4. 返回构建结果

## 自定义开发

### 添加新的块类型

1. 在 `types/index.ts` 中添加新的 BlockType
2. 在 `components/blocks/` 创建新的块组件
3. 在 `DocumentEditor.tsx` 中注册新块类型
4. 在 `documentStore.ts` 的 `buildAgent` 函数中处理新块

### 修改样式

全局样式在 `app/globals.css` 中定义，使用 Tailwind CSS 变量系统。

### 数据持久化

当前使用 localStorage，可以修改 `documentStore.ts` 中的 `loadDocuments` 和 `saveDocument` 方法来对接后端 API。

## 注意事项

- TypeScript 编译错误是正常的，需要先运行 `npm install` 安装依赖
- 文档数据保存在浏览器的 localStorage 中，清除浏览器数据会丢失
- 建议在生产环境中实现后端 API 和数据库存储
