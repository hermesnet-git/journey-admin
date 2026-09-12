import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RefreshCw, ScrollText, Sliders } from 'lucide-react';
import { skinVars, Text } from '@telefonica/mistica';
import type { ComponentType } from 'react';
import { FlowDiagramViewer } from '../execution/FlowDiagramViewer';
import type { NodeIODetail } from '../execution/api';
import { SummaryField } from '../execution/SummaryField';
import { getInstanceHistory, type IncidentEntry, type InstanceHistoryResponse } from './api';
import { DiagnosticoNodeDrawer } from './DiagnosticoNodeDrawer';
import { VariableTimeline } from './VariableTimeline';
import { DiagnosticoLogPanel, type LogEntry } from './DiagnosticoLogPanel';

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

// Fluxo deixou de ser aba — fica sempre visível no canvas; Variáveis/Log agora são um painel
// inferior ao lado dele, não uma tela cheia separada (pedido do usuário: ver as duas coisas juntas
// ao mesmo tempo, sem esconder o fluxo pra olhar uma variável ou uma linha de log).
type BottomTabKey = 'variaveis' | 'log';

const BOTTOM_TABS: { key: BottomTabKey; label: string; icon: ComponentType<{ size?: number }> }[] = [
  { key: 'variaveis', label: 'Histórico de Variáveis', icon: Sliders },
  { key: 'log', label: 'Log', icon: ScrollText },
];

const DEFAULT_PANEL_HEIGHT = 300;
const MIN_PANEL_HEIGHT = 140;

