这是一份为您准备的详细需求文档（PRD），旨在交付给您以构建 Agent 管理 Web 应用。

-----

# 产品需求文档：Agent 管理平台

## 1\. 概述

### 1.1. 项目目标

本项目旨在创建一个 B/S 架构的 Web 应用程序，用于集中管理、配置和编辑 AI Agents。核心功能包括 Agent 的列表展示、增删改查，以及一个强大的、以文档为核心的 Agent 编辑器。该编辑器支持富文本、表格插入（通过 XLSX 拖拽上传），并能通过表格操作触发侧边栏，以可视化（React Flow）和自然语言两种方式，对 Agent 的多轮对话流程（Journeys）进行精细化配置。

### 1.2. 技术栈

  * **前端框架:** Next.js (App Router)
  * **UI 库:** TailwindCSS
  * **组件库:** shadcn/ui (推荐，用于按钮、输入框、Drawer/Sheet 等，与 TailwindCSS 完美集成)
  * **表格组件:** AG-Grid (用于 Agent 列表页)
  * **富文本编辑器:** Novel (基于 TipTap)
  * **流程图库:** React Flow

## 2\. 数据模型 (Data Schema)

为了让 Cursor 更好地理解应用结构，我们首先定义核心的数据模型 (建议使用 Prisma 或类似的 ORM)。

```typescript
// 伪代码 / Prisma Schema 风格

// 1. 顶层 Agent 模型
model Agent {
  id          String   @id @default(uuid())
  name        String
  description String?
  systemPromptJson  Json?    // Novel 编辑器输出的 JSON 内容
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // 关系
  tools       Tool[]
  glossary    Term[]
  guidelines  Guideline[]
  journeys    Journey[]
}

// 2. 工具 (Tools) - Agent 可调用的函数
model Tool {
  id          String  @id @default(uuid())
  agentId     String
  agent       Agent   @relation(fields: [agentId], references: [id])
  
  name        String  // 例如: get_upcoming_slots
  description String?
  parameters  Json?   // 函数参数的 JSON Schema
}

// 3. 术语表 (Glossary) - 领域知识
model Term {
  id          String   @id @default(uuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])

  name        String   // 例如: Office Hours
  description String
  synonyms    String[]
}

// 4. 全局指南 (Guidelines) - 跨流程的全局规则
model Guideline {
  id          String   @id @default(uuid())
  agentId     String
  agent       Agent    @relation(fields: [agentId], references: [id])

  condition   String   // 例如: "The patient asks to talk to a human agent"
  action      String   // 例如: "Ask them to call the office, providing the phone number"
  toolIds     String[] // 触发此指南时可能需要调用的工具
}

// 5. 对话旅程 (Journey) - 核心的多轮对话流
model Journey {
  id                 String   @id @default(uuid())
  agentId            String
  agent              Agent    @relation(fields: [agentId], references: [id])
  
  title              String   // 例如: "Schedule an Appointment"
  description        String?
  triggerConditions  String[] // 触发此 Journey 的条件

  // React Flow 数据
  nodes              Json     // 存储 React Flow 的 Node[]
  edges              Json     // 存储 React Flow 的 Edge[]
}

/* React Flow Node (Json 结构示例):
{
  id: '1',
  type: 'chatState', // 'toolState', 'start', 'end'
  position: { x: 100, y: 100 },
  data: {
    label: 'Agent Says',
    content: 'List available times and ask which ones works for them'
  }
}

React Flow Edge (Json 结构示例):
{
  id: 'e1-2',
  source: '1',
  target: '2',
  label: 'The patient picks a time' // 存储 'condition'
}
*/
```

## 3\. 功能模块需求

### 模块一：Agent 列表页

  * **路径:** `/`
  * **功能描述:** 展示所有已创建的 Agent。
  * **组件:** **AG-Grid**

#### 3.1. 界面与功能

1.  **表格展示:**
      * 使用 AG-Grid (React) 展示 `Agent` 列表。
      * **列配置:**
          * `Name` (Agent 名称)：文本。
          * `Description` (描述)：文本。
          * `Last Modified` (最后更新时间 `updatedAt`)：日期格式。
          * `Actions` (操作)：自定义单元格渲染。
