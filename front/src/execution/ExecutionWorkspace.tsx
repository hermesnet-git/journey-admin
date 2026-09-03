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
  type TestMessageInput,
  type NodeIODetail,
  type StepResponse,
  type TrailEntry,
  type VariableEntry,
} from './api';
import { DevicePreview } from './DevicePreview';
import { InspectorPanel, type LogEntry } from './InspectorPanel';
import { SummaryField } from './HistoryWorkspace';

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
// isso — o tipo de conector entre parênteses é o que deixa claro qual delas é uma chamada REST e
// qual é uma publicação/consumo de mensageria, sem precisar abrir o Fluxo da Jornada pra descobrir.
function describeTrailEntry(entry: TrailEntry, connectorTypeByNodeId: Record<string, string>): string {
  if (entry.nodeType === 'SERVICE_TASK' || entry.nodeType === 'RECEIVE_TASK') {
    const label = entry.nodeType === 'SERVICE_TASK' ? 'Tarefa de serviço' : 'Tarefa de recebimento';
    const verb = entry.nodeType === 'SERVICE_TASK' ? 'executada' : 'concluída';
    const connectorLabel = CONNECTOR_TYPE_LABEL[connectorTypeByNodeId[entry.nodeId]];
    return connectorLabel ? `${label} (${connectorLabel}) "${entry.nodeName}" ${verb}.` : `${label} "${entry.nodeName}" ${verb}.`;
  }
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
    return { topico: entry.kafkaTopic, ...unwrapKafkaEnvelope(entry.kafkaPayload) };
  }
  return undefined;
}

// entry.kafkaPayload é o envelope inteiro publicado (EventMessageDTO: correlationId/messageName/
// payload{status,data}), não só o corpo de negócio — sem isso, o log mostrava um "payload" (a chave
// que embrulha o envelope) contendo outro "payload" dentro (o campo de mesmo nome do próprio
// envelope), como se tivesse duplicado por engano. Estoura os campos do envelope direto no nível de
// cima em vez de aninhar tudo debaixo de uma chave "payload" genérica.
function unwrapKafkaEnvelope(rawPayload: string | null): Record<string, unknown> {
  const envelope = parseMaybeJson(rawPayload);
  if (envelope && typeof envelope === 'object' && !Array.isArray(envelope)) {
    return envelope as Record<string, unknown>;
  }
  return envelope !== null && envelope !== undefined ? { mensagem: envelope } : {};
}