export function HistoryWorkspace({ history: initialHistory }: Props) {
  const [history, setHistory] = useState(initialHistory);
  const [refreshing, setRefreshing] = useState(false);
  const [bottomTab, setBottomTab] = useState<BottomTabKey>('variaveis');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const draggingRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = window.innerHeight - e.clientY;
      setPanelHeight(Math.min(Math.max(next, MIN_PANEL_HEIGHT), window.innerHeight - 260));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
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

  function startDrag() {
    draggingRef.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }

  // ACTIVE/SUSPENDED ainda podem mudar (a instância segue viva no motor); qualquer estado
  // terminal (Concluída/Encerrada) nunca mais muda — atualizar não traria nada de novo.
  const canRefresh = history.state === 'ACTIVE' || history.state === 'SUSPENDED';

  async function refresh() {
    setRefreshing(true);
    try {
      setHistory(await getInstanceHistory(history.processInstanceId));
    } catch {
      // Atualização falhou: mantém o que já estava na tela em vez de esvaziar tudo.
    } finally {
      setRefreshing(false);
    }
  }

  const connectorTypeByNodeId: Record<string, string> = {};
  history.flow.flowNodes.forEach((n) => {
    if (n.connectorConfig) connectorTypeByNodeId[n.id] = n.connectorConfig.connectorType;
  });

  // Início/Início por Mensagem já vêm como um HistoryStep normal (backend não filtra mais o
  // startEvent) — não precisa mais somar o nó inicial à parte, como antes.
  const visitedNodeIds = history.steps.map((s) => s.nodeId);

  const normalizedSteps = history.steps.map((step) => ({ ...step, input: unwrapKafkaInput(step.input) }));

  const nodeIO: Record<string, NodeIODetail> = {};
  for (const step of normalizedSteps) {
    nodeIO[step.nodeId] = step;
  }

  const openIncident = history.incidents.find((i) => i.open) ?? null;

  const log: LogEntry[] = [
    ...normalizedSteps.map((step, i) => ({
      id: `history-${i}`,
      time: (step.endTime ?? step.startTime).slice(11, 23),
      message: describeHistoryStep(step, connectorTypeByNodeId),
      data: stepLogData(step),
    })),
    ...history.incidents.map((incident, i) => ({
      id: `incident-${i}`,
      time: incident.createTime.slice(11, 23),
      message: incidentLogMessage(incident),
      data: incident.message ? { mensagem: incident.message } : undefined,
      isError: true,
    })),
  ].sort((a, b) => a.time.localeCompare(b.time));

  const selectedFlowNode = selectedNodeId ? history.flow.flowNodes.find((n) => n.id === selectedNodeId) : undefined;
  const selectedDetail = selectedNodeId ? nodeIO[selectedNodeId] : undefined;
  // Corta a timeline no fim deste nó (ou "agora" pro nó em andamento, sem endTime) — usado tanto
  // pela foto do drawer quanto pra colorir a timeline completa da aba Variáveis.
  const highlightUpToTime = selectedNodeId ? (selectedDetail?.endTime ?? (selectedNodeId === history.currentNodeId ? new Date().toISOString() : null)) : null;

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
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing || !canRefresh}
          title={canRefresh ? 'Buscar o estado mais recente desta instância' : 'Instância já concluída — não há nada novo pra buscar'}
          className="ml-auto shrink-0 flex items-center gap-[6px] px-3 py-[7px] rounded-md text-[12.5px] font-medium border-0 cursor-pointer disabled:opacity-50 disabled:cursor-default"
          style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textPrimary }}
        >
          <RefreshCw size={13} className={refreshing ? 'animate-spin' : undefined} />
          Atualizar
        </button>
      </div>

      {openIncident && (
        <div
          className="shrink-0 mx-6 mt-4 rounded-lg p-3 flex items-start gap-2"
          style={{ background: skinVars.colors.errorLow, border: `1px solid ${skinVars.colors.error}` }}
        >
          <AlertTriangle size={16} color={skinVars.colors.error} className="shrink-0 mt-[1px]" />
          <div className="min-w-0">
            <Text size={13} weight="medium" color={skinVars.colors.error}>
              {incidentLogMessage(openIncident)}
            </Text>
            {openIncident.message && (
              <div className="mt-[2px]">
                <Text size={12} color={skinVars.colors.error}>
                  {openIncident.message}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex">
          <div className="flex-1 min-w-0 h-full">
            <FlowDiagramViewer
              flowNodes={history.flow.flowNodes}
              flowConnections={history.flow.flowConnections}
              currentNodeId={history.currentNodeId}
              visitedNodeIds={visitedNodeIds}
              erroredNodeId={openIncident?.nodeId ?? null}
              erroredNodeName={openIncident?.nodeName ?? null}
              erroredMessage={openIncident?.message ?? null}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          </div>
          {selectedNodeId && (
            <DiagnosticoNodeDrawer
              nodeId={selectedNodeId}
              detail={selectedDetail}
              flowNode={selectedFlowNode}
              flowNodes={history.flow.flowNodes}
              flowConnections={history.flow.flowConnections}
              visitedNodeIds={visitedNodeIds}
              currentNodeId={history.currentNodeId}
              variables={history.variables}
              variableTimeline={history.variableTimeline}
              incidents={history.incidents}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>

        {/* Painel inferior fixo (Variáveis/Log), sempre ao lado do canvas — nunca cobre o fluxo
            inteiro como uma aba de tela cheia fazia antes. */}
        <div
          className="shrink-0 flex flex-col min-h-0"
          style={{ height: panelHeight, borderTop: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.background }}
        >
          <div
            onMouseDown={startDrag}
            className="w-full h-[7px] shrink-0 flex items-center justify-center cursor-ns-resize"
            style={{ background: skinVars.colors.backgroundAlternative }}
            title="Arraste para redimensionar"
          >
            <div className="w-10 h-[3px] rounded-full" style={{ background: skinVars.colors.border }} />
          </div>

          <div className="flex shrink-0" style={{ borderBottom: `1px solid ${skinVars.colors.border}` }}>
            {BOTTOM_TABS.map((t) => {
              const Icon = t.icon;
              const active = t.key === bottomTab;
              return (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setBottomTab(t.key)}
                  className="flex items-center gap-[6px] px-4 py-[10px] text-[13px] font-medium cursor-pointer border-0"
                  style={{
                    background: active ? skinVars.colors.background : 'transparent',
                    color: active ? skinVars.colors.brand : skinVars.colors.textSecondary,
                    borderBottom: active ? `2px solid ${skinVars.colors.brand}` : '2px solid transparent',
                  }}
                >
                  <Icon size={14} />
                  {t.label}
                  {t.key === 'log' && log.length > 0 && (
                    <span className="rounded-full text-[10.5px] px-[6px] leading-[16px]" style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textSecondary }}>
                      {log.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex-1 min-h-0">
            {bottomTab === 'variaveis' ? (
              <div className="h-full overflow-auto p-4">
                <VariableTimeline
                  variables={history.variables}
                  timeline={history.variableTimeline}
                  highlightUpToTime={highlightUpToTime}
                />
              </div>
            ) : (
              <DiagnosticoLogPanel log={log} endRef={logEndRef} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function incidentLogMessage(incident: IncidentEntry): string {
  const where = incident.nodeName ?? incident.nodeId;
  const status = incident.open ? 'em aberto' : 'resolvido';
  return `Incidente (${status}) em "${where}": ${incident.incidentType}`;
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
