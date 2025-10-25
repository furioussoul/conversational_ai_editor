# 开发工具配置说明

## 📝 Prettier 代码格式化

### 已安装的依赖

- `prettier` - 代码格式化工具
- `eslint-config-prettier` - 禁用与 Prettier 冲突的 ESLint 规则
- `eslint-plugin-prettier` - 将 Prettier 作为 ESLint 规则运行

### 配置文件

- `.prettierrc` - Prettier 配置
- `.prettierignore` - 忽略格式化的文件
- `.eslintrc.json` - ESLint 配置（集成 Prettier）

### 使用命令

```bash
# 格式化所有文件
npm run format

# 检查格式化问题（不修改文件）
npm run format:check

# Lint 检查
npm run lint
```

### VS Code 自动格式化

已配置保存时自动格式化：

- 保存文件时自动格式化
- 粘贴时自动格式化
- 自动修复 ESLint 问题
- 自动整理 imports

确保已安装推荐的扩展：

- Prettier - Code formatter (`esbenp.prettier-vscode`)
- ESLint (`dbaeumer.vscode-eslint`)

---

## 🐛 调试配置 (launch.json)

### 可用的调试配置

#### 1. Next.js: debug server-side

调试服务端代码（API routes, getServerSideProps 等）

**使用方法：**

1. 按 F5 或点击"运行和调试"
2. 选择"Next.js: debug server-side"
3. 在服务端代码中设置断点
4. 访问页面触发断点

#### 2. Next.js: debug client-side

调试客户端 React 代码

**使用方法：**

1. 先运行 `npm run dev`
2. 选择"Next.js: debug client-side"
3. 在组件代码中设置断点
4. Chrome 浏览器会自动打开并连接调试器

#### 3. Next.js: debug full stack

同时调试服务端和客户端

**使用方法：**

1. 按 F5 选择"Next.js: debug full stack"
2. 可以同时在前后端代码设置断点
3. 一键启动完整调试环境

#### 4. Next.js: attach to running server

连接到已运行的开发服务器

**使用方法：**

1. 先以调试模式运行服务器：`NODE_OPTIONS='--inspect' npm run dev`
2. 选择"Next.js: attach to running server"
3. 连接到端口 9229

#### 5. Chrome: launch with localhost

启动 Chrome 并打开 localhost:3000

**使用方法：**

1. 确保开发服务器已运行
2. 选择此配置启动 Chrome
3. 使用独立的用户数据目录，不影响正常浏览器

#### 6. Chrome: attach to running instance

连接到已打开的 Chrome 实例

**使用方法：**

1. 启动 Chrome 时添加远程调试参数：
   ```bash
   /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
   ```
2. 选择此配置连接调试

### 复合配置

#### Next.js: Full Stack Debug

组合配置，同时启动服务端和客户端调试

**使用方法：**

1. 选择"Next.js: Full Stack Debug"
2. 自动启动两个调试会话
3. 可以在前后端同时打断点

---

## 🎯 快速开始

### 首次设置

1. **安装推荐扩展**
   - 打开 VS Code
   - 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows)
   - 输入 "Extensions: Show Recommended Extensions"
   - 安装所有推荐扩展

2. **验证 Prettier 配置**

   ```bash
   npm run format:check
   ```

3. **格式化所有代码**
   ```bash
   npm run format
   ```

### 日常开发

1. **编写代码**
   - 保存时自动格式化
   - ESLint 自动修复

2. **调试代码**
   - 按 F5 启动调试
   - 或使用调试面板选择配置

3. **提交前检查**
   ```bash
   npm run format:check
   npm run lint
   ```

---

## ⚙️ 配置说明

### Prettier 规则

```json
{
  "semi": true, // 使用分号
  "trailingComma": "es5", // ES5 支持的尾随逗号
  "singleQuote": true, // 使用单引号
  "printWidth": 100, // 行宽 100 字符
  "tabWidth": 2, // 缩进 2 空格
  "useTabs": false, // 使用空格而非 Tab
  "arrowParens": "always", // 箭头函数总是使用括号
  "endOfLine": "lf", // 使用 LF 换行符
  "bracketSpacing": true, // 对象字面量括号内有空格
  "jsxSingleQuote": false, // JSX 使用双引号
  "bracketSameLine": false // JSX 标签的 > 不与属性同行
}
```

### VS Code 设置亮点

- ✅ 保存时自动格式化
- ✅ 粘贴时自动格式化
- ✅ 自动修复 ESLint 问题
- ✅ 自动整理 imports
- ✅ Tailwind CSS 智能提示
- ✅ CSS @apply 规则支持

---

## 🔧 故障排除

### Prettier 不工作？

1. 检查是否安装扩展

   ```
   Prettier - Code formatter (esbenp.prettier-vscode)
   ```

2. 检查输出面板
   - 打开输出面板
   - 选择 "Prettier"
   - 查看错误信息

3. 重启 VS Code
   ```
   Cmd+Shift+P -> Developer: Reload Window
   ```

### 调试器无法连接？

1. 确保端口未被占用

   ```bash
   lsof -i :9229
   lsof -i :9222
   ```

2. 清理 Chrome 调试配置

   ```bash
   rm -rf .vscode/chrome-debug-profile
   ```

3. 检查 Node.js 版本
   ```bash
   node --version
   # 需要 Node.js 18+
   ```

### ESLint 报错？

1. 清理依赖重新安装

   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. 检查 `.eslintrc.json` 配置
3. 重启 ESLint 服务器
   ```
   Cmd+Shift+P -> ESLint: Restart ESLint Server
   ```

---

## 📚 相关文档

- [Prettier 文档](https://prettier.io/docs/en/)
- [ESLint 文档](https://eslint.org/docs/latest/)
- [VS Code 调试指南](https://code.visualstudio.com/docs/editor/debugging)
- [Next.js 调试文档](https://nextjs.org/docs/pages/building-your-application/configuring/debugging)

---

## 🎨 代码风格示例

### 格式化前

```typescript
const foo = { bar: 1, baz: 2 };
function test(a, b, c) {
  return a + b + c;
}
```

### 格式化后

```typescript
const foo = { bar: 1, baz: 2 };
function test(a, b, c) {
  return a + b + c;
}
```

---

## 💡 提示

- 使用 `Shift+Alt+F` (Mac: `Shift+Option+F`) 手动格式化当前文件
- 使用 `Cmd+K Cmd+F` (Mac) 格式化选中的代码
- 按 F5 快速启动调试
- 使用 `console.log` 时会自动在调试器中显示
