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
import { Play, ClipboardList, CheckCircle2 as EndIcon, Server, Mail, Diamond, Info, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { BACKEND_TO_FRONT_TYPE, NODE_META, NODE_WIDTH, TYPE_COLOR, type NodeType } from '../flow-designer/model';
import type { FlowConnectionInfo, FlowNodeInfo } from './api';
import { ErrorDetailsModal } from './ErrorDetailsModal';

// Mesmo mapa de ícones do WorkflowNode.tsx (flow-designer) — redeclarado aqui de propósito: são 7
// linhas, e esse visualizador não deve depender de um componente acoplado ao editor de fluxo.
const ICON: Record<NodeType, typeof Play> = {
  start: Play,
  userTask: ClipboardList,
  end: EndIcon,
  serviceTask: Server,
  receiveTask: Mail,
  messageStartEvent: Mail,
  gateway: Diamond,
};

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
  onShowError?: () => void;
}

function SimNode({ data }: NodeProps<Node<SimNodeData>>) {
  const { frontType, name, status, onShowError } = data;
  const Icon = ICON[frontType];
  const typeColor = TYPE_COLOR[frontType];
  const isCurrent = status === 'current';
  const isDone = status === 'done';
  const isPending = status === 'pending';
  const isError = status === 'error';
  const isTypeColored = status === 'type';

  // O ícone é sempre o do tipo de componente (nunca vira um "check") — só a cor do card muda por
  // status. `successLow`/`errorLow` são os tokens já prontos da Mística para preenchimento tintado
  // (concatenar alfa hexadecimal numa cor `var(...)` do skin não funciona — não é uma string hex).
  const background = isCurrent
    ? `${typeColor}26`
    : isDone
      ? skinVars.colors.successLow
      : isError
        ? skinVars.colors.errorLow
        : isTypeColored
          ? `${typeColor}14`
          : skinVars.colors.backgroundContainer;
  const borderColor = isCurrent
    ? typeColor
    : isDone
      ? skinVars.colors.success
      : isError
        ? skinVars.colors.error
        : isTypeColored
          ? typeColor
          : PENDING_COLOR;
  const iconColor = isCurrent
    ? typeColor
    : isDone
      ? skinVars.colors.success
      : isError
        ? skinVars.colors.error
        : isTypeColored
          ? typeColor
          : skinVars.colors.textSecondary;
  const textColor = isPending ? skinVars.colors.textSecondary : skinVars.colors.textPrimary;

  return (
    <div
      className="relative rounded-xl px-3 py-[10px] flex items-center gap-[10px]"
      style={{
        width: NODE_WIDTH,
        background,
        // Largura da borda sempre igual em todo status — variar `borderWidth` muda a altura "auto"
        // do card (border soma fora do conteúdo mesmo com box-sizing:border-box), o que desalinha o
        // handle vertical (top:50%) entre nós vizinhos e torce as setas. O destaque do passo atual
        // (mais grosso, piscando) usa `outline` em vez disso — não participa do box model/layout.
        border: `1.5px solid ${borderColor}`,
        outline: isCurrent ? `2.5px solid ${typeColor}` : isError ? `2px solid ${skinVars.colors.error}` : 'none',
        outlineOffset: isCurrent || isError ? 1.5 : 0,
        // A etapa atual "pisca" o contorno lentamente pra deixar óbvio que o fluxo está parado ali
        // aguardando (resposta de usuário ou "Pular etapa").
        ['--sim-outline-full' as string]: typeColor,
        ['--sim-outline-dim' as string]: `${typeColor}30`,
        animation: isCurrent ? 'blink-current-outline 2.2s ease-in-out infinite' : 'none',
      }}
    >
      <Handle type="target" position={Position.Left} style={HANDLE_STYLE} />
      <Icon size={17} color={iconColor} strokeWidth={2} className="shrink-0" />
      <div className="min-w-0">
        <div className="text-[12.5px] font-semibold truncate" style={{ color: textColor }}>
          {name}
        </div>
        <div className="text-[10.5px] truncate" style={{ color: skinVars.colors.textSecondary }}>
          {NODE_META[frontType].title}
        </div>
      </div>
      {isError && onShowError && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onShowError();
          }}
          title="Ver detalhes do erro"
          className="shrink-0 w-5 h-5 rounded-full flex items-center justify-center cursor-pointer border-0"
          // O React Flow põe `pointer-events: none` no wrapper do nó quando ele não é
          // selecionável/arrastável (nosso caso, o diagrama é somente-leitura) — sem isso o clique
          // nunca chega a este botão.
          style={{ background: skinVars.colors.error, color: '#fff', pointerEvents: 'auto' }}
        >
          <Info size={13} strokeWidth={2.5} />
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
}: Props) {
  const { zoomIn, zoomOut, fitView, setCenter } = useReactFlow();
  const [showErrorModal, setShowErrorModal] = useState(false);
  const visited = useMemo(() => new Set(visitedNodeIds), [visitedNodeIds]);

  const onShowError = () => setShowErrorModal(true);

  const nodes: Node<SimNodeData>[] = useMemo(
    () =>
      flowNodes.map((n) => {
        const status: NodeStatus = staticView
          ? 'type'
          : n.id === erroredNodeId
            ? 'error'
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
            onShowError: status === 'error' ? onShowError : undefined,
          },
        };
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [flowNodes, currentNodeId, visited, erroredNodeId, erroredNodeName, erroredMessage, staticView],
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
          labelStyle: { fill: skinVars.colors.textSecondary, fontSize: 11 },
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
  // Na visualização estática não há "etapa atual" — o `fitView` nativo do <ReactFlow> (mais abaixo)
  // já cuida do enquadramento inicial, com timing mais confiável que chamar fitView() num efeito.
  useEffect(() => {
    if (staticView) return;
    const current = flowNodes.find((n) => n.id === currentNodeId);
    if (!current) {
      fitView({ padding: 0.2, duration: 300 });
      return;
    }
    setCenter(current.positionX + NODE_WIDTH / 2, current.positionY + 30, { zoom: 1, duration: 300 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentNodeId, staticView]);

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
        panOnScroll
        zoomOnScroll
        fitView={staticView}
        fitViewOptions={{ padding: 0.2 }}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        proOptions={{ hideAttribution: true }}
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
