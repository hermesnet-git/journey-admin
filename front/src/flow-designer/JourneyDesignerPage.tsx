import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  MarkerType,
  MiniMap,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  useViewport,
  getViewportForBounds,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { WorkflowActionsContext, type WorkflowActions } from './actions-context';
import { FlowThemeContext, DARK_COLORS, LIGHT_COLORS } from './theme';
import { useAppTheme } from '../shell/theme';
import { WorkflowNode } from './WorkflowNode';
import { AnnotationNode } from './AnnotationNode';
import { Palette } from './Palette';
import { PropertiesDock } from './PropertiesDock';
import { ErrorModal } from './ErrorModal';
import { Toolbar } from './Toolbar';
import { validateFlow } from './validation';
import {
  NODE_WIDTH,
  TYPE_COLOR,
  initialFlowNodes,
  initialFlowEdges,
  makeNode,
  newNodeId,
  newConnectionId,
  computeLayout,
  findFreeSpot,
  SINGLE_OUTPUT_TYPES,
  FRONT_TO_BACKEND_TYPE,
  BACKEND_TO_FRONT_TYPE,
  outgoingLimitFor,
  makeAnnotation,
  isAnnotationId,
  type NodeType,
  type WFNode,
  type WFEdge,
  type WFEdgeData,
  type WFNodeData,
  type WFAnnotation,
  type EdgeShape,
} from './model';
import { updateJourney, type Journey } from '../api/journeys';
import { getFlow, updateFlow } from '../api/flows';
import { listForms, type Form } from '../api/forms';
import { listClusters, listCredentials, type MessagingCluster, type CredentialReference } from '../api/messaging';
import { ApiClientError } from '../api/client';

const nodeTypes = {
  start: WorkflowNode,
  userTask: WorkflowNode,
  end: WorkflowNode,
  serviceTask: WorkflowNode,
  receiveTask: WorkflowNode,
  messageStartEvent: WorkflowNode,
  gateway: WorkflowNode,
  annotation: AnnotationNode,
};

interface HistorySnapshot {
  nodes: WFNode[];
  edges: WFEdge[];
  annotations: WFAnnotation[];
}

export function JourneyDesignerPage({
  journey,
  onClose,
  onSaved,
  onOpenForm,
  onOpenNewForm,
}: {
  journey: Journey;
  onClose: () => void;
  onSaved: () => void;
  onOpenForm: (formId: string) => void;
  onOpenNewForm: () => void;
}) {
  return (
    <ReactFlowProvider>
      <DesignerInner journey={journey} onClose={onClose} onSaved={onSaved} onOpenForm={onOpenForm} onOpenNewForm={onOpenNewForm} />
    </ReactFlowProvider>
  );
}

