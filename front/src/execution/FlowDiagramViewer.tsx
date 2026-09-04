import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  BackgroundVariant,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertTriangle, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { BACKEND_TO_FRONT_TYPE, NODE_DIMENSIONS, TYPE_COLOR, type NodeType } from '../flow-designer/model';
import { NodeShape } from '../flow-designer/NodeShape';
import { LIGHT_COLORS, DARK_COLORS } from '../flow-designer/theme';
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
  frontType: NodeType;
  name: string;
  status: NodeStatus;
  connectorType?: string | null;
  selected?: boolean;
  onShowError?: () => void;
  onSelect?: () => void;
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
  const { frontType, name, status, connectorType, selected, onShowError, onSelect } = data;
  const { dark } = useAppTheme();
  const typeColor = TYPE_COLOR[frontType];
  const dim = NODE_DIMENSIONS[frontType];
  const style = statusStyle(status, typeColor);
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
      style={{ width: dim.width, height: dim.height, pointerEvents: 'auto', cursor: onSelect ? 'pointer' : undefined }}
      onClick={onSelect}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <NodeShape
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
      />
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
      <Handle type="source" position={Position.Right} style={HANDLE_STYLE} />
    </div>
  );
}

const NODE_TYPES = { simNode: SimNode };

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
}: Props) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const { dark } = useAppTheme();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const visited = useMemo(() => new Set(visitedNodeIds), [visitedNodeIds]);

  const onShowError = () => setShowErrorModal(true);

  const nodes: Node<SimNodeData>[] = useMemo(
    () =>
      flowNodes.map((n) => {
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
            selected: n.id === selectedNodeId,
            onShowError: status === 'error' ? onShowError : undefined,
            onSelect: onNodeSelect ? () => onNodeSelect(n.id === selectedNodeId ? null : n.id) : undefined,
          },
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowNodes, currentNodeId, visited, erroredNodeId, erroredNodeName, erroredMessage, staticView, selectedNodeId, onNodeSelect],
  );

  const edges: Edge[] = useMemo(
    () =>
      flowConnections.map((c) => {
        const traversed = visited.has(c.sourceNodeId) && (visited.has(c.targetNodeId) || c.targetNodeId === currentNodeId);
        const color = traversed ? skinVars.colors.success : PENDING_COLOR;
        return {
          id: c.id,
          source: c.sourceNodeId,
          target: c.targetNodeId,
          label: c.isDefault ? 'padrão' : (c.condition ?? undefined),
          // Contorno (stroke atrás do preenchimento via paintOrder) em vez de uma caixa de fundo —
          // dá contraste pra ler o texto sobre qualquer nó/linha que passe por baixo, sem desenhar
          // um retângulo sólido atrás dele.
          labelStyle: {
            fill: skinVars.colors.textPrimary,
            fontSize: 11,
            fontWeight: 600,
            stroke: skinVars.colors.background,
            strokeWidth: 4,
            paintOrder: 'stroke',
          },
          labelBgStyle: { fill: 'transparent' },
          labelBgPadding: [0, 0] as [number, number],
          style: { stroke: color, strokeWidth: traversed ? 2 : 1.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      }),
    [flowConnections, visited, currentNodeId],
  );

  // Centraliza a etapa atual sempre que ela muda (inclusive no primeiro carregamento), num zoom
  // fixo que deixa cada card em tamanho legível — fluxos longos (como o survey de 15 perguntas)
  // não cabem inteiros na tela, então um `fitView` do grafo inteiro encolhe demais os componentes.
  // Na visualização estática (prévia de "Executar", sem instância rodando) não há "etapa atual" —
  // o enquadramento inicial é o início do fluxo (nó START/MESSAGE_START_EVENT), e o diagnóstico de
  // falha ao iniciar (erroredNodeId) assume assim que aparece, com prioridade sobre o início.
  useEffect(() => {
    const target = staticView
      ? (flowNodes.find((n) => n.id === erroredNodeId) ?? flowNodes.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT'))
      : flowNodes.find((n) => n.id === currentNodeId);
    if (!target) {
      if (!staticView) fitView({ padding: 0.2, duration: 300 });
      return;
    }
    const dim = NODE_DIMENSIONS[BACKEND_TO_FRONT_TYPE[target.type]];
    setCenter(target.positionX + dim.width / 2, target.positionY + dim.height / 2, { zoom: 1, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, staticView, erroredNodeId, flowNodes]);

  const iconBtn =
    'w-[28px] h-[28px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer';

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        zoomOnScroll
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
        // Mesmo fundo do canvas do designer de Jornadas no claro (LIGHT_COLORS.canvasBg) — sem isso
        // o React Flow cai no próprio transparente padrão e deixa o que tiver atrás aparecer, ficando
        // diferente do cinza do canvas de edição. --xy-background-color é a variável que a camada
        // real de fundo (.react-flow__background) lê, não o `background` do elemento raiz (ver
        // mesmo ajuste em JourneyDesignerPage). Escuro fica como já estava — só o claro foi pedido.
        style={!dark ? { background: LIGHT_COLORS.canvasBg, ['--xy-background-color' as string]: LIGHT_COLORS.canvasBg } : undefined}
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1.4} color={skinVars.colors.border} />
      </ReactFlow>
      <div
        className="absolute bottom-3 right-3 flex items-center gap-[2px] rounded-lg px-1 py-1"
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
