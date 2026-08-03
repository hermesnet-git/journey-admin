import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MiniMap,
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
import { FlowThemeContext, DARK_COLORS, LIGHT_COLORS } from './theme';
import { useAppTheme } from '../shell/theme';
import { WorkflowNode } from './WorkflowNode';
import { Palette } from './Palette';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { ErrorModal } from './ErrorModal';
import { Toolbar } from './Toolbar';
import { validateFlow } from './validation';
import {
  NODE_WIDTH,
  initialFlowNodes,
  initialFlowEdges,
  makeNode,
  newConnectionId,
  computeLayout,
  type NodeType,
  type WFNode,
  type WFEdge,
  type WFNodeData,
} from './model';
import { createJourney, updateJourney, type Journey } from '../api/journeys';
import { getFlow, updateFlow } from '../api/flows';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';

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
  const { dark } = useAppTheme();
  const c = dark ? DARK_COLORS : LIGHT_COLORS;

  const [activeJourney, setActiveJourney] = useState<Journey | null>(journey);
  const [name, setName] = useState(journey?.name ?? '');
  const [description, setDescription] = useState(journey?.description ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [productId, setProductId] = useState(journey?.productId ?? '');
  const [channelId, setChannelId] = useState(journey?.channelId ?? '');
  const [nodes, setNodes] = useState<WFNode[]>(() => initialFlowNodes());
  const [edges, setEdges] = useState<WFEdge[]>(() => initialFlowEdges(nodes));
  const [loading, setLoading] = useState(!!journey);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [invalidNodeIds, setInvalidNodeIds] = useState<Set<string>>(new Set());
  const [, setHistoryTick] = useState(0);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    setInvalidNodeIds(new Set());
  }, [nodes, edges]);

  const undoStack = useRef<HistorySnapshot[]>([]);
  const redoStack = useRef<HistorySnapshot[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();

  useEffect(() => {
    if (journey) return;
    listProducts({ status: 'ACTIVE' }).then(setProducts);
  }, [journey]);

  useEffect(() => {
    if (journey || !productId) {
      if (!journey) setChannels([]);
      return;
    }
    listChannels(productId, { status: 'ACTIVE' }).then(setChannels);
  }, [journey, productId]);

  useEffect(() => {
    if (!journey) return;
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
  }, [journey]);

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
      // Only block deleting the last remaining START/END — the flow must always
      // keep exactly one of each, but extras (e.g. from quick-add) can be removed.
      const startCount = nodesRef.current.filter((n) => n.type === 'start').length;
      const endCount = nodesRef.current.filter((n) => n.type === 'end').length;
      const deletingLastStart = toDelete.some((n) => n.type === 'start') && startCount <= 1;
      const deletingLastEnd = toDelete.some((n) => n.type === 'end') && endCount <= 1;
      if (deletingLastStart || deletingLastEnd) return false;
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

  const onQuickAdd = useCallback(
    (nodeId: string, type: NodeType) => {
      const source = nodesRef.current.find((n) => n.id === nodeId);
      if (!source) return;
      pushHistory();
      const node = makeNode(type, source.position.x + NODE_WIDTH + 140, source.position.y);
      setNodes((nds) => [...nds, node]);
      setEdges((eds) => [...eds, { id: newConnectionId(), source: nodeId, target: node.id }]);
      setSelectedNodeId(node.id);
    },
    [pushHistory],
  );

  const organize = useCallback(() => {
    pushHistory();
    setNodes((nds) => computeLayout(nds, edgesRef.current));
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [pushHistory, fitView]);

  const actions = useMemo<WorkflowActions>(
    () => ({
      onEdit: (nodeId) => setSelectedNodeId(nodeId),
      onQuickAdd,
    }),
    [onQuickAdd],
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
        data: { ...n.data, invalid: invalidNodeIds.has(n.id) },
      })),
    [nodes, invalidNodeIds, selectedNodeId],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const highlighted = selectedNodeId != null && (e.source === selectedNodeId || e.target === selectedNodeId);
        const color = highlighted ? c.accent : c.handleColor;
        return {
          ...e,
          type: 'smoothstep',
          animated: highlighted,
          style: { stroke: color, strokeWidth: highlighted ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [edges, selectedNodeId, c],
  );

  async function handleSave() {
    const { errors: validationErrors, invalidNodeIds: invalid } = validateFlow(nodes, edges);
    if (!name.trim()) validationErrors.push('Informe o nome da jornada.');
    if (!activeJourney && !channelId) validationErrors.push('Selecione o produto e o canal da jornada.');
    if (validationErrors.length) {
      setInvalidNodeIds(invalid);
      setErrors(validationErrors);
      return;
    }

    setSaving(true);
    try {
      const journeyRecord = activeJourney
        ? await updateJourney(activeJourney.journeyId, { name, description })
        : await createJourney({ channelId, name, description });
      await updateFlow(journeyRecord.journeyId, {
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
      setActiveJourney(journeyRecord);
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
      <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: c.textSecondary }}>
        Carregando fluxo...
      </div>
    );
  }

  return (
    <FlowThemeContext.Provider value={{ dark, c }}>
      <WorkflowActionsContext.Provider value={actions}>
        <div className="flex-1 flex flex-col overflow-hidden">
          <Toolbar
            canUndo={undoStack.current.length > 0}
            canRedo={redoStack.current.length > 0}
            onUndo={undo}
            onRedo={redo}
            onOrganize={organize}
            zoomPct={Math.round(zoom * 100)}
            onZoomIn={() => zoomIn({ duration: 150 })}
            onZoomOut={() => zoomOut({ duration: 150 })}
            onFitToScreen={() => fitView({ padding: 0.2, duration: 200 })}
            onSave={handleSave}
            saving={saving}
            onCancel={onClose}
          />
          <div className="flex-1 flex min-h-0">
            <Palette
              onAdd={addNodeFromPalette}
              journey={{
                products,
                channels,
                productId,
                channelId,
                onProductChange: (id) => {
                  setProductId(id);
                  setChannelId('');
                },
                onChannelChange: setChannelId,
                lockedProductName: activeJourney ? activeJourney.productName : undefined,
                lockedChannelName: activeJourney ? activeJourney.channelName : undefined,
                name,
                onNameChange: setName,
                description,
                onDescriptionChange: setDescription,
              }}
            />
            <div
              ref={wrapperRef}
              className="flex-1 relative min-w-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <ReactFlow
                nodes={displayNodes}
                edges={displayEdges}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeDragStart={onNodeDragStart}
                onBeforeDelete={onBeforeDelete}
                onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                onPaneClick={() => setSelectedNodeId(null)}
                deleteKeyCode={['Delete', 'Backspace']}
                minZoom={0.4}
                maxZoom={1.6}
                snapToGrid
                snapGrid={[16, 16]}
                defaultEdgeOptions={{ type: 'smoothstep' }}
                colorMode={dark ? 'dark' : 'light'}
                style={{ background: c.canvasBg }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} color={c.dotColor} gap={20} size={1.4} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) => (n.type === 'start' ? '#16a34a' : n.type === 'end' ? '#dc2626' : '#019DF4')}
                  maskColor={dark ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.65)'}
                  style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
                />
              </ReactFlow>
            </div>
            {selectedNode && (
              <NodePropertiesPanel
                node={selectedNode}
                canDelete={
                  (selectedNode.type !== 'start' || nodes.filter((n) => n.type === 'start').length > 1) &&
                  (selectedNode.type !== 'end' || nodes.filter((n) => n.type === 'end').length > 1)
                }
                onClose={() => setSelectedNodeId(null)}
                onUpdate={(patch) => updateNodeData(selectedNode.id, patch)}
                onDelete={() => deleteNode(selectedNode.id)}
              />
            )}
          </div>
        </div>
        {errors.length > 0 && <ErrorModal errors={errors} onClose={() => setErrors([])} />}
      </WorkflowActionsContext.Provider>
    </FlowThemeContext.Provider>
  );
}
