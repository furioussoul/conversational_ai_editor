'use client';

import { useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Panel,
} from 'reactflow';
import { Agent, Tool, Term, Journey, Guideline, Observation } from '@/types';
import { Wrench, BookOpen, Map, FileText, Eye, User, X, Save } from 'lucide-react';

interface AgentFlowCanvasProps {
  agent: Agent | null;
  onUpdateAgent?: (agent: Agent) => void;
}

interface NodeData {
  label: string;
  type: 'agent' | 'tool' | 'term' | 'journey' | 'guideline' | 'observation';
  data: any;
  icon: React.ReactNode;
  description?: string;
}

// 自定义节点组件
function CustomNode({ data }: { data: NodeData }) {
  const iconColor = {
    agent: 'text-purple-500',
    tool: 'text-blue-500',
    term: 'text-green-500',
    journey: 'text-orange-500',
    guideline: 'text-red-500',
    observation: 'text-yellow-500',
  }[data.type];

  const bgColor = {
    agent: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    tool: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    term: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    journey: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
    guideline: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    observation: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
  }[data.type];

  return (
    <div className={`px-4 py-3 rounded-lg border-2 ${bgColor} min-w-[200px] max-w-[300px]`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={iconColor}>{data.icon}</span>
        <div className="font-semibold text-gray-900 dark:text-white text-sm">{data.label}</div>
      </div>
      {data.description && (
        <div className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
          {data.description}
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  custom: CustomNode,
};

export default function AgentFlowCanvas({ agent, onUpdateAgent }: AgentFlowCanvasProps) {
  const [selectedNode, setSelectedNode] = useState<Node<NodeData> | null>(null);
  const [editingData, setEditingData] = useState<any>(null);

  // 将 Agent 转换为 ReactFlow 节点
  const initialNodes = useMemo(() => {
    if (!agent) return [];

    const nodes: Node<NodeData>[] = [];
    let yOffset = 0;
    const xSpacing = 350;
    const ySpacing = 150;

    // Agent 主节点
    nodes.push({
      id: 'agent',
      type: 'custom',
      position: { x: 400, y: yOffset },
      data: {
        label: agent.name || 'Agent',
        type: 'agent',
        data: { name: agent.name, description: agent.description },
        icon: <User className="w-5 h-5" />,
        description: agent.description,
      },
    });

    yOffset += ySpacing;

    // 工具节点
    if (agent.tools && agent.tools.length > 0) {
      agent.tools.forEach((tool, idx) => {
        nodes.push({
          id: `tool-${idx}`,
          type: 'custom',
          position: { x: 50 + (idx % 3) * xSpacing, y: yOffset },
          data: {
            label: tool.name,
            type: 'tool',
            data: tool,
            icon: <Wrench className="w-4 h-4" />,
            description: tool.description,
          },
        });
      });
      yOffset += ySpacing;
    }

    // 术语节点
    if (agent.terms && agent.terms.length > 0) {
      agent.terms.forEach((term, idx) => {
        nodes.push({
          id: `term-${idx}`,
          type: 'custom',
          position: { x: 50 + (idx % 3) * xSpacing, y: yOffset },
          data: {
            label: term.name,
            type: 'term',
            data: term,
            icon: <BookOpen className="w-4 h-4" />,
            description: term.description,
          },
        });
      });
      yOffset += ySpacing;
    }

    // 旅程节点
    if (agent.journeys && agent.journeys.length > 0) {
      agent.journeys.forEach((journey, idx) => {
        nodes.push({
          id: `journey-${idx}`,
          type: 'custom',
          position: { x: 50 + (idx % 3) * xSpacing, y: yOffset },
          data: {
            label: journey.title,
            type: 'journey',
            data: journey,
            icon: <Map className="w-4 h-4" />,
            description: journey.description,
          },
        });
      });
      yOffset += ySpacing;
    }

    // 指南节点
    if (agent.guidelines && agent.guidelines.length > 0) {
      agent.guidelines.forEach((guideline, idx) => {
        nodes.push({
          id: `guideline-${idx}`,
          type: 'custom',
          position: { x: 50 + (idx % 3) * xSpacing, y: yOffset },
          data: {
            label: `指南 ${idx + 1}`,
            type: 'guideline',
            data: guideline,
            icon: <FileText className="w-4 h-4" />,
            description: guideline.condition,
          },
        });
      });
      yOffset += ySpacing;
    }

    // 观察节点
    if (agent.observations && agent.observations.length > 0) {
      agent.observations.forEach((observation, idx) => {
        nodes.push({
          id: `observation-${idx}`,
          type: 'custom',
          position: { x: 50 + (idx % 3) * xSpacing, y: yOffset },
          data: {
            label: `观察点 ${idx + 1}`,
            type: 'observation',
            data: observation,
            icon: <Eye className="w-4 h-4" />,
            description: observation.description,
          },
        });
      });
    }

    return nodes;
  }, [agent]);

  // 创建连接边
  const initialEdges = useMemo(() => {
    if (!agent) return [];

    const edges: Edge[] = [];

    // 所有节点都连接到 Agent 主节点
    initialNodes.forEach((node) => {
      if (node.id !== 'agent') {
        edges.push({
          id: `edge-${node.id}`,
          source: 'agent',
          target: node.id,
          type: 'smoothstep',
          animated: false,
          style: { stroke: '#94a3b8' },
        });
      }
    });

    return edges;
  }, [agent, initialNodes]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node<NodeData>) => {
    setSelectedNode(node);
    setEditingData({ ...node.data.data });
  }, []);

  const handleClosePanel = useCallback(() => {
    setSelectedNode(null);
    setEditingData(null);
  }, []);

  const handleSave = useCallback(() => {
    if (!selectedNode || !editingData || !agent || !onUpdateAgent) return;

    const updatedAgent = { ...agent };
    const [type, idxStr] = selectedNode.id.split('-');
    const idx = parseInt(idxStr);

    switch (type) {
      case 'tool':
        if (updatedAgent.tools) {
          updatedAgent.tools[idx] = editingData;
        }
        break;
      case 'term':
        if (updatedAgent.terms) {
          updatedAgent.terms[idx] = editingData;
        }
        break;
      case 'journey':
        if (updatedAgent.journeys) {
          updatedAgent.journeys[idx] = editingData;
        }
        break;
      case 'guideline':
        if (updatedAgent.guidelines) {
          updatedAgent.guidelines[idx] = editingData;
        }
        break;
      case 'observation':
        if (updatedAgent.observations) {
          updatedAgent.observations[idx] = editingData;
        }
        break;
      case 'agent':
        updatedAgent.name = editingData.name;
        updatedAgent.description = editingData.description;
        break;
    }

    onUpdateAgent(updatedAgent);
    handleClosePanel();
  }, [selectedNode, editingData, agent, onUpdateAgent, handleClosePanel]);

  if (!agent) {
    return (
      <div className="flex h-full items-center justify-center text-gray-500 dark:text-gray-400">
        <div className="text-center">
          <Map className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>暂无可视化内容</p>
          <p className="text-sm mt-1">开始编写文档后即可看到流程图</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        nodeTypes={nodeTypes}
        fitView
        className="bg-gray-50 dark:bg-gray-900"
      >
        <Background color="#aaa" gap={16} />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const colors = {
              agent: '#a855f7',
              tool: '#3b82f6',
              term: '#22c55e',
              journey: '#f97316',
              guideline: '#ef4444',
              observation: '#eab308',
            };
            return colors[node.data.type as keyof typeof colors] || '#6b7280';
          }}
        />
        <Panel position="top-left" className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-md">
          <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {agent.name || 'Agent 流程图'}
          </div>
        </Panel>
      </ReactFlow>

      {/* 编辑面板 */}
      {selectedNode && editingData && (
        <div className="absolute right-4 top-4 bottom-4 w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              编辑 {selectedNode.data.label}
            </h3>
            <button
              onClick={handleClosePanel}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {selectedNode.data.type === 'agent' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    名称
                  </label>
                  <input
                    type="text"
                    value={editingData.name || ''}
                    onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editingData.description || ''}
                    onChange={(e) =>
                      setEditingData({ ...editingData, description: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'tool' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    工具名称
                  </label>
                  <input
                    type="text"
                    value={editingData.name || ''}
                    onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editingData.description || ''}
                    onChange={(e) =>
                      setEditingData({ ...editingData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    参数
                  </label>
                  <input
                    type="text"
                    value={editingData.parameters || ''}
                    onChange={(e) => setEditingData({ ...editingData, parameters: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    返回类型
                  </label>
                  <input
                    type="text"
                    value={editingData.returnType || ''}
                    onChange={(e) => setEditingData({ ...editingData, returnType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'guideline' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    条件
                  </label>
                  <textarea
                    value={editingData.condition || ''}
                    onChange={(e) => setEditingData({ ...editingData, condition: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    行动
                  </label>
                  <textarea
                    value={editingData.action || ''}
                    onChange={(e) => setEditingData({ ...editingData, action: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'term' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    术语名称
                  </label>
                  <input
                    type="text"
                    value={editingData.name || ''}
                    onChange={(e) => setEditingData({ ...editingData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editingData.description || ''}
                    onChange={(e) =>
                      setEditingData({ ...editingData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    同义词 (逗号分隔)
                  </label>
                  <input
                    type="text"
                    value={editingData.synonyms?.join(', ') || ''}
                    onChange={(e) =>
                      setEditingData({
                        ...editingData,
                        synonyms: e.target.value
                          .split(',')
                          .map((s) => s.trim())
                          .filter(Boolean),
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'journey' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    旅程标题
                  </label>
                  <input
                    type="text"
                    value={editingData.title || ''}
                    onChange={(e) => setEditingData({ ...editingData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editingData.description || ''}
                    onChange={(e) =>
                      setEditingData({ ...editingData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}

            {selectedNode.data.type === 'observation' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    描述
                  </label>
                  <textarea
                    value={editingData.description || ''}
                    onChange={(e) =>
                      setEditingData({ ...editingData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>
              </>
            )}
          </div>

          <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-2">
            <button
              onClick={handleClosePanel}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
            >
              取消
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              保存
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
