import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  BaseEdge,
  getSmoothStepPath,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  useStore,
  useInternalNode,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, Crosshair, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { BACKEND_TO_FRONT_TYPE, ERROR_HANDLE, TYPE_COLOR, type ConnectorConfig, type NodeType } from '../flow-designer/model';
import { NodeShape } from '../flow-designer/NodeShape';
import { NodeCard, NodeDot, NodePill, detailForZoom } from '../flow-designer/NodeCard';
import { DEFAULT_PATH_LABEL, readableCondition, screenVariableLabels } from '../flow-designer/conditionLabel';
import type { SduiNode } from '../sdui/model';
import type { FlowSection } from '../api/flows';
import { isTaskType, labelReserve, nodeChips, nodeSize, nodeTypeLabel, useNodeDisplayMode, type NodeDisplayMode } from '../flow-designer/nodeMode';
import { computeRoutes, layoutPositions } from '../flow-designer/layout';
import { fitRoute, labelPoint, roundedPath, type EdgeRoute, type Pt } from '../flow-designer/edgeRouter';
import { EdgeLabel } from '../flow-designer/EdgeLabel';
import { LIGHT_COLORS, DARK_COLORS, JOURNEY_CANVAS_BG_DARK, JOURNEY_CANVAS_DOT_DARK } from '../flow-designer/theme';
import { useAppTheme } from '../shell/theme';
import type { FlowConnectionInfo, FlowNodeInfo } from './api';
import { ErrorDetailsModal } from './ErrorDetailsModal';

const PENDING_COLOR = skinVars.colors.neutralMedium;

// Handles precisam existir no DOM pro React Flow medir os pontos de conexão das arestas, mas não
// têm por que aparecer como "bolinhas" nas bordas dos cards — ficam com opacidade zero.
const HANDLE_STYLE = { width: 1, height: 1, opacity: 0, zIndex: 5 } as const;

// 'type' é usado pela visualização estática (sem execução): cada nó fica colorido pela cor do seu
// próprio tipo, em vez do cinza neutro de "pendente" (que só faz sentido quando há um caminho
// percorrido de verdade pra contrastar contra).
type NodeStatus = 'done' | 'current' | 'pending' | 'error' | 'type';

interface SimNodeData extends Record<string, unknown> {
  // Níveis de detalhe por zoom (desligado na miniatura de modelo).
  lod?: boolean;
  frontType: NodeType;
  name: string;
  status: NodeStatus;
  connectorType?: string | null;
  connectorConfig?: ConnectorConfig | null;
  screenRoot?: SduiNode | null;
  mode: NodeDisplayMode;
  selected?: boolean;
  onShowError?: () => void;
  onSelect?: () => void;
  // Ordem em que a execução passou por aqui (1, 2…; mais de um número quando voltou por um laço).
  stepNumbers?: number[];
  // Fora do caminho percorrido, com o restante esmaecido.
  dimmed?: boolean;
  // O motor está passando por esta etapa agora (animação do que ele faz sozinho entre passos).
  flash?: boolean;
}

// Cores por status — mesma forma/ícone do designer (NodeShape), só a "pintura" muda conforme a
// execução avança. 'pending'/'type' usam o mesmo tratamento neutro do designer por padrão (fundo/
// borda neutros, só o ícone com a cor do tipo); 'current'/'done'/'error' são a trilha de execução
// de verdade (REQ desta funcionalidade: "ir pintando conforme vai executando"), a única coisa que
// não podia se perder na unificação com o editor.
function statusStyle(status: NodeStatus, typeColor: string) {
  switch (status) {
    case 'current':
      return {
        background: `${typeColor}26`,
        borderColor: typeColor,
        iconColor: typeColor,
        boxShadow: 'none',
        pulse: true,
        pulseColor: typeColor,
      };
    case 'done':
      // Contorno verde marca "já passou por aqui", ícone e fundo continuam na cor do próprio tipo
      // do componente (igual ao designer) — só o anel muda com a execução, não a identidade visual
      // do nó. Fundo preenchido, mas com a cor do tipo (bem diluída), não verde.
      return {
        background: `${typeColor}26`,
        borderColor: skinVars.colors.success,
        iconColor: typeColor,
        boxShadow: 'none',
        pulse: false,
      };
    case 'error':
      // Anel só (sem piscar) — usa o token "Low" já pronto da Mística em vez de concatenar alfa
      // hexadecimal numa cor var(...) do skin, que não é uma string hex e quebraria.
      return {
        background: skinVars.colors.errorLow,
        borderColor: skinVars.colors.error,
        iconColor: skinVars.colors.error,
        boxShadow: `0 0 0 3px ${skinVars.colors.errorLow}`,
        pulse: false,
      };
    case 'pending':
      return {
        background: skinVars.colors.backgroundContainer,
        borderColor: PENDING_COLOR,
        iconColor: skinVars.colors.textSecondary,
        boxShadow: 'none',
        pulse: false,
      };
    case 'type':
    default:
      return {
        background: skinVars.colors.backgroundContainer,
        borderColor: skinVars.colors.border,
        iconColor: typeColor,
        boxShadow: 'none',
        pulse: false,
      };
  }
}

