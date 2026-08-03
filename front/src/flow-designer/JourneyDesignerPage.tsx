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
import { FlowThemeContext, DARK_COLORS, LIGHT_COLORS } from './theme';
import { useAppTheme } from '../shell/theme';
import { WorkflowNode } from './WorkflowNode';
import { Palette } from './Palette';
import { PropertiesPanel } from './PropertiesPanel';
import { ErrorModal } from './ErrorModal';
import { Toolbar } from './Toolbar';
import { validateFlow } from './validation';
import {
  NODE_WIDTH,
  initialFlowNodes,
  initialFlowEdges,
  makeNode,
  newNodeId,
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
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current });
    const next = redoStack.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    setHistoryTick((t) => t + 1);
  }, []);

  // Marks exactly one node as selected (used when a node is created/duplicated).
  const selectOnlyNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
  }, []);

  const updateNodeData = useCallback((nodeId: string, patch: Partial<WFNodeData>) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    },
    [pushHistory],
  );

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
  const onBeforeDelete = useCallback(async () => {
    // START/END can be deleted freely; the "exactly one of each" rule is
    // enforced only at save time via validateFlow.
    pushHistory();
    return true;
  }, [pushHistory]);

  const addNodeAt = useCallback(
    (type: NodeType, x: number, y: number) => {
      pushHistory();
      const node = { ...makeNode(type, x, y), selected: true };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
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

  // START/END must stay unique, so copy/duplicate only apply to userTask nodes.
  const clipboardRef = useRef<WFNode | null>(null);

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodesRef.current.find((n) => n.id === nodeId);
      if (!source || source.type !== 'userTask') return;
      pushHistory();
      const clone = {
        ...source,
        id: newNodeId(),
        position: { x: source.position.x + 40, y: source.position.y + 40 },
        data: { ...source.data },
        selected: true,
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), clone]);
    },
    [pushHistory],
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      const selected = nodesRef.current.filter((n) => n.selected);
      if (e.key === 'c') {
        if (selected.length === 1 && selected[0].type === 'userTask') clipboardRef.current = selected[0];
      } else if (e.key === 'v') {
        if (clipboardRef.current) {
          e.preventDefault();
          duplicateNode(clipboardRef.current.id);
        }
      } else if (e.key === 'd') {
        if (selected.length === 1) {
          e.preventDefault();
          duplicateNode(selected[0].id);
        }
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [duplicateNode]);

  const onQuickAdd = useCallback(
    (nodeId: string, type: NodeType) => {
      const source = nodesRef.current.find((n) => n.id === nodeId);
      if (!source) return;
      pushHistory();
      const node = { ...makeNode(type, source.position.x + NODE_WIDTH + 140, source.position.y), selected: true };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
      setEdges((eds) => [...eds, { id: newConnectionId(), source: nodeId, target: node.id }]);
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
      onEdit: (nodeId) => selectOnlyNode(nodeId),
      onQuickAdd,
      onDelete: deleteNode,
    }),
    [onQuickAdd, selectOnlyNode, deleteNode],
  );

  const displayNodes = useMemo(
    () => nodes.map((n) => ({ ...n, data: { ...n.data, invalid: invalidNodeIds.has(n.id) } })),
    [nodes, invalidNodeIds],
  );

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const color = e.selected ? c.accent : c.edgeColor;
        return {
          ...e,
          type: 'smoothstep',
          style: { stroke: color, strokeWidth: e.selected ? 2.5 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [edges, c],
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

  const selectedNodes = nodes.filter((n) => n.selected);
  const singleSelectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

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
                deleteKeyCode={['Delete', 'Backspace']}
                multiSelectionKeyCode={['Control', 'Meta']}
                selectionKeyCode={['Control', 'Meta']}
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
              </ReactFlow>
            </div>
            {singleSelectedNode && (
              <PropertiesPanel
                node={singleSelectedNode}
                onClose={() => selectOnlyNode('')}
                onUpdate={(patch) => updateNodeData(singleSelectedNode.id, patch)}
                onDelete={() => deleteNode(singleSelectedNode.id)}
              />
            )}
          </div>
        </div>
        {errors.length > 0 && <ErrorModal errors={errors} onClose={() => setErrors([])} />}
      </WorkflowActionsContext.Provider>
    </FlowThemeContext.Provider>
  );
}