2.  **操作列 (Actions):**
      * 包含两个图标按钮：
          * **编辑 (Edit):** 点击后导航到 `  /agent/[id] ` 页面。
          * **删除 (Delete):** 点击后弹出确认对话框 (使用 `shadcn/ui` 的 `AlertDialog`)，确认后调用 `DELETE /api/agents/[id]`。
3.  **新建 Agent:**
      * 页面右上角应有一个 "创建新 Agent" 按钮。
      * 点击后，调用 `POST /api/agents` (可传入默认 name) 创建一个新 Agent，并立即导航到新创建的 Agent 编辑页 `  /agent/[id_new] `。

### 模块二：Agent 增删改 (API)

  * **路径:** `/api/agents/`
  * **功能描述:** 提供 Agent 资源的 RESTful API 接口。

#### 3.1. API Endpoints

1.  **`GET /api/agents`**
      * 获取所有 Agent 列表（用于 AG-Grid）。
2.  **`GET /api/agents/[id]`**
      * 获取单个 Agent 的详细信息，包括其关联的 `tools`, `glossary`, `guidelines`, `journeys`。
3.  **`POST /api/agents`**
      * 创建一个新的 Agent。
      * Body：`{ name: string, description?: string }`。
      * 返回：新创建的 `Agent` 对象。
4.  **`PUT /api/agents/[id]`**
      * 更新一个 Agent 的所有信息。
      * Body：完整的 `Agent` 对象（或部分，使用 PATCH 更佳，但 PUT 亦可）。
      * **重要:** 这是 Agent 编辑页"保存"按钮的核心。
5.  **`DELETE /api/agents/[id]`**
      * 删除一个 Agent。

### 模块三：Agent 编辑页面

  * **路径:** `/agent/[id]`
  * **功能描述:** 这是应用的核心。一个集成的界面，用于编辑 Agent 的所有属性，特别是其对话流程。

#### 3.1. 页面布局

1.  **顶部栏:**
      * 显示 Agent 的 `name` (可编辑的输入框) 和 `description` (可编辑的输入框)。
      * 一个 "保存" 按钮，点击时调用 `PUT /api/agents/[id]`，保存整个 Agent 的所有修改（包括 Novel 编辑器内容和所有 Journeys 的 React Flow 数据）。
2.  **主编辑区:**
      * **Novel 编辑器:** 占据页面的主要区域。

#### 3.2. Novel 富文本编辑器

1.  **基础功能:**
      * 用于编写 Agent 的主提示词（`systemPromptJson`）。
      * 支持标准的富文本功能：加粗、斜体、列表、标题等。
2.  **核心功能：表格集成**
      * **拖拽上传 (XLSX):**
          * 编辑器应支持拖拽事件。当用户拖拽一个 `.xlsx` 文件到编辑器上时：
          * 使用 `xlsx` (SheetJS) 库在**客户端**解析该文件。
          * 将解析出的数据（二维数组）转换为 Novel (TipTap) 的 `table` 节点 JSON 结构。
          * 在光标位置插入该表格。
      * **表格编辑:**
          * **表头定制:** 允许用户编辑表格的第一行（表头）内容。
          * **默认事件:** 双击（`onDoubleClick`）任意单元格（`<td>`）时，应允许用户编辑该单元格的文本内容。
      * **自定义点击事件 (核心):**
          * 需求：**单机某个列的 cell 可以以拉窗形式从右边拉出一个窗口**。
          * **实现:**
              * 我们规定，插入的表格如果用于管理 `Journeys`，其结构应是固定的（或可配置的，但为简化起见，我们先固定）。
              * 例如，一个 "Journeys 管理表"：
                | Journey Title | Description | Trigger Conditions | Actions |
                | :--- | :--- | :--- | :--- |
                | Schedule an Appointment | 帮用户预约 | "schedule appointment", "make booking" | `[编辑流程]` |
                | Lab Results | 查询实验报告 | "lab results", "check test" | `[编辑流程]` |
                | ... | ... | ... | ... |
                | `[+ 添加 Journey]` | | | |
              * 当用户**单击 (onClick)** "Actions" 列下的 `[编辑流程]` 单元格时：
              * 触发一个函数，该函数打开一个侧边栏抽屉 (Drawer / Sheet)。
              * 必须将该行对应的 `journey.id`（或如果是新行，则为 `null`）传递给这个抽屉组件。