function SimNode({ data }: NodeProps<Node<SimNodeData>>) {
  const { frontType, name, status, connectorType, connectorConfig, screenRoot, mode, selected, onShowError, onSelect, stepNumbers, dimmed, flash, lod } = data;
  const { dark } = useAppTheme();
  const zoom = useStore((state) => state.transform[2]);
  // Mesmos três níveis do editor (cartão, pílula, ponto); a miniatura de modelo não usa.
  const detail = lod ? detailForZoom(zoom) : 'full';
  const typeColor = TYPE_COLOR[frontType];
  const dim = nodeSize(frontType, mode);
  const asCard = mode !== 'circle' && isTaskType(frontType);
  const baseStyle = statusStyle(status, typeColor);
  // Eventos e Decisão ainda não alcançados: fundo e borda da cor do tipo, como no editor.
  const style =
    !isTaskType(frontType) && (status === 'type' || status === 'pending')
      ? { ...baseStyle, background: `color-mix(in srgb, ${typeColor} 20%, ${skinVars.colors.backgroundContainer})`, borderColor: typeColor, iconColor: typeColor }
      : baseStyle;
  // Ponto de longe: cor da trilha (percorrida, atual, erro) ou do tipo.
  const dotColor =
    status === 'error' ? skinVars.colors.error : status === 'done' ? skinVars.colors.success : status === 'current' ? skinVars.colors.brand : typeColor;
  // Mesma cor de foco do nó selecionado no canvas de Jornadas (flow-designer/theme accent) — não o
  // skinVars.colors.brand da skin Mística ativa, que muda conforme o skin escolhido (Blau, Movistar,
  // ...) e por isso não bate com o roxo fixo que o designer usa pra "selecionado".
  const focusColor = dark ? DARK_COLORS.accent : LIGHT_COLORS.accent;
  const SELECTED_RING = `0 0 0 2px ${focusColor}`;
  const labelColor = status === 'pending' ? skinVars.colors.textSecondary : skinVars.colors.textPrimary;
  const boxShadow = selected
    ? [style.boxShadow !== 'none' ? style.boxShadow : null, SELECTED_RING].filter(Boolean).join(', ')
    : style.boxShadow;

  return (
    <div
      className="relative"
      // O React Flow põe `pointer-events: none` no wrapper do nó quando ele não é
      // selecionável/arrastável (nosso caso, o diagrama continua somente-leitura pra mover/conectar) —
      // sem isso o clique nunca chegaria aqui, mesma razão do botão de erro logo abaixo.
      style={{
        width: dim.width,
        height: dim.height,
        pointerEvents: 'auto',
        cursor: onSelect ? 'pointer' : undefined,
        opacity: dimmed ? 0.35 : 1,
        transition: 'opacity 250ms ease-out',
      }}
      onClick={onSelect}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      {detail === 'dot' ? (
        <NodeDot color={dotColor} />
      ) : asCard ? (
        (() => {
          const colors = {
            background: style.background,
            border: style.borderColor,
            textPrimary: labelColor,
            textSecondary: skinVars.colors.textSecondary,
            chipBg: skinVars.colors.backgroundAlternative,
            warnBg: skinVars.colors.errorLow,
            warnText: skinVars.colors.error,
            typeColor: style.iconColor,
            error: skinVars.colors.error,
          };
          return mode === 'detailed' ? (
            <NodeCard
              detail={detail}
              nodeType={frontType}
              name={name}
              colors={colors}
              boxShadow={boxShadow}
              pulse={style.pulse}
              pulseColor={style.pulseColor}
              typeLabel={nodeTypeLabel(frontType, connectorType)}
              chips={nodeChips(frontType, connectorConfig, screenRoot, false, false)}
            />
          ) : (
            <NodePill detail={detail} nodeType={frontType} name={name} colors={colors} boxShadow={boxShadow} pulse={style.pulse} pulseColor={style.pulseColor} />
          );
        })()
      ) : (
      <NodeShape
        size={dim}
        nodeType={frontType}
        name={name}
        background={style.background}
        borderColor={style.borderColor}
        iconColor={style.iconColor}
        labelColor={labelColor}
        boxShadow={boxShadow}
        pulse={style.pulse}
        pulseColor={style.pulseColor}
        surfaceColor={skinVars.colors.backgroundContainer}
        badgeColor={skinVars.colors.brand}
        connectorType={connectorType}
        largeLabel
      />
      )}
      {status === 'error' && onShowError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowError();
          }}
          title="Ver detalhes do erro"
          className="absolute -top-[7px] -right-[7px] w-5 h-5 rounded-full flex items-center justify-center cursor-pointer border-0"
          // O React Flow põe `pointer-events: none` no wrapper do nó quando ele não é
          // selecionável/arrastável (nosso caso, o diagrama é somente-leitura) — sem isso o clique
          // nunca chega a este botão.
          style={{ background: skinVars.colors.error, color: '#fff', pointerEvents: 'auto', zIndex: 10 }}
        >
          <AlertTriangle size={13} strokeWidth={2.5} />
        </button>
      )}
      {flash && (
        <div
          className="flow-step-flash absolute pointer-events-none"
          style={{ inset: -6, borderRadius: asCard ? 16 : 999, border: `3px solid ${skinVars.colors.brand}` }}
        />
      )}
      {stepNumbers && stepNumbers.length > 0 && detail !== 'dot' && (
        <div
          title={`Passo ${stepNumbers.join(', ')} da execução`}
          className="absolute -top-[10px] -left-[10px] h-[20px] min-w-[20px] px-[5px] rounded-full flex items-center justify-center text-[10.5px] font-bold"
          style={{ background: skinVars.colors.brand, color: '#fff', zIndex: 6, boxShadow: '0 1px 3px rgba(0,0,0,.25)' }}
        >
          {stepNumbers.length > 3 ? `${stepNumbers.slice(0, 2).join(',')}…` : stepNumbers.join(',')}
        </div>
      )}
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
      <Handle type="source" id={ERROR_HANDLE} position={Position.Bottom} style={HANDLE_STYLE} />
    </div>
  );
}