function DesignerInner({
  journey,
  onClose,
  onSaved,
  onOpenForm,
  onOpenNewForm,
}: {
  journey: Journey;
  onClose: () => void;
  onSaved: () => void;
  onOpenForm: (formId: string) => void;
  onOpenNewForm: () => void;
}) {
  const { dark } = useAppTheme();
  const c = dark ? DARK_COLORS : LIGHT_COLORS;

  const [activeJourney, setActiveJourney] = useState<Journey>(journey);
  const [name, setName] = useState(journey.name);
  const [description, setDescription] = useState(journey.description ?? '');
  const [forms, setForms] = useState<Form[]>([]);
  const [clusters, setClusters] = useState<MessagingCluster[]>([]);
  const [credentials, setCredentials] = useState<CredentialReference[]>([]);
  const [nodes, setNodes] = useState<WFNode[]>(() => initialFlowNodes());
  const [edges, setEdges] = useState<WFEdge[]>(() => initialFlowEdges(nodes));
  // Separate from `nodes`: never touched by validateFlow/computeLayout/save-as-FlowNode mapping, so
  // nothing that walks the executable flow graph needs to know annotations exist.
  const [annotations, setAnnotations] = useState<WFAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [confirmingPublishedEdit, setConfirmingPublishedEdit] = useState(false);
  const [invalidNodeIds, setInvalidNodeIds] = useState<Set<string>>(new Set());
  const [, setHistoryTick] = useState(0);
  // The properties dock is always visible. It shows this node's properties
  // when set, and falls back to the journey's own properties when null (e.g.
  // after a blank-canvas click).
  const [propertiesNodeId, setPropertiesNodeId] = useState<string | null>(null);
  // Client-only, purely visual: highlights the path through the flow connected to whichever node
  // is hovered or selected, dimming the rest so a busy diagram stays readable.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Client-only display preference (which @xyflow/react edge renderer to use), remembered across
  // sessions but never sent to the backend — it isn't part of the flow's saved data.
  const [edgeShape, setEdgeShape] = useState<EdgeShape>(
    () => (localStorage.getItem('flow-designer:edge-shape') as EdgeShape | null) ?? 'smoothstep',
  );
  useEffect(() => {
    localStorage.setItem('flow-designer:edge-shape', edgeShape);
  }, [edgeShape]);

  const nodesRef = useRef(nodes);
  const edgesRef = useRef(edges);
  const annotationsRef = useRef(annotations);
  useEffect(() => {
    nodesRef.current = nodes;
  }, [nodes]);
  useEffect(() => {
    edgesRef.current = edges;
  }, [edges]);
  useEffect(() => {
    annotationsRef.current = annotations;
  }, [annotations]);
  useEffect(() => {
    setInvalidNodeIds(new Set());
  }, [nodes, edges]);

  // Keep the always-visible dock in sync with the current selection: clicking
  // any node on canvas updates it to that node's properties.
  useEffect(() => {
    const selectedNode = nodes.find((n) => n.selected);
    if (selectedNode && selectedNode.id !== propertiesNodeId) setPropertiesNodeId(selectedNode.id);
  }, [nodes, propertiesNodeId]);

  const undoStack = useRef<HistorySnapshot[]>([]);
  const redoStack = useRef<HistorySnapshot[]>([]);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView, getNodesBounds, getViewport, setViewport } = useReactFlow();
  const { zoom } = useViewport();

  // Fluxos são lidos/construídos da esquerda pra direita (mesma direção do auto-layout LR e de onde
  // novos nós nascem via onQuickAdd abaixo), então a visão inicial ancora perto da borda esquerda do
  // canvas com espaço pra crescer pra direita, em vez da centralização padrão do fitView — que só
  // desperdiça o espaço que está prestes a ser preenchido pelos próximos nós.
  const fitViewLeftAligned = useCallback(() => {
    const paneEl = wrapperRef.current;
    if (!paneEl || nodesRef.current.length === 0) return;
    const bounds = getNodesBounds(nodesRef.current.map((n) => n.id));
    if (bounds.width === 0 && bounds.height === 0) return;
    const { width: paneWidth, height: paneHeight } = paneEl.getBoundingClientRect();
    if (!paneWidth || !paneHeight) return;
    // minZoom espelha o <ReactFlow minZoom>; maxZoom é travado em 1 aqui (nunca dá zoom IN além do
    // tamanho natural) em vez do 1.6 do próprio canvas — ajustar um único nó pequeno ao painel
    // empurraria o zoom calculado pro máximo, e um nó grande e zoomado ainda parece "centralizado"
    // visualmente não importa onde sua borda esquerda tecnicamente esteja; um nó de tamanho natural
    // com canvas vazio de verdade à direita passa a sensação de "início de um fluxo" em vez disso.
    const { zoom: fitZoom, y } = getViewportForBounds(bounds, paneWidth, paneHeight, 0.4, 1, 0.3);
    const leftMargin = 64;
    setViewport({ x: leftMargin - bounds.x * fitZoom, y, zoom: fitZoom }, { duration: 0 });
  }, [getNodesBounds, setViewport]);

  // Ajusta o pan (nunca o zoom) só o suficiente pra trazer um nó totalmente pra dentro do canvas
  // visível — usado depois que o quick-add posiciona um nó novo mais à direita, que antes podia
  // nascer além da borda (ou atrás do painel de propriedades, sempre aberto) sem nada que o trouxesse
  // de volta à vista.
  const panIntoView = useCallback(
    (position: { x: number; y: number }) => {
      const paneEl = wrapperRef.current;
      if (!paneEl) return;
      const { width: paneWidth, height: paneHeight } = paneEl.getBoundingClientRect();
      if (!paneWidth || !paneHeight) return;
      const { x: panX, y: panY, zoom: currentZoom } = getViewport();
      const margin = 60;
      // O próprio botão "+" de quick-add do nó abre um popup uns 230px mais à direita que o nó em
      // si (deslocamento do botão + largura do submenu) — reserva essa folga à direita pra que
      // adicionar um nó não deixe só o nó cabendo, sem espaço pra abrir esse popup.
      const rightMargin = 260;
      const nodeHeightEstimate = 90; // cards vary (description/badges) — a visibility margin doesn't need the exact height
      const left = position.x * currentZoom + panX;
      const right = (position.x + NODE_WIDTH) * currentZoom + panX;
      const top = position.y * currentZoom + panY;
      const bottom = (position.y + nodeHeightEstimate) * currentZoom + panY;
      let dx = 0;
      let dy = 0;
      if (right > paneWidth - rightMargin) dx = paneWidth - rightMargin - right;
      else if (left < margin) dx = margin - left;
      if (bottom > paneHeight - margin) dy = paneHeight - margin - bottom;
      else if (top < margin) dy = margin - top;
      if (dx !== 0 || dy !== 0) setViewport({ x: panX + dx, y: panY + dy, zoom: currentZoom }, { duration: 220 });
    },
    [getViewport, setViewport],
  );

  const refreshForms = useCallback(() => {
    listForms().then(setForms);
  }, []);

  useEffect(() => {
    refreshForms();
  }, [refreshForms]);

  // Catálogo de clusters/credenciais (FT-14) — carregado uma vez; diferente de forms, não é criado
  // inline a partir do designer de fluxo, então não precisa de um refresh acionável pelo usuário.
  useEffect(() => {
    listClusters({ status: 'ACTIVE' }).then(setClusters);
    listCredentials({ status: 'ACTIVE' }).then(setCredentials);
  }, []);

  useEffect(() => {
    getFlow(journey.journeyId).then((flow) => {
      const loadedNodes: WFNode[] = flow.nodes.map((n) => ({
        id: n.nodeId,
        type: BACKEND_TO_FRONT_TYPE[n.nodeType],
        position: { x: n.positionX, y: n.positionY },
        data: {
          name: n.name,
          description: n.description ?? '',
          formId: n.userTaskConfig?.formId ?? null,
          messageText: n.userTaskConfig?.messageText ?? null,
          connectorConfig: n.connectorConfig,
          startVariables: n.startVariables ?? undefined,
        },
      }));
      setNodes(loadedNodes);
      setEdges(
        flow.connections.map((c) => ({
          id: c.connectionId,
          source: c.sourceNodeId,
          target: c.targetNodeId,
          data: { condition: c.condition ?? undefined, isDefault: c.isDefault },
        })),
      );
      setAnnotations(
        flow.annotations.map((a) => ({
          id: a.id,
          type: 'annotation' as const,
          position: { x: a.positionX, y: a.positionY },
          data: { text: a.text, linkedNodeIds: a.linkedNodeIds },
        })),
      );
      setLoading(false);
      // Os nós só recebem seu tamanho medido de verdade (do que o cálculo de bounds precisa) depois
      // que esse render é commitado — mesmo raciocínio do requestAnimationFrame no organize() abaixo.
      requestAnimationFrame(() => fitViewLeftAligned());
    });
  }, [journey, fitViewLeftAligned]);

  const pushHistory = useCallback(() => {
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current });
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current });
    const prev = undoStack.current.pop()!;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setAnnotations(prev.annotations);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current });
    const next = redoStack.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    setAnnotations(next.annotations);
    setHistoryTick((t) => t + 1);
  }, []);

  // Marks exactly one node as selected (used when a node is created/duplicated).
  const selectOnlyNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.map((n) => ({ ...n, selected: n.id === nodeId })));
  }, []);

  const updateNodeData = useCallback((nodeId: string, patch: Partial<WFNodeData>) => {
    setNodes((nds) => nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n)));
  }, []);

  const updateEdgeData = useCallback((edgeId: string, patch: Partial<WFEdgeData>) => {
    setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, ...patch } } : e)));
  }, []);

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushHistory();
      setNodes((nds) => nds.filter((n) => n.id !== nodeId));
      setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setAnnotations((anns) =>
        anns.map((a) =>
          a.data.linkedNodeIds.includes(nodeId)
            ? { ...a, data: { ...a.data, linkedNodeIds: a.data.linkedNodeIds.filter((id) => id !== nodeId) } }
            : a,
        ),
      );
      setPropertiesNodeId((cur) => (cur === nodeId ? null : cur));
    },
    [pushHistory],
  );

  // The canvas renders `nodes` and `annotations` concatenated into one array (there's only one
  // <ReactFlow>), so a single onNodesChange batch can mix changes for both — split by id prefix and
  // route each half back to its own state.
  const onNodesChange = useCallback<OnNodesChange<WFNode | WFAnnotation>>(
    (changes) => {
      const nodeChanges = changes.filter((c) => !('id' in c) || !isAnnotationId(c.id)) as NodeChange<WFNode>[];
      const annotationChanges = changes.filter((c) => 'id' in c && isAnnotationId(c.id)) as NodeChange<WFAnnotation>[];
      if (nodeChanges.length) setNodes((nds) => applyNodeChanges(nodeChanges, nds));
      if (annotationChanges.length) setAnnotations((anns) => applyNodeChanges(annotationChanges, anns));
    },
    [],
  );
  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes: EdgeChange[]) => setEdges((eds) => applyEdgeChanges(changes, eds)),
    [],
  );
  const onConnect = useCallback<OnConnect>(
    (params) => {
      // Dragging from an annotation's handle to a flow node links them (a faint dashed line, see
      // annotationLinkEdges) instead of creating a real FlowConnection — annotations aren't part of
      // the executable flow, so this never touches the BPMN-bound `edges` state.
      if (params.source && isAnnotationId(params.source) && params.target) {
        const targetId = params.target;
        pushHistory();
        setAnnotations((anns) =>
          anns.map((a) =>
            a.id === params.source && !a.data.linkedNodeIds.includes(targetId)
              ? { ...a, data: { ...a.data, linkedNodeIds: [...a.data.linkedNodeIds, targetId] } }
              : a,
          ),
        );
        return;
      }
      const source = nodesRef.current.find((n) => n.id === params.source);
      if (source?.type) {
        const outCount = edgesRef.current.filter((e) => e.source === params.source).length;
        if (outCount >= outgoingLimitFor(source.type)) return;
      }
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
      const spot = findFreeSpot(nodesRef.current, x, y);
      const node = { ...makeNode(type, spot.x, spot.y), selected: true };
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

  const addAnnotationFromPalette = useCallback(() => {
    const rect = wrapperRef.current?.getBoundingClientRect();
    const center = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 400, y: 300 };
    const pos = screenToFlowPosition(center);
    pushHistory();
    const annotation = { ...makeAnnotation(pos.x - 95, pos.y - 30), selected: true };
    setAnnotations((anns) => [...anns.map((a) => ({ ...a, selected: false })), annotation]);
  }, [pushHistory, screenToFlowPosition]);

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

  // Single-of-a-kind types (start/end/messageStartEvent) must stay unique, so
  // copy/duplicate only apply to the repeatable task types.
  const clipboardRef = useRef<WFNode | null>(null);

  const duplicateNode = useCallback(
    (nodeId: string) => {
      const source = nodesRef.current.find((n) => n.id === nodeId);
      if (!source || !source.type || !SINGLE_OUTPUT_TYPES.includes(source.type)) return;
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
        const type = selected[0]?.type;
        if (selected.length === 1 && type && SINGLE_OUTPUT_TYPES.includes(type)) clipboardRef.current = selected[0];
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
      if (!source || !source.type) return;
      const outCount = edgesRef.current.filter((e) => e.source === nodeId).length;
      if (outCount >= outgoingLimitFor(source.type)) return;
      pushHistory();
      // Os dois ramos do Gateway se abrem acima/abaixo da origem (mesmo deslocamento que o
      // auto-layout usa entre linhas irmãs) em vez de empilhar na mesma linha da origem, pra que
      // caminho A/B leiam como ramos distintos à primeira vista. O primeiro adicionado é sugerido
      // como caminho padrão — exatamente um dos dois precisa ser (REQ-03.11.002) — o usuário pode
      // trocar no GatewayFields.
      const isGateway = source.type === 'gateway';
      const branchYOffset = isGateway ? (outCount === 0 ? -44 : 44) : 0;
      const node = {
        ...makeNode(type, source.position.x + NODE_WIDTH + 140, source.position.y + branchYOffset),
        selected: true,
      };
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
      setEdges((eds) => [
        ...eds,
        {
          id: newConnectionId(),
          source: nodeId,
          target: node.id,
          ...(isGateway && outCount === 0 ? { data: { isDefault: true } } : {}),
        },
      ]);
      // Nós novos sempre nascem à direita da origem — o fluxo continua crescendo até ultrapassar o
      // canvas visível (ou ficar atrás do painel de propriedades, sempre aberto) sem nada que o
      // acompanhe.
      panIntoView(node.position);
    },
    [pushHistory, panIntoView],
  );

  const onPaneClick = useCallback(() => {
    setPropertiesNodeId(null);
  }, []);

  const organize = useCallback(() => {
    pushHistory();
    setNodes((nds) => computeLayout(nds, edgesRef.current));
    requestAnimationFrame(() => fitView({ padding: 0.2, duration: 200 }));
  }, [pushHistory, fitView]);

  const onUpdateAnnotationText = useCallback((annotationId: string, text: string) => {
    setAnnotations((anns) => anns.map((a) => (a.id === annotationId ? { ...a, data: { ...a.data, text } } : a)));
  }, []);

  const onDeleteAnnotation = useCallback(
    (annotationId: string) => {
      pushHistory();
      setAnnotations((anns) => anns.filter((a) => a.id !== annotationId));
    },
    [pushHistory],
  );

  const onUnlinkAnnotation = useCallback(
    (annotationId: string, nodeId: string) => {
      pushHistory();
      setAnnotations((anns) =>
        anns.map((a) =>
          a.id === annotationId
            ? { ...a, data: { ...a.data, linkedNodeIds: a.data.linkedNodeIds.filter((id) => id !== nodeId) } }
            : a,
        ),
      );
    },
    [pushHistory],
  );

  const actions = useMemo<WorkflowActions>(
    () => ({
      onEdit: (nodeId) => {
        selectOnlyNode(nodeId);
        setPropertiesNodeId(nodeId);
      },
      onQuickAdd,
      onDelete: deleteNode,
      onOpenForm,
      getFormName: (formId) => forms.find((f) => f.formId === formId)?.name,
      getForm: (formId) => forms.find((f) => f.formId === formId),
      onUpdateAnnotationText,
      onDeleteAnnotation,
      onUnlinkAnnotation,
      getNodeName: (nodeId) => nodesRef.current.find((n) => n.id === nodeId)?.data.name,
    }),
    [onQuickAdd, selectOnlyNode, deleteNode, onOpenForm, forms, onUpdateAnnotationText, onDeleteAnnotation, onUnlinkAnnotation],
  );

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          invalid: invalidNodeIds.has(n.id),
          outgoingLimitReached:
            !!n.type && edges.filter((e) => e.source === n.id).length >= outgoingLimitFor(n.type),
          zoom,
        },
      })),
    [nodes, edges, invalidNodeIds, zoom],
  );

  const displayAnnotations = useMemo(() => annotations.map((a) => ({ ...a, data: { ...a.data, zoom } })), [annotations, zoom]);

  // Derived, not stored: a faint dashed line per (annotation, linkedNodeId) pair, straight from the
  // annotation's own linkedNodeIds — there's no separate "link" state to keep in sync.
  const annotationLinkEdges = useMemo(
    () =>
      annotations.flatMap((a) =>
        a.data.linkedNodeIds.map((nodeId) => ({
          id: `AnnotationLink_${a.id}_${nodeId}`,
          source: a.id,
          target: nodeId,
          type: 'straight' as const,
          selectable: false,
          style: {
            stroke: dark ? 'rgba(202,138,4,0.55)' : 'rgba(180,130,10,0.5)',
            strokeWidth: 1,
            strokeDasharray: '3 4',
            vectorEffect: 'non-scaling-stroke' as const,
          },
        })),
      ),
    [annotations, dark],
  );

  const selectedNodeId = useMemo(() => nodes.find((n) => n.selected)?.id ?? null, [nodes]);
  const focusNodeId = hoveredNodeId ?? selectedNodeId;

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const onFocusedPath = !!focusNodeId && (e.source === focusNodeId || e.target === focusNodeId);
        const dimmed = !!focusNodeId && !onFocusedPath;
        const color = e.selected || onFocusedPath ? c.accent : c.edgeColor;
        return {
          ...e,
          type: edgeShape,
          // Same label the read-only "Fluxo da Jornada" viewer already shows (FlowDiagramViewer) —
          // a gateway's outgoing path is otherwise invisible on canvas until you open its
          // properties, and the two views ended up inconsistent with each other.
          label: e.data?.isDefault ? 'padrão' : (e.data?.condition ?? undefined),
          labelStyle: { fill: c.textSecondary, fontSize: 11 },
          labelBgStyle: { fill: 'transparent' },
          labelBgPadding: [0, 0] as [number, number],
          style: {
            stroke: color,
            strokeWidth: e.selected || onFocusedPath ? 2.5 : 1.5,
            opacity: dimmed ? 0.25 : 1,
            vectorEffect: 'non-scaling-stroke' as const,
            transition: 'opacity 150ms ease-out, stroke 150ms ease-out',
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [edges, c, focusNodeId, edgeShape],
  );

  function handleSave() {
    const { errors: validationErrors, invalidNodeIds: invalid } = validateFlow(nodes, edges);
    if (!name.trim()) validationErrors.push('Informe o nome da jornada.');
    if (validationErrors.length) {
      setInvalidNodeIds(invalid);
      setErrors(validationErrors);
      return;
    }

    if (activeJourney.status === 'PUBLISHED') {
      setConfirmingPublishedEdit(true);
      return;
    }

    doSave();
  }

  async function doSave() {
    setSaving(true);
    try {
      const journeyRecord = await updateJourney(activeJourney.journeyId, { name, description });
      await updateFlow(journeyRecord.journeyId, {
        name: 'Fluxo principal',
        nodes: nodes.map((n) => ({
          nodeId: n.id,
          nodeType: FRONT_TO_BACKEND_TYPE[n.type as NodeType],
          name: n.data.name,
          description: n.data.description || null,
          positionX: Math.round(n.position.x),
          positionY: Math.round(n.position.y),
          userTaskConfig:
            n.data.formId || n.data.messageText
              ? { formId: n.data.formId || null, messageText: n.data.messageText || null }
              : null,
          connectorConfig: n.data.connectorConfig,
          startVariables: n.data.startVariables ?? null,
        })),
        connections: edges.map((e) => ({
          connectionId: e.id,
          sourceNodeId: e.source,
          targetNodeId: e.target,
          condition: e.data?.condition ?? null,
          isDefault: !!e.data?.isDefault,
        })),
        annotations: annotations.map((a) => ({
          id: a.id,
          text: a.data.text,
          positionX: Math.round(a.position.x),
          positionY: Math.round(a.position.y),
          linkedNodeIds: a.data.linkedNodeIds,
        })),
      });
      setActiveJourney(journeyRecord);
      onSaved();
    } catch (err) {
      // Uma violação estrutural (422) vem com uma lista de mensagens em `details` — usar cada uma
      // como item próprio do ErrorModal em vez da mensagem única (que junta tudo com "; ") faz a
      // lista aparecer como itens separados de verdade, não um parágrafo só.
      if (err instanceof ApiClientError && err.details?.length) {
        setErrors(err.details.map((d) => d.message));
      } else {
        setErrors([err instanceof Error ? err.message : 'Erro ao salvar jornada.']);
      }
    } finally {
      setSaving(false);
    }
  }

  const propertiesNode = nodes.find((n) => n.id === propertiesNodeId) ?? null;

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
            edgeShape={edgeShape}
            onEdgeShapeChange={setEdgeShape}
            zoomPct={Math.round(zoom * 100)}
            onZoomIn={() => zoomIn({ duration: 150 })}
            onZoomOut={() => zoomOut({ duration: 150 })}
            onFitToScreen={() => fitView({ padding: 0.2, duration: 200 })}
            onSave={handleSave}
            saving={saving}
            onCancel={onClose}
          />
          <div className="flex-1 flex min-h-0">
            <Palette onAdd={addNodeFromPalette} onAddAnnotation={addAnnotationFromPalette} />
            <div
              ref={wrapperRef}
              className="flex-1 relative min-w-0"
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              <ReactFlow
                nodes={[...displayNodes, ...displayAnnotations]}
                edges={[...displayEdges, ...annotationLinkEdges]}
                nodeTypes={nodeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onPaneClick={onPaneClick}
                onNodeDragStart={onNodeDragStart}
                onNodeMouseEnter={(_, node) => setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                onBeforeDelete={onBeforeDelete}
                deleteKeyCode={['Delete', 'Backspace']}
                multiSelectionKeyCode={['Control', 'Meta']}
                selectionKeyCode={['Control', 'Meta']}
                minZoom={0.4}
                maxZoom={1.6}
                connectionRadius={30}
                snapToGrid
                snapGrid={[16, 16]}
                defaultEdgeOptions={{ type: edgeShape }}
                colorMode={dark ? 'dark' : 'light'}
                style={{ background: c.canvasBg }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} color={c.dotColor} gap={20} size={1.2} />
                <MiniMap
                  pannable
                  zoomable
                  nodeColor={(n) => TYPE_COLOR[n.type as NodeType] ?? c.textSecondary}
                  nodeStrokeWidth={0}
                  nodeBorderRadius={4}
                  maskColor={dark ? 'rgba(14,15,19,0.65)' : 'rgba(244,244,247,0.7)'}
                  style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 8 }}
                />
              </ReactFlow>
            </div>
            <PropertiesDock
              node={propertiesNode}
              forms={forms}
              clusters={clusters}
              credentials={credentials}
              allNodes={nodes}
              allEdges={edges}
              journeyId={activeJourney.journeyId}
              onUpdateNode={(patch) => propertiesNode && updateNodeData(propertiesNode.id, patch)}
              onUpdateEdge={updateEdgeData}
              onDeleteNode={() => propertiesNode && deleteNode(propertiesNode.id)}
              onOpenNewForm={onOpenNewForm}
              onRefreshForms={refreshForms}
              journey={{
                productName: activeJourney.productName,
                channelName: activeJourney.channelName,
                name,
                onNameChange: setName,
                description,
                onDescriptionChange: setDescription,
              }}
            />
          </div>
        </div>
        {errors.length > 0 && <ErrorModal errors={errors} onClose={() => setErrors([])} />}
        {confirmingPublishedEdit && (
          <ConfirmDialog
            title="Editar jornada publicada?"
            message="Esta jornada está publicada. Salvar agora grava essas alterações numa versão em rascunho separada — a versão publicada continua ativa até que o rascunho seja publicado."
            confirmLabel="Salvar como rascunho"
            onConfirm={() => {
              setConfirmingPublishedEdit(false);
              doSave();
            }}
            onCancel={() => setConfirmingPublishedEdit(false)}
          />
        )}
      </WorkflowActionsContext.Provider>
    </FlowThemeContext.Provider>
  );
}
