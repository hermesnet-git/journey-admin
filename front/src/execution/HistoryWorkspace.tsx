import { useEffect, useState } from 'react';
import { skinVars, Text } from '@telefonica/mistica';
import { getVariables, type InstanceHistoryResponse, type NodeIODetail, type VariableEntry } from './api';
import { InspectorPanel, type LogEntry } from './InspectorPanel';

interface Props {
  history: InstanceHistoryResponse;
}

// Mesmo texto que ExecutionWorkspace já usa pra narrar a trilha ao vivo (describeTrailEntry) — aqui
// não é incremental, o histórico inteiro já chega pronto de uma vez, então vira o log inteiro direto.
const STEP_TYPE_LABEL: Record<string, (name: string) => string> = {
  START: (name) => `Jornada iniciada em "${name}".`,
  USER_TASK: (name) => `Tarefa de usuário "${name}" concluída.`,
  SERVICE_TASK: (name) => `Tarefa de serviço "${name}" executada.`,
  RECEIVE_TASK: (name) => `Tarefa de recebimento "${name}" concluída.`,
  GATEWAY: (name) => `Decisão "${name}" avaliada.`,
  END: (name) => `Etapa final "${name}" alcançada.`,
};

function describeHistoryStep(step: NodeIODetail): string {
  const describe = STEP_TYPE_LABEL[step.nodeType];
  return describe ? describe(step.nodeName) : `Etapa "${step.nodeName}" concluída.`;
}

function stepLogData(step: NodeIODetail): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  if (step.input) data.entrada = step.input;
  if (step.output) data.saida = step.output;
  return Object.keys(data).length > 0 ? data : undefined;
}

export const STATE_LABEL: Record<string, string> = {
  ACTIVE: 'Ativa',
  COMPLETED: 'Concluída',
  EXTERNALLY_TERMINATED: 'Encerrada manualmente',
  INTERNALLY_TERMINATED: 'Encerrada pelo motor',
  SUSPENDED: 'Suspensa',
};

export function HistoryWorkspace({ history }: Props) {
  const [variables, setVariables] = useState<VariableEntry[]>([]);

  // Mesmo endpoint que o modo ao vivo já usa (GET /instances/{id}/variables) — CamundaClient já
  // resolve variáveis de qualquer instância, ativa ou terminada, via fallback pra história (ver
  // CamundaClient.getProcessVariables no ms-espec-registry), então não precisa de nada novo aqui.
  useEffect(() => {
    getVariables(history.processInstanceId)
      .then(setVariables)
      .catch(() => {
        /* aba Variáveis só fica vazia; não impede ver o resto do histórico */
      });
  }, [history.processInstanceId]);

  const startNodeId = history.flow.flowNodes.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT')?.id;
  const visitedNodeIds = [startNodeId, ...history.steps.map((s) => s.nodeId)].filter(
    (id): id is string => !!id,
  );

  const nodeIO: Record<string, NodeIODetail> = {};
  for (const step of history.steps) {
    nodeIO[step.nodeId] = step;
  }

  const log: LogEntry[] = history.steps.map((step, i) => ({
    id: `history-${i}`,
    time: (step.endTime ?? step.startTime).slice(11, 23),
    message: describeHistoryStep(step),
    data: stepLogData(step),
  }));

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: skinVars.colors.background }}>
      <div
        className="shrink-0 flex items-center gap-6 px-6 py-4 border-b flex-wrap"
        style={{ borderColor: skinVars.colors.border }}
      >
        <div>
          <Text size={15} weight="medium" color={skinVars.colors.textPrimary}>
            {history.journeyName}
            {history.versionNumber != null && (
              <span style={{ color: skinVars.colors.textSecondary, fontWeight: 400 }}> · v{history.versionNumber}</span>
            )}
          </Text>
        </div>
        <SummaryField label="Business key" value={history.businessKey} mono />
        <SummaryField label="Estado" value={STATE_LABEL[history.state] ?? history.state} />
        <SummaryField label="Início" value={formatDateTime(history.startTime)} />
        <SummaryField label="Fim" value={history.endTime ? formatDateTime(history.endTime) : '—'} />
        <SummaryField label="Duração" value={formatDuration(history.durationMillis)} />
      </div>

      <InspectorPanel
        flowNodes={history.flow.flowNodes}
        flowConnections={history.flow.flowConnections}
        currentNodeId={null}
        visitedNodeIds={visitedNodeIds}
        nodeIO={nodeIO}
        variables={variables}
        log={log}
      />
    </div>
  );
}

function SummaryField({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase" style={{ color: skinVars.colors.textSecondary }}>
        {label}
      </div>
      <div
        className="text-[12.5px] truncate"
        style={{ color: skinVars.colors.textPrimary, fontFamily: mono ? 'monospace' : undefined }}
      >
        {value}
      </div>
    </div>
  );
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}
