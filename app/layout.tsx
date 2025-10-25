import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI 知识库 - 可视化 Agent 编辑器',
  description: '通过可视化文档编辑的方式定义和管理 AI Agent',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
