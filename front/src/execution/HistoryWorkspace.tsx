import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
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
  GATEWAY: (name) => `Decisão "${name}" avaliada.`,
  END: (name) => `Etapa final "${name}" alcançada.`,
};

const CONNECTOR_TYPE_LABEL: Record<string, string> = {
  REST: 'API REST',
  KAFKA: 'Kafka',
  EVENT_HUBS: 'Event Hubs',
  SERVICE_BUS: 'Service Bus',
};

// Duas Tarefas de Serviço/Recebimento com o mesmo nome genérico são indistinguíveis no log sem
// isso — o tipo de conector entre parênteses deixa claro qual é uma chamada REST e qual é uma
// publicação/consumo de mensageria, sem precisar abrir o Fluxo da Jornada pra descobrir.
function describeHistoryStep(step: NodeIODetail, connectorTypeByNodeId: Record<string, string>): string {
  if (step.nodeType === 'SERVICE_TASK' || step.nodeType === 'RECEIVE_TASK') {
    const label = step.nodeType === 'SERVICE_TASK' ? 'Tarefa de serviço' : 'Tarefa de recebimento';
    const verb = step.nodeType === 'SERVICE_TASK' ? 'executada' : 'concluída';
    const connectorLabel = CONNECTOR_TYPE_LABEL[connectorTypeByNodeId[step.nodeId]];
    return connectorLabel ? `${label} (${connectorLabel}) "${step.nodeName}" ${verb}.` : `${label} "${step.nodeName}" ${verb}.`;
  }
  const describe = STEP_TYPE_LABEL[step.nodeType];
  return describe ? describe(step.nodeName) : `Etapa "${step.nodeName}" concluída.`;
}

// input.payload de um Service/Receive Task Kafka é o envelope inteiro publicado/recebido
// (EventMessageDTO: correlationId/messageName/payload{status,data}), não só o corpo de negócio — sem
// isso a tela mostrava um "payload" (chave que embrulha o envelope) contendo outro "payload" dentro
// (o campo de mesmo nome do próprio envelope). Estoura os campos do envelope direto em cima de
// "input", ao lado de "topic", em vez de aninhar tudo debaixo de uma chave "payload" genérica.
function unwrapKafkaInput(input: Record<string, unknown> | null): Record<string, unknown> | null {
  if (!input || !('topic' in input) || !('payload' in input)) return input;
  const raw = input.payload;
  let envelope: unknown = raw;
  if (typeof raw === 'string') {
    try {
      envelope = JSON.parse(raw);
    } catch {
      envelope = raw;
    }
  }
  if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
    const { payload: _payload, ...rest } = input;
    return { ...rest, ...(envelope as Record<string, unknown>) };
  }
  return input;
}

function stepLogData(step: NodeIODetail): Record<string, unknown> | undefined {
  const data: Record<string, unknown> = {};
  if (step.input) data.entrada = step.input;
  if (step.output) data.saida = step.output;
  return Object.keys(data).length > 0 ? data : undefined;
}

export const STATE_LABEL: Record<string, string> = {
  ACTIVE: 'Em execução',
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

  const connectorTypeByNodeId: Record<string, string> = {};
  history.flow.flowNodes.forEach((n) => {
    if (n.connectorConfig) connectorTypeByNodeId[n.id] = n.connectorConfig.connectorType;
  });

  const startNodeId = history.flow.flowNodes.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT')?.id;
  const visitedNodeIds = [startNodeId, ...history.steps.map((s) => s.nodeId)].filter(
    (id): id is string => !!id,
  );

  const normalizedSteps = history.steps.map((step) => ({ ...step, input: unwrapKafkaInput(step.input) }));

  const nodeIO: Record<string, NodeIODetail> = {};
  for (const step of normalizedSteps) {
    nodeIO[step.nodeId] = step;
  }

  const log: LogEntry[] = normalizedSteps.map((step, i) => ({
    id: `history-${i}`,
    time: (step.endTime ?? step.startTime).slice(11, 23),
    message: describeHistoryStep(step, connectorTypeByNodeId),
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
        <SummaryField label="Instance ID" value={history.processInstanceId} mono copyable />
        <SummaryField label="Business key" value={history.businessKey} mono copyable />
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
        fillHeight
      />
    </div>
  );
}

export function SummaryField({ label, value, mono, copyable }: { label: string; value: string; mono?: boolean; copyable?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem feedback, sem quebrar a tela
    }
  }

  return (
    <div className="min-w-0">
      <div className="text-[10.5px] font-semibold uppercase" style={{ color: skinVars.colors.textSecondary }}>
        {label}
      </div>
      <div className="flex items-center gap-1">
        <div
          className="text-[12.5px] truncate"
          style={{ color: skinVars.colors.textPrimary, fontFamily: mono ? 'monospace' : undefined }}
        >
          {value}
        </div>
        {copyable && (
          <button
            type="button"
            onClick={handleCopy}
            title="Copiar"
            className="shrink-0 cursor-pointer border-0 bg-transparent flex items-center justify-center"
            style={{ color: copied ? skinVars.colors.brand : skinVars.colors.textSecondary }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  );
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('pt-BR');
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return '—';
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds.toFixed(1)} s`;
  const minutes = seconds / 60;
  if (minutes < 60) return `${minutes.toFixed(1)} min`;
  return `${(minutes / 60).toFixed(1)} h`;
}
