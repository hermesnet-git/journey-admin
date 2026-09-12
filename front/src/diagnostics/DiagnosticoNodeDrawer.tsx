import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { skinVars, Text } from '@telefonica/mistica';
import {
  ConnectorConfigSection,
  GatewaySection,
  CollapsibleJsonSection,
  nodeDurationLabel,
  NODE_TYPE_LABEL_PT,
} from '../execution/InspectorPanel';
import type { FlowConnectionInfo, FlowNodeInfo, NodeIODetail } from '../execution/api';
import type { VariableSnapshot, VariableTimelineEntry } from './api';
import { NodeSnapshotSection } from './NodeSnapshotSection';

const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 260;
const MAX_WIDTH = 640;

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
  onClose: () => void;
}

// Drawer próprio do Diagnóstico (não o NodeDetailDrawer do InspectorPanel — decisão de manter as
// duas telas independentes) — reaproveita só as peças de baixo nível sem estado próprio
// (ConnectorConfigSection/GatewaySection/CollapsibleJsonSection/nodeDurationLabel/NODE_TYPE_LABEL_PT,
// exportadas de InspectorPanel.tsx) e acrescenta a seção "Estado das variáveis", generalizando pra
// qualquer nó o que antes só existia pro Início.
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
      <div className="flex-1 min-w-0 h-full overflow-auto" style={{ background: skinVars.colors.background }}>
        <div className="flex items-start justify-between gap-2 p-3 border-b" style={{ borderColor: skinVars.colors.border }}>
          <div className="min-w-0">
            <Text size={13} weight="medium" color={skinVars.colors.textPrimary}>
              {detail?.nodeName ?? fallbackName}
            </Text>
            {typeLabel && (
              <div className="mt-[2px]">
                <Text size={11} color={skinVars.colors.textSecondary}>
                  {typeLabel} · {timingLabel(detail?.nodeType ?? flowNode?.type, detail, isCurrent)}
                </Text>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="shrink-0 cursor-pointer border-0 bg-transparent"
            style={{ color: skinVars.colors.textSecondary }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {isGateway && flowNode && (
            <GatewaySection
              gatewayId={flowNode.id}
              flowNodes={flowNodes}
              flowConnections={flowConnections}
              currentNodeId={currentNodeId}
              visitedNodeIds={visitedNodeIds}
            />
          )}
          {connectorConfig && <ConnectorConfigSection connectorConfig={connectorConfig} nodeType={flowNode?.type} />}
          {detail?.input && (
            <CollapsibleJsonSection
              title={
                (detail?.nodeType ?? flowNode?.type) === 'START'
                  ? 'Informações enviadas ao motor'
                  : connectorConfig && connectorConfig.connectorType !== 'REST'
                    ? 'Payload da Mensagem'
                    : 'Entrada'
              }
              data={detail.input}
            />
          )}
          {detail?.output && <CollapsibleJsonSection title="Saída" data={detail.output} />}
          {reached && <NodeSnapshotSection endTime={detail?.endTime ?? null} variables={variables} timeline={variableTimeline} />}
          {!isGateway && !connectorConfig && !detail?.input && !detail?.output && !reached && (
            <Text size={12.5} color={skinVars.colors.textSecondary}>
              A instância ainda não chegou nesta etapa.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}
