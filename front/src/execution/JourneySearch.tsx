import { useEffect, useRef, useState } from 'react';
import { Play, Search } from 'lucide-react';
import { Callout, Stack, Text, TextFieldBase, TextLink, skinVars } from '@telefonica/mistica';
import {
  getJourneyFlow,
  getLatestInstance,
  sendTestMessage,
  startInstance,
  type FlowBundle,
  type FlowNodeInfo,
  type InstanceResponse,
  type JourneySummary,
  type StepResponse,
} from './api';
import { recordExecutionStart } from './auditApi';
import { SendTestMessagePanel } from './SendTestMessagePanel';
// Listagem de jornadas publicadas vem direto do admin/back (autenticado, já é a fonte da
// verdade) — o ms-espec-registry só entra em cena ao executar de fato (getJourneyFlow/
// startInstance/sendTestMessage), quando é preciso falar com o motor de runtime.
import { listJourneys as listPublishedJourneys } from '../api/journeys';

interface Props {
  active: boolean;
  onStarted: (processInstanceId: string, businessKey: string, journey: JourneySummary, flow: FlowBundle, step: StepResponse) => void;
}

const LATEST_INSTANCE_POLL_MS = 2000;
const LATEST_INSTANCE_MAX_ATTEMPTS = 20; // ~40s

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function JourneySearch({ active, onStarted }: Props) {
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<JourneySummary | null>(null);
  const [startNode, setStartNode] = useState<FlowNodeInfo | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  // REQ-03.12.001/003: valores digitados pro formulário de "variáveis de entrada" declaradas no nó
  // START — chave é o nome da variável, sempre string aqui (convertida pro tipo certo em handleExecute).
  const [startVariableValues, setStartVariableValues] = useState<Record<string, string>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // A aba de Execuções fica montada mesmo quando não está visível (ver App.tsx), então
    // precisa refazer a busca toda vez que volta a ficar ativa — senão jornada recém
    // incluída/alterada/publicada em outra aba não aparece sem dar refresh na página.
    if (!active) return;
    listPublishedJourneys({ status: 'PUBLISHED' })
      .then(setJourneys)
      .catch((e) => setLoadError(errorMessage(e)));
  }, [active]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = (journeys ?? []).filter(
    (j) =>
      q.length === 0 ||
      j.name.toLowerCase().includes(q) ||
      j.productName.toLowerCase().includes(q) ||
      j.channelName.toLowerCase().includes(q),
  );

  function handleSelect(journey: JourneySummary) {
    setSelected(journey);
    setQuery(journey.name);
    setOpen(false);
    setStartNode(null);
    setStartError(null);
    setStartVariableValues({});
    // Precisa saber o tipo do nó de início antes de decidir entre "Executar" e o painel de envio
    // de mensagem — MESSAGE_START_EVENT não tem início manual, só uma mensagem Kafka real inicia.
    getJourneyFlow(journey.journeyId)
      .then((flow) => setStartNode(flow.flowNodes.find((n) => n.type === 'START' || n.type === 'MESSAGE_START_EVENT') ?? null))
      .catch(() => setStartNode(null));
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selected && value !== selected.name) {
      setSelected(null);
      setStartNode(null);
    }
  }

  async function handleExecute() {
    if (!selected) return;
    setStarting(true);
    setStartError(null);
    try {
      const variables = toStartVariablePayload(startVariables, startVariableValues);
      const { processInstanceId, businessKey, flow, step } = await startInstance(selected.journeyId, variables);
      recordExecutionStart(selected.journeyId, selected.name, processInstanceId).catch(() => {
        /* falha ao registrar auditoria não deve impedir a execução de continuar */
      });
      onStarted(processInstanceId, businessKey, selected, flow, step);
    } catch (e) {
      setStartError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  async function handleSendStartMessage(payload: Record<string, unknown>) {
    if (!selected || !startNode) return;
    const since = new Date().toISOString();
    await sendTestMessage(selected.journeyId, startNode.id, payload);
    const instance = await pollForNewInstance(selected.journeyId, since);
    recordExecutionStart(selected.journeyId, selected.name, instance.processInstanceId).catch(() => {
      /* falha ao registrar auditoria não deve impedir a execução de continuar */
    });
    onStarted(instance.processInstanceId, instance.businessKey, selected, instance.flow, instance.step);
  }

  const isMessageStart = startNode?.type === 'MESSAGE_START_EVENT';
  const messageStartTopic = isMessageStart && typeof startNode.connectorConfig?.config?.topic === 'string'
    ? startNode.connectorConfig.config.topic
    : null;
  // REQ-03.12.001: só o nó START comum declara isso — MESSAGE_START_EVENT usa o painel de mensagem.
  const startVariables = startNode?.startVariables ?? [];
  const missingStartVariable = startVariables.some(
    (v) => v.type !== 'boolean' && !startVariableValues[v.name],
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: skinVars.colors.background }}>
      <div className="w-full max-w-[560px] px-6">
        <Stack space={24}>
          <Stack space={4}>
            <Text size={24} weight="bold" color={skinVars.colors.textPrimary} textAlign="center">
              Executar
            </Text>
            <Text size={14} color={skinVars.colors.textSecondary} textAlign="center">
              Busque uma jornada publicada para executá-la de ponta a ponta
            </Text>
          </Stack>

          {loadError && <Callout variant="default" title="Não foi possível carregar as jornadas" description={loadError} />}

          <div ref={containerRef} className="relative">
            <TextFieldBase
              label="Buscar jornada"
              placeholder="Nome da jornada, produto ou canal..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              startIcon={<Search size={16} />}
              fullWidth
              autoComplete="off"
            />

            {open && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-lg overflow-y-auto max-h-[360px]"
                style={{
                  background: skinVars.colors.backgroundContainer,
                  border: `1px solid ${skinVars.colors.border}`,
                  boxShadow: '0 12px 32px -10px rgba(0,0,0,.18)',
                }}
              >
                {journeys === null ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      Carregando...
                    </Text>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      {q.length === 0
                        ? 'Nenhuma jornada publicada disponível.'
                        : `Nenhuma jornada publicada encontrada para "${query}".`}
                    </Text>
                  </div>
                ) : (
                  results.map((journey) => (
                    <button
                      key={journey.journeyId}
                      type="button"
                      onClick={() => handleSelect(journey)}
                      className="w-full text-left px-4 py-[10px] cursor-pointer border-0"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.backgroundAlternative)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Stack space={2}>
                        <Text size={14} weight="medium" color={skinVars.colors.textPrimary}>
                          {journey.name}
                        </Text>
                        <Text size={12} color={skinVars.colors.textSecondary}>
                          {journey.productName} · {journey.channelName}
                        </Text>
                      </Stack>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

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
                      onChange={(e) =>
                        setStartVariableValues((prev) => ({ ...prev, [v.name]: String(e.target.checked) }))
                      }
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
              disabled={!selected || starting || missingStartVariable}
              onClick={handleExecute}
              className="flex items-center justify-center gap-2 rounded-lg py-3 w-full border-0 font-semibold cursor-pointer transition-opacity"
              style={{
                background: skinVars.colors.buttonPrimaryBackground,
                color: skinVars.colors.textButtonPrimary,
                opacity: !selected || starting || missingStartVariable ? 0.5 : 1,
                cursor: !selected || starting || missingStartVariable ? 'default' : 'pointer',
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
