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
import { Info, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { BACKEND_TO_FRONT_TYPE, NODE_DIMENSIONS, TYPE_COLOR, type NodeType } from '../flow-designer/model';
import { NodeShape } from '../flow-designer/NodeShape';
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
      return {
        background: skinVars.colors.successLow,
        borderColor: skinVars.colors.success,
        iconColor: skinVars.colors.success,
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

// Anel adicional, por cima do que o status já desenha, marcando o nó clicado — cor distinta
// (brand) pra não ser confundido com o verde de "concluído" ou o vermelho de "erro".
const SELECTED_RING = `0 0 0 2px ${skinVars.colors.brand}`;

function SimNode({ data }: NodeProps<Node<SimNodeData>>) {
  const { frontType, name, status, selected, onShowError, onSelect } = data;
  const typeColor = TYPE_COLOR[frontType];
  const dim = NODE_DIMENSIONS[frontType];
  const style = statusStyle(status, typeColor);
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
    const dim = NODE_DIMENSIONS[BACKEND_TO_FRONT_TYPE[current.type]];
    setCenter(current.positionX + dim.width / 2, current.positionY + dim.height / 2, { zoom: 1, duration: 300 });
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