// Moldura de seção, só leitura: nome do grupo e contorno tracejado atrás das etapas.
function SectionFrame({ data }: NodeProps<Node<{ name: string; width: number; height: number; failure?: boolean }>>) {
  return (
    <div
      style={{
        width: data.width,
        height: data.height,
        borderRadius: 16,
        border: `1.5px dashed ${skinVars.colors.border}`,
        background: `color-mix(in srgb, ${skinVars.colors.brand} 4%, transparent)`,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          fontSize: 13,
          fontWeight: 700,
          letterSpacing: '0.12em',
          textTransform: 'uppercase',
          color: data.failure ? skinVars.colors.error : skinVars.colors.textSecondary,
        }}
      >
        {data.name}
      </div>
    </div>
  );
}

const NODE_TYPES = { simNode: SimNode, sectionFrame: SectionFrame };

interface ViewerEdgeData extends Record<string, unknown> {
  lod?: boolean;
  route?: EdgeRoute;
  labelText?: string;
  rawCondition?: string;
  danger?: boolean;
  dimmed?: boolean;
}

// Linha somente-leitura pela rota calculada (desvia das etapas); sem rota, o caminho simples. O rótulo
// é a mesma etiqueta do editor; com condição legível, a expressão original aparece ao passar o mouse.
function RoutedViewerEdge({ source, target, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, style, markerEnd, data }: EdgeProps<Edge<ViewerEdgeData>>) {
  const far = useStore((state) => state.transform[2] < 0.45) && !!data?.lod;
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const points = fitRoute(data?.route, { x: sourceX, y: sourceY }, { x: targetX, y: targetY });
  let path: string;
  let at: Pt;
  if (points) {
    path = roundedPath(points);
    at = labelPoint(points, data?.route?.loop);
  } else {
    const [p, lx, ly] = getSmoothStepPath({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition });
    path = p;
    at = { x: lx, y: ly };
  }
  if (far && sourceNode && targetNode) {
    const center = (n: NonNullable<typeof sourceNode>) => ({
      x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
      y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
    });
    const start = /^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(path);
    const sc = center(sourceNode);
    const tc = center(targetNode);
    if (start) path = 'M' + sc.x + ' ' + sc.y + 'L' + start[1] + ' ' + start[2] + path.replace(/^M[^LQ]*/, '') + 'L' + tc.x + ' ' + tc.y;
  }
  return (
    <>
      <BaseEdge path={path} style={style} markerEnd={far ? undefined : markerEnd} />
      {data?.labelText && (
        <EdgeLabel
          x={at.x}
          y={at.y}
          text={data.labelText}
          title={data.rawCondition}
          danger={data.danger}
          dimmed={data.dimmed}
          hideWhenFar={!!data.lod}
          colors={{
            background: skinVars.colors.backgroundContainer,
            border: skinVars.colors.border,
            text: skinVars.colors.textPrimary,
            dangerBackground: skinVars.colors.errorLow,
            dangerBorder: skinVars.colors.error,
            dangerText: skinVars.colors.error,
          }}
        />
      )}
    </>
  );
}

