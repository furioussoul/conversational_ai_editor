'use client';

import {
    useCallback,
    useEffect,
    useState,
    type ChangeEvent as ReactChangeEvent,
    type MouseEvent as ReactMouseEvent,
} from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    applyEdgeChanges,
    applyNodeChanges,
    type Connection,
    type Edge,
    type EdgeChange,
    type Node,
    type NodeChange,
} from 'reactflow';

import 'reactflow/dist/style.css';

import { Button } from '@/components/ui/button';
import type { Journey, JourneyEdge, JourneyNode, Tool } from '@/lib/data/types';
import { cn } from '@/lib/utils';
import {
    ChatNode,
    EndNode,
    StartNode,
    ToolNode,
    type ChatNodeData,
    type ToolNodeData,
} from './nodes';

const nodeTypes = {
  start: StartNode,
  chat: ChatNode,
  tool: ToolNode,
  end: EndNode,
};

type JourneyFlowEditorProps = {
  journey: Journey;
  tools: Tool[];
  className?: string;
  onJourneyChange: (journey: Journey) => void;
  onSelectEdge: (edgeId: string | null) => void;
};

type FlowNode = Node<ChatNodeData | ToolNodeData | Record<string, unknown>>;

type FlowEdge = Edge;

const EDGE_DEFAULT_LABEL = '请填写条件…';

export function JourneyFlowEditor({
  journey,
  tools,
  className,
  onJourneyChange,
  onSelectEdge,
}: JourneyFlowEditorProps) {
  const [flowNodes, setFlowNodes] = useState<FlowNode[]>([]);
  const [flowEdges, setFlowEdges] = useState<FlowEdge[]>([]);

  const toJourneyNode = useCallback((node: FlowNode): JourneyNode => {
    const { onContentChange, onToolChange, tools: _tools, ...restData } = node.data ?? {};
    return {
      id: node.id,
      type: node.type as JourneyNode['type'],
      position: node.position,
      data: restData,
    };
  }, []);

  const toJourneyEdge = useCallback((edge: FlowEdge): JourneyEdge => {
    return {
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label,
    };
  }, []);

  const updateJourneyFromNodes = useCallback(
    (nodes: FlowNode[]) => {
      const updatedJourney: Journey = {
        ...journey,
        nodes: nodes.map(toJourneyNode),
        edges: flowEdges.map(toJourneyEdge),
      };
      onJourneyChange(updatedJourney);
    },
    [journey, flowEdges, onJourneyChange, toJourneyEdge, toJourneyNode],
  );

  const updateJourneyFromEdges = useCallback(
    (edges: FlowEdge[]) => {
      const updatedJourney: Journey = {
        ...journey,
        nodes: flowNodes.map(toJourneyNode),
        edges: edges.map(toJourneyEdge),
      };
      onJourneyChange(updatedJourney);
    },
    [journey, flowNodes, onJourneyChange, toJourneyEdge, toJourneyNode],
  );

  useEffect(() => {
    const nodes: FlowNode[] = journey.nodes.map((node) => ({
      id: node.id,
      type: node.type,
      position: node.position,
      data: {
        ...node.data,
        tools,
        onContentChange: (value: string) => {
          setFlowNodes((current: FlowNode[]) => {
            const updated = current.map((existing: FlowNode) =>
              existing.id === node.id
                ? {
                    ...existing,
                    data: { ...existing.data, content: value },
                  }
                : existing,
            );
            updateJourneyFromNodes(updated);
            return updated;
          });
        },
        onToolChange: (toolId: string) => {
          setFlowNodes((current: FlowNode[]) => {
            const updated = current.map((existing: FlowNode) =>
              existing.id === node.id
                ? {
                    ...existing,
                    data: { ...existing.data, toolId },
                  }
                : existing,
            );
            updateJourneyFromNodes(updated);
            return updated;
          });
        },
      },
    }));
    setFlowNodes(nodes);
  }, [journey.nodes, tools, updateJourneyFromNodes]);

  useEffect(() => {
    const edges: FlowEdge[] = journey.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      label: edge.label ?? EDGE_DEFAULT_LABEL,
      animated: false,
    }));
    setFlowEdges(edges);
  }, [journey.edges]);

  const onNodesChange = useCallback(
    (changes: NodeChange<FlowNode>[]) => {
      setFlowNodes((nodes: FlowNode[]) => {
        const updated = applyNodeChanges(changes, nodes);
        updateJourneyFromNodes(updated);
        return updated;
      });
    },
    [updateJourneyFromNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<FlowEdge>[]) => {
      setFlowEdges((edges: FlowEdge[]) => {
        const updated = applyEdgeChanges(changes, edges);
        updateJourneyFromEdges(updated);
        return updated;
      });
    },
    [updateJourneyFromEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      setFlowEdges((edges: FlowEdge[]) => {
        const newEdge: FlowEdge = {
          id: crypto.randomUUID(),
          source: connection.source ?? '',
          target: connection.target ?? '',
          label: EDGE_DEFAULT_LABEL,
          animated: false,
        };
        const updated = addEdge(newEdge, edges);
        updateJourneyFromEdges(updated);
        return updated;
      });
    },
    [updateJourneyFromEdges],
  );

  const handleAddNode = useCallback(
    (type: JourneyNode['type']) => {
      const newNode: FlowNode = {
        id: crypto.randomUUID(),
        type,
        position: { x: 100, y: 100 },
        data: {
          label:
            type === 'chat'
              ? 'Agent Says'
              : type === 'tool'
                ? '调用工具'
                : type === 'start'
                  ? '开始'
                  : '结束',
          content: type === 'chat' ? '新的回复内容…' : undefined,
          toolId: undefined,
          tools,
        },
      };
      const updatedNodes = [...flowNodes, newNode];
      setFlowNodes(updatedNodes);
      updateJourneyFromNodes(updatedNodes);
    },
    [flowNodes, tools, updateJourneyFromNodes],
  );

  const handleEdgeLabelChange = useCallback(
    (edgeId: string, label: string) => {
      setFlowEdges((edges: FlowEdge[]) => {
        const updated = edges.map((edge: FlowEdge) =>
          edge.id === edgeId
            ? {
                ...edge,
                label,
              }
            : edge,
        );
        updateJourneyFromEdges(updated);
        return updated;
      });
    },
    [updateJourneyFromEdges],
  );

  return (
    <div className={cn('flex h-full flex-col gap-3', className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => handleAddNode('chat')}>
          添加聊天节点
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAddNode('tool')}>
          添加工具节点
        </Button>
        <Button variant="outline" size="sm" onClick={() => handleAddNode('end')}>
          添加结束节点
        </Button>
      </div>

      <div className="flex-1 overflow-hidden rounded-md border border-border">
        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgeClick={(
            _event: ReactMouseEvent<Element, globalThis.MouseEvent>,
            edge: FlowEdge,
          ) => onSelectEdge(edge.id)}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <MiniMap pannable zoomable className="bg-muted/20" />
          <Controls position="bottom-right" />
          <Background gap={24} size={1} color="#e4e4e7" />
        </ReactFlow>
      </div>

      <EdgeLabelEditor
        edges={flowEdges}
        onLabelChange={handleEdgeLabelChange}
        onSelectEdge={onSelectEdge}
      />
    </div>
  );
}

