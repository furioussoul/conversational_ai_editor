'use client';

import { useEffect } from 'react';
import { useDocumentStore } from '@/store/documentStore';
import DocumentEditor from '@/components/DocumentEditor';
import Sidebar from '@/components/Sidebar';
import Header from '@/components/Header';

export default function Home() {
  const { loadDocuments, currentDocument } = useDocumentStore();

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  return (
    <div className="flex h-screen bg-background">
      {/* 左侧边栏 */}
      <Sidebar />

      {/* 主内容区 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 顶部导航栏 */}
        <Header />

        {/* 文档编辑器 */}
        <main className="flex-1 overflow-auto">
          {currentDocument ? (
            <DocumentEditor />
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-semibold text-muted-foreground">
                  选择或创建一个文档开始编辑
                </h2>
                <p className="mt-2 text-muted-foreground">
                  从左侧边栏选择现有文档，或创建新的知识库文档
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
