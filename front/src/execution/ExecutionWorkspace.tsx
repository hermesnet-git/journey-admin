import { useCallback, useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Stack, Text, skinVars } from '@telefonica/mistica';
import {
  completeTask,
  ExecutionApiError,
  ExecutionNetworkError,
  getCurrentStep,
  getVariables,
  sendTestMessage,
  setVariable,
  skipStep,
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
  onRestart: () => void;
}

const NODE_TYPE_LABEL: Record<string, string> = {
  USER_TASK: 'tarefa de usuário',
  SERVICE_TASK: 'tarefa de serviço',
  RECEIVE_TASK: 'tarefa de recebimento',
};

function taskLabel(nodeType: string | null): string {
  return nodeType ? (NODE_TYPE_LABEL[nodeType] ?? 'etapa') : 'etapa';
}

function now(): string {
  return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

export function ExecutionWorkspace({ processInstanceId, businessKey, journey, flow, initialStep, onRestart }: Props) {
  const startNodeId = flow.flowNodes.find((n) => n.type === 'START')?.id;

  const [step, setStep] = useState(initialStep);
  const [busy, setBusy] = useState(false);
  const [erroredNodeId, setErroredNodeId] = useState<string | null>(null);
  const [erroredNodeName, setErroredNodeName] = useState<string | null>(null);
  const [erroredMessage, setErroredMessage] = useState<string | null>(null);
  const [visitedPath, setVisitedPath] = useState<string[]>(() => {
    const base = startNodeId ? [startNodeId] : [];
    return initialStep.nodeId ? [...base, initialStep.nodeId] : base;
  });
  const [variables, setVariables] = useState<VariableEntry[]>([]);
  const [log, setLog] = useState<LogEntry[]>([
    { id: 'start', time: now(), message: 'Jornada iniciada.' },
    { id: 'start-step', time: now(), message: describeStep(initialStep) },
  ]);

  const appendLog = useCallback((message: string, data?: Record<string, unknown>) => {
    setLog((prev) => [...prev, { id: `${Date.now()}-${prev.length}`, time: now(), message, data }]);
  }, []);

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
    if (newStep.errorNodeId) {
      setErroredNodeId(newStep.errorNodeId);
      setErroredNodeName(newStep.errorNodeName);
      setErroredMessage(newStep.errorMessage);
      appendLog(`Falha ao executar "${newStep.errorNodeName ?? 'etapa'}": ${newStep.errorMessage ?? 'erro desconhecido'}.`);
    } else {
      clearError();
    }
    for (const entry of newStep.trail) {
      setVisitedPath((prev) => (prev.includes(entry.nodeId) ? prev : [...prev, entry.nodeId]));
      appendLog(describeTrailEntry(entry));
    }
    if (newStep.nodeId) {
      setVisitedPath((prev) => (prev[prev.length - 1] === newStep.nodeId ? prev : [...prev, newStep.nodeId!]));
    }
    appendLog(describeStep(newStep));
    if (newStep.type !== 'ENDED') {
      refreshVariables();
    }
  }

  async function handleCompleteTask(answers: Record<string, unknown>) {
    if (!step.taskId) return;
    setBusy(true);
    try {
      const newStep = await completeTask(processInstanceId, step.taskId, answers);
      if (!newStep.errorNodeId) {
        appendLog(`${capitalize(taskLabel(step.nodeType))} "${step.nodeName}" respondida.`, answers);
      }
      applyNewStep(newStep);
    } catch (e) {
      const message = errorMessage(e);
      setErroredNodeId(step.nodeId);
      setErroredNodeName(step.nodeName);
      setErroredMessage(message);
      appendLog(`Falha de comunicação ao tentar avançar "${step.nodeName}": ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSkipStep() {
    setBusy(true);
    try {
      const newStep = await skipStep(processInstanceId);
      if (!newStep.errorNodeId) {
        appendLog(`Etapa "${step.nodeName}" (${taskLabel(step.nodeType)}) pulada manualmente.`);
      }
      applyNewStep(newStep);
    } catch (e) {
      const message = errorMessage(e);
      setErroredNodeId(step.nodeId);
      setErroredNodeName(step.nodeName);
      setErroredMessage(message);
      appendLog(`Falha de comunicação ao tentar avançar "${step.nodeName}": ${message}`);
    } finally {
      setBusy(false);
    }
  }

  async function handleSendTestMessage(nodeId: string, payload: Record<string, unknown>) {
    await sendTestMessage(journey.journeyId, nodeId, payload);
    appendLog(`Mensagem de teste publicada no Kafka para "${step.nodeName}".`, payload);
  }

  // Nó Kafka em espera não tem botão: o produtor completa sozinho (worker em background) e o
  // consumidor só avança quando uma mensagem real chega (painel "Enviar mensagem" ou um produtor
  // externo de verdade) — em ambos os casos, só o polling aqui detecta que o passo mudou.
  const waitingConnectorConfig = step.nodeId ? (flow.flowNodes.find((n) => n.id === step.nodeId)?.connectorConfig ?? null) : null;
  const isWaitingOnKafka = step.type === 'WAITING' && waitingConnectorConfig?.connectorType === 'KAFKA';

  useEffect(() => {
    if (!isWaitingOnKafka) return;
    const id = setInterval(async () => {
      try {
        const latest = await getCurrentStep(processInstanceId);
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
      appendLog(`Falha ao alterar a variável "${name}": ${errorMessage(e)}`);
    }
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col" style={{ background: skinVars.colors.background }}>
      <div className="flex-1 min-h-0 overflow-auto">
        <div className="max-w-[1040px] mx-auto px-6 py-8">
          <Stack space={24}>
            <div className="flex items-center justify-between">
              <Stack space={2}>
                <Text size={12.5} color={skinVars.colors.textSecondary}>
                  {journey.productName} · {journey.channelName}
                </Text>
                <Text size={19} weight="bold" color={skinVars.colors.textPrimary}>
                  {journey.name}
                </Text>
              </Stack>
              <button
                type="button"
                onClick={onRestart}
                className="flex items-center gap-[6px] rounded-lg px-3 py-2 text-[13px] font-medium cursor-pointer"
                style={{ background: 'transparent', border: `1px solid ${skinVars.colors.border}`, color: skinVars.colors.textSecondary }}
              >
                <ArrowLeft size={14} />
                Nova execução
              </button>
            </div>

            <DevicePreview
              channelType={flow.channelType}
              step={step}
              busy={busy}
              connectorConfig={waitingConnectorConfig}
              businessKey={businessKey}
              onCompleteTask={handleCompleteTask}
              onSkipStep={handleSkipStep}
              onSendTestMessage={handleSendTestMessage}
            />
          </Stack>
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