#### 3.3. Journey 编辑抽屉 (Side Panel)

  * **组件:** `shadcn/ui` 的 `Sheet` (从右侧滑出)。
  * **触发:** 由 3.2 中表格的 "Actions" 列单元格点击触发。
  * **Props:** 接收 `journeyId`（或 Agent 数据中对应的 `journey` 对象）。

#### 3.3.1. 抽屉内部布局

1.  **顶部:**
      * 显示 Journey 的 `title` 和 `description` (可编辑)。
      * 一个**切换开关 (Toggle Group)**，用于在 "可视化流程" 和 "自然语言" 视图间切换。
2.  **视图一：可视化流程 (React Flow)**
      * **画布:** 渲染一个 `<ReactFlow>` 画布。
      * **数据:** `nodes` 和 `edges` 从 `journey` 对象中加载。
      * **自定义节点 (Custom Nodes):** 必须创建以下自定义节点以匹配 Python 示例的逻辑：
          * `startNode` (类型: 'start'): 表示 `initial_state`。
          * `chatNode` (类型: 'chat'): 表示 `chat_state`。节点内部应有一个文本区域用于编辑 "Agent 要说的话"。
          * `toolNode` (类型: 'tool'): 表示 `tool_state`。节点内部应有一个下拉框（或 AutoComplete）用于选择一个已在 Agent 中定义的 `Tool` (例如 `get_upcoming_slots`)。
          * `endNode` (类型: 'end'): 表示 `p.END_JOURNEY`。
      * **边 (Edges):**
          * `label` 属性用于存储**条件 (condition)**。
          * 边的 `label` 应该是可编辑的（例如，点击边时弹出一个输入框）。
          * 用户可以通过拖拽从节点的 Handle 连接出新的边。
      * **交互:**
          * 用户可以拖拽节点、连接节点、编辑节点内容（Chat 内容、Tool 名称）和边（Condition）。
          * 所有对 `nodes` 和 `edges` 的更改都应实时（或在关闭抽屉时）更新到父页面（Agent 编辑页）的 State 中，以便最后统一"保存"。
3.  **视图二：自然语言**
      * **功能:** 提供一种非可视化的方式来维护流程。
      * **实现:**
          * 可以是一个简单的多行文本框 (`<Textarea>`)，用户在其中编写一种简化的脚本语言（如下所示）。
          * 或者是一个结构化的表单，让用户逐行添加 "State" 和 "Transition"。
          * **（推荐方案）简易脚本:**
              * 提供一个 `textarea`。
              * 当用户在此视图下编辑时，他们可以编写如下伪代码：
            <!-- end list -->
            ```
            START
            => TOOL: get_upcoming_slots
            => CHAT: "List available times: {result}. Which one works?"

            ON "The patient picks a time"
              => CHAT: "Confirm the details: {details}?"
              ON "The patient confirms"
                => TOOL: schedule_appointment
                => CHAT: "Appointment scheduled."
                => END

            ON "None of those times work"
              => TOOL: get_later_slots
              => CHAT: "List later times: {result}."
              ON "The patient picks a time"
                => GOTO [CHAT: "Confirm the details: {details}?"] // GOTO 之前定义的节点
              ON "None of those times work"
                => CHAT: "Please call the office."
                => END
            ```
          * **同步:** 这是最复杂的部分。
              * **React Flow -\> 文本:** 当用户切换到"自然语言"视图时，需要一个函数将 `nodes` 和 `edges` *序列化* 为上述的伪代码。
              * **文本 -\> React Flow:** 当用户在"自然语言"视图下编辑后切换回"可视化流程"时，需要一个函数*解析*上述伪代码，并将其*反序列化* 为 `nodes` 和 `edges` 结构（包括自动布局）。
              * *(给 Cursor 的提示：这个双向同步是高级功能。如果实现困难，可以优先保证 "React Flow" 视图的编辑功能，"自然语言" 视图可以降级为只读的摘要。)*

## 4\. 非功能性需求

1.  **样式:** 必须严格使用 **TailwindCSS** 进行所有组件的样式设置。
2.  **状态管理:** 使用 React `useState`, `useContext` 或 `Zustand` 来管理 Agent 编辑页的复杂状态（`agent` 对象的深度嵌套）。
3.  **响应式:** 优先保证桌面端的体验。

-----