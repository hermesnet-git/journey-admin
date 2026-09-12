import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import { nodeDurationLabel, NODE_TYPE_LABEL_PT } from '../execution/InspectorPanel';
import type { FlowConnectionInfo, FlowNodeInfo, NodeIODetail } from '../execution/api';
import type { IncidentEntry, VariableSnapshot, VariableTimelineEntry } from './api';
import type { NodeLayoutProps } from './nodeLayoutTypes';
import { NodeDetailInspector } from './NodeDetailInspector';

const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 300;
const MAX_WIDTH = 680;

// Início/Fim (e Início por Mensagem) são eventos de fronteira, praticamente instantâneos — duração
// vira "0.0 s", sem significado nenhum, e "em andamento" nunca cabe pro Início (já aconteceu, é
// passado). Mostra a que horas aconteceu de verdade em vez de uma duração sem sentido; o resto dos
// tipos de nó continua com nodeDurationLabel (duração é informação real ali).
const BOUNDARY_TYPES = new Set(['START', 'END', 'MESSAGE_START_EVENT']);

function timingLabel(nodeType: string | undefined, detail: NodeIODetail | undefined, isCurrent: boolean): string {
  if (isCurrent) return 'em andamento';
  if (nodeType && BOUNDARY_TYPES.has(nodeType) && detail?.endTime) {
    return `concluído às ${new Date(detail.endTime).toLocaleTimeString('pt-BR')}`;
  }
  return nodeDurationLabel(detail);
}

interface Props {
  nodeId: string;
  detail: NodeIODetail | undefined;
  flowNode: FlowNodeInfo | undefined;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  visitedNodeIds: string[];
  currentNodeId: string | null;
  variables: VariableSnapshot[];
  variableTimeline: VariableTimelineEntry[];
  incidents: IncidentEntry[];
  onClose: () => void;
}

// Drawer próprio do Diagnóstico (não o NodeDetailDrawer do InspectorPanel — decisão de manter as
// duas telas independentes). Chegou a ter 3 propostas de layout lado a lado (chips no topo) pra
// comparar com dado real; o Inspector venceu e as outras duas (Narrativa/Abas) foram removidas.
export function DiagnosticoNodeDrawer({
  nodeId,
  detail,
  flowNode,
  flowNodes,
  flowConnections,
  visitedNodeIds,
  currentNodeId,
  variables,
  variableTimeline,
  incidents,
  onClose,
}: Props) {
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const next = drag.startWidth + (drag.startX - e.clientX);
      setWidth(Math.min(Math.max(next, MIN_WIDTH), MAX_WIDTH));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startDrag(e: React.MouseEvent) {
    draggingRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  const typeLabel = NODE_TYPE_LABEL_PT[detail?.nodeType ?? flowNode?.type ?? ''] ?? null;
  const connectorConfig = flowNode?.connectorConfig ?? null;
  const isGateway = (detail?.nodeType ?? flowNode?.type) === 'GATEWAY';
  const fallbackName = flowNode?.name ?? nodeId;
  const isCurrent = nodeId === currentNodeId;
  // Sem detail e não é o nó atual: a instância nunca chegou aqui — não faz sentido "fotografar" o
  // estado das variáveis pra um ponto que nunca aconteceu.
  const reached = detail !== undefined || isCurrent;
  const incident = incidents.find((i) => i.nodeId === nodeId) ?? null;

  const layoutProps: NodeLayoutProps = {
    nodeId,
    detail,
    flowNode,
    flowNodes,
    flowConnections,
    visitedNodeIds,
    currentNodeId,
    variables,
    variableTimeline,
    incident,
    isCurrent,
    isGateway,
    reached,
    connectorConfig,
    typeLabel,
    fallbackName,
    timing: timingLabel(detail?.nodeType ?? flowNode?.type, detail, isCurrent),
  };

  return (
    <div className="shrink-0 h-full flex" style={{ width }}>
      <div
        onMouseDown={startDrag}
        className="w-[5px] shrink-0 h-full cursor-col-resize flex items-center justify-center"
        style={{ background: skinVars.colors.backgroundAlternative, borderLeft: `1px solid ${skinVars.colors.border}` }}
        title="Arraste para redimensionar"
      >
        <div className="w-[3px] h-10 rounded-full" style={{ background: skinVars.colors.border }} />
      </div>
      <div className="flex-1 min-w-0 h-full overflow-auto relative" style={{ background: skinVars.colors.background }}>
        <button
          type="button"
          onClick={onClose}
          title="Fechar"
          className="absolute top-[14px] right-[14px] z-10 shrink-0 cursor-pointer border-0 bg-transparent flex items-center justify-center"
          style={{ color: skinVars.colors.textSecondary, width: 24, height: 24 }}
        >
          <X size={15} />
        </button>

        <NodeDetailInspector {...layoutProps} />
      </div>
    </div>
  );
}
