import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Loader2, Map as MapIcon, X } from 'lucide-react';
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
  type OnConnectEnd,
  type OnReconnect,
  type NodeChange,
  type EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { WorkflowActionsContext, type WorkflowActions } from './actions-context';
import { FlowThemeContext, DARK_COLORS, LIGHT_COLORS, JOURNEY_CANVAS_BG_DARK, JOURNEY_CANVAS_DOT_DARK } from './theme';
import { useAppTheme } from '../shell/theme';
import { WorkflowNode } from './WorkflowNode';
import { AnnotationNode } from './AnnotationNode';
import { Palette } from './Palette';
import { PropertiesDock } from './PropertiesDock';
import { FormDesignerDock, DOCK_DEFAULT_HEIGHT } from './FormDesignerDock';
import { ErrorModal } from './ErrorModal';
import { EditJourneyChannelsModal } from '../journeys/EditJourneyChannelsModal';
import { Toolbar } from './Toolbar';
import { flowEdgeTypes } from './FlowEdge';
import {
  NODE_WIDTH,
  TYPE_COLOR,
  initialFlowNodes,
  initialFlowEdges,
  makeNode,
  newNodeId,
  newConnectionId,
  GATEWAY_BRANCH_GAP,
  GATEWAY_GAP_X,
  RANK_SEP,
  findFreeSpot,
  SINGLE_OUTPUT_TYPES,
  FRONT_TO_BACKEND_TYPE,
  BACKEND_TO_FRONT_TYPE,
  outgoingLimitFor,
  ERROR_HANDLE,
  isErrorEdge,
  canHaveErrorPath,
  gatewayViolations,
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
  type NodeNote,
} from './model';
import { updateJourney, type Journey } from '../api/journeys';
import { getFlow, updateFlow, validateFlow, type Flow, type FlowUpdateInput } from '../api/flows';
import { listClusters, listCredentials, type MessagingCluster, type CredentialReference } from '../api/messaging';
import { ApiClientError } from '../api/client';
import { useToast } from '../products/Toast';
import { listAuthoringComponentDefinitions, type ComponentDefinition } from '../api/componentDefinitions';
import { createNode as createSduiNode, type SduiNode } from '../sdui/model';
import { COLLAPSED_SECTION, computeLayout, computeLayoutForSection, computeLayoutForSelection, computeRoutes } from './layout';
import type { EdgeRoute } from './edgeRouter';
import { nodeSize, useNodeDisplayMode, type NodeDisplayMode } from './nodeMode';
import { fitBox, freeSectionSpot, memberBounds, refitSections, SECTION_DEFAULT, SECTION_HEADER, SECTION_PAD, toSectionState, withMembers, type SectionState } from './sections';
import { readableCondition, screenVariableLabels } from './conditionLabel';
import { clearTourPending, guideNotes, isTourPending } from './notes';
import { GuidePanel } from './GuidePanel';
import { NodeSearch } from './NodeSearch';
import { NavigationBar } from './NavigationBar';
import { SectionNode, type WFSectionNode } from './SectionNode';
import type { FlowSection } from '../api/flows';

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
  sections: FlowSection[],
) {
  return JSON.stringify({
    name,
    description,
    sections,
    nodes: nodes.map((n) => ({
      nodeId: n.id,
      nodeType: FRONT_TO_BACKEND_TYPE[n.type as NodeType],
      name: n.data.name,
      description: n.data.description || null,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      userTaskConfig: n.type === 'userTask'
        ? { embeddedScreenRoot: n.data.embeddedScreenRoot ?? null, dataSources: n.data.screenDataSources?.length ? n.data.screenDataSources : null }
        : null,
      connectorConfig: n.data.connectorConfig,
      startVariables: n.data.startVariables ?? null,
    })),
    connections: edges.map((e) => ({
      connectionId: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      condition: e.data?.condition ?? null,
      label: e.data?.label || null,
      isDefault: !!e.data?.isDefault,
      onError: !!e.data?.onError,
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

// Mesmo mapeamento WFNode/WFEdge/WFAnnotation → FlowUpdateInput usado tanto por Salvar (updateFlow)
// quanto por Validar (validateFlow) — extraído aqui pra não duplicar a conversão duas vezes.
function buildFlowInput(nodes: WFNode[], edges: WFEdge[], annotations: WFAnnotation[], layoutMode: NodeDisplayMode, sections: FlowSection[]): FlowUpdateInput {
  return {
    name: 'Fluxo principal',
    layoutMode,
    sections,
    nodes: nodes.map((n) => ({
      nodeId: n.id,
      nodeType: FRONT_TO_BACKEND_TYPE[n.type as NodeType],
      name: n.data.name,
      description: n.data.description || null,
      positionX: Math.round(n.position.x),
      positionY: Math.round(n.position.y),
      userTaskConfig: n.type === 'userTask'
        ? { embeddedScreenRoot: n.data.embeddedScreenRoot ?? null, dataSources: n.data.screenDataSources?.length ? n.data.screenDataSources : null }
        : null,
      connectorConfig: n.data.connectorConfig,
      startVariables: n.data.startVariables ?? null,
    })),
    connections: edges.map((e) => ({
      connectionId: e.id,
      sourceNodeId: e.source,
      targetNodeId: e.target,
      condition: e.data?.condition ?? null,
      label: e.data?.label || null,
      isDefault: !!e.data?.isDefault,
      onError: !!e.data?.onError,
    })),
    annotations: annotations.map((a) => ({
      id: a.id,
      text: a.data.text,
      positionX: Math.round(a.position.x),
      positionY: Math.round(a.position.y),
      linkedNodeIds: a.data.linkedNodeIds,
    })),
  };
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
  section: SectionNode,
};

// Moldura da seção: folga em volta das etapas e espaço do cabeçalho em cima.
const OUTGOING_LIMIT_MESSAGE = 'Esta etapa já tem o número máximo de saídas.';

// Motivo de recusa do caminho "Se falhar" (mesma regra do FlowValidator), ou null se pode ligar.
function errorPathRefusal(source: WFNode | undefined, sourceId: string, edges: WFEdge[]): string | null {
  if (!canHaveErrorPath(source)) return 'O caminho "Se falhar" existe só para integração REST, publicação de mensagem ou espera por mensagem.';
  if (edges.some((e) => e.source === sourceId && isErrorEdge(e))) {
    return 'Esta tarefa já tem um caminho "Se falhar". Arraste a ponta do caminho existente para trocar o destino.';
  }
  return null;
}

interface HistorySnapshot {
  nodes: WFNode[];
  edges: WFEdge[];
  annotations: WFAnnotation[];
  sections: SectionState[];
}

// isNew: jornada recém-criada que ainda não foi confirmada — Salvar confirma (mesmo sem alterações) e
// Cancelar pede confirmação e descarta (onDiscard exclui a jornada). draft: fluxo gerado (IA ou Figma)
// que abre como alteração ainda não salva, no lugar do fluxo que está no servidor.
export function JourneyDesignerPage({
  journey,
  isNew = false,
  draft,
  onClose,
  onDiscard,
  onSaved,
}: {
  journey: Journey;
  isNew?: boolean;
  draft?: Flow;
  onClose: () => void;
  onDiscard?: () => void | Promise<void>;
  onSaved: () => void;
}) {
  return (
    <ReactFlowProvider>
      <DesignerInner journey={journey} isNew={isNew} draft={draft} onClose={onClose} onDiscard={onDiscard} onSaved={onSaved} />
    </ReactFlowProvider>
  );
}

function DesignerInner({
  journey,
  isNew,
  draft,
  onClose,
  onDiscard,
  onSaved,
}: {
  journey: Journey;
  isNew: boolean;
  draft?: Flow;
  onClose: () => void;
  onDiscard?: () => void | Promise<void>;
  onSaved: () => void;
}) {
  const { dark, colors: appColors } = useAppTheme();
  const c = dark ? DARK_COLORS : LIGHT_COLORS;
  // Só o fundo do diagrama de Jornadas (não o `c.canvasBg` genérico, reaproveitado em vários outros
  // pain​éis) — roxo no escuro, cinza claro normal no claro.
  const journeyCanvasBg = dark ? JOURNEY_CANVAS_BG_DARK : c.canvasBg;
  const journeyDotColor = dark ? JOURNEY_CANVAS_DOT_DARK : c.dotColor;
  const { showToast } = useToast();

  const [activeJourney, setActiveJourney] = useState<Journey>(journey);
  const [name, setName] = useState(journey.name);
  const [description, setDescription] = useState(journey.description ?? '');
  const [clusters, setClusters] = useState<MessagingCluster[]>([]);
  const [credentials, setCredentials] = useState<CredentialReference[]>([]);
  const [screenDefinition, setScreenDefinition] = useState<ComponentDefinition | null>(null);
  const [nodes, setNodes] = useState<WFNode[]>(() => initialFlowNodes());
  const [edges, setEdges] = useState<WFEdge[]>(() => initialFlowEdges(nodes));
  // Separate from `nodes`: never touched by validateFlow/computeLayout/save-as-FlowNode mapping, so
  // nothing that walks the executable flow graph needs to know annotations exist.
  const [annotations, setAnnotations] = useState<WFAnnotation[]>([]);
  const [loading, setLoading] = useState(true);
  // O fluxo já chegou, mas o canvas ainda calcula as linhas e enquadra: o indicador cobre esse tempo.
  const [drawn, setDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'valid' | 'invalid' | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [errorTitle, setErrorTitle] = useState('Não foi possível salvar');
  const [confirmingPublishedEdit, setConfirmingPublishedEdit] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Chave = id do nó, valor = a(s) mensagem(ns) de violação daquele nó (join "; " quando mais de
  // uma) — usado tanto pra destacar no canvas (badge de erro) quanto pro texto do tooltip do badge.
  const [invalidNodeReasons, setInvalidNodeReasons] = useState<Map<string, string>>(new Map());
  const [, setHistoryTick] = useState(0);
  // The properties dock is always visible. It shows this node's properties
  // when set, and falls back to the journey's own properties when null (e.g.
  // after a blank-canvas click).
  const [propertiesNodeId, setPropertiesNodeId] = useState<string | null>(null);
  // Sinal de "acabou de nascer" pro painel de propriedades saber que deve abrir só com "Informações
  // Gerais" expandida (Variáveis/Conector/Decisão colapsados) — um nó recém-criado não tem nada
  // configurado ainda nessas seções, então começar tudo aberto é só ruído. É consumido uma vez
  // (PropertiesPanel limpa via onFreshNodeConsumed) pra não recolapsar se o usuário voltar a esse
  // nó depois de já ter configurado algo.
  const [freshNodeId, setFreshNodeId] = useState<string | null>(null);
  // Vive aqui (não dentro do FormDesignerDock) porque o dock desmonta toda vez que a seleção sai de
  // uma User Task — um state interno perderia o redimensionamento do usuário a cada troca de nó.
  const [dockHeight, setDockHeight] = useState(DOCK_DEFAULT_HEIGHT);
  // "Fixar" o editor de tela: enquanto ativo, o dock continua mostrando a última User Task válida
  // mesmo depois de selecionar outra coisa (ou nada) no canvas — ver previewNode mais abaixo.
  const [dockPinned, setDockPinned] = useState(false);
  const [pinnedPreviewNodeId, setPinnedPreviewNodeId] = useState<string | null>(null);
  // Client-only, purely visual: highlights the path through the flow connected to whichever node
  // is hovered or selected, dimming the rest so a busy diagram stays readable.
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  // Etapa destacada pelo "Guia deste modelo" (passar o mouse numa anotação ou passo do tour).
  const [guideNodeId, setGuideNodeId] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [connecting, setConnecting] = useState(false);
  // Ligação cujo rótulo está sendo escrito (duplo clique na linha).
  const [editingEdgeId, setEditingEdgeId] = useState<string | null>(null);
  // Molduras das seções (posição e tamanho próprios); quais etapas estão dentro de cada uma é
  // calculado pela posição (liveSections), nunca guardado aqui.
  const [sections, setSections] = useState<SectionState[]>([]);
  const sectionsRef = useRef(sections);
  sectionsRef.current = sections;
  const liveSectionsRef = useRef<SectionState[]>([]);
  // Recolhida/aberta é preferência de quem olha (por jornada), não vai para o fluxo.
  const collapsedKey = `flow:collapsed-sections:${journey.journeyId}`;
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try {
      return new Set(JSON.parse(localStorage.getItem(collapsedKey) ?? '[]') as string[]);
    } catch {
      return new Set();
    }
  });
  const collapsedRef = useRef(collapsedSections);
  collapsedRef.current = collapsedSections;
  useEffect(() => {
    try {
      localStorage.setItem(collapsedKey, JSON.stringify([...collapsedSections]));
    } catch {
      // sem armazenamento: vale só nesta sessão
    }
  }, [collapsedKey, collapsedSections]);
  // Lido uma vez na abertura; a marca some num efeito (seguro mesmo com renderização dupla).
  const [tourPending] = useState(() => isTourPending(journey.journeyId));
  useEffect(() => {
    if (tourPending) clearTourPending(journey.journeyId);
  }, [tourPending, journey.journeyId]);
  // Client-only display preference (which @xyflow/react edge renderer to use), remembered across
  // sessions but never sent to the backend — it isn't part of the flow's saved data.
  const [edgeShape, setEdgeShape] = useState<EdgeShape>(
    () => (localStorage.getItem('flow-designer:edge-shape-v2') as EdgeShape | null) ?? 'routed',
  );
  useEffect(() => {
    localStorage.setItem('flow-designer:edge-shape-v2', edgeShape);
  }, [edgeShape]);
  // Círculo, compacto ou detalhado: preferência por usuário, a mesma da Execução e do Diagnóstico.
  const [nodeMode, setNodeMode] = useNodeDisplayMode('editor');
  const nodeModeRef = useRef(nodeMode);
  nodeModeRef.current = nodeMode;
  // Modo em que as posições atuais foram organizadas — trocar de modo reorganiza o fluxo.
  const laidOutModeRef = useRef<NodeDisplayMode | null>(null);
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

  // Rotas das linhas automáticas, recalculadas quando o fluxo para de mudar (depois de arrastar,
  // organizar ou ligar etapas); enquanto isso, cada linha segue a etapa pelo caminho simples.
  const [routes, setRoutes] = useState<Map<string, EdgeRoute>>(new Map());
  const sectionViewRef = useRef<{
    hidden: Set<string>;
    blocks: { id: string; type: NodeType; x: number; y: number; width: number; height: number }[];
    links: { id: string; source: string; target: string; onError: boolean }[];
  }>({ hidden: new Set(), blocks: [], links: [] });
  const geometryKey = useMemo(
    () =>
      JSON.stringify([
        nodeMode,
        nodes.map((n) => [n.id, n.type, Math.round(n.position.x), Math.round(n.position.y)]),
        edges.map((e) => [e.id, e.source, e.target, !!e.data?.onError]),
        sections,
        [...collapsedSections],
      ]),
    [nodes, edges, nodeMode, sections, collapsedSections],
  );
  useEffect(() => {
    if (edgeShape !== 'routed') return;
    const timer = setTimeout(() => {
      setDrawn(true);
      setRoutes(
        computeRoutes(
          // Seção recolhida: as etapas dela somem e o bloco entra no lugar, com as linhas ligadas nele.
          [
            ...nodesRef.current
              .filter((n) => !sectionViewRef.current.hidden.has(n.id))
              .map((n) => ({ id: n.id, type: n.type as NodeType, x: n.position.x, y: n.position.y })),
            ...sectionViewRef.current.blocks,
          ],
          [
            ...edgesRef.current
              .filter((e) => !sectionViewRef.current.hidden.has(e.source) && !sectionViewRef.current.hidden.has(e.target))
              .map((e) => ({ id: e.id, source: e.source, target: e.target, onError: !!e.data?.onError })),
            ...sectionViewRef.current.links,
          ],
          nodeModeRef.current,
          // Seções abertas: o cabeçalho delas vira obstáculo para as linhas.
          liveSectionsRef.current.filter((sec) => !collapsedRef.current.has(sec.id)),
        ),
      );
    }, 150);
    return () => clearTimeout(timer);
  }, [geometryKey, edgeShape]);

  // Linhas retas/curvas não passam pelo roteador: o canvas está pronto assim que o fluxo carrega. Em
  // qualquer caso, o indicador nunca fica mais de alguns segundos.
  useEffect(() => {
    if (loading) return;
    if (edgeShape !== 'routed') setDrawn(true);
    const timer = setTimeout(() => setDrawn(true), 4000);
    return () => clearTimeout(timer);
  }, [loading, edgeShape]);

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
  // Assinatura do conteúdo real de nodes/edges, sem `selected` — clicar num nó (ou fora, pra
  // desselecionar) já basta pra trocar a referência do array de nodes/edges (React Flow guarda
  // seleção dentro do próprio objeto), o que disparava esse reset mesmo sem o fluxo ter mudado de
  // verdade. O badge de "inválido" precisa sobreviver a isso, e só sumir quando o conteúdo mudar.
  const structuralKey = useMemo(
    () =>
      JSON.stringify([
        nodes.map(({ selected: _selected, ...rest }) => rest),
        edges.map(({ selected: _selected, ...rest }) => rest),
      ]),
    [nodes, edges],
  );
  useEffect(() => {
    setInvalidNodeReasons(new Map());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [structuralKey]);

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

  const { screenToFlowPosition, zoomIn, zoomOut, zoomTo, getNodesBounds, getViewport, setViewport } = useReactFlow();
  const { zoom } = useViewport();

  // Padrão pedido pelo usuário: sempre 100% de zoom (nunca reduz pra caber o fluxo inteiro na tela,
  // mesmo que ultrapasse a área visível — o usuário navega/dá pan pro resto) com o início do fluxo
  // ancorado perto da borda esquerda do canvas, não centralizado — mesma direção do auto-layout LR e
  // de onde novos nós nascem via onQuickAdd abaixo, então o espaço à direita já nasce livre pra
  // crescer. Usado ao carregar uma jornada (nova, existente ou recém-gerada por IA).
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

  // Catálogo de clusters/credenciais (FT-14) — carregado uma vez, não é criado inline a partir do
  // designer de fluxo, então não precisa de um refresh acionável pelo usuário.
  useEffect(() => {
    listClusters().then(setClusters);
    listCredentials().then(setCredentials);
    // A definição vigente de ui.screen é necessária no nascimento da Tarefa de Usuário: a tela
    // raiz pertence ao nó desde sua criação e nunca é sintetizada posteriormente pelo runtime.
    listAuthoringComponentDefinitions()
      .then((definitions) => setScreenDefinition(definitions.find((definition) => definition.type === 'ui.screen') ?? null))
      .catch(() => setScreenDefinition(null));
  }, []);

  // Mapeamento puro backend -> estado do canvas, usado no carregamento inicial do fluxo.
  const mapFlowToState = useCallback(
    (flow: Flow) => ({
      nodes: flow.nodes.map((n) => ({
        id: n.nodeId,
        type: BACKEND_TO_FRONT_TYPE[n.nodeType],
        position: { x: n.positionX, y: n.positionY },
        data: {
          name: n.name,
          description: n.description ?? '',
          embeddedScreenRoot: n.userTaskConfig?.embeddedScreenRoot ?? null,
          screenDataSources: n.userTaskConfig?.dataSources ?? undefined,
          connectorConfig: n.connectorConfig,
          startVariables: n.startVariables ?? undefined,
        },
      })) as WFNode[],
      edges: flow.connections.map((c) => ({
        id: c.connectionId,
        source: c.sourceNodeId,
        target: c.targetNodeId,
        ...(c.onError ? { sourceHandle: ERROR_HANDLE } : {}),
        data: { condition: c.condition ?? undefined, isDefault: c.isDefault, onError: c.onError || undefined, label: c.label || undefined },
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
    getFlow(journey.journeyId).then(async (serverFlow) => {
      // Jornada recém-gerada: o que aparece é o rascunho da IA/Figma, ainda não gravado.
      const flow = draft ?? serverFlow;
      const mapped = mapFlowToState(flow);
      const mode = nodeModeRef.current;
      // Organizado em outro modo (ou antes de existir o modo): reorganiza para o modo de quem abre,
      // sem contar como alteração — só vira gravação se a pessoa salvar.
      // Seção gravada sem moldura própria ganha a que cabe em volta das etapas dela.
      const loaded = (flow.sections ?? [])
        .map((sec) => toSectionState(sec, mapped.nodes, mode))
        .filter((sec): sec is SectionState => sec !== null);
      const collapsedNow = collapsedRef.current;
      const relaid = flow.layoutMode !== mode && mapped.nodes.length > 0;
      const laidOut = relaid ? await computeLayout(mapped.nodes, mapped.edges, mode, withMembers(loaded, mapped.nodes, collapsedNow, mode), collapsedNow) : mapped.nodes;
      const loadedSections = withMembers(relaid ? refitSections(withMembers(loaded, mapped.nodes, collapsedNow, mode), mapped.nodes, laidOut, collapsedNow, mode) : loaded, laidOut, collapsedNow, mode);
      laidOutModeRef.current = mode;
      setNodes(laidOut);
      setEdges(mapped.edges);
      setAnnotations(mapped.annotations);
      // Com rascunho, nada do que está na tela foi salvo: o marcador vazio nunca bate com o fluxo atual,
      // então o Salvar grava e a barra mostra "Alterações não salvas".
      savedSnapshotRef.current = draft
        ? ''
        : buildFlowSnapshot(journey.name, journey.description ?? '', laidOut, mapped.edges, mapped.annotations, loadedSections);
      setSections(loadedSections);
      setLoading(false);
      // Os nós só recebem seu tamanho medido de verdade (do que o cálculo de bounds precisa) depois
      // que esse render é commitado — mesmo raciocínio do requestAnimationFrame no organize() abaixo.
      requestAnimationFrame(() => fitViewLeftAligned());
    });
  }, [journey, draft, fitViewLeftAligned, mapFlowToState]);

  const [channelsModalOpen, setChannelsModalOpen] = useState(false);

  const pushHistory = useCallback(() => {
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current, sections: sectionsRef.current });
    redoStack.current = [];
    setHistoryTick((t) => t + 1);
  }, []);

  const undo = useCallback(() => {
    if (!undoStack.current.length) return;
    redoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current, sections: sectionsRef.current });
    const prev = undoStack.current.pop()!;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    setAnnotations(prev.annotations);
    setSections(prev.sections);
    setHistoryTick((t) => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (!redoStack.current.length) return;
    undoStack.current.push({ nodes: nodesRef.current, edges: edgesRef.current, annotations: annotationsRef.current, sections: sectionsRef.current });
    const next = redoStack.current.pop()!;
    setNodes(next.nodes);
    setEdges(next.edges);
    setAnnotations(next.annotations);
    setSections(next.sections);
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

  // Sobe/desce uma saída entre as saídas da mesma origem. Numa Decisão, a ordem da lista é a ordem
  // em que o motor avalia as condições — vale a primeira verdadeira.
  const moveEdge = useCallback(
    (edgeId: string, direction: -1 | 1) => {
      pushHistory();
      setEdges((eds) => {
        const index = eds.findIndex((e) => e.id === edgeId);
        if (index < 0) return eds;
        let other = index + direction;
        while (other >= 0 && other < eds.length && eds[other].source !== eds[index].source) other += direction;
        if (other < 0 || other >= eds.length) return eds;
        const next = [...eds];
        [next[index], next[other]] = [next[other], next[index]];
        return next;
      });
    },
    [pushHistory],
  );

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
  // Arrastar o cabeçalho (ou o bloco, recolhida) move a moldura e as etapas que estão dentro dela.
  const sectionDragging = useRef(false);
  const moveSection = useCallback((sectionId: string, x: number, y: number) => {
    const current = sectionsRef.current.find((sec) => sec.id === sectionId);
    if (!current) return;
    const dx = Math.round(x - current.x);
    const dy = Math.round(y - current.y);
    if (dx === 0 && dy === 0) return;
    const members = new Set(liveSectionsRef.current.find((sec) => sec.id === sectionId)?.nodeIds ?? []);
    // Vários eventos de arrasto chegam no mesmo lote: a referência é atualizada na hora para o
    // próximo calcular o deslocamento a partir da posição já movida, e não da anterior.
    const next = sectionsRef.current.map((sec) => (sec.id === sectionId ? { ...sec, x: sec.x + dx, y: sec.y + dy } : sec));
    sectionsRef.current = next;
    setSections(next);
    if (members.size > 0) {
      setNodes((nds) => nds.map((n) => (members.has(n.id) ? { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } } : n)));
    }
  }, []);

  const onNodesChange = useCallback<OnNodesChange<WFNode | WFAnnotation>>(
    (changes) => {
      changes.forEach((c) => {
        if (c.type !== 'position' || !c.position) return;
        const isHeader = c.id.startsWith('SectionHeader_');
        const isBlock = !isHeader && c.id.startsWith('Section_') && !c.id.startsWith('SectionLink_');
        if (!isHeader && !isBlock) return;
        if (c.dragging && !sectionDragging.current) {
          sectionDragging.current = true;
          pushHistory();
        }
        if (!c.dragging) sectionDragging.current = false;
        moveSection(c.id.slice(isHeader ? 'SectionHeader_'.length : 'Section_'.length), c.position.x, c.position.y);
      });
      const nodeChanges = changes.filter((c) => !('id' in c) || (!isAnnotationId(c.id) && !c.id.startsWith('Section'))) as NodeChange<WFNode>[];
      const annotationChanges = changes.filter((c) => 'id' in c && isAnnotationId(c.id)) as NodeChange<WFAnnotation>[];
      if (nodeChanges.length) setNodes((nds) => applyNodeChanges(nodeChanges, nds));
      if (annotationChanges.length) setAnnotations((anns) => applyNodeChanges(annotationChanges, anns));
    },
    [moveSection, pushHistory],
  );
  const onEdgesChange = useCallback<OnEdgesChange>(
    (changes: EdgeChange[]) =>
      setEdges((eds) => applyEdgeChanges(changes.filter((c) => !('id' in c) || !c.id.startsWith('SectionLink_')), eds)),
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
      // Saída "Se falhar": só em integração REST ou publicação de mensagem, uma por etapa, e fora da contagem de saídas normais.
      // Toda recusa vira um aviso com o motivo — antes a linha só sumia, sem explicação.
      if (params.sourceHandle === ERROR_HANDLE) {
        const refusal = errorPathRefusal(source, params.source, edgesRef.current);
        if (refusal) {
          showToast(refusal, 'info');
          return;
        }
        pushHistory();
        setEdges((eds) => addEdge({ ...params, id: newConnectionId(), data: { onError: true } }, eds));
        return;
      }
      if (source?.type) {
        const outCount = edgesRef.current.filter((e) => e.source === params.source && !isErrorEdge(e)).length;
        if (outCount >= outgoingLimitFor(source.type)) {
          showToast(OUTGOING_LIMIT_MESSAGE, 'info');
          return;
        }
      }
      pushHistory();
      setEdges((eds) => addEdge({ ...params, id: newConnectionId() }, eds));
    },
    [pushHistory, showToast],
  );
  // Soltar a linha em qualquer parte da etapa de destino (não só na bolinha de entrada): quando a
  // ligação não fechou num ponto, procura a etapa debaixo do ponteiro e liga nela.
  const onConnectEnd = useCallback<OnConnectEnd>(
    (event, state) => {
      setConnecting(false);
      if (state.isValid || !state.fromNode || state.fromHandle?.type !== 'source') return;
      const point = 'changedTouches' in event ? event.changedTouches[0] : event;
      const el = document.elementFromPoint(point.clientX, point.clientY)?.closest('.react-flow__node');
      const targetId = el?.getAttribute('data-id');
      const target = nodesRef.current.find((n) => n.id === targetId);
      if (!target || target.id === state.fromNode.id || target.type === 'start' || target.type === 'messageStartEvent') return;
      onConnect({ source: state.fromNode.id, sourceHandle: state.fromHandle.id ?? null, target: target.id, targetHandle: null });
    },
    [onConnect],
  );
  // Arrastar a ponta de uma seta já existente pra outro nó (retarget), em vez de excluir e puxar
  // uma nova — mesma regra de limite de saída do onConnect, só reaplicada quando a origem muda
  // (mover só a ponta de destino nunca altera quantas saídas o nó de origem tem).
  const onReconnect = useCallback<OnReconnect>(
    (oldEdge, newConnection) => {
      if (isAnnotationId(oldEdge.source)) return;
      if (newConnection.source !== oldEdge.source) {
        const source = nodesRef.current.find((n) => n.id === newConnection.source);
        if (isErrorEdge(oldEdge)) {
          const refusal = errorPathRefusal(source, newConnection.source, edgesRef.current);
          if (refusal) {
            showToast(refusal, 'info');
            return;
          }
        } else if (source?.type) {
          const outCount = edgesRef.current.filter((e) => e.source === newConnection.source && e.id !== oldEdge.id && !isErrorEdge(e)).length;
          if (outCount >= outgoingLimitFor(source.type)) {
            showToast(OUTGOING_LIMIT_MESSAGE, 'info');
            return;
          }
        }
      }
      pushHistory();
      // shouldReplaceId: false — por padrão reconnectEdge troca o id da aresta por um formato
      // próprio da lib (xy-edge__...), que não bate com o padrão "Flow_..." que o back exige
      // (FlowConnectionInput.connectionId, @Pattern "^Flow_.+") e quebra o salvamento.
      setEdges((eds) => reconnectEdge(oldEdge, newConnection, eds, { shouldReplaceId: false }));
    },
    [pushHistory, showToast],
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
      if (type === 'userTask' && !screenDefinition) {
        showToast('Não foi possível criar a Tarefa de Usuário porque a definição de Tela não está disponível no catálogo.', 'error');
        return;
      }
      pushHistory();
      const spot = findFreeSpot(nodesRef.current, x, y);
      const node = { ...makeNode(type, spot.x, spot.y, nodesRef.current), selected: true };
      if (type === 'userTask' && screenDefinition) {
        node.data.embeddedScreenRoot = createSduiNode(screenDefinition);
      }
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
      setFreshNodeId(node.id);
    },
    [pushHistory, screenDefinition, showToast],
  );

  const addNodeFromPalette = useCallback(
    (type: NodeType) => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      const center = rect ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 } : { x: 400, y: 300 };
      const pos = screenToFlowPosition(center);
      const dim = nodeSize(type, nodeModeRef.current);
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

  // Moldura nova e vazia, centrada no ponto (as etapas que ficarem dentro dela passam a fazer parte).
  const addSectionAt = useCallback(
    (cx: number, cy: number) => {
      pushHistory();
      setSections((prev) => [
        ...prev,
        {
          id: `Section_${crypto.randomUUID()}`,
          name: `Seção ${prev.length + 1}`,
          nodeIds: [],
          x: Math.round(cx - SECTION_DEFAULT.width / 2),
          y: Math.round(cy - SECTION_DEFAULT.height / 2),
          width: SECTION_DEFAULT.width,
          height: SECTION_DEFAULT.height,
        },
      ]);
    },
    [pushHistory],
  );

  // Clique na paleta: moldura numerada num lugar livre (à esquerda e abaixo do início do desenho).
  const addSectionFromPalette = useCallback(() => {
    const spot = freeSectionSpot(nodesRef.current, sectionsRef.current, [...routes.values()], nodeModeRef.current);
    pushHistory();
    setSections((prev) => {
      const used = prev.map((s) => /^Seção (\d+)$/.exec(s.name)).flatMap((m) => (m ? [Number(m[1])] : []));
      return [
        ...prev,
        {
          id: `Section_${crypto.randomUUID()}`,
          name: `Seção ${Math.max(0, ...used) + 1}`,
          nodeIds: [],
          x: spot.x,
          y: spot.y,
          width: SECTION_DEFAULT.width,
          height: SECTION_DEFAULT.height,
        },
      ];
    });
  }, [routes, pushHistory]);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const dropped = e.dataTransfer.getData('text/plain');
      if (dropped === 'section') {
        const at = screenToFlowPosition({ x: e.clientX, y: e.clientY });
        addSectionAt(at.x, at.y);
        return;
      }
      const type = dropped as NodeType;
      if (!type) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const dim = nodeSize(type, nodeModeRef.current);
      addNodeAt(type, pos.x - dim.width / 2, pos.y - dim.height / 2);
    },
    [addNodeAt, addSectionAt, screenToFlowPosition],
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
      if (type === 'userTask' && !screenDefinition) {
        showToast('Não foi possível criar a Tarefa de Usuário porque a definição de Tela não está disponível no catálogo.', 'error');
        return;
      }
      const outCount = edgesRef.current.filter((e) => e.source === nodeId && !isErrorEdge(e)).length;
      if (outCount >= outgoingLimitFor(source.type)) return;
      pushHistory();
      // Os dois ramos do Gateway se abrem acima/abaixo da origem (em vez de empilhar na mesma linha)
      // pra que caminho A/B leiam como ramos distintos à primeira vista — mesma regra que
      // applyGatewayBranchSpacing (model.ts) reaplica depois do dagre, pra "Organizar" não
      // desfazer o que o quick-add já deixou certo. O deslocamento é derivado da altura de verdade
      // do nó sendo adicionado (metade da altura + folga), não um valor fixo — um fixo sobrepunha
      // os dois ramos quando o tipo adicionado era um dos maiores (userTask/serviceTask/
      // receiveTask, 78px). O primeiro adicionado é sugerido como caminho padrão — exatamente um dos
      // dois precisa ser (REQ-03.11.002) — o usuário pode trocar no GatewayFields.
      const isGateway = source.type === 'gateway';
      const mode = nodeModeRef.current;
      // Ramos alternam acima/abaixo e se afastam a cada par: 1º acima, 2º abaixo, 3º mais acima…
      const branchSlot = (outCount % 2 === 0 ? -1 : 1) * (Math.floor(outCount / 2) + 1);
      const branchYOffset = isGateway ? (nodeSize(type, mode).height / 2 + GATEWAY_BRANCH_GAP) * branchSlot : 0;
      const gapX = isGateway ? GATEWAY_GAP_X : RANK_SEP;
      // n.position é o canto superior-esquerdo, não o centro — tipos diferentes têm alturas
      // diferentes (ex.: Início 52px vs Tarefa de Usuário 78px), então alinhar os "y" direto deixava
      // os CENTROS desalinhados (linha inclinada em vez de reta). Centraliza pelo centro vertical de
      // verdade da origem antes de aplicar o deslocamento dos ramos do gateway.
      const sourceCenterY = source.position.y + nodeSize(source.type, mode).height / 2;
      const targetY = sourceCenterY - nodeSize(type, mode).height / 2 + branchYOffset;
      const node = {
        ...makeNode(type, source.position.x + nodeSize(source.type, mode).width + gapX, targetY, nodesRef.current),
        selected: true,
      };
      // A criação rápida segue a mesma invariável da paleta: uma Tarefa de Usuário já
      // nasce com a raiz da tela e fica imediatamente disponível para autoria no Form Builder.
      if (type === 'userTask' && screenDefinition) {
        node.data.embeddedScreenRoot = createSduiNode(screenDefinition);
      }
      setNodes((nds) => [...nds.map((n) => ({ ...n, selected: false })), node]);
      setFreshNodeId(node.id);
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
    [pushHistory, panIntoView, screenDefinition, showToast],
  );

  const onPaneClick = useCallback(() => {
    setPropertiesNodeId(null);
  }, []);

  // Mesmo padrão de alinhar/distribuir do editor de tela (FormScreenCanvasWeb) — só que operando em
  // WFNode.position direto (não em positionX/positionY de FormField), já que aqui não tem um
  // conceito de "campo" por trás do nó.
  const selectedNodeIds = useMemo(() => nodes.filter((n) => n.selected).map((n) => n.id), [nodes]);

  const alignSelected = useCallback(
    (mode: 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom') => {
      if (selectedNodeIds.length < 2) return;
      pushHistory();
      const boxes = selectedNodeIds.map((id) => {
        const n = nodesRef.current.find((x) => x.id === id)!;
        const dim = nodeSize(n.type as NodeType, nodeModeRef.current);
        return { id, x: n.position.x, y: n.position.y, width: dim.width, height: dim.height };
      });
      let target: number;
      if (mode === 'left') target = Math.min(...boxes.map((b) => b.x));
      else if (mode === 'right') target = Math.max(...boxes.map((b) => b.x + b.width));
      else if (mode === 'centerX') target = boxes.reduce((s, b) => s + (b.x + b.width / 2), 0) / boxes.length;
      else if (mode === 'top') target = Math.min(...boxes.map((b) => b.y));
      else if (mode === 'bottom') target = Math.max(...boxes.map((b) => b.y + b.height));
      else target = boxes.reduce((s, b) => s + (b.y + b.height / 2), 0) / boxes.length;

      const byId = new Map(boxes.map((b) => [b.id, b]));
      setNodes((nds) =>
        nds.map((n) => {
          const b = byId.get(n.id);
          if (!b) return n;
          if (mode === 'left') return { ...n, position: { ...n.position, x: Math.round(target) } };
          if (mode === 'right') return { ...n, position: { ...n.position, x: Math.round(target - b.width) } };
          if (mode === 'centerX') return { ...n, position: { ...n.position, x: Math.round(target - b.width / 2) } };
          if (mode === 'top') return { ...n, position: { ...n.position, y: Math.round(target) } };
          if (mode === 'bottom') return { ...n, position: { ...n.position, y: Math.round(target - b.height) } };
          return { ...n, position: { ...n.position, y: Math.round(target - b.height / 2) } };
        }),
      );
    },
    [selectedNodeIds, pushHistory],
  );

  // Distribuir espaçamento igual: ordena os selecionados pelo eixo, reparte o vão entre o início do
  // primeiro e o fim do último em partes iguais descontando as próprias larguras/alturas — só os do
  // MEIO se movem (primeiro e último ficam onde já estavam).
  const distributeSelected = useCallback(
    (axis: 'horizontal' | 'vertical') => {
      if (selectedNodeIds.length < 3) return;
      pushHistory();
      const boxes = selectedNodeIds
        .map((id) => {
          const n = nodesRef.current.find((x) => x.id === id)!;
          const dim = nodeSize(n.type as NodeType, nodeModeRef.current);
          return { id, x: n.position.x, y: n.position.y, width: dim.width, height: dim.height };
        })
        .sort((a, b) => (axis === 'horizontal' ? a.x - b.x : a.y - b.y));
      const first = boxes[0];
      const last = boxes[boxes.length - 1];
      const span = axis === 'horizontal' ? last.x + last.width - first.x : last.y + last.height - first.y;
      const sizeSum = boxes.reduce((s, b) => s + (axis === 'horizontal' ? b.width : b.height), 0);
      const gap = (span - sizeSum) / (boxes.length - 1);

      const nextPosition = new Map<string, number>();
      let cursor = axis === 'horizontal' ? first.x : first.y;
      for (const b of boxes) {
        nextPosition.set(b.id, cursor);
        cursor += (axis === 'horizontal' ? b.width : b.height) + gap;
      }

      setNodes((nds) =>
        nds.map((n) => {
          const pos = nextPosition.get(n.id);
          if (pos === undefined) return n;
          return axis === 'horizontal'
            ? { ...n, position: { ...n.position, x: Math.round(pos) } }
            : { ...n, position: { ...n.position, y: Math.round(pos) } };
        }),
      );
    },
    [selectedNodeIds, pushHistory],
  );

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
      // Sem nenhuma etapa ligada, a nota volta a ser um post-it — logo abaixo da etapa que deixou.
      const node = nodesRef.current.find((n) => n.id === nodeId);
      const below = node
        ? { x: node.position.x, y: node.position.y + nodeSize(node.type as NodeType, nodeModeRef.current).height + 60 }
        : null;
      setAnnotations((anns) =>
        anns.map((a) => {
          if (a.id !== annotationId) return a;
          const linkedNodeIds = a.data.linkedNodeIds.filter((id) => id !== nodeId);
          return { ...a, position: linkedNodeIds.length === 0 && below ? below : a.position, data: { ...a.data, linkedNodeIds } };
        }),
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
      onUpdateAnnotationText,
      onDeleteAnnotation,
      onUnlinkAnnotation,
      onSetEdgeLabel: (edgeId, label) => {
        setEditingEdgeId(null);
        const text = label.trim();
        const current = edgesRef.current.find((e) => e.id === edgeId)?.data?.label ?? '';
        if (text === current) return;
        pushHistory();
        setEdges((eds) => eds.map((e) => (e.id === edgeId ? { ...e, data: { ...e.data, label: text || undefined } } : e)));
      },
      onCancelEdgeLabel: () => setEditingEdgeId(null),
      onEditEdgeLabel: (edgeId) => setEditingEdgeId(edgeId),
    }),
    [onQuickAdd, selectOnlyNode, deleteNode, onUpdateAnnotationText, onDeleteAnnotation, onUnlinkAnnotation, pushHistory],
  );

  // Regras de Decisão calculáveis ao vivo no cliente (grau, padrão único, condição obrigatória) —
  // não espera o usuário clicar em "Validar" pra acusar o problema no canvas. `invalidNodeReasons`
  // (do "Validar" contra o back) tem prioridade quando as duas coincidirem, por trazer o texto mais
  // completo (pode juntar mais de uma violação do mesmo nó).
  const liveGatewayReasons = useMemo(() => gatewayViolations(nodes, edges), [nodes, edges]);

  const notes = useMemo(() => guideNotes(annotations, nodes, edges), [annotations, nodes, edges]);

  // Seções com as etapas que estão dentro de cada moldura agora (apagar uma etapa a tira da seção).
  const liveSections = useMemo(() => withMembers(sections, nodes, collapsedSections, nodeMode), [sections, nodes, collapsedSections, nodeMode]);
  liveSectionsRef.current = liveSections;

  // Agrupar as etapas selecionadas: uma moldura que cabe em volta delas.
  const groupSelection = useCallback(() => {
    const selected = nodesRef.current.filter((n) => n.selected);
    if (selected.length < 2) return;
    const box = fitBox(selected, nodeModeRef.current);
    if (!box) return;
    pushHistory();
    setSections((prev) => [...prev, { id: `Section_${crypto.randomUUID()}`, name: `Seção ${prev.length + 1}`, nodeIds: [], ...box }]);
  }, [pushHistory]);

  // Recolher ou abrir uma seção. Ao recolher, ela guarda as etapas que tinha (ficam escondidas); ao
  // abrir, só o conteúdo dela é reorganizado, a partir do canto da moldura — o resto do fluxo não se
  // mexe (o "Organizar" é que recalcula tudo).
  const toggleSection = useCallback(
    (sectionId: string) => {
      const section = liveSectionsRef.current.find((x) => x.id === sectionId);
      const opening = collapsedRef.current.has(sectionId);
      setCollapsedSections((prev) => {
        const next = new Set(prev);
        if (next.has(sectionId)) next.delete(sectionId);
        else next.add(sectionId);
        return next;
      });
      if (!section) return;
      if (!opening) {
        setSections((prev) => prev.map((x) => (x.id === sectionId ? { ...x, nodeIds: section.nodeIds } : x)));
        return;
      }
      if (section.nodeIds.length === 0) return;
      pushHistory();
      computeLayoutForSection(nodesRef.current, edgesRef.current, section.nodeIds, nodeModeRef.current, {
        x: section.x + SECTION_PAD,
        y: section.y + SECTION_HEADER,
      }).then((laid) => {
        setNodes(laid);
        const box = fitBox(laid.filter((n) => section.nodeIds.includes(n.id)), nodeModeRef.current);
        if (box) setSections((prev) => prev.map((x) => (x.id === sectionId ? { ...x, ...box } : x)));
      });
    },
    [pushHistory],
  );

  // Etapa escondida dentro de seção recolhida → id da seção.
  const hiddenBySection = useMemo(() => {
    const map = new Map<string, string>();
    liveSections.forEach((s) => collapsedSections.has(s.id) && s.nodeIds.forEach((id) => map.set(id, s.id)));
    return map;
  }, [liveSections, collapsedSections]);

  // width/height explícitos: as mudanças de medida dessas peças não voltam para o estado, então sem eles o
  // canvas esconderia a peça para medir de novo a cada vez que o objeto é recriado (o pisca-pisca no arrasto).
  const sectionNodes = useMemo(
    () =>
      liveSections.flatMap((s): WFSectionNode[] => {
        const collapsed = collapsedSections.has(s.id);
        const members = memberBounds(nodes.filter((n) => s.nodeIds.includes(n.id)), nodeMode);
        // Seção que contém o destino de um "Se falhar" é a faixa de falha: nome em vermelho.
        const failure = edges.some((e) => isErrorEdge(e) && s.nodeIds.includes(e.target));
        const base = {
          tone: failure ? ('danger' as const) : undefined,
          name: s.name,
          count: s.nodeIds.length,
          x: s.x,
          y: s.y,
          members,
          onToggle: () => toggleSection(s.id),
          onRename: (newName: string) => setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, name: newName } : x))),
          onRemove: () => setSections((prev) => prev.filter((x) => x.id !== s.id)),
          onResizeStart: () => pushHistory(),
          onResize: (box: { x: number; y: number; width: number; height: number }) =>
            setSections((prev) => prev.map((x) => (x.id === s.id ? { ...x, ...box } : x))),
        };
        // Recolhida: um bloco no canto da moldura, que se arrasta (as etapas escondidas vão junto).
        if (collapsed) {
          return [
            {
              id: `Section_${s.id}`,
              type: 'section' as const,
              draggable: true,
              selectable: false,
              position: { x: s.x, y: s.y },
              width: COLLAPSED_SECTION.width,
              height: COLLAPSED_SECTION.height,
              data: { ...base, variant: 'block', width: COLLAPSED_SECTION.width, height: COLLAPSED_SECTION.height },
            },
          ];
        }
        // Moldura atrás de tudo e cabeçalho por cima de tudo: as linhas de etapas selecionadas
        // sobem de camada e, sem isso, cobririam o cabeçalho e roubariam o clique. O cabeçalho é
        // por onde a seção se arrasta.
        return [
          {
            id: `Section_${s.id}`,
            type: 'section' as const,
            draggable: false,
            selectable: false,
            position: { x: s.x, y: s.y },
            zIndex: -1,
            width: s.width,
            height: s.height,
            data: { ...base, variant: 'frame', width: s.width, height: s.height },
          },
          {
            id: `SectionHeader_${s.id}`,
            type: 'section' as const,
            draggable: true,
            selectable: false,
            position: { x: s.x, y: s.y },
            zIndex: 2000,
            width: s.width,
            height: SECTION_HEADER - 8,
            data: { ...base, variant: 'header', width: s.width, height: SECTION_HEADER - 8 },
          },
        ];
      }),
    [liveSections, nodes, edges, nodeMode, collapsedSections, toggleSection, pushHistory],
  );
  const notesByNode = useMemo(() => {
    const map = new Map<string, NodeNote[]>();
    notes.forEach((note) =>
      note.nodeIds.forEach((id) => map.set(id, [...(map.get(id) ?? []), { id: note.id, number: note.number, text: note.text }])),
    );
    return map;
  }, [notes]);

  const displayNodes = useMemo(
    () =>
      nodes.map((n) => {
        const outgoing = edges.filter((e) => e.source === n.id && !isErrorEdge(e));
        // Direção média das linhas de saída já existentes, pra nascer o botão "+" do lado oposto em
        // vez de sempre centralizado (onde uma linha existente passaria por cima dele).
        const offsets = outgoing
          .map((e) => nodes.find((t) => t.id === e.target)?.position.y)
          .filter((y): y is number => y !== undefined)
          .map((y) => y - n.position.y)
          .filter((dy) => Math.abs(dy) > 4);
        const avgOffset = offsets.length ? offsets.reduce((a, b) => a + b, 0) / offsets.length : 0;
        const invalidReason = invalidNodeReasons.get(n.id) ?? liveGatewayReasons.get(n.id);
        return {
          ...n,
          data: {
            ...n.data,
            invalid: invalidReason !== undefined,
            invalidReason,
            outgoingLimitReached: !!n.type && outgoing.length >= outgoingLimitFor(n.type),
            errorPathTaken: edges.some((e) => e.source === n.id && isErrorEdge(e)),
            quickAddAvoid: avgOffset > 0 ? ('down' as const) : avgOffset < 0 ? ('up' as const) : undefined,
            notes: notesByNode.get(n.id),
            zoom,
          },
          hidden: hiddenBySection.has(n.id),
        };
      }),
    [nodes, edges, invalidNodeReasons, liveGatewayReasons, zoom, notesByNode, hiddenBySection],
  );

  // Nota ligada vira marcador na etapa; só a nota solta aparece como post-it no canvas.
  const displayAnnotations = useMemo(
    () => annotations.filter((a) => a.data.linkedNodeIds.length === 0).map((a) => ({ ...a, data: { ...a.data, zoom } })),
    [annotations, zoom],
  );


  const selectedNodeId = useMemo(() => nodes.find((n) => n.selected)?.id ?? null, [nodes]);
  const focusNodeId = guideNodeId ?? hoveredNodeId ?? selectedNodeId;

  // Rótulos das telas para as condições legíveis — refeito só quando alguma tela muda, não a cada
  // arraste (as raízes das telas mantêm a mesma referência enquanto ninguém edita).
  const screenRootsRef = useRef<(SduiNode | null | undefined)[]>([]);
  const screenRoots = useMemo(() => {
    const next = nodes.map((n) => n.data.embeddedScreenRoot);
    const prev = screenRootsRef.current;
    if (next.length === prev.length && next.every((r, i) => r === prev[i])) return prev;
    screenRootsRef.current = next;
    return next;
  }, [nodes]);
  const variableLabels = useMemo(() => screenVariableLabels(screenRoots), [screenRoots]);

  const displayEdges = useMemo(
    () =>
      edges.map((e) => {
        const onFocusedPath = !!focusNodeId && (e.source === focusNodeId || e.target === focusNodeId);
        const dimmed = !!focusNodeId && !onFocusedPath;
        const color = isErrorEdge(e) ? c.danger : e.selected || onFocusedPath ? c.accent : c.edgeColor;
        return {
          ...e,
          data: {
            ...e.data,
            route: routes.get(e.id),
            conditionText: readableCondition(e.data?.condition, variableLabels) ?? undefined,
            editingLabel: e.id === editingEdgeId,
          },
          type: edgeShape,
          // O texto ("padrão"/condição) some daqui — FlowEdge (edgeTypes) monta o próprio rótulo a
          // partir de e.data.isDefault/condition, ancorado perto do destino (ver FlowEdge.tsx).
          style: {
            stroke: color,
            strokeWidth: e.selected || onFocusedPath ? 2.5 : 1.5,
            strokeDasharray: isErrorEdge(e) ? '5 4' : undefined,
            opacity: dimmed ? 0.25 : 1,
            vectorEffect: 'non-scaling-stroke' as const,
            transition: 'opacity 150ms ease-out, stroke 150ms ease-out',
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [edges, c, focusNodeId, edgeShape, routes, variableLabels, editingEdgeId],
  );

  // Seção recolhida: toda ligação que entra ou sai das etapas escondidas passa a ligar no bloco da seção.
  // A saída de uma seção vai para a etapa de destino (ou para o bloco dela, se também estiver recolhida), e
  // várias ligações entre os mesmos dois pontos viram uma só: a linha mostra que existe ao menos uma ligação
  // entre eles. São só desenho — o usuário não seleciona, não apaga, não puxa nem religa essas linhas.
  const sectionLinks = useMemo(() => {
    const links = new Map<string, { id: string; source: string; target: string; edges: typeof edges }>();
    for (const e of edges) {
      const s = hiddenBySection.get(e.source);
      const t = hiddenBySection.get(e.target);
      if ((!s && !t) || s === t) continue;
      const source = s ? `Section_${s}` : e.source;
      const target = t ? `Section_${t}` : e.target;
      const id = `SectionLink_${source}__${target}`;
      const link = links.get(id) ?? { id, source, target, edges: [] };
      link.edges.push(e);
      links.set(id, link);
    }
    return [...links.values()];
  }, [edges, hiddenBySection]);

  // O que o roteamento precisa saber das seções recolhidas (lido no efeito das rotas).
  sectionViewRef.current = {
    hidden: new Set(hiddenBySection.keys()),
    blocks: sectionNodes
      .filter((n) => n.data.variant === 'block')
      .map((n) => ({ id: n.id, type: 'userTask' as NodeType, x: n.position.x, y: n.position.y, width: n.data.width, height: n.data.height })),
    links: sectionLinks.map((l) => ({ id: l.id, source: l.source, target: l.target, onError: l.edges.every((e) => isErrorEdge(e)) })),
  };

  const sectionLinkEdges = useMemo(
    () =>
      sectionLinks.flatMap((l) => {
        // Estilo da primeira ligação normal (ou da de falha, se todas forem de falha).
        const shown = displayEdges.find((d) => l.edges.some((e) => e.id === d.id && !isErrorEdge(e))) ?? displayEdges.find((d) => l.edges.some((e) => e.id === d.id));
        if (!shown) return [];
        const onError = l.edges.every((e) => isErrorEdge(e));
        return [
          {
            id: l.id,
            source: l.source,
            target: l.target,
            type: edgeShape,
            selectable: false,
            deletable: false,
            focusable: false,
            reconnectable: false,
            style: shown.style,
            markerEnd: shown.markerEnd,
            data: { route: routes.get(l.id), onError },
          },
        ];
      }),
    [sectionLinks, displayEdges, edgeShape, routes],
  );

  function handleSave() {
    // Salvar não exige mais consistência estrutural (rascunho pode ficar inválido) — só a
    // publicação garante isso agora (PublishJourneyVersion.goLive, no back). Quem quiser saber se
    // o fluxo atual está consistente antes de publicar usa o botão "Validar" (handleValidate).
    if (!name.trim()) {
      setErrorTitle('Não foi possível salvar');
      setErrors(['Informe o nome da jornada.']);
      return;
    }

    // Jornada nova: Salvar confirma a criação mesmo sem alterações.
    if (!isNew && buildFlowSnapshot(name, description, nodes, edges, annotations, liveSections) === savedSnapshotRef.current) {
      showToast('Nenhuma alteração foi feita — nenhuma nova versão será gerada.', 'info');
      return;
    }

    if (activeJourney.status === 'PUBLISHED') {
      setConfirmingPublishedEdit(true);
      return;
    }

    doSave();
  }

  // Jornada nova que ainda não foi salva: sair é desistir de criá-la, então pede confirmação e a exclui.
  function handleCancel() {
    if (isNew && onDiscard) {
      setConfirmingDiscard(true);
    } else {
      onClose();
    }
  }

  async function doSave() {
    setSaving(true);
    try {
      const journeyRecord = await updateJourney(activeJourney.journeyId, { name, description });
      await updateFlow(journeyRecord.journeyId, buildFlowInput(nodes, edges, annotations, nodeMode, liveSections));
      setActiveJourney(journeyRecord);
      savedSnapshotRef.current = buildFlowSnapshot(name, description, nodes, edges, annotations, liveSections);
      onSaved();
    } catch (err) {
      // Uma violação estrutural (422) vem com uma lista de mensagens em `details` — usar cada uma
      // como item próprio do ErrorModal em vez da mensagem única (que junta tudo com "; ") faz a
      // lista aparecer como itens separados de verdade, não um parágrafo só.
      setErrorTitle('Não foi possível salvar');
      if (err instanceof ApiClientError && err.details?.length) {
        setErrors(err.details.map((d) => d.message));
      } else {
        setErrors([err instanceof Error ? err.message : 'Erro ao salvar jornada.']);
      }
    } finally {
      setSaving(false);
    }
  }

  // Roda a mesma checagem estrutural que a publicação vai exigir (FlowValidator, no back), contra
  // o estado atual do editor — sem persistir nada, então funciona mesmo com alterações ainda não
  // salvas. 200 vazio = consistente (toast de sucesso); 422 traz a mesma lista de violações que
  // Salvar mostrava antes desta mudança, agora só sob demanda aqui.
  async function handleValidate() {
    setValidating(true);
    try {
      await validateFlow(activeJourney.journeyId, buildFlowInput(nodes, edges, annotations, nodeMode, liveSections));
      setValidationStatus('valid');
      setInvalidNodeReasons(new Map());
      showToast('Jornada consistente — nenhuma violação estrutural encontrada.', 'success');
    } catch (err) {
      setErrorTitle('Jornada inconsistente');
      if (err instanceof ApiClientError && err.details?.length) {
        // Só marca "inválida" quando o erro é mesmo uma violação estrutural (FlowValidator) — um
        // erro de rede/servidor não confirma inconsistência nenhuma, só que a checagem falhou.
        setValidationStatus('invalid');
        setErrors(err.details.map((d) => d.message));
        // `field` carrega o id do nó com problema (ver ApiErrorDetail/FlowViolation no back) quando
        // a violação é sobre uma etapa específica — "flow" (violação sobre a jornada como um todo,
        // ex.: contagem de elementos iniciais/finais) não bate com nenhum id de nó e é ignorado aqui.
        // Duas violações no mesmo nó (ex.: gateway sem padrão E com condição faltando) juntam a
        // mensagem com "; ", pro tooltip do badge mostrar as duas.
        const nodeIds = new Set(nodes.map((n) => n.id));
        const reasons = new Map<string, string>();
        for (const d of err.details) {
          if (!nodeIds.has(d.field)) continue;
          reasons.set(d.field, reasons.has(d.field) ? `${reasons.get(d.field)}; ${d.message}` : d.message);
        }
        setInvalidNodeReasons(reasons);
      } else {
        setErrors([err instanceof Error ? err.message : 'Erro ao validar jornada.']);
      }
    } finally {
      setValidating(false);
    }
  }

  // Qualquer edição no fluxo invalida o resultado da última checagem — sem isso, o ícone
  // continuaria verde/vermelho mesmo depois do usuário mudar o desenho, mentindo sobre o estado
  // atual (o back só sabe o que foi mandado da última vez que "Validar" rodou).
  useEffect(() => {
    setValidationStatus(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodes, edges, annotations]);

  const propertiesNode = nodes.find((n) => n.id === propertiesNodeId) ?? null;
  // Dock segue a seleção diretamente: qualquer User Task selecionada mostra o dock (editor de tela
  // embutido).
  const isValidPreviewTarget = propertiesNode?.type === 'userTask';
  // Fixado (dockPinned): selecionar qualquer outra coisa some não esconde mais o dock — ele fica
  // preso na última User Task válida (pinnedPreviewNodeId) até ser desafixado ou apagado.
  const previewNode = isValidPreviewTarget
    ? propertiesNode
    : dockPinned
      ? (nodes.find((n) => n.id === pinnedPreviewNodeId) ?? null)
      : null;
  const previewVariables = previewNode ? availableVariableOriginsAt(previewNode.id, nodes, edges) : [];
  const userTasks = orderedUserTasks(nodes, edges);
  const hasUnsavedChanges = savedSnapshotRef.current !== null
    && savedSnapshotRef.current !== buildFlowSnapshot(name, description, nodes, edges, annotations, liveSections);

  // 2+ selecionados: organiza só o grupo (mantém o resto do canvas onde está). 0 ou 1 selecionado:
  // organiza o canvas inteiro, comportamento de sempre.
  const organize = useCallback(async () => {
    pushHistory();
    const selectedIds = new Set(nodesRef.current.filter((n) => n.selected).map((n) => n.id));
    const mode = nodeModeRef.current;
    const before = nodesRef.current;
    const laidOut =
      selectedIds.size >= 2
        ? await computeLayoutForSelection(before, edgesRef.current, selectedIds, mode)
        : await computeLayout(before, edgesRef.current, mode, liveSectionsRef.current, collapsedRef.current);
    setNodes(laidOut);
    // As molduras acompanham: a recolhida anda com as etapas dela, e a aberta se ajusta a elas.
    if (selectedIds.size < 2) setSections(refitSections(liveSectionsRef.current, before, laidOut, collapsedRef.current, mode));
    // Recentraliza o resultado sem trocar o zoom atual do usuário — fitView recalcularia um zoom
    // novo pra caber tudo, o que não é o que "Organizar" deveria fazer (só reposiciona os nós).
    requestAnimationFrame(() => {
      const paneEl = wrapperRef.current;
      if (!paneEl || nodesRef.current.length === 0) return;
      const bounds = getNodesBounds(nodesRef.current.map((n) => n.id));
      if (bounds.width === 0 && bounds.height === 0) return;
      const { width: paneWidth, height: paneHeight } = paneEl.getBoundingClientRect();
      if (!paneWidth || !paneHeight) return;
      const { zoom: currentZoom } = getViewport();
      // Mesma correção do "Ajustar à tela" (fitToVisibleArea): descontar a altura do Form Builder
      // quando aberto, senão o recentro considera espaço que na prática está coberto pelo dock.
      const occupiedBottom = previewNode ? dockHeight : 0;
      const visibleHeight = Math.max(paneHeight - occupiedBottom, 1);
      setViewport(
        {
          x: paneWidth / 2 - (bounds.x + bounds.width / 2) * currentZoom,
          y: visibleHeight / 2 - (bounds.y + bounds.height / 2) * currentZoom,
          zoom: currentZoom,
        },
        { duration: 200 },
      );
    });
  }, [pushHistory, getNodesBounds, getViewport, setViewport, previewNode, dockHeight]);

  // Trocar de modo reorganiza o fluxo no espaçamento do novo modo (também quando o modo muda em
  // outra tela, já que a preferência é compartilhada).
  useEffect(() => {
    if (loading || laidOutModeRef.current === null || laidOutModeRef.current === nodeMode) return;
    laidOutModeRef.current = nodeMode;
    pushHistory();
    const before = nodesRef.current;
    computeLayout(before, edgesRef.current, nodeMode, liveSectionsRef.current, collapsedRef.current).then((laidOut) => {
      setNodes(laidOut);
      setSections(refitSections(liveSectionsRef.current, before, laidOut, collapsedRef.current, nodeMode));
      requestAnimationFrame(() => fitViewLeftAligned());
    });
  }, [nodeMode, loading, pushHistory, fitViewLeftAligned]);

  // Botão "Ajustar à tela" da Toolbar: o fitView nativo do React Flow calcula contra a altura
  // inteira do pane, sem saber que o Form Builder (FormDesignerDock, position:absolute) cobre a
  // parte de baixo do mesmo container quando aberto — resultado, nós ficavam ajustados atrás do
  // dock. Reaproveita o cálculo manual de fitViewLeftAligned, mas centralizado e restrito à área
  // realmente visível acima do dock.
  // Sem ids: o fluxo inteiro; com ids: só essas etapas (zoom na seleção).
  const fitToVisibleArea = useCallback((ids?: string[]) => {
    const paneEl = wrapperRef.current;
    const target = ids ?? nodesRef.current.map((n) => n.id);
    if (!paneEl || target.length === 0) return;
    const bounds = getNodesBounds(target);
    if (bounds.width === 0 && bounds.height === 0) return;
    const { width: paneWidth, height: paneHeight } = paneEl.getBoundingClientRect();
    if (!paneWidth || !paneHeight) return;
    // ponytail: usa a altura do dock no modo docked padrão — não distingue dock recolhido (bem
    // menor, resultado só fica um pouco mais afastado do que precisaria) nem expandido em tela
    // cheia (cobre o canvas inteiro, botão fica inacessível de qualquer forma). Ajustar se o estado
    // recolhido/expandido algum dia subir de FormDesignerDock pra este componente.
    const occupiedBottom = previewNode ? dockHeight : 0;
    const visibleHeight = Math.max(paneHeight - occupiedBottom, 1);
    const padding = 0.2;
    const zoom = Math.min(
      (paneWidth * (1 - padding)) / bounds.width,
      (visibleHeight * (1 - padding)) / bounds.height,
      1.6, // mesmo maxZoom configurado no <ReactFlow> abaixo
    );
    const boundedZoom = Math.max(zoom, 0.2); // mesmo minZoom configurado no <ReactFlow> abaixo
    const x = paneWidth / 2 - (bounds.x + bounds.width / 2) * boundedZoom;
    const y = visibleHeight / 2 - (bounds.y + bounds.height / 2) * boundedZoom;
    setViewport({ x, y, zoom: boundedZoom }, { duration: 200 });
  }, [getNodesBounds, setViewport, previewNode, dockHeight]);

  // Leva a etapa ao centro da tela (Guia/tour), sem afastar além do zoom atual.
  const focusOnNode = useCallback(
    (nodeId: string) => {
      const paneEl = wrapperRef.current;
      if (!paneEl) return;
      const bounds = getNodesBounds([nodeId]);
      const { width, height } = paneEl.getBoundingClientRect();
      const z = Math.max(getViewport().zoom, 0.9);
      setViewport({ x: width / 2 - (bounds.x + bounds.width / 2) * z, y: height / 2 - (bounds.y + bounds.height / 2) * z, zoom: z }, { duration: 350 });
    },
    [getNodesBounds, getViewport, setViewport],
  );

  // Atalhos de navegação: Ctrl+F busca, F (ou Shift+1) ajusta à tela, Shift+2 aproxima da seleção,
  // Shift+0 volta a 100%, Ctrl+G agrupa a seleção numa seção. Fora de campos de texto.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        setSearchOpen(true);
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        groupSelection();
      } else if (!e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey && e.key.toLowerCase() === 'f') {
        e.preventDefault();
        fitToVisibleArea();
      } else if (e.shiftKey && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (e.code === 'Digit1') fitToVisibleArea();
        else if (e.code === 'Digit2') {
          const ids = nodesRef.current.filter((n) => n.selected).map((n) => n.id);
          if (ids.length) fitToVisibleArea(ids);
        } else if (e.code === 'Digit0') zoomTo(1, { duration: 150 });
        else return;
        e.preventDefault();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [fitToVisibleArea, zoomTo, groupSelection]);

  useEffect(() => {
    if (isValidPreviewTarget && propertiesNode) setPinnedPreviewNodeId(propertiesNode.id);
  }, [isValidPreviewTarget, propertiesNode?.id]);
  // Memoizado: sem isso, o objeto era recriado a cada render (inclusive nos dezenas de renders por
  // segundo que o próprio arraste de um nó dispara via onNodesChange), e todo nó que consome esse
  // contexto (useFlowTheme) reage à mudança de referência mesmo memoizado — Context ignora React.memo.
  const flowTheme = useMemo(() => ({ dark, c, nodeFill, nodeMode }), [dark, c, nodeFill, nodeMode]);

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex-1 flex flex-col items-center justify-center gap-3 text-[13px]" style={{ color: c.textSecondary }}>
        <Loader2 size={26} className="animate-spin" style={{ color: c.accent }} />
        Carregando a jornada…
      </div>
    );
  }

  return (
    <FlowThemeContext.Provider value={flowTheme}>
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
            nodeMode={nodeMode}
            onNodeModeChange={setNodeMode}
            selectedCount={selectedNodeIds.length}
            onAlign={alignSelected}
            onDistribute={distributeSelected}
            onSave={handleSave}
            saving={saving}
            onValidate={handleValidate}
            validating={validating}
            validationStatus={validationStatus}
            onCancel={handleCancel}
            journeyName={name}
          />
          <div className="flex-1 flex min-h-0">
            <Palette onAdd={addNodeFromPalette} onAddAnnotation={addAnnotationFromPalette} onAddSection={addSectionFromPalette} />
            <div
              ref={wrapperRef}
              className="flex-1 relative min-w-0"
              // Teste: Roboto (fonte padrão do Mística) só nos componentes dentro do canvas — não no
              // resto da tela (toolbar/paleta/painel de propriedades continuam na fonte de sempre).
              style={{ fontFamily: "'Roboto', sans-serif" }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={onDrop}
            >
              {!drawn && (
                <div
                  role="status"
                  aria-live="polite"
                  data-canvas-loading
                  className="absolute inset-0 z-50 flex flex-col items-center justify-center gap-3 text-[13px]"
                  style={{ background: c.canvasBg, color: c.textSecondary, fontFamily: 'inherit' }}
                >
                  <Loader2 size={26} className="animate-spin" style={{ color: c.accent }} />
                  Desenhando a jornada…
                </div>
              )}
              <ReactFlow
                nodes={[...(sectionNodes as unknown as WFNode[]), ...displayNodes, ...displayAnnotations]}
                edges={[...displayEdges, ...sectionLinkEdges]}
                nodeTypes={nodeTypes}
                edgeTypes={flowEdgeTypes}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                // Enquanto uma ligação é puxada, os pontos de conexão de todas as etapas ficam visíveis.
                onConnectStart={() => setConnecting(true)}
                onConnectEnd={onConnectEnd}
                className={connecting ? 'wf-connecting' : undefined}
                onReconnect={onReconnect}
                // Duplo clique na linha: escreve (ou troca) o rótulo dela.
                onEdgeDoubleClick={(_, edge) => !edge.id.startsWith('SectionLink_') && setEditingEdgeId(edge.id)}
                onPaneClick={onPaneClick}
                onNodeDragStart={onNodeDragStart}
                // Só etapas destacam o caminho; moldura/bloco de seção não.
                onNodeMouseEnter={(_, node) => !node.id.startsWith('Section') && setHoveredNodeId(node.id)}
                onNodeMouseLeave={() => setHoveredNodeId(null)}
                onBeforeDelete={onBeforeDelete}
                // Desligado enquanto o dock de edição de tela está aberto (previewNode) — o React
                // Flow do editor de tela (FormScreenCanvasWeb) roda aninhado dentro desta mesma
                // página, com seu próprio deleteKeyCode desligado de propósito; sem isto, apertar
                // Delete enquanto o foco está num componente da tela também disparava o listener
                // global desta instância (a de fora), apagando a User Task selecionada em vez do
                // componente da tela.
                deleteKeyCode={previewNode ? null : ['Delete', 'Backspace']}
                multiSelectionKeyCode={['Control', 'Meta']}
                selectionKeyCode={['Control', 'Meta']}
                minZoom={0.2}
                maxZoom={1.6}
                connectionRadius={30}
                defaultEdgeOptions={{ type: edgeShape }}
                colorMode={dark ? 'dark' : 'light'}
                // A pintura de fundo real do React Flow mora na camada .react-flow__background, que
                // lê a variável --xy-background-color (herdada por CSS custom property) — setar
                // `background` aqui no elemento raiz só troca a cor de baixo dessa camada, invisível
                // por trás dela.
                style={{ background: journeyCanvasBg, ['--xy-background-color' as string]: journeyCanvasBg }}
                proOptions={{ hideAttribution: true }}
              >
                <Background variant={BackgroundVariant.Dots} color={journeyDotColor} gap={20} size={1.2} />
                <NavigationBar
                  zoomPct={Math.round(zoom * 100)}
                  selectedCount={selectedNodeIds.length}
                  onSearch={() => setSearchOpen(true)}
                  search={
                    searchOpen ? (
                      <NodeSearch
                        nodes={nodes.map((n) => ({ id: n.id, type: n.type as NodeType, name: n.data.name }))}
                        onPick={(id) => {
                          selectOnlyNode(id);
                          focusOnNode(id);
                        }}
                        onClose={() => setSearchOpen(false)}
                      />
                    ) : null
                  }
                  onZoomIn={() => zoomIn({ duration: 150 })}
                  onZoomOut={() => zoomOut({ duration: 150 })}
                  onZoom={(pct) => zoomTo(pct / 100, { duration: 150 })}
                  onFit={() => fitToVisibleArea()}
                  onZoomToSelection={() => fitToVisibleArea(nodesRef.current.filter((n) => n.selected).map((n) => n.id))}
                  onGroup={groupSelection}
                />
                <GuidePanel
                  notes={notes}
                  nodeName={(nodeId) => nodesRef.current.find((n) => n.id === nodeId)?.data.name}
                  onHighlight={setGuideNodeId}
                  onFocus={focusOnNode}
                  startTour={tourPending}
                />
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
                <FormDesignerDock
                  channelTypes={activeJourney.channelTypes}
                  nodeId={previewNode.id}
                  embeddedScreenRoot={previewNode.data.embeddedScreenRoot ?? null}
                  onEmbeddedScreenRootChange={(root) => updateNodeData(previewNode.id, { embeddedScreenRoot: root })}
                  screenDataSources={previewNode.data.screenDataSources ?? []}
                  onScreenDataSourcesChange={(dataSources) => updateNodeData(previewNode.id, { screenDataSources: dataSources })}
                  onPushHistory={pushHistory}
                  variables={previewVariables}
                  userTasks={userTasks}
                  onNavigateTask={selectOnlyNode}
                  height={dockHeight}
                  onHeightChange={setDockHeight}
                  pinned={dockPinned}
                  onPinnedChange={setDockPinned}
                  hasUnsavedChanges={hasUnsavedChanges}
                />
              )}
            </div>
            <PropertiesDock
              node={propertiesNode}
              clusters={clusters}
              credentials={credentials}
              allNodes={nodes}
              allEdges={edges}
              journeyId={activeJourney.journeyId}
              onUpdateNode={(patch) => propertiesNode && updateNodeData(propertiesNode.id, patch)}
              onUpdateEdge={updateEdgeData}
              onMoveEdge={moveEdge}
              onDeleteNode={() => propertiesNode && deleteNode(propertiesNode.id)}
              freshNodeId={freshNodeId}
              onFreshNodeConsumed={() => setFreshNodeId(null)}
              journey={{
                productName: activeJourney.productName,
                channelTypes: activeJourney.channelTypes,
                onEditChannels: () => setChannelsModalOpen(true),
                name,
                onNameChange: setName,
                description,
                onDescriptionChange: setDescription,
              }}
            />
          </div>
        </div>
        {channelsModalOpen && (
          <EditJourneyChannelsModal
            journey={activeJourney}
            onClose={() => setChannelsModalOpen(false)}
            onUpdated={(updated) => {
              setActiveJourney(updated);
              setChannelsModalOpen(false);
            }}
          />
        )}
        {errors.length > 0 && <ErrorModal errors={errors} title={errorTitle} onClose={() => setErrors([])} />}
        {confirmingDiscard && (
          <ConfirmDialog
            title="Descartar a nova jornada?"
            message="A jornada ainda não foi salva. Se você sair agora, ela será excluída como se nunca tivesse sido criada."
            confirmLabel="Descartar"
            cancelLabel="Continuar editando"
            onConfirm={() => {
              setConfirmingDiscard(false);
              onDiscard?.();
            }}
            onCancel={() => setConfirmingDiscard(false)}
          />
        )}
        {confirmingPublishedEdit && (
          <ConfirmDialog
            title="Editar jornada publicada?"
            message={
              <>
                Esta jornada está publicada. Salvar agora grava essas alterações numa versão em rascunho separada, sem
                alterar o que já está no ar.{' '}
                <strong style={{ color: appColors.warning }}>
                  Quando esse rascunho for publicado, ele vira mais uma versão publicada — a versão atual continua
                  ativa até você despublicá-la manualmente.
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