const EDGE_TYPES = { routed: RoutedViewerEdge };

interface Props {
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
  erroredNodeId?: string | null;
  erroredNodeName?: string | null;
  erroredMessage?: string | null;
  // Visualização somente estrutural (sem execução em andamento) — usada pela pré-visualização de
  // fluxo em Jornadas. Cada nó fica colorido pela cor do seu tipo (em vez do cinza "pendente"), e o
  // enquadramento inicial usa o `fitView` nativo do React Flow (mais confiável nesse caso, já que não
  // há uma etapa atual pra centralizar).
  staticView?: boolean;
  // Clicar num nó pra ver seu input/output (ao vivo ou histórico) — opcional: sem onNodeSelect, os
  // nós continuam puramente visuais, como antes.
  selectedNodeId?: string | null;
  onNodeSelect?: (nodeId: string | null) => void;
  // Miniatura (prévia de template em Nova jornada): enquadra o fluxo inteiro, sem rótulo de condição
  // nas ligações e sem capturar a rolagem do painel em volta (zoom só pelos botões).
  compact?: boolean;
  sections?: FlowSection[];
  // Execução/Diagnóstico: número de cada passo por etapa, o resto esmaecido e a etapa que o motor
  // está percorrendo agora (destaque animado).
  stepNumbers?: Record<string, number[]>;
  dimUnvisited?: boolean;
  flashNodeId?: string | null;
  // "Seguir a execução": centraliza a etapa atual (e a animada) a cada passo. Ausente = segue.
  follow?: boolean;
  onFollowChange?: (follow: boolean) => void;
}

export function FlowDiagramViewer(props: Props) {
  return (
    <div className="w-full h-full">
      <ReactFlowProvider>
        <FlowDiagramInner {...props} />
      </ReactFlowProvider>
    </div>
  );
}

