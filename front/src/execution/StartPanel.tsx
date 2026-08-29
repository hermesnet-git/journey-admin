import { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Callout, Stack, Text, TextLink, skinVars } from '@telefonica/mistica';
import {
  getJourneyFlow,
  getLatestInstance,
  sendTestMessage,
  startInstance,
  type FlowBundle,
  type InstanceResponse,
  type JourneySummary,
} from './api';
import { recordExecutionStart } from './auditApi';
import { SendTestMessagePanel } from './SendTestMessagePanel';
import { FlowDiagramViewer } from './FlowDiagramViewer';

const LATEST_INSTANCE_POLL_MS = 2000;
const LATEST_INSTANCE_MAX_ATTEMPTS = 20; // ~40s

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface Props {
  journey: JourneySummary;
  onStarted: (instance: InstanceResponse) => void;
}

// Configuração de início de uma jornada selecionada — variáveis de entrada, controle manual de
// Kafka, ou o painel de mensagem de teste pra um MESSAGE_START_EVENT. Renderizado com `key` no
// journeyId pelo pai (ExecutionsPage), então trocar de jornada selecionada é sempre um remount
// limpo aqui — nada de lógica de reset manual entre uma seleção e outra.
export function StartPanel({ journey, onStarted }: Props) {
  // O fluxo inteiro (não só o nó de início) fica guardado pra alimentar a prévia estrutural abaixo —
  // antes disso ele era buscado e quase todo descartado, só pra extrair startNode/hasKafkaProducer.
  const [flow, setFlow] = useState<FlowBundle | null>(null);
  const [flowError, setFlowError] = useState(false);
  const [manualKafkaControl, setManualKafkaControl] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // REQ-03.12.001/003: valores digitados pro formulário de "variáveis de entrada" declaradas no nó
  // START — chave é o nome da variável, sempre string aqui (convertida pro tipo certo em handleExecute).
  const [startVariableValues, setStartVariableValues] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;
    getJourneyFlow(journey.journeyId)
      .then((f) => {
        if (!cancelled) setFlow(f);
      })
      .catch(() => {
        if (!cancelled) setFlowError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [journey.journeyId]);

  // Tipo do nó de início decide entre "Executar" e o painel de envio de mensagem —
  // MESSAGE_START_EVENT não tem início manual, só uma mensagem Kafka real inicia.
  const startNode = flow?.flowNodes.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT') ?? null;
  const hasKafkaProducer = flow?.flowNodes.some((n) => n.type === 'SERVICE_TASK' && n.connectorConfig?.connectorType === 'KAFKA') ?? false;

  async function handleExecute() {
    setStarting(true);
    setStartError(null);
    try {
      const variables = toStartVariablePayload(startVariables, startVariableValues);
      const instance = await startInstance(journey.journeyId, variables, manualKafkaControl);
      recordExecutionStart(journey.journeyId, journey.name, instance.processInstanceId).catch(() => {
        /* falha ao registrar auditoria não deve impedir a execução de continuar */
      });
      onStarted(instance);
    } catch (e) {
      setStartError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  async function handleSendStartMessage(payload: Record<string, unknown>) {
    if (!startNode) return;
    const since = new Date().toISOString();
    await sendTestMessage(journey.journeyId, startNode.id, payload);
    const instance = await pollForNewInstance(journey.journeyId, since);
    recordExecutionStart(journey.journeyId, journey.name, instance.processInstanceId).catch(() => {
      /* falha ao registrar auditoria não deve impedir a execução de continuar */
    });
    onStarted(instance);
  }

  const isMessageStart = startNode?.type === 'MESSAGE_START_EVENT';
  const messageStartTopic =
    isMessageStart && typeof startNode.connectorConfig?.config?.topic === 'string' ? startNode.connectorConfig.config.topic : null;
  // REQ-03.12.001: só o nó START comum declara isso — MESSAGE_START_EVENT usa o painel de mensagem.
  const startVariables = startNode?.startVariables ?? [];
  const missingStartVariable = startVariables.some((v) => v.type !== 'boolean' && !startVariableValues[v.name]);

  return (
    <div className="flex-1 min-h-0 overflow-auto flex items-start justify-center py-10 px-6">
      <div className="w-full max-w-[640px]">
        <Stack space={24}>
          <Stack space={2}>
            <Text size={18} weight="bold" color={skinVars.colors.textPrimary}>
              {journey.name}
            </Text>
            <Text size={13} color={skinVars.colors.textSecondary}>
              {journey.productName} · {journey.channelName}
              {journey.publishedVersionNumber != null && ` · v${journey.publishedVersionNumber}`}
            </Text>
          </Stack>

          {/* Prévia estrutural do fluxo antes de executar — mesmo visualizador somente-leitura da
              aba "Fluxo da Jornada" (staticView: colorido por tipo de nó, sem trilha de execução),
              pra não decidir "Executar" às cegas. Omitida silenciosamente se a busca falhar
              (flowError) — o formulário abaixo continua funcionando sem ela. */}
          {flow && flow.flowNodes.length > 0 ? (
            <div
              className="rounded-lg overflow-hidden"
              style={{ height: 200, border: `1px solid ${skinVars.colors.border}` }}
            >
              <FlowDiagramViewer flowNodes={flow.flowNodes} flowConnections={flow.flowConnections} currentNodeId={null} visitedNodeIds={[]} staticView />
            </div>
          ) : !flowError && !flow ? (
            <div className="rounded-lg animate-pulse" style={{ height: 200, background: skinVars.colors.backgroundAlternative }} />
          ) : null}

          {startError && <Callout variant="default" title="Não foi possível iniciar" description={startError} />}

          {!isMessageStart && startVariables.length > 0 && (
            <Stack space={8}>
              <Text size={12.5} weight="medium" color={skinVars.colors.textSecondary}>
                Variáveis de entrada
              </Text>
              {startVariables.map((v) =>
                v.type === 'boolean' ? (
                  <label key={v.name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={startVariableValues[v.name] === 'true'}
                      onChange={(e) => setStartVariableValues((prev) => ({ ...prev, [v.name]: String(e.target.checked) }))}
                    />
                    <Text size={13} color={skinVars.colors.textPrimary}>
                      {v.name}
                    </Text>
                  </label>
                ) : (
                  <div key={v.name}>
                    <Text size={12} color={skinVars.colors.textSecondary}>
                      {v.name}
                    </Text>
                    <input
                      type={inputTypeFor(v.type)}
                      value={startVariableValues[v.name] ?? ''}
                      onChange={(e) => setStartVariableValues((prev) => ({ ...prev, [v.name]: e.target.value }))}
                      className="w-full box-border"
                      style={{
                        fontSize: 13,
                        padding: '8px 10px',
                        borderRadius: 8,
                        border: `1px solid ${skinVars.colors.border}`,
                        background: skinVars.colors.background,
                        color: skinVars.colors.textPrimary,
                      }}
                    />
                  </div>
                ),
              )}
            </Stack>
          )}

          {!isMessageStart && hasKafkaProducer && (
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={manualKafkaControl} onChange={(e) => setManualKafkaControl(e.target.checked)} />
              <Text size={13} color={skinVars.colors.textPrimary}>
                Controlar tarefas assíncronas manualmente nesta execução
              </Text>
            </label>
          )}

          {isMessageStart && messageStartTopic ? (
            <Stack space={12}>
              <SendTestMessagePanel
                topic={messageStartTopic}
                initialPayload={{}}
                description="Esta jornada só começa a partir de uma mensagem Kafka real — edite o payload e envie um teste para iniciar uma instância."
                onSend={handleSendStartMessage}
              />
              <div className="flex justify-center">
                <TextLink onPress={handleExecute} disabled={starting} underline="always">
                  <Text size={12.5} color={skinVars.colors.textSecondary}>
                    Iniciar sem mensagem
                  </Text>
                </TextLink>
              </div>
            </Stack>
          ) : (
            <button
              type="button"
              disabled={starting || missingStartVariable}
              onClick={handleExecute}
              className="flex items-center justify-center gap-2 rounded-lg py-3 w-full border-0 font-semibold cursor-pointer transition-opacity"
              style={{
                background: skinVars.colors.buttonPrimaryBackground,
                color: skinVars.colors.textButtonPrimary,
                opacity: starting || missingStartVariable ? 0.5 : 1,
                cursor: starting || missingStartVariable ? 'default' : 'pointer',
              }}
            >
              <Play size={16} />
              {starting ? 'Iniciando...' : 'Executar'}
            </button>
          )}
        </Stack>
      </div>
    </div>
  );
}

async function pollForNewInstance(journeyId: string, since: string): Promise<InstanceResponse> {
  for (let attempt = 0; attempt < LATEST_INSTANCE_MAX_ATTEMPTS; attempt++) {
    const instance = await getLatestInstance(journeyId, since);
    if (instance) return instance;
    await delay(LATEST_INSTANCE_POLL_MS);
  }
  throw new Error('Nenhuma instância nova apareceu depois da mensagem — confira se o Kafka e o worker de execução estão no ar.');
}

// REQ-03.12.003: converte os valores digitados (sempre string, vindos de <input>) pro tipo
// declarado antes de mandar pro POST .../instances. undefined quando a jornada não declara nada,
// pra não mandar um body vazio à toa.
function toStartVariablePayload(
  declarations: { name: string; type: string }[],
  values: Record<string, string>,
): Record<string, unknown> | undefined {
  if (declarations.length === 0) return undefined;
  const payload: Record<string, unknown> = {};
  declarations.forEach((v) => {
    const raw = values[v.name] ?? '';
    if (v.type === 'number') payload[v.name] = raw === '' ? null : Number(raw);
    else if (v.type === 'boolean') payload[v.name] = raw === 'true';
    else payload[v.name] = raw;
  });
  return payload;
}

function inputTypeFor(type: string): string {
  if (type === 'number') return 'number';
  if (type === 'date') return 'date';
  if (type === 'datetime') return 'datetime-local';
  return 'text';
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'Erro inesperado.';
}
