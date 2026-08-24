import { useCallback, useEffect, useState } from 'react';
import { skinVars } from '@telefonica/mistica';
import {
  apiCallLogData,
  completeTask,
  ExecutionApiError,
  ExecutionNetworkError,
  formatApiCallLog,
  getCurrentStep,
  getVariables,
  now,
  previewKafkaMessage,
  sendKafkaMessage,
  sendTestMessage,
  setVariable,
  shouldLogApiCall,
  skipStep,
  type ApiCallLogEntry,
  type FlowBundle,
  type JourneySummary,
  type StepResponse,
  type TrailEntry,
  type VariableEntry,
} from './api';
import { DevicePreview } from './DevicePreview';
import { InspectorPanel, type LogEntry } from './InspectorPanel';

const WAITING_POLL_MS = 2000;

interface Props {
  processInstanceId: string;
  businessKey: string;
  journey: JourneySummary;
  flow: FlowBundle;
  initialStep: StepResponse;
  manualKafkaControl: boolean;
  // Chamadas já feitas antes desta tela montar (busca da jornada, o próprio start) — capturadas por
  // quem orquestra a tela anterior (ExecutionsPage) e passadas pra cá pra abrir o log já com a
  // linha do zero, em vez de só a partir do momento em que este componente existe.
  initialApiLog?: LogEntry[];
  // ExecutionsPage é quem de fato chama setApiCallLogger (uma única vez, pra vida inteira da
  // página) — este componente só se "anuncia" como o dono ativo enquanto está montado, pra evitar
  // uma corrida entre o cleanup de um registro e o setup do outro no mesmo commit (ver
  // ExecutionsPage.handleApiCallHandlerChange).
  onApiCallHandlerChange?: (handler: ((entry: ApiCallLogEntry) => void) | null) => void;
}

const NODE_TYPE_LABEL: Record<string, string> = {
  USER_TASK: 'tarefa de usuário',
  SERVICE_TASK: 'tarefa de serviço',
  RECEIVE_TASK: 'tarefa de recebimento',
};

function taskLabel(nodeType: string | null): string {
  return nodeType ? (NODE_TYPE_LABEL[nodeType] ?? 'etapa') : 'etapa';
}

function describeStep(step: StepResponse): string {
  if (step.type === 'USER_TASK') {
    return `Aguardando resposta da ${taskLabel(step.nodeType)} "${step.nodeName}".`;
  }
  if (step.type === 'WAITING') {
    return `Aguardando conclusão da ${taskLabel(step.nodeType)} "${step.nodeName}".`;
  }
  return 'Jornada concluída.';
}

// Nós que o motor executou sozinho (sem parar) a caminho do novo passo — ex.: uma verificação de
// elegibilidade + gateway + aplicação de troca de plano, tudo numa única transição. Sem narrar isso
// no log, essas etapas ficam invisíveis (nunca aparecem como "passo atual").
const TRAIL_TYPE_LABEL: Record<string, (name: string) => string> = {
  SERVICE_TASK: (name) => `Tarefa de serviço "${name}" executada.`,
  RECEIVE_TASK: (name) => `Tarefa de recebimento "${name}" concluída.`,
  GATEWAY: (name) => `Decisão "${name}" avaliada.`,
  END: (name) => `Etapa final "${name}" alcançada.`,
};

function describeTrailEntry(entry: TrailEntry): string {
  const describe = TRAIL_TYPE_LABEL[entry.nodeType];
  return describe ? describe(entry.nodeName) : `Etapa "${entry.nodeName}" concluída.`;
}

// A SERVICE_TASK carrega url/response (conector REST) ou kafkaTopic/kafkaPayload (conector Kafka),
// nunca os dois — mostrado inline no log via o mesmo bloco JSON que LogPanel já renderiza pra
// qualquer entry.data.
function trailLogData(entry: TrailEntry): Record<string, unknown> | undefined {
  if (entry.url || entry.response) {
    const data: Record<string, unknown> = { metodo: entry.method, url: entry.url };
    if (entry.requestHeaders) data.requestHeaders = parseMaybeJson(entry.requestHeaders);
    if (entry.requestBody) data.requestBody = parseMaybeJson(entry.requestBody);
    data.resposta = parseMaybeJson(entry.response);
    return data;
  }
  if (entry.kafkaTopic || entry.kafkaPayload) {
    return { topico: entry.kafkaTopic, payload: parseMaybeJson(entry.kafkaPayload) };
  }
  return undefined;
}

