import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Map as MapIcon, X } from 'lucide-react';
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
  reconnectEdge,
  useReactFlow,
  useViewport,
  type OnNodesChange,
  type OnEdgesChange,
  type OnConnect,
  type OnReconnect,
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
import { FormPreviewDock, DOCK_DEFAULT_HEIGHT } from './FormPreviewDock';
import { ErrorModal } from './ErrorModal';
import { GeneratePromptModal, type GenerateLogEntry } from './GeneratePromptModal';
import { Toolbar } from './Toolbar';
import { validateFlow } from './validation';
import {
  NODE_WIDTH,
  NODE_DIMENSIONS,
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
  orderedUserTasks,
  availableVariableOriginsAt,
  type NodeType,
  type WFNode,
  type WFEdge,
  type WFEdgeData,
  type WFNodeData,
  type WFAnnotation,
  type EdgeShape,
} from './model';
import { updateJourney, type Journey } from '../api/journeys';
import { getFlow, updateFlow, generateFlow, type Flow } from '../api/flows';
import { listForms, type Form } from '../api/forms';
import { listClusters, listCredentials, type MessagingCluster, type CredentialReference } from '../api/messaging';
import { ApiClientError } from '../api/client';
import { useToast } from '../products/Toast';

// Mesmo formato enviado a updateJourney/updateFlow — usado tanto pro save de verdade quanto pra
// detectar, comparando com o snapshot salvo pela última vez, se há algo pra salvar. Sem isso,
// "Salvar" sem nenhuma edição real ainda dispara updateFlow, que sempre grava uma nova versão em
// rascunho (UpdateFlow.execute chama createJourneyVersion incondicionalmente).
function buildFlowSnapshot(
  name: string,
  description: string,
  nodes: WFNode[],
  edges: WFEdge[],
  annotations: WFAnnotation[],
) {
  return JSON.stringify({
    name,
    description,
    nodes: nodes.map((n) => ({
      nodeId: n.id,
      nodeType: FRONT_TO_BACKEND_TYPE[n.type as NodeType],
      name: n.data.name,
      description: n.data.description || null,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      userTaskConfig:
        n.data.messageText || (n.data.embeddedScreen && n.data.embeddedScreen.length > 0)
          ? {
              messageText: n.data.messageText || null,
              embeddedScreen: n.data.embeddedScreen ?? [],
            }
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
}

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
  const { dark, colors: appColors } = useAppTheme();
  const c = dark ? DARK_COLORS : LIGHT_COLORS;
  const { showToast } = useToast();

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
  // Vive aqui (não dentro do FormPreviewDock) porque o dock desmonta toda vez que a seleção sai de
  // uma User Task — um state interno perderia o redimensionamento do usuário a cada troca de nó.
  const [dockHeight, setDockHeight] = useState(DOCK_DEFAULT_HEIGHT);
  // "Fixar" o editor de tela: enquanto ativo, o dock continua mostrando a última User Task válida
  // mesmo depois de selecionar outra coisa (ou nada) no canvas — ver previewNode mais abaixo.
  const [dockPinned, setDockPinned] = useState(false);
  const [pinnedPreviewNodeId, setPinnedPreviewNodeId] = useState<string | null>(null);
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
  // Mesma ideia do edgeShape: preferência só de exibição, lembrada entre sessões. Padrão vazio
  // (sem tingir o fundo do card com a cor do tipo do nó) — pedido explícito do usuário.
  const [nodeFill, setNodeFill] = useState<boolean>(
    () => localStorage.getItem('flow-designer:node-fill') === 'true',
  );
  useEffect(() => {
    localStorage.setItem('flow-designer:node-fill', String(nodeFill));
  }, [nodeFill]);
  // Minimapa começa recolhido de propósito (pedido do usuário) — só um botão no canto até clicar
  // pra usar; não persiste entre sessões (sempre volta a recolhido, diferente de edgeShape/nodeFill).
  const [minimapOpen, setMinimapOpen] = useState(false);

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
  // Snapshot (mesmo formato enviado ao backend) do que está salvo agora — comparado no handleSave
  // pra saber se há algo de fato pra salvar. Populado ao carregar o fluxo e atualizado após cada
  // save bem-sucedido.
  const savedSnapshotRef = useRef<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const { screenToFlowPosition, zoomIn, zoomOut, fitView, getNodesBounds, getViewport, setViewport } = useReactFlow();
  const { zoom } = useViewport();

  // Padrão pedido pelo usuário: sempre 100% de zoom (nunca reduz pra caber o fluxo inteiro na tela,
  // mesmo que ultrapasse a área visível — o usuário navega/dá pan pro resto) com o início do fluxo
  // ancorado perto da borda esquerda do canvas, não centralizado — mesma direção do auto-layout LR e
  // de onde novos nós nascem via onQuickAdd abaixo, então o espaço à direita já nasce livre pra
  // crescer. Usado ao carregar uma jornada (nova ou existente) e depois do "Gerar com IA".
  const fitViewLeftAligned = useCallback(() => {
    const paneEl = wrapperRef.current;
    if (!paneEl || nodesRef.current.length === 0) return;
    const bounds = getNodesBounds(nodesRef.current.map((n) => n.id));
    if (bounds.width === 0 && bounds.height === 0) return;
    const { height: paneHeight } = paneEl.getBoundingClientRect();
    if (!paneHeight) return;
    const zoom = 1;
    const leftMargin = 64;
    const y = paneHeight / 2 - (bounds.y + bounds.height / 2) * zoom;
    setViewport({ x: leftMargin - bounds.x * zoom, y, zoom }, { duration: 0 });
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
    listClusters().then(setClusters);
    listCredentials().then(setCredentials);
  }, []);

  // Mapeamento puro backend -> estado do canvas, reaproveitado tanto pelo carregamento inicial
  // quanto pela geração por prompt (GeneratePromptModal) abaixo.
  const mapFlowToState = useCallback(
    (flow: Flow) => ({
      nodes: flow.nodes.map((n) => ({
        id: n.nodeId,
        type: BACKEND_TO_FRONT_TYPE[n.nodeType],
        position: { x: n.positionX, y: n.positionY },
        data: {
          name: n.name,
          description: n.description ?? '',
          messageText: n.userTaskConfig?.messageText ?? null,
          embeddedScreen: n.userTaskConfig?.embeddedScreen ?? [],
          connectorConfig: n.connectorConfig,
          startVariables: n.startVariables ?? undefined,
        },
      })) as WFNode[],
      edges: flow.connections.map((c) => ({
        id: c.connectionId,
        source: c.sourceNodeId,
        target: c.targetNodeId,
        data: { condition: c.condition ?? undefined, isDefault: c.isDefault },
      })) as WFEdge[],
      annotations: flow.annotations.map((a) => ({
        id: a.id,
        type: 'annotation' as const,
        position: { x: a.positionX, y: a.positionY },
        data: { text: a.text, linkedNodeIds: a.linkedNodeIds },
      })) as WFAnnotation[],
    }),
    [],
  );

  useEffect(() => {
    getFlow(journey.journeyId).then((flow) => {
      const mapped = mapFlowToState(flow);
      setNodes(mapped.nodes);
      setEdges(mapped.edges);
      setAnnotations(mapped.annotations);
      savedSnapshotRef.current = buildFlowSnapshot(
        journey.name,
        journey.description ?? '',
        mapped.nodes,
        mapped.edges,
        mapped.annotations,
      );
      setLoading(false);
      // Os nós só recebem seu tamanho medido de verdade (do que o cálculo de bounds precisa) depois
      // que esse render é commitado — mesmo raciocínio do requestAnimationFrame no organize() abaixo.
      requestAnimationFrame(() => fitViewLeftAligned());
    });
  }, [journey, fitViewLeftAligned, mapFlowToState]);

  const [generateModalOpen, setGenerateModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateLog, setGenerateLog] = useState<GenerateLogEntry[]>([]);

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

  // O back-end só valida/monta o fluxo (FlowValidator) e devolve um preview — nada é persistido
  // aqui. pushHistory antes de aplicar deixa Ctrl+Z desfazer a geração como qualquer outra edição.
  const handleGenerate = useCallback(
    async (prompt: string) => {
      setGenerating(true);
      setGenerateLog([]);
      try {
        const flow = await generateFlow(activeJourney.journeyId, prompt, (message) =>
          setGenerateLog((log) => [...log, { text: message }]),
        );
        const mapped = mapFlowToState(flow);
        pushHistory();
        setNodes(computeLayout(mapped.nodes, mapped.edges));
        setEdges(mapped.edges);
        setAnnotations(mapped.annotations);
        setGenerateModalOpen(false);
        setGenerateLog([]);
        requestAnimationFrame(() => fitViewLeftAligned());
      } catch (err) {
        // Fica no log do próprio modal (em vermelho), não num ErrorModal separado — o usuário
        // continua vendo o prompt e o histórico de tentativas junto do erro, e pode ajustar e
        // tentar de novo sem perder o contexto.
        const messages =
          err instanceof ApiClientError && err.details?.length
            ? err.details.map((d) => d.message)
            : [err instanceof Error ? err.message : 'Erro ao gerar fluxo.'];
        setGenerateLog((log) => [...log, ...messages.map((text) => ({ text, error: true }))]);
      } finally {
        setGenerating(false);
      }
    },
    [activeJourney.journeyId, mapFlowToState, pushHistory, fitViewLeftAligned],
  );

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
  // Arrastar a ponta de uma seta já existente pra outro nó (retarget), em vez de excluir e puxar
  // uma nova — mesma regra de limite de saída do onConnect, só reaplicada quando a origem muda
  // (mover só a ponta de destino nunca altera quantas saídas o nó de origem tem).
  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, newConnection) => {
      if (isAnnotationId(oldEdge.source)) return;
      if (newConnection.source !== oldEdge.source) {
        const source = nodesRef.current.find((n) => n.id === newConnection.source);
        if (source?.type) {
          const outCount = edgesRef.current.filter((e) => e.source === newConnection.source && e.id !== oldEdge.id).length;
          if (outCount >= outgoingLimitFor(source.type)) return;
        }
      }
      pushHistory();
      // shouldReplaceId: false — por padrão reconnectEdge troca o id da aresta por um formato
      // próprio da lib (xy-edge__...), que não bate com o padrão "Flow_..." que o back exige
      // (FlowConnectionInput.connectionId, @Pattern "^Flow_.+") e quebra o salvamento.
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds, { shouldReplaceId: false }));
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
      const dim = NODE_DIMENSIONS[type];
      addNodeAt(type, pos.x - dim.width / 2, pos.y - dim.height / 2);
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
      const dim = NODE_DIMENSIONS[type];
      addNodeAt(type, pos.x - dim.width / 2, pos.y - dim.height / 2);
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
      // A toolbar já anuncia "Desfazer (Ctrl+Z)"/"Refazer (Ctrl+Y)" nos tooltips dos botões (ver
      // Toolbar.tsx), mas o atalho de teclado em si nunca tinha sido implementado aqui — só os
      // botões funcionavam. Ctrl+Shift+Z como redo também, de brinde: convenção comum o bastante
      // (Mac/vários apps) pra valer o `else if` a mais.
      if (e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        redo();
      } else if (e.key === 'z') {
        e.preventDefault();
        undo();
      } else if (e.key === 'y') {
        e.preventDefault();
        redo();
      } else if (e.key === 'c') {
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
  }, [duplicateNode, undo, redo]);

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
        ...makeNode(type, source.position.x + NODE_DIMENSIONS[source.type].width + 140, source.position.y + branchYOffset),
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

    if (buildFlowSnapshot(name, description, nodes, edges, annotations) === savedSnapshotRef.current) {
      showToast('Nenhuma alteração foi feita — nenhuma nova versão será gerada.', 'info');
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
            n.data.messageText || (n.data.embeddedScreen && n.data.embeddedScreen.length > 0)
              ? {
                  messageText: n.data.messageText || null,
                  embeddedScreen: n.data.embeddedScreen ?? [],
                }
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
      savedSnapshotRef.current = buildFlowSnapshot(name, description, nodes, edges, annotations);
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
  // Dock segue a seleção diretamente: qualquer User Task selecionada mostra o dock (editor de tela
  // embutido). Exceção: canal URA não tem editor de tela (paleta vazia) — o único mecanismo dele é
  // messageText, então só mostra o dock ali quando já existe uma mensagem configurada.
  const isValidPreviewTarget =
    propertiesNode?.type === 'userTask' && (activeJourney.channelType !== 'URA' || !!propertiesNode.data.messageText);
  // Fixado (dockPinned): selecionar qualquer outra coisa some não esconde mais o dock — ele fica
  // preso na última User Task válida (pinnedPreviewNodeId) até ser desafixado ou apagado.
  const previewNode = isValidPreviewTarget
    ? propertiesNode
    : dockPinned
      ? (nodes.find((n) => n.id === pinnedPreviewNodeId) ?? null)
      : null;
  const previewVariables = previewNode ? availableVariableOriginsAt(previewNode.id, nodes, edges, forms) : [];
  const userTasks = orderedUserTasks(nodes, edges);

  useEffect(() => {
    if (isValidPreviewTarget && propertiesNode) setPinnedPreviewNodeId(propertiesNode.id);
  }, [isValidPreviewTarget, propertiesNode?.id]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center text-[13px]" style={{ color: c.textSecondary }}>
        Carregando fluxo...
      </div>
    );
  }

  return (
    <FlowThemeContext.Provider value={{ dark, c, nodeFill }}>
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
            nodeFill={nodeFill}
            onNodeFillChange={setNodeFill}
            zoomPct={Math.round(zoom * 100)}
            onZoomIn={() => zoomIn({ duration: 150 })}
            onZoomOut={() => zoomOut({ duration: 150 })}
            onFitToScreen={() => fitView({ padding: 0.2, duration: 200 })}
            onSave={handleSave}
            saving={saving}
            onCancel={onClose}
            onGenerate={() => setGenerateModalOpen(true)}
            journeyName={name}
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
                onReconnect={onReconnect}
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
                {minimapOpen ? (
                  <>
                    <MiniMap
                      position="top-right"
                      pannable
                      zoomable
                      nodeColor={(n) => TYPE_COLOR[n.type as NodeType] ?? c.textSecondary}
                      nodeStrokeWidth={0}
                      nodeBorderRadius={4}
                      maskColor={dark ? 'rgba(14,15,19,0.65)' : 'rgba(244,244,247,0.7)'}
                      style={{ background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 8 }}
                    />
                    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
                      <button
                        onClick={() => setMinimapOpen(false)}
                        title="Recolher minimapa"
                        className="w-[20px] h-[20px] rounded-full flex items-center justify-center cursor-pointer border-0"
                        style={{ background: c.cardBg, border: `1px solid ${c.border}`, color: c.textSecondary }}
                      >
                        <X size={11} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 30 }}>
                    <button
                      onClick={() => setMinimapOpen(true)}
                      title="Abrir minimapa"
                      className="w-[28px] h-[28px] rounded-lg flex items-center justify-center cursor-pointer border-0"
                      style={{ background: c.cardBg, border: `1px solid ${c.border}`, color: c.textSecondary }}
                    >
                      <MapIcon size={14} />
                    </button>
                  </div>
                )}
              </ReactFlow>
              {previewNode && (
                <FormPreviewDock
                  nodeName={previewNode.data.name}
                  channelType={activeJourney.channelType}
                  journeyId={activeJourney.journeyId}
                  nodeId={previewNode.id}
                  embeddedScreen={previewNode.data.embeddedScreen ?? []}
                  onEmbeddedScreenChange={(fields) => updateNodeData(previewNode.id, { embeddedScreen: fields })}
                  onPushHistory={pushHistory}
                  forms={forms}
                  onRefreshForms={refreshForms}
                  onOpenNewForm={onOpenNewForm}
                  variables={previewVariables}
                  userTasks={userTasks}
                  onNavigateTask={selectOnlyNode}
                  height={dockHeight}
                  onHeightChange={setDockHeight}
                  pinned={dockPinned}
                  onPinnedChange={setDockPinned}
                />
              )}
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
        {generateModalOpen && (
          <GeneratePromptModal
            generating={generating}
            log={generateLog}
            onGenerate={handleGenerate}
            onCancel={() => {
              setGenerateModalOpen(false);
              setGenerateLog([]);
            }}
          />
        )}
        {confirmingPublishedEdit && (
          <ConfirmDialog
            title="Editar jornada publicada?"
            message={
              <>
                Esta jornada está publicada. Salvar agora grava essas alterações numa versão em rascunho separada.{' '}
                <strong style={{ color: appColors.warning }}>
                  A versão publicada continua ativa até que o rascunho seja publicado.
                </strong>
              </>
            }
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