type EdgeLabelEditorProps = {
  edges: FlowEdge[];
  onLabelChange: (edgeId: string, label: string) => void;
  onSelectEdge: (edgeId: string | null) => void;
};

function EdgeLabelEditor({ edges, onLabelChange, onSelectEdge }: EdgeLabelEditorProps) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  useEffect(() => {
    onSelectEdge(selectedEdgeId);
  }, [onSelectEdge, selectedEdgeId]);

  if (!edges.length) {
    return (
      <div className="rounded-md border border-dashed border-muted px-3 py-2 text-xs text-muted-foreground">
        当前流程中还没有连线，请连接节点后为其填写条件。
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">点击选择一条连线以编辑条件：</p>
      <div className="grid gap-2">
        {edges.map((edge) => (
          <label
            key={edge.id}
            className={cn(
              'flex flex-col gap-1 rounded-md border border-border bg-background p-2 text-xs',
              selectedEdgeId === edge.id && 'border-primary shadow-sm',
            )}
          >
            <span className="font-medium text-foreground">
              {edge.source} → {edge.target}
            </span>
            <input
              value={edge.label ?? ''}
              onChange={(event: ReactChangeEvent<HTMLInputElement>) =>
                onLabelChange(edge.id, event.target.value)
              }
              onFocus={() => setSelectedEdgeId(edge.id)}
              className="rounded-md border border-input bg-background px-2 py-1 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="触发条件描述…"
            />
          </label>
        ))}
      </div>
    </div>
  );
}