function parseMaybeJson(value: string | null): unknown {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export function ExecutionWorkspace({
  processInstanceId,
  businessKey,
  journey,
  flow,
  initialStep,
  manualKafkaControl,
  initialApiLog,
  onApiCallHandlerChange,
}: Props) {
  const startNodeId = flow.flowNodes.find((n) => n.type === 'START')?.id;

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [erroredNodeId, setErroredNodeId] = useState<string | null>(null);
  const [erroredNodeName, setErroredNodeName] = useState<string | null>(null);
  const [erroredMessage, setErroredMessage] = useState<string | null>(null);
  // The engine may run several steps synchronously as part of starting the instance itself (e.g. a
  // SERVICE_TASK chain right after START, before the first wait state) — initialStep.trail already
  // carries them (same shape applyNewStep consumes below), so the very first render needs to fold
  // it in too, not just subsequent step updates.
  const [visitedPath, setVisitedPath] = useState<string[]>(() => {
    const ids = startNodeId ? [startNodeId] : [];
    for (const entry of initialStep.trail) {
      if (!ids.includes(entry.nodeId)) ids.push(entry.nodeId);
    }
    if (initialStep.nodeId && ids[ids.length - 1] !== initialStep.nodeId) ids.push(initialStep.nodeId);
    return ids;
  });
  const [variables, setVariables] = useState<VariableEntry[]>([]);
  const [log, setLog] = useState<LogEntry[]>(() => [
    ...(initialApiLog ?? []),
    { id: 'start', time: now(), message: 'Jornada iniciada.' },
    ...initialStep.trail.map((entry, i) => ({
      id: `start-trail-${i}`,
      time: now(),
      message: describeTrailEntry(entry),
      data: trailLogData(entry),
    })),
    { id: 'start-step', time: now(), message: describeStep(initialStep) },
  ]);

  const appendLog = useCallback((message: string, data?: Record<string, unknown>, isError?: boolean) => {
    setLog((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, time: now(), message, data, isError }]);
  }, []);

  // Toda chamada que ./api.ts faz ao ms-espec-registry (não só os eventos de negócio já logados nos
  // handlers abaixo) — o pedido era ver TODAS as integrações front→outras pontas, não só as
  // curadas. initialApiLog acima já trouxe o que aconteceu antes deste componente montar; a partir
  // daqui é este handler que ExecutionsPage repassa (ver onApiCallHandlerChange/liveLoggerRef lá).
  useEffect(() => {
    onApiCallHandlerChange?.((entry) => {
      if (!shouldLogApiCall(entry)) return;
      const { message, isError } = formatApiCallLog(entry);
      appendLog(message, apiCallLogData(entry), isError);
    });
    return () => onApiCallHandlerChange?.(null);
  }, [appendLog, onApiCallHandlerChange]);

  const refreshVariables = useCallback(() => {
    getVariables(processInstanceId)
      .then(setVariables)
      .catch(() => {
        /* aba Variáveis só deixa de atualizar; não interrompe a execução */
      });
  }, [processInstanceId]);

  useEffect(() => {
    refreshVariables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearError() {
    setErroredNodeId(null);
    setErroredNodeName(null);
    setErroredMessage(null);
  }

  function applyNewStep(newStep: StepResponse) {
    setStep(newStep);
    // errorMessage é a fonte da verdade de "houve erro", não errorNodeId: a heurística que tenta
    // achar QUAL nó falhou pode não conseguir (ex.: o ramo que falhou nem chegou a rodar de novo
    // por causa de um loop no fluxo) e volta null mesmo com um erro real — tratar isso como "sem
    // erro" escondia a falha inteira do usuário, mostrando só "respondida" no log.
    if (newStep.errorMessage) {
      setErroredNodeId(newStep.errorNodeId);
      setErroredNodeName(newStep.errorNodeName);
      setErroredMessage(newStep.errorMessage);
      appendLog(
        `Falha ao executar "${newStep.errorNodeName ?? 'etapa'}": ${newStep.errorMessage ?? 'erro desconhecido'}.`,
        newStep.errorConnectorConfig ? { ...newStep.errorConnectorConfig } : undefined,
        true,
      );
    } else {
      clearError();
    }
    for (const entry of newStep.trail) {
      setVisitedPath((prev) => (prev.includes(entry.nodeId) ? prev : [...prev, entry.nodeId]));
      appendLog(describeTrailEntry(entry), trailLogData(entry));
    }
    if (newStep.nodeId) {
      setVisitedPath((prev) => (prev[prev.length - 1] === newStep.nodeId ? prev : [...prev, newStep.nodeId!]));
    }
    appendLog(describeStep(newStep));
    refreshVariables();
  }

  async function handleCompleteTask(answers: Record<string, unknown>) {
    if (!step.taskId) return;
    setBusy(true);
    try {
      const newStep = await completeTask(processInstanceId, step.taskId, answers);
      if (!newStep.errorMessage) {
        appendLog(`${capitalize(taskLabel(step.nodeType))} "${step.nodeName}" respondida.`, answers);
      }
      applyNewStep(newStep);
    } catch (e) {
      const message = errorMessage(e);
      setErroredNodeId(step.nodeId);
      setErroredNodeName(step.nodeName);
      setErroredMessage(message);
      appendLog(`Falha de comunicação ao tentar avançar "${step.nodeName}": ${message}`, undefined, true);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipStep() {
    setBusy(true);
    try {
      const newStep = await skipStep(processInstanceId);
      if (!newStep.errorMessage) {
        appendLog(`Etapa "${step.nodeName}" (${taskLabel(step.nodeType)}) pulada manualmente.`);
      }
      applyNewStep(newStep);
    } catch (e) {
      const message = errorMessage(e);
      setErroredNodeId(step.nodeId);
      setErroredNodeName(step.nodeName);
      setErroredMessage(message);
      appendLog(`Falha de comunicação ao tentar avançar "${step.nodeName}": ${message}`, undefined, true);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTestMessage(nodeId: string, payload: Record<string, unknown>) {
    await sendTestMessage(journey.journeyId, nodeId, payload);
    appendLog(`Mensagem de teste publicada no Kafka para "${step.nodeName}".`, payload);
  }

  async function handleSendKafkaMessage(payload?: Record<string, unknown>) {
    const nodeName = step.nodeName;
    const newStep = await sendKafkaMessage(processInstanceId, payload);
    appendLog(
      payload
        ? `Mensagem Kafka enviada manualmente para "${nodeName}".`
        : `Mensagem Kafka gerada automaticamente para "${nodeName}".`,
      payload,
    );
    applyNewStep(newStep);
  }

  function handlePreviewKafkaMessage() {
    return previewKafkaMessage(processInstanceId);
  }

  // Nó Kafka em espera não tem botão: o produtor completa sozinho (worker em background) e o
  // consumidor só avança quando uma mensagem real chega (painel "Enviar mensagem" ou um produtor
  // externo de verdade) — em ambos os casos, só o polling aqui detecta que o passo mudou.
  const waitingConnectorConfig = step.nodeId ? (flow.flowNodes.find((n) => n.id === step.nodeId)?.connectorConfig ?? null) : null;
  const isWaitingOnKafka = step.type === 'WAITING' && waitingConnectorConfig?.connectorType === 'KAFKA';

  useEffect(() => {
    if (!isWaitingOnKafka) return;
    // Rastreia desde quando ainda não perguntamos ao backend — sem isso o polling só saberia que o
    // passo mudou, nunca o que o worker automático publicou de fato nesse meio-tempo (ver
    // trailLogData/currentStep). Só avança em caso de sucesso: numa falha de rede, mantém a janela
    // pra não perder a trilha de um Service Task que rodou durante a instabilidade.
    let since = new Date().toISOString();
    const id = setInterval(async () => {
      try {
        const latest = await getCurrentStep(processInstanceId, since);
        since = new Date().toISOString();
        if (latest.type !== step.type || latest.nodeId !== step.nodeId) {
          applyNewStep(latest);
        }
      } catch {
        // silencioso — a próxima rodada do intervalo tenta de novo
      }
    }, WAITING_POLL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWaitingOnKafka, processInstanceId, step.type, step.nodeId]);

  async function handleEditVariable(name: string, rawValue: string, type: string) {
    try {
      const value = type === 'Boolean' ? rawValue === 'true' : type === 'Double' ? Number(rawValue) : rawValue;
      const updated = await setVariable(processInstanceId, name, value, type);
      setVariables(updated);
      appendLog(`Variável "${name}" alterada manualmente para ${rawValue}.`);
    } catch (e) {
      appendLog(`Falha ao alterar a variável "${name}": ${errorMessage(e)}`, undefined, true);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: skinVars.colors.background }}>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1040px] mx-auto px-6 py-8">
          <DevicePreview
            channelType={flow.channelType}
            step={step}
            busy={busy}
            connectorConfig={waitingConnectorConfig}
            businessKey={businessKey}
            manualKafkaControl={manualKafkaControl}
            onCompleteTask={handleCompleteTask}
            onSkipStep={handleSkipStep}
            onSendTestMessage={handleSendTestMessage}
            onSendKafkaMessage={handleSendKafkaMessage}
            onPreviewKafkaMessage={handlePreviewKafkaMessage}
          />
        </div>
      </div>

      <InspectorPanel
        flowNodes={flow.flowNodes}
        flowConnections={flow.flowConnections}
        currentNodeId={step.type === 'ENDED' ? null : step.nodeId}
        visitedNodeIds={visitedPath}
        erroredNodeId={erroredNodeId}
        erroredNodeName={erroredNodeName}
        erroredMessage={erroredMessage}
        variables={variables}
        onEditVariable={handleEditVariable}
        log={log}
      />
    </div>
  );
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function errorMessage(e: unknown): string {
  if (e instanceof ExecutionNetworkError) return e.message;
  if (e instanceof ExecutionApiError) return e.message;
  return 'Erro inesperado.';
}