function parseMaybeJson(value: string | null): unknown {
  if (!value) return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

// Mesmos campos que trailLogData já extrai de um TrailEntry, só que separados em input/output —
// alimenta o drawer de detalhe do nó (InspectorPanel/NodeDetailDrawer), que usa a mesma forma
// nodeIO tanto ao vivo (aqui, montado incrementalmente) quanto no modo Histórico (tudo de uma vez).
// Sem timestamp por nó no fluxo ao vivo hoje (o backend só manda a trilha em si, não quando cada
// etapa individualmente começou/terminou) — usa o instante em que o front recebeu a resposta pros
// dois campos, então a duração fica sempre "—"/"concluído" em vez de um tempo real decorrido.
function trailEntryToNodeIO(entry: TrailEntry): NodeIODetail {
  const input: Record<string, unknown> = {};
  let output: Record<string, unknown> | null = null;
  if (entry.url || entry.response) {
    if (entry.method) input.method = entry.method;
    if (entry.url) input.url = entry.url;
    if (entry.requestHeaders) input.headers = parseMaybeJson(entry.requestHeaders);
    if (entry.requestBody) input.body = parseMaybeJson(entry.requestBody);
    if (entry.response) output = { response: parseMaybeJson(entry.response) };
  } else if (entry.kafkaTopic || entry.kafkaPayload) {
    if (entry.kafkaTopic) input.topic = entry.kafkaTopic;
    Object.assign(input, unwrapKafkaEnvelope(entry.kafkaPayload));
  }
  const timestamp = now();
  return {
    nodeId: entry.nodeId,
    nodeName: entry.nodeName,
    nodeType: entry.nodeType,
    startTime: timestamp,
    endTime: timestamp,
    durationMillis: null,
    input: Object.keys(input).length > 0 ? input : null,
    output,
  };
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
  const connectorTypeByNodeId: Record<string, string> = {};
  flow.flowNodes.forEach((n) => {
    if (n.connectorConfig) connectorTypeByNodeId[n.id] = n.connectorConfig.connectorType;
  });

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
  const [nodeIO, setNodeIO] = useState<Record<string, NodeIODetail>>(() => {
    const map: Record<string, NodeIODetail> = {};
    for (const entry of initialStep.trail) {
      map[entry.nodeId] = trailEntryToNodeIO(entry);
    }
    return map;
  });
  const [log, setLog] = useState<LogEntry[]>(() => [
    ...(initialApiLog ?? []),
    { id: 'start', time: now(), message: 'Jornada iniciada.' },
    ...initialStep.trail.map((entry, i) => ({
      id: `start-trail-${i}`,
      time: now(),
      message: describeTrailEntry(entry, connectorTypeByNodeId),
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

  function applyNewStep(newStep: StepResponse, skipTrailNodeIds?: Set<string>) {
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
      // Nó já narrado por quem chamou (ex.: handleSendKafkaMessage, que detalha a mensagem
      // publicada na própria linha "gerada/enviada") — não duplica a mesma entrada aqui de novo.
      if (!skipTrailNodeIds?.has(entry.nodeId)) {
        appendLog(describeTrailEntry(entry, connectorTypeByNodeId), trailLogData(entry));
      }
      setNodeIO((prev) => ({ ...prev, [entry.nodeId]: trailEntryToNodeIO(entry) }));
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
        if (step.nodeId) {
          const timestamp = now();
          setNodeIO((prev) => ({
            ...prev,
            [step.nodeId!]: {
              nodeId: step.nodeId!,
              nodeName: step.nodeName ?? step.nodeId!,
              nodeType: step.nodeType ?? 'USER_TASK',
              startTime: timestamp,
              endTime: timestamp,
              durationMillis: null,
              input: Object.keys(answers).length > 0 ? answers : null,
              output: null,
            },
          }));
        }
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

  async function handleSendTestMessage(nodeId: string, message: TestMessageInput) {
    await sendTestMessage(journey.journeyId, nodeId, message);
    appendLog(`Mensagem de teste publicada no Kafka para "${step.nodeName}".`, { ...message });
  }

  async function handleSendKafkaMessage(payload?: Record<string, unknown>) {
    const nodeName = step.nodeName;
    const nodeId = step.nodeId;
    const newStep = await sendKafkaMessage(processInstanceId, payload);
    // "Gerar automaticamente" manda payload=undefined pro back resolver sozinho — sem isso a linha
    // do log ficava sem nenhum dado, mesmo a mensagem tendo sido publicada de verdade. A trilha que
    // volta com o passo já traz o tópico/envelope reais que saíram, então usa isso em vez do
    // parâmetro (que só existe quando foi digitado manualmente).
    const publishedEntry = nodeId ? newStep.trail.find((e) => e.nodeId === nodeId) : undefined;
    appendLog(
      payload
        ? `Mensagem Kafka enviada manualmente para "${nodeName}".`
        : `Mensagem Kafka gerada automaticamente para "${nodeName}".`,
      publishedEntry ? trailLogData(publishedEntry) : payload,
    );
    applyNewStep(newStep, publishedEntry ? new Set([publishedEntry.nodeId]) : undefined);
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
      <div
        className="shrink-0 flex items-center gap-6 px-6 py-3 border-b flex-wrap"
        style={{ borderColor: skinVars.colors.border }}
      >
        <SummaryField label="Instance ID" value={processInstanceId} mono copyable />
        <SummaryField label="Business key" value={businessKey} mono copyable />
      </div>
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
        nodeIO={nodeIO}
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