function FlowDiagramInner({
  flowNodes,
  flowConnections,
  currentNodeId,
  visitedNodeIds,
  erroredNodeId,
  erroredNodeName,
  erroredMessage,
  staticView,
  selectedNodeId,
  onNodeSelect,
  compact,
  sections,
  stepNumbers,
  dimUnvisited,
  flashNodeId,
  follow = true,
  onFollowChange,
}: Props) {
  const { zoomIn, zoomOut, fitView, setCenter, getZoom } = useReactFlow();
  const { dark } = useAppTheme();
  const [mode] = useNodeDisplayMode();
  // Somente leitura: sempre organizado na hora, no modo de quem está vendo.
  const [positions, setPositions] = useState<Map<string, { x: number; y: number }> | null>(null);
  useEffect(() => {
    let cancelled = false;
    layoutPositions(
      flowNodes.map((n) => ({ id: n.id, type: BACKEND_TO_FRONT_TYPE[n.type] })),
      flowConnections.map((c) => ({ id: c.id, source: c.sourceNodeId, target: c.targetNodeId, onError: c.onError, isDefault: c.isDefault })),
      mode,
      compact ? [] : (sections ?? []),
    ).then((p) => {
      if (!cancelled) setPositions(p);
    });
    return () => {
      cancelled = true;
    };
  }, [flowNodes, flowConnections, mode]);
  const placed = useMemo(
    () =>
      positions
        ? flowNodes.map((n) => ({ ...n, positionX: positions.get(n.id)?.x ?? n.positionX, positionY: positions.get(n.id)?.y ?? n.positionY }))
        : [],
    [flowNodes, positions],
  );
  const routes = useMemo(
    () =>
      computeRoutes(
        placed.map((n) => ({ id: n.id, type: BACKEND_TO_FRONT_TYPE[n.type], x: n.positionX, y: n.positionY })),
        flowConnections.map((c) => ({ id: c.id, source: c.sourceNodeId, target: c.targetNodeId, onError: c.onError, isDefault: c.isDefault })),
        mode,
        compact ? [] : (sections ?? []),
      ),
    [placed, flowConnections, mode, sections, compact],
  );
  const variableLabels = useMemo(() => screenVariableLabels(flowNodes.map((n) => n.embeddedScreenRoot)), [flowNodes]);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const visited = useMemo(() => new Set(visitedNodeIds), [visitedNodeIds]);

  const onShowError = () => setShowErrorModal(true);

  const nodes: Node<SimNodeData>[] = useMemo(
    () =>
      placed.map((n) => {
        // erroredNodeId vence mesmo em staticView — é assim que a prévia de "Executar" (StartPanel)
        // aponta o nó culpado quando o start falha (StartFailureDiagnostic), sem precisar de uma
        // instância rodando de verdade pra ter "etapa atual"/"visitados".
        const status: NodeStatus =
          n.id === erroredNodeId
            ? 'error'
            : staticView
              ? 'type'
              : n.id === currentNodeId
                ? 'current'
                : visited.has(n.id)
                  ? 'done'
                  : 'pending';
        return {
          id: n.id,
          type: 'simNode',
          position: { x: n.positionX, y: n.positionY },
          draggable: false,
          selectable: false,
          data: {
            frontType: BACKEND_TO_FRONT_TYPE[n.type],
            name: n.name,
            status,
            connectorType: n.connectorConfig?.connectorType ?? null,
            connectorConfig: n.connectorConfig ? { ...n.connectorConfig, credentialRef: null } : null,
            screenRoot: n.embeddedScreenRoot ?? null,
            mode,
            selected: n.id === selectedNodeId,
            onShowError: status === 'error' ? onShowError : undefined,
            onSelect: onNodeSelect ? () => onNodeSelect(n.id === selectedNodeId ? null : n.id) : undefined,
            stepNumbers: stepNumbers?.[n.id],
            lod: !compact,
            dimmed: !!dimUnvisited && status === 'pending',
            flash: n.id === flashNodeId,
          },
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [placed, mode, currentNodeId, visited, erroredNodeId, erroredNodeName, erroredMessage, staticView, selectedNodeId, onNodeSelect, stepNumbers, dimUnvisited, flashNodeId],
  );

  // Molduras das seções em volta das etapas do grupo (mesma folga do editor).
  const sectionFrames: Node[] = useMemo(() => {
    if (!sections?.length || compact) return [];
    return sections.flatMap((s) => {
      const members = placed.filter((n) => s.nodeIds.includes(n.id));
      if (members.length === 0) return [];
      const boxes = members.map((n) => {
        const type = BACKEND_TO_FRONT_TYPE[n.type];
        const size = nodeSize(type, mode);
        return { x: n.positionX, y: n.positionY, r: n.positionX + size.width, b: n.positionY + size.height + labelReserve(type, mode) };
      });
      const x0 = Math.min(...boxes.map((b) => b.x)) - 24;
      const y0 = Math.min(...boxes.map((b) => b.y)) - 40;
      const x1 = Math.max(...boxes.map((b) => b.r)) + 24;
      const y1 = Math.max(...boxes.map((b) => b.b)) + 12;
      return [
        {
          id: `Section_${s.id}`,
          type: 'sectionFrame',
          position: { x: x0, y: y0 },
          draggable: false,
          selectable: false,
          zIndex: -1,
          data: { name: s.name, width: x1 - x0, height: y1 - y0, failure: flowConnections.some((c) => c.onError && s.nodeIds.includes(c.targetNodeId)) },
        },
      ];
    });
  }, [sections, placed, mode, compact, flowConnections]);

  const edges: Edge[] = useMemo(
    () =>
      flowConnections.map((c) => {
        const traversed = visited.has(c.sourceNodeId) && (visited.has(c.targetNodeId) || c.targetNodeId === currentNodeId);
        const color = traversed ? skinVars.colors.success : PENDING_COLOR;
        return {
          id: c.id,
          type: 'routed',
          source: c.sourceNodeId,
          target: c.targetNodeId,
          ...(c.onError ? { sourceHandle: ERROR_HANDLE } : {}),
          data: {
            route: routes.get(c.id),
            rawCondition: !c.onError && !c.isDefault && c.condition ? c.condition : undefined,
            labelText: compact ? undefined : c.label ? c.label : c.onError ? 'Se falhar' : c.isDefault ? DEFAULT_PATH_LABEL : (readableCondition(c.condition ?? undefined, variableLabels) ?? c.condition ?? undefined),
            danger: !!c.onError,
            lod: !compact,
            dimmed: !!dimUnvisited && !traversed,
          },
          // Saída "Se falhar": tracejada, na cor de erro enquanto não foi percorrida.
          style: {
            stroke: c.onError && !traversed ? skinVars.colors.error : color,
            strokeWidth: traversed ? 2 : 1.5,
            strokeDasharray: c.onError ? '5 4' : undefined,
            opacity: dimUnvisited && !traversed ? 0.3 : 1,
          },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [flowConnections, visited, currentNodeId, compact, routes, variableLabels, dimUnvisited],
  );

  // Centraliza a etapa atual sempre que ela muda (inclusive no primeiro carregamento), num zoom
  // fixo que deixa cada card em tamanho legível — fluxos longos (como o survey de 15 perguntas)
  // não cabem inteiros na tela, então um `fitView` do grafo inteiro encolhe demais os componentes.
  // Na visualização estática (prévia de "Executar", sem instância rodando) não há "etapa atual" —
  // o enquadramento inicial é o início do fluxo (nó START/MESSAGE_START_EVENT), e o diagnóstico de
  // falha ao iniciar (erroredNodeId) assume assim que aparece, com prioridade sobre o início.
  useEffect(() => {
    if (placed.length === 0) return;
    if (compact) {
      requestAnimationFrame(() => fitView({ padding: 0.12 }));
      return;
    }
    const target = staticView
      ? (placed.find((n) => n.id === erroredNodeId) ?? placed.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT'))
      : placed.find((n) => n.id === currentNodeId);
    if (!follow && !staticView) return;
    if (!target) {
      if (!staticView) requestAnimationFrame(() => fitView({ padding: 0.2, duration: 300 }));
      return;
    }
    const dim = nodeSize(BACKEND_TO_FRONT_TYPE[target.type], mode);
    setCenter(target.positionX + dim.width / 2, target.positionY + dim.height / 2, { zoom: 1, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, staticView, erroredNodeId, placed, follow]);

  // Acompanha a etapa que o motor está percorrendo sozinho, sem mudar o zoom de quem está vendo.
  useEffect(() => {
    if (!follow || !flashNodeId) return;
    const target = placed.find((n) => n.id === flashNodeId);
    if (!target) return;
    const dim = nodeSize(BACKEND_TO_FRONT_TYPE[target.type], mode);
    setCenter(target.positionX + dim.width / 2, target.positionY + dim.height / 2, { zoom: getZoom(), duration: 250 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flashNodeId]);

  // Seleção vinda de fora do canvas (link no Log/Histórico de Variáveis) pode mirar num nó que não
  // está na área visível — sem centralizar, o destaque muda mas o usuário não vê nada acontecer.
  useEffect(() => {
    if (!selectedNodeId) return;
    const target = placed.find((n) => n.id === selectedNodeId);
    if (!target) return;
    const dim = nodeSize(BACKEND_TO_FRONT_TYPE[target.type], mode);
    setCenter(target.positionX + dim.width / 2, target.positionY + dim.height / 2, { zoom: 1, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  const iconBtn =
    'w-[28px] h-[28px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer';

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={[...sectionFrames, ...nodes]}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll={!compact}
        preventScrolling={!compact}
        minZoom={compact ? 0.05 : 0.2}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        // Mesmo fundo do canvas do designer de Jornadas no claro (LIGHT_COLORS.canvasBg) — sem isso
        // o React Flow cai no próprio transparente padrão e deixa o que tiver atrás aparecer, ficando
        // diferente do cinza do canvas de edição. --xy-background-color é a variável que a camada
        // real de fundo (.react-flow__background) lê, não o `background` do elemento raiz (ver
        // mesmo ajuste em JourneyDesignerPage). Escuro fica como já estava — só o claro foi pedido.
        style={{
          background: dark ? JOURNEY_CANVAS_BG_DARK : LIGHT_COLORS.canvasBg,
          ['--xy-background-color' as string]: dark ? JOURNEY_CANVAS_BG_DARK : LIGHT_COLORS.canvasBg,
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color={dark ? JOURNEY_CANVAS_DOT_DARK : skinVars.colors.border} />
      </ReactFlow>
      <div
          className={`absolute ${compact ? 'bottom-2 right-2' : 'bottom-3 right-3'} flex items-center gap-[2px] rounded-lg px-1 py-1`}
          style={{ background: skinVars.colors.backgroundContainer, border: `1px solid ${skinVars.colors.border}` }}
        >
          <button type="button" onClick={() => zoomOut({ duration: 150 })} className={iconBtn} style={{ color: skinVars.colors.textSecondary }} title="Diminuir zoom">
            <ZoomOut size={15} />
          </button>
          <button type="button" onClick={() => zoomIn({ duration: 150 })} className={iconBtn} style={{ color: skinVars.colors.textSecondary }} title="Aumentar zoom">
            <ZoomIn size={15} />
          </button>
          <button type="button" onClick={() => fitView({ padding: 0.2, duration: 200 })} className={iconBtn} style={{ color: skinVars.colors.textSecondary }} title="Ajustar à tela">
            <Maximize size={15} />
          </button>
          {onFollowChange && (
            <button
              type="button"
              onClick={() => onFollowChange(!follow)}
              aria-pressed={follow}
              className="h-[28px] px-[8px] rounded-md border-0 flex items-center gap-[5px] cursor-pointer text-[12px] font-medium"
              style={{
                background: follow ? skinVars.colors.brandLow : 'transparent',
                color: follow ? skinVars.colors.brand : skinVars.colors.textSecondary,
              }}
              title="Centralizar a etapa atual a cada passo"
            >
              <Crosshair size={14} /> Seguir a execução
            </button>
          )}
        </div>
      {showErrorModal && (
        <ErrorDetailsModal
          title={erroredNodeName ?? 'Erro na etapa'}
          message={erroredMessage ?? 'Ocorreu um erro inesperado ao executar esta etapa.'}
          onClose={() => setShowErrorModal(false)}
        />
      )}
    </div>
  );
}
