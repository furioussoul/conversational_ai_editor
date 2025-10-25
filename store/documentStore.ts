import { create } from 'zustand';
import { KnowledgeDocument, DocumentStatus, BuildResult, Agent } from '@/types';
import { parseMarkdownToAgent } from '@/lib/markdownParser';

interface DocumentStore {
  // 当前文档
  currentDocument: KnowledgeDocument | null;

  // 所有文档列表
  documents: KnowledgeDocument[];

  // 操作方法
  setCurrentDocument: (doc: KnowledgeDocument | null) => void;
  updateDocument: (updates: Partial<KnowledgeDocument>) => void;

  // 文档管理
  createDocument: (title: string, createdBy: string) => KnowledgeDocument;
  loadDocuments: () => void;
  saveDocument: () => void;

  // 状态变更
  submitForReview: () => void;
  publish: (reviewedBy: string) => Promise<BuildResult>;
  archive: () => void;
}

export const useDocumentStore = create<DocumentStore>((set, get) => ({
  currentDocument: null,
  documents: [],

  setCurrentDocument: (doc) => set({ currentDocument: doc }),

  updateDocument: (updates) =>
    set((state) => ({
      currentDocument: state.currentDocument
        ? { ...state.currentDocument, ...updates, updatedAt: new Date() }
        : null,
    })),

  createDocument: (title, createdBy) => {
    const newDoc: KnowledgeDocument = {
      id: `doc_${Date.now()}`,
      title,
      status: DocumentStatus.DRAFT,
      markdown: '', // 初始化为空 Markdown
      version: 1,
      createdBy,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    set((state) => ({
      documents: [...state.documents, newDoc],
      currentDocument: newDoc,
    }));

    return newDoc;
  },

  loadDocuments: () => {
    // 从 localStorage 或 API 加载文档
    const stored = localStorage.getItem('ai-kb-documents');
    if (stored) {
      try {
        const documents = JSON.parse(stored);
        set({ documents });
      } catch (e) {
        console.error('Failed to load documents:', e);
      }
    }
  },

  saveDocument: () => {
    const { documents } = get();
    localStorage.setItem('ai-kb-documents', JSON.stringify(documents));
  },

  submitForReview: () =>
    set((state) => {
      if (!state.currentDocument) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          status: DocumentStatus.REVIEWING,
          updatedAt: new Date(),
        },
      };
    }),

  publish: async (reviewedBy) => {
    const { currentDocument } = get();
    if (!currentDocument) {
      return {
        success: false,
        errors: ['No document selected'],
        buildAt: new Date(),
      };
    }

    // 解析 Markdown 生成 Agent
    const parseResult = await parseMarkdownToAgent(currentDocument.markdown);

    if (!parseResult.success || !parseResult.agent) {
      return {
        success: false,
        errors: parseResult.errors || ['Failed to parse document'],
        warnings: parseResult.warnings,
        buildAt: new Date(),
      };
    }

    // 构建成功
    const agentId = parseResult.agent.id;

    set((state) => ({
      currentDocument: state.currentDocument
        ? {
            ...state.currentDocument,
            status: DocumentStatus.PUBLISHED,
            agentId,
            parsedAgent: parseResult.agent,
            publishedAt: new Date(),
            reviewedBy,
            reviewedAt: new Date(),
          }
        : null,
    }));

    return {
      success: true,
      agentId,
      agent: parseResult.agent,
      warnings: parseResult.warnings,
      buildAt: new Date(),
    };
  },

  archive: () =>
    set((state) => {
      if (!state.currentDocument) return state;
      return {
        currentDocument: {
          ...state.currentDocument,
          status: DocumentStatus.ARCHIVED,
          updatedAt: new Date(),
        },
      };
    }),
}));
