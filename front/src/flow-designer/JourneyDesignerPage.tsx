import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MarkerType,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  useViewport,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { WorkflowActionsContext, type WorkflowActions } from './actions-context';
import { WorkflowNode } from './WorkflowNode';
import { Palette } from './Palette';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { JourneyPanel, type JourneyMeta } from './JourneyPanel';
import { Toolbar } from './Toolbar';
import { validateFlow } from './validation';
import {
  NODE_WIDTH,
  initialFlowNodes,
  initialFlowEdges,
  makeNode,
  newConnectionId,
  type NodeType,
  type WFNode,
  type WFEdge,
  type WFNodeData,
} from './model';
import { createJourney, updateJourney, type Journey } from '../api/journeys';
import { getFlow, updateFlow } from '../api/flows';

const nodeTypes = { start: WorkflowNode, userTask: WorkflowNode, end: WorkflowNode };

interface HistorySnapshot {
  nodes: WFNode[];
  edges: WFEdge[];
}

export function JourneyDesignerPage({
  journey,
  onClose,
  onSaved,
}: {
  journey: Journey | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <ReactFlowProvider>
      <DesignerInner journey={journey} onClose={onClose} onSaved={onSaved} />
    </ReactFlowProvider>
  );
}

function DesignerInner({
  journey,
  onClose,
  onSaved,
}: {
  journey: Journey | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = journey === null;
  const [meta, setMeta] = useState<JourneyMeta>({
    name: journey?.name ?? '',
    description: journey?.description ?? '',
    channelId: journey?.channelId ?? '',
  });
  const [nodes, setNodes] = useState<WFNode[]>(() => initialFlowNodes());
  const [edges, setEdges] = useState<WFEdge[]>(() => initialFlowEdges(nodes));
  const [loading, setLoading] = useState(!isNew);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [, setHistoryTick] = useState(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);

  const undoStack = useRef<HistorySnapshot[]>([]);
  const redoStack = useRef<HistorySnapshot[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  useEffect(() => {
    if (isNew || !journey) return;
    getFlow(journey.journeyId).then((flow) => {
      const loadedNodes: WFNode[] = flow.nodes.map((n) => ({
        id: n.nodeId,
        type: n.nodeType === 'START' ? 'start' : n.nodeType === 'END' ? 'end' : 'userTask',
        position: { x: n.positionX, y: n.positionY },
        data: { name: n.name, description: n.description ?? '' },
      }));
      setNodes(loadedNodes);
      setEdges(flow.connections.map((c) => ({ id: c.connectionId, source: c.sourceNodeId, target: c.targetNodeId })));
      setLoading(false);
    });
  }, [isNew, journey]);

  const pushHistory = useCallback(() => {
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const prev = undoStack.current.pop()!;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setSelectedNodeId(null);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const next = redoStack.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    setSelectedNodeId(null);
    setHistoryTick((t) => t + 1);
  }, []);

  const onNodesChange = useCallback<OnNodesChange<WFNode>>(
    (changes: NodeChange<WFNode>[]) => setNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );
  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback<OnConnect>(
    (params) => {
      pushHistory();
      setEdges((eds) => addEdge({ ...params, id: newConnectionId() }, eds));
    },
    [pushHistory],
  );
  const onNodeDragStart = useCallback(() => pushHistory(), [pushHistory]);
  const onBeforeDelete = useCallback(
    async ({ nodes: toDelete }: { nodes: WFNode[] }) => {
      if (toDelete.some((n) => n.type === 'start' || n.type === 'end')) return false;
      pushHistory();
      return true;
    },
    [pushHistory],
  );

  const addNodeAt = useCallback(
    (type: NodeType, x: number, y: number) => {
      pushHistory();
      const node = makeNode(type, x, y);
      setNodes((nds) => [...nds, node]);
      setSelectedNodeId(node.id);
    },
    [pushHistory],
  );

  const addNodeFromPalette = useCallback(
    (type: NodeType) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const center = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 400, y: 300 };
      const pos = screenToFlowPosition(center);
      addNodeAt(type, pos.x - NODE_WIDTH / 2, pos.y - 30);
    },
    [addNodeAt, screenToFlowPosition],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const type = e.dataTransfer.getData('text/plain') as NodeType;
      if (!type) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNodeAt(type, pos.x - NODE_WIDTH / 2, pos.y - 30);
    },
    [addNodeAt, screenToFlowPosition],
  );

  const updateNodeData = useCallback((nodeId: string, patch: Partial<WFNodeData>) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setSelectedNodeId(null);
    },
    [pushHistory],
  );

  const actions = useMemo<WorkflowActions>(
    () => ({
      onEdit: (nodeId) => setSelectedNodeId(nodeId),
    }),
    [],
  );

  async function handleSave() {
    const validationErrors = validateFlow(nodes, edges);
    if (!meta.name.trim()) validationErrors.push('Informe o nome da jornada.');
    if (isNew && !meta.channelId) validationErrors.push('Selecione o canal da jornada.');
    if (validationErrors.length) {
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    setErrors([]);
    try {
      const journeyId = isNew
        ? (await createJourney({ channelId: meta.channelId, name: meta.name, description: meta.description }))
            .journeyId
        : journey!.journeyId;

      if (!isNew) {
        await updateJourney(journeyId, { name: meta.name, description: meta.description });
      }

      await updateFlow(journeyId, {
        name: 'Fluxo principal',
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          nodeType: n.type === 'start' ? 'START' : n.type === 'end' ? 'END' : 'USER_TASK',
          name: n.data.name,
          description: n.data.description || null,
          positionX: Math.round(n.position.x),
          positionY: Math.round(n.position.y),
          formId: null,
        })),
        connections: edges.map((e) => ({ connectionId: e.id, sourceNodeId: e.source, targetNodeId: e.target })),
      });

      onSaved();
    } catch (err) {
      setErrors([err instanceof Error ? err.message : 'Erro ao salvar jornada.']);
    } finally {
      setSaving(false);
    }
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px] text-[#71717a]">Carregando fluxo...</div>
    );
  }

  return (
    <WorkflowActionsContext.Provider value={actions}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <Toolbar
          journeyName={meta.name}
          canUndo={undoStack.current.length > 0}
          canRedo={redoStack.current.length > 0}
          onUndo={undo}
          onRedo={redo}
          zoomPct={Math.round(zoom * 100)}
          onZoomIn={() => zoomIn({ duration: 150 })}
          onZoomOut={() => zoomOut({ duration: 150 })}
          onFitToScreen={() => fitView({ padding: 0.2, duration: 200 })}
          onSave={handleSave}
          saving={saving}
          onClose={onClose}
        />
        {errors.length > 0 && (
          <div className="px-4 py-2 bg-[#fef2f2] border-b border-[#fecaca] text-[12.5px] text-[#b91c1c]">
            {errors.map((e, i) => (
              <div key={i}>{e}</div>
            ))}
          </div>
        )}
        <div className="flex-1 flex min-h-0">
          <JourneyPanel meta={meta} onChange={setMeta} locked={!isNew} />
          <Palette onAdd={addNodeFromPalette} />
          <div
            ref={wrapperRef}
            className="flex-1 relative min-w-0"
            onDragOver={(e) => e.preventDefault()}
            onDrop={onDrop}
          >
            <ReactFlow
              nodes={nodes}
              edges={edges.map((e) => ({ ...e, type: 'smoothstep', markerEnd: { type: MarkerType.ArrowClosed } }))}
              nodeTypes={nodeTypes}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeDragStart={onNodeDragStart}
              onBeforeDelete={onBeforeDelete}
              onNodeDoubleClick={(_, node) => setSelectedNodeId(node.id)}
              deleteKeyCode={['Delete', 'Backspace']}
              minZoom={0.4}
              maxZoom={1.6}
              defaultEdgeOptions={{ type: 'smoothstep' }}
              proOptions={{ hideAttribution: true }}
            >
              <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} />
            </ReactFlow>
          </div>
          {selectedNode && (
            <NodePropertiesPanel
              node={selectedNode}
              onClose={() => setSelectedNodeId(null)}
              onUpdate={(patch) => updateNodeData(selectedNode.id, patch)}
              onDelete={() => deleteNode(selectedNode.id)}
            />
          )}
        </div>
      </div>
    </WorkflowActionsContext.Provider>
  );
}
