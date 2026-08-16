import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useAppTheme, type AppColors } from '../shell/theme';
import { getFlow, type Flow } from '../api/flows';
import { NODE_META, TYPE_COLOR, type NodeType } from '../flow-designer/model';
import { FlowDiagramViewer } from '../simulation/FlowDiagramViewer';
import type { FlowConnectionInfo, FlowNodeInfo } from '../simulation/api';

// Só os tipos que realmente aparecem nos fluxos gerados — messageStartEvent usa a mesma cor de
// "start" (ambos são início do fluxo) e ficaria redundante numa legenda.
const LEGEND_TYPES: NodeType[] = ['start', 'userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];

interface Props {
  journeyId: string;
  journeyName: string;
  onClose: () => void;
}

// Reaproveita o mesmo visualizador somente-leitura da aba "Fluxo da Jornada" das Simulações — mesma
// linguagem visual (cores por tipo, ícones, fundo pontilhado, zoom), sem o comportamento de execução
// (não há passo atual/concluído/erro aqui, é só a estrutura do fluxo).
export function JourneyFlowPreviewModal({ journeyId, journeyName, onClose }: Props) {
  const { colors: c } = useAppTheme();
  const [flow, setFlow] = useState<Flow | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getFlow(journeyId)
      .then((f) => {
        if (!cancelled) setFlow(f);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Erro ao carregar o fluxo.');
      });
    return () => {
      cancelled = true;
    };
  }, [journeyId]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const nodes: FlowNodeInfo[] =
    flow?.nodes.map((n) => ({
      id: n.nodeId,
      type: n.nodeType,
      name: n.name,
      positionX: n.positionX,
      positionY: n.positionY,
      formId: n.userTaskConfig?.formId ?? null,
      connectorConfig: n.connectorConfig
        ? { connectorType: n.connectorConfig.connectorType, config: n.connectorConfig.config }
        : null,
    })) ?? [];

  const connections: FlowConnectionInfo[] =
    flow?.connections.map((conn) => ({
      id: conn.connectionId,
      sourceNodeId: conn.sourceNodeId,
      targetNodeId: conn.targetNodeId,
      condition: conn.condition,
      isDefault: conn.isDefault,
    })) ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[960px] h-[75vh] rounded-2xl flex flex-col box-border"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 20px 50px -12px ${c.shadow}` }}
      >
        <div className="flex items-start justify-between gap-4 px-6 py-5 border-b shrink-0" style={{ borderColor: c.border }}>
          <div className="min-w-0">
            <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: c.textPrimary }}>
              Fluxo: {journeyName}
            </h2>
            <p className="m-0 mt-[3px] text-[12.5px]" style={{ color: c.textSecondary }}>
              Visualização somente leitura do fluxo atual da jornada.
            </p>
          </div>
          <button
            type="button"
            aria-label="Fechar"
            onClick={onClose}
            className="shrink-0 flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer"
            style={{ color: c.textMuted }}
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative flex-1 min-h-0">
          {error ? (
            <p className="p-6 text-[13px]" style={{ color: c.danger }}>
              {error}
            </p>
          ) : !flow ? (
            <p className="p-6 text-[13px]" style={{ color: c.textSecondary }}>
              Carregando...
            </p>
          ) : nodes.length === 0 ? (
            <p className="p-6 text-[13px]" style={{ color: c.textSecondary }}>
              Esta jornada ainda não tem um fluxo definido.
            </p>
          ) : (
            <>
              <FlowDiagramViewer
                flowNodes={nodes}
                flowConnections={connections}
                currentNodeId={null}
                visitedNodeIds={[]}
                staticView
              />
              <ColorLegend c={c} />
            </>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-6 py-4 border-t rounded-b-2xl shrink-0"
          style={{ borderColor: c.border, background: c.bg }}
        >
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-4 py-2 text-[12.5px] font-medium cursor-pointer border"
            style={{ borderColor: c.border, background: c.surface, color: c.textPrimary }}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}

// Fica fora da árvore do <FlowDiagramViewer> (que é quem tem o pan/zoom do React Flow) — um overlay
// `position: absolute` no container pai não se move nem dá zoom junto com o diagrama. Mesma altura
// (bottom-3) do painel de zoom do FlowDiagramViewer, que fica no canto oposto (bottom-right).
function ColorLegend({ c }: { c: AppColors }) {
  return (
    <div
      className="absolute bottom-3 left-3 rounded-lg px-3 py-[9px] flex items-center gap-4 pointer-events-none"
      style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 4px 16px -4px ${c.shadow}` }}
    >
      {LEGEND_TYPES.map((type) => (
        <div key={type} className="flex items-center gap-[7px]">
          <span className="w-[9px] h-[9px] rounded-full shrink-0" style={{ background: TYPE_COLOR[type] }} />
          <span className="text-[12px] whitespace-nowrap" style={{ color: c.textSecondary }}>
            {NODE_META[type].title}
          </span>
        </div>
      ))}
    </div>
  );
}
