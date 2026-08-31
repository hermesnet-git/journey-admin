import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, X } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { useBackdropClose } from './PropertyGrid';
import {
  HeadersEditor,
  StructuredJsonEditor,
  OutputMappingEditor,
  PayloadFieldsEditor,
  TestAndMapPanel,
  VariablePickerButton,
  insertTokenAtCursor,
  REST_METHODS,
  METHODS_WITH_BODY,
  OUTPUT_MAPPING_FIELD,
  type PayloadField,
} from './PropertiesPanel';
import { SearchSelect } from './SearchSelect';
import { type ConnectorConfig, type ConnectorType, type OutputMappingRule, type VariableOrigin, type VariableType } from './model';
import { testCredentialConnection, listClusterTopics, type MessagingCluster, type CredentialReference } from '../api/messaging';

const inputStyle = (c: FlowColors): React.CSSProperties => ({
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: `1px solid ${c.border}`,
  background: c.cardBg,
  color: c.textPrimary,
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
});
const labelStyle = (c: FlowColors): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: c.textSecondary,
  marginBottom: 6,
});

function exampleValueForType(type: VariableType): unknown {
  switch (type) {
    case 'number':
      return 42;
    case 'boolean':
      return true;
    case 'date':
      return '2026-08-30';
    case 'datetime':
      return '2026-08-30T14:30:00Z';
    default:
      return 'exemplo';
  }
}

// Mesma extração que o worker faz de verdade (status/code saem de dentro do corpo e viram campos de
// topo do envelope) — só pra mostrar aqui um exemplo fiel de como a mensagem final fica.
function splitStatusCode(data: Record<string, unknown>): { status?: unknown; code?: unknown; rest: Record<string, unknown> } {
  const rest = { ...data };
  const status = rest.status;
  const code = rest.code;
  delete rest.status;
  delete rest.code;
  return { status, code, rest };
}

// config.payload continua sendo o objeto plano {nome: valor} que o worker de verdade resolve e
// envia — config.payloadFields é só a representação em linhas que a tabela edita (guarda o TIPO,
// que payload sozinho não tem onde guardar) e fica sempre convertida de volta pra manter as duas
// em sincronia, sem exigir nenhuma mudança no back.
function payloadFieldsToObject(fields: PayloadField[]): Record<string, string> {
  const obj: Record<string, string> = {};
  fields.forEach((f) => {
    if (f.name) obj[f.name] = f.value;
  });
  return obj;
}

function suggestedPayloadFields(vars: VariableOrigin[]): PayloadField[] {
  return vars.map((v) => ({ name: v.name, value: `{{${v.name}}}`, type: v.type }));
}

function buildEnvelopePreview(payload: Record<string, unknown>, messageName: string | undefined) {
  const { status, code, rest } = splitStatusCode(payload);
  const payloadObj: Record<string, unknown> = {};
  if (status !== undefined) payloadObj.status = status;
  if (code !== undefined) payloadObj.code = code;
  payloadObj.data = rest;
  return {
    correlationId: '<identificador da execução>',
    ...(messageName ? { messageName } : {}),
    payload: payloadObj,
  };
}

// Painel didático, sem exigir que o usuário saiba ler JSON de cara: mostra um exemplo de como a
// mensagem final fica, lado a lado com o que ele está configurando — em vez de só confiar que o
// editor de campos representa fielmente o que vai ser enviado/esperado.
function PayloadPreview({ title, note, envelope, c }: { title: string; note?: string; envelope: unknown; c: FlowColors }) {
  return (
    <div style={{ marginTop: 16 }}>
      <div style={labelStyle(c)}>{title}</div>
      {note && <div style={{ fontSize: 11.5, color: c.textSecondary, marginBottom: 8 }}>{note}</div>}
      <pre
        style={{
          fontSize: 11.5,
          fontFamily: 'monospace',
          background: c.canvasBg,
          border: `1px solid ${c.border}`,
          borderRadius: 8,
          padding: 10,
          margin: 0,
          maxHeight: 220,
          overflow: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          color: c.textPrimary,
        }}
      >
        {JSON.stringify(envelope, null, 2)}
      </pre>
    </div>
  );
}

const REST_STEPS = ['Conexão', 'Headers', 'Parâmetros & Corpo', 'Testar e Mapear'] as const;
// Um único passo de dados: pra quem produz (SERVICE_TASK) é o que sai; pra quem consome
// (RECEIVE_TASK/MESSAGE_START_EVENT) é o que entra. Não existe mais um "Mapear saída" separado —
// pro lado de consumo, "Escolher o que aproveitar" (dentro deste mesmo passo) É o mapeamento.
const BROKER_STEPS = ['Conexão', 'Dados'] as const;

// REQ-14.05.005: Event Hubs/Service Bus reaproveitam o mesmo formato de etapas do Kafka.
const STEPS_BY_TYPE: Record<ConnectorType, readonly string[]> = {
  REST: REST_STEPS,
  KAFKA: BROKER_STEPS,
  EVENT_HUBS: BROKER_STEPS,
  SERVICE_BUS: BROKER_STEPS,
};

interface Props {
  connectorConfig: ConnectorConfig;
  variables: VariableOrigin[];
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
  journeyId: string;
  nodeId: string;
  onConfigUpdate: (patch: Partial<ConnectorConfig>) => void;
  onClose: () => void;
}

// Additive guided path over connectorConfig — but unlike the inline "Conector" section, edits made
// here live in a local draft and only reach onConfigUpdate (and therefore the inline panel) when
// the user explicitly clicks "Concluir". Closing any other way (X, Cancelar, backdrop, Esc) checks
// for unsaved changes first (ConfirmDialog, same component JourneyDesignerPage already uses for an
// analogous "you're about to lose something" moment) instead of silently discarding.
export function ConnectorWizard({
  connectorConfig,
  variables,
  clusters,
  credentials,
  journeyId,
  nodeId,
  onConfigUpdate,
  onClose,
}: Props) {
  const { c } = useFlowTheme();
  const steps: readonly string[] = STEPS_BY_TYPE[connectorConfig.connectorType];
  const [stepIndex, setStepIndex] = useState(0);
  // "Automático" é sempre o padrão pra um conector de mensageria — cobre tanto quem produz quanto
  // quem consome sem exigir nenhuma configuração; "customizado" é uma escolha explícita do usuário.
  const [draft, setDraft] = useState<ConnectorConfig>(() => {
    if (connectorConfig.connectorType === 'REST') return connectorConfig;
    const cfg = connectorConfig.config ?? {};
    const patch: Record<string, unknown> = {};
    if (cfg.payloadMode === undefined) patch.payloadMode = 'GENERIC_DUMP';
    // payloadFields é novo — se já existe um payload salvo sem essa representação em linhas
    // (config antigo desta mesma etapa de desenvolvimento), reconstrói a tabela a partir dele em
    // vez de abrir vazia e "perder" o que já estava configurado.
    if (cfg.payloadFields === undefined && cfg.payload && typeof cfg.payload === 'object' && !Array.isArray(cfg.payload)) {
      patch.payloadFields = Object.entries(cfg.payload as Record<string, unknown>).map(([name, value]) => ({
        name,
        value: value == null ? '' : String(value),
        type: 'string',
      }));
    }
    if (Object.keys(patch).length === 0) return connectorConfig;
    return { ...connectorConfig, config: { ...cfg, ...patch } };
  });
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  // Só relevante no passo "Dados" em modo customizado — no automático não há o que mapear, então
  // só a aba de Preview existe (ver renderização do passo abaixo).
  const [dataTab, setDataTab] = useState<'MAPPING' | 'PREVIEW'>('MAPPING');

  // REQ-14.04.005: teste de conexão do conector de mensageria — só valida cluster+credencial,
  // nunca publica/consome mensagem real. Estado próprio, separado do teste REST acima.
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionTestResult, setConnectionTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') requestClose();
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dirty]);

  function updateDraft(patch: Partial<ConnectorConfig>) {
    setDraft((d) => ({ ...d, ...patch }));
    setDirty(true);
  }

  function updateDraftConfig(key: string, value: unknown) {
    updateDraft({ config: { ...(draft.config ?? {}), [key]: value } });
  }

  // Ao trocar pra "customizado" do lado de quem produz, começa com todas as variáveis disponíveis
  // já preenchidas (uma sugestão, não uma obrigação) — em vez de uma tabela em branco pedindo pro
  // usuário lembrar de cor tudo que a jornada já sabe até aqui.
  function selectPayloadMode(mode: 'GENERIC_DUMP' | 'CUSTOM') {
    const isConsume = draft.config?.operation === 'CONSUME';
    const existingFields = (draft.config?.payloadFields as PayloadField[] | undefined) ?? [];
    if (mode === 'CUSTOM' && !isConsume && existingFields.length === 0) {
      const fields = suggestedPayloadFields(variables);
      updateDraft({
        config: { ...(draft.config ?? {}), payloadMode: mode, payloadFields: fields, payload: payloadFieldsToObject(fields) },
      });
      setDataTab('MAPPING');
      return;
    }
    updateDraftConfig('payloadMode', mode);
    if (mode === 'CUSTOM') setDataTab('MAPPING');
  }

  function requestClose() {
    if (dirty) setConfirmingDiscard(true);
    else onClose();
  }

  function discardAndClose() {
    setConfirmingDiscard(false);
    onClose();
  }

  function finish() {
    onConfigUpdate({ config: draft.config, credentialRef: draft.credentialRef });
    onClose();
  }

  async function runConnectionTest() {
    const credential = credentials.find((cr) => cr.referenceName === draft.credentialRef);
    if (!credential) return;
    setTestingConnection(true);
    setConnectionTestResult(null);
    try {
      setConnectionTestResult(await testCredentialConnection(credential.credentialId));
    } catch (e) {
      setConnectionTestResult({ ok: false, message: e instanceof Error ? e.message : 'Falha ao testar conexão' });
    } finally {
      setTestingConnection(false);
    }
  }

  const method = (draft.config?.method as string) ?? '';
  const showBody = METHODS_WITH_BODY.has(method);
  const outputMappingRules = (draft.config?.[OUTPUT_MAPPING_FIELD] as OutputMappingRule[]) ?? [];

  function renderRestStep(label: string) {
    switch (label) {
      case 'Conexão':
        return (
          <div>
            <div style={labelStyle(c)}>Método</div>
            <select
              style={{ ...inputStyle(c), cursor: 'pointer', marginBottom: 12 }}
              value={method}
              onChange={(e) => updateDraftConfig('method', e.target.value)}
            >
              <option value="">—</option>
              {REST_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <div style={labelStyle(c)}>URL</div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
              <input
                ref={urlInputRef}
                style={{ ...inputStyle(c), flex: 1 }}
                value={(draft.config?.url as string) ?? ''}
                onChange={(e) => updateDraftConfig('url', e.target.value)}
                placeholder="https://..."
              />
              <VariablePickerButton
                variables={variables}
                onInsert={(token) =>
                  insertTokenAtCursor(urlInputRef.current, (draft.config?.url as string) ?? '', token, (next) =>
                    updateDraftConfig('url', next),
                  )
                }
              />
            </div>
            <div style={labelStyle(c)}>Credencial (opcional)</div>
            <input
              style={inputStyle(c)}
              value={draft.credentialRef ?? ''}
              onChange={(e) => updateDraft({ credentialRef: e.target.value || null })}
              placeholder="ex.: credential-runtime-01"
            />
          </div>
        );
      case 'Headers':
        return (
          <HeadersEditor
            headers={(draft.config?.headers as Record<string, string>) ?? {}}
            onChange={(headers) => updateDraftConfig('headers', headers)}
            variables={variables}
          />
        );
      case 'Parâmetros & Corpo':
        return (
          <div>
            <div style={labelStyle(c)}>Parâmetros de URL (query params)</div>
            <div style={{ marginBottom: 20 }}>
              <StructuredJsonEditor
                value={draft.config?.params}
                onChange={(v) => updateDraftConfig('params', v)}
                variables={variables}
              />
            </div>
            {showBody ? (
              <>
                <div style={labelStyle(c)}>Body</div>
                <StructuredJsonEditor
                  value={draft.config?.body}
                  onChange={(v) => updateDraftConfig('body', v)}
                  variables={variables}
                />
              </>
            ) : (
              <div style={{ fontSize: 12.5, color: c.textSecondary }}>
                Método {method || '(não escolhido)'} não envia corpo — escolha POST, PUT ou PATCH na etapa Conexão pra configurar um Body.
              </div>
            )}
          </div>
        );
      case 'Testar e Mapear':
        return (
          <TestAndMapPanel
            connectorConfig={draft}
            journeyId={journeyId}
            nodeId={nodeId}
            outputMappingRules={outputMappingRules}
            onChangeOutputMapping={(rules) => updateDraftConfig(OUTPUT_MAPPING_FIELD, rules)}
          />
        );
      default:
        return null;
    }
  }

  const brokerClusterId = (draft.config?.clusterId as string) ?? null;
  const brokerCredentialsForCluster = brokerClusterId
    ? credentials.filter((cr) => cr.clusterId === brokerClusterId)
    : credentials;
  const brokerTopicLabel =
    draft.connectorType === 'EVENT_HUBS' ? 'Nome do Event Hub' : draft.connectorType === 'SERVICE_BUS' ? 'Fila/Tópico' : 'Tópico';

  // Sugestão de tópicos reais do cluster escolhido (US-03.09) — cacheada por cluster pra não
  // rebuscar ao reabrir o seletor; o campo continua aceitando digitação livre (allowCustomValue),
  // então uma falha aqui nunca bloqueia o desenho do fluxo, só perde a sugestão.
  const [topicsByCluster, setTopicsByCluster] = useState<Record<string, string[]>>({});
  const [topicsLoading, setTopicsLoading] = useState(false);
  const [topicsError, setTopicsError] = useState<string | null>(null);

  useEffect(() => {
    if (!brokerClusterId || topicsByCluster[brokerClusterId]) {
      setTopicsError(null);
      return;
    }
    let cancelled = false;
    setTopicsLoading(true);
    setTopicsError(null);
    listClusterTopics(brokerClusterId)
      .then((response) => {
        if (cancelled) return;
        if (response.ok) {
          setTopicsByCluster((prev) => ({ ...prev, [brokerClusterId]: response.topics }));
        } else {
          setTopicsError(response.message ?? 'Não foi possível listar os tópicos do cluster.');
        }
      })
      .catch(() => {
        if (!cancelled) setTopicsError('Não foi possível listar os tópicos do cluster (ms-espec-registry fora do ar?).');
      })
      .finally(() => {
        if (!cancelled) setTopicsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brokerClusterId]);

  const brokerClusterTopics = brokerClusterId ? (topicsByCluster[brokerClusterId] ?? []) : [];

  function renderBrokerStep(label: string) {
    switch (label) {
      case 'Conexão':
        return (
          <div>
            <div style={labelStyle(c)}>Cluster</div>
            <div style={{ marginBottom: 12 }}>
              <SearchSelect
                items={clusters}
                getId={(cluster) => cluster.clusterId}
                getLabel={(cluster) => cluster.name}
                value={brokerClusterId}
                onChange={(clusterId) => {
                  updateDraftConfig('clusterId', clusterId ?? '');
                  updateDraft({ credentialRef: null });
                }}
                placeholder="Nenhum cluster cadastrado"
                emptyLabel="Nenhum cluster encontrado — cadastre em Catálogo de Integrações"
                inputStyle={inputStyle(c)}
              />
            </div>
            <div style={labelStyle(c)}>{brokerTopicLabel}</div>
            <div style={{ marginBottom: 12 }}>
              <SearchSelect
                items={brokerClusterTopics}
                getId={(topic) => topic}
                getLabel={(topic) => topic}
                value={(draft.config?.topic as string) ?? null}
                onChange={(topic) => updateDraftConfig('topic', topic ?? '')}
                allowCustomValue
                placeholder={
                  !brokerClusterId ? 'Escolha um cluster primeiro' : topicsLoading ? 'Carregando tópicos...' : 'Digite ou escolha um tópico'
                }
                emptyLabel={topicsLoading ? 'Carregando…' : (topicsError ?? 'Nenhum tópico encontrado no cluster — digite um nome novo')}
                inputStyle={inputStyle(c)}
              />
              {topicsError && <div style={{ fontSize: 11, color: c.danger, marginTop: 2 }}>{topicsError}</div>}
            </div>
            <div style={labelStyle(c)}>Operação</div>
            <div
              style={{ ...inputStyle(c), marginBottom: 12, color: c.textSecondary }}
              title="Definida automaticamente pelo tipo de nó"
            >
              {(draft.config?.operation as string) ?? '—'}
            </div>
            <div style={labelStyle(c)}>Credencial</div>
            <SearchSelect
              items={brokerCredentialsForCluster}
              getId={(cred) => cred.referenceName}
              getLabel={(cred) => cred.referenceName}
              value={draft.credentialRef}
              onChange={(referenceName) => {
                updateDraft({ credentialRef: referenceName });
                setConnectionTestResult(null);
              }}
              placeholder={brokerClusterId ? 'Nenhuma credencial cadastrada' : 'Escolha um cluster primeiro'}
              emptyLabel="Nenhuma credencial encontrada — cadastre em Catálogo de Integrações"
              inputStyle={inputStyle(c)}
            />

            {draft.credentialRef && (
              <div style={{ marginTop: 12 }}>
                <button
                  type="button"
                  onClick={runConnectionTest}
                  disabled={testingConnection}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '7px 14px',
                    borderRadius: 8,
                    border: `1px solid ${c.border}`,
                    background: c.cardBg,
                    color: c.textPrimary,
                    fontSize: 12.5,
                    fontWeight: 700,
                    cursor: testingConnection ? 'default' : 'pointer',
                  }}
                >
                  {testingConnection ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
                  {testingConnection ? 'Testando...' : 'Testar conexão'}
                </button>
                {connectionTestResult && (
                  <div style={{ marginTop: 8, fontSize: 12.5, color: connectionTestResult.ok ? c.accent : c.danger }}>
                    {connectionTestResult.message}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'Dados': {
        const isConsume = draft.config?.operation === 'CONSUME';
        const payloadMode = (draft.config?.payloadMode as string) === 'CUSTOM' ? 'CUSTOM' : 'GENERIC_DUMP';
        const payloadFields = (draft.config?.payloadFields as PayloadField[] | undefined) ?? [];
        // No automático não há nada pra mapear — só existe a aba de exemplo. No customizado, o
        // usuário escolhe entre editar o mapeamento ou conferir o resultado.
        const activeTab: 'MAPPING' | 'PREVIEW' = payloadMode === 'GENERIC_DUMP' ? 'PREVIEW' : dataTab;
        const options = isConsume
          ? ([
              {
                value: 'GENERIC_DUMP',
                label: 'Aproveitar tudo automaticamente',
                description:
                  'Tudo que chegar nessa mensagem já entra na jornada, do jeito que vier. Não precisa configurar nada — é a opção recomendada.',
              },
              {
                value: 'CUSTOM',
                label: 'Escolher o que aproveitar',
                description: 'Você escolhe quais informações da mensagem recebida quer usar na jornada, e dá um nome pra cada uma.',
              },
            ] as const)
          : ([
              {
                value: 'GENERIC_DUMP',
                label: 'Enviar tudo automaticamente',
                description:
                  'Todas as informações que a jornada já coletou até aqui são enviadas junto. Não precisa configurar nada — é a opção recomendada.',
              },
              {
                value: 'CUSTOM',
                label: 'Escolher o que enviar',
                description: 'Você escolhe exatamente quais informações enviar, uma por uma.',
              },
            ] as const);

        const previewNode = isConsume ? (
          <PayloadPreview
            c={c}
            title="Exemplo de como a mensagem precisa chegar"
            note={
              payloadMode === 'CUSTOM'
                ? 'Cada linha do mapeamento vira uma variável com o nome que você escolheu, lida de dentro de "payload.data".'
                : 'Cada informação dentro de "data" vira uma variável do processo com esse mesmo nome, automaticamente.'
            }
            envelope={{
              correlationId: '<precisa ser igual ao identificador da execução que está esperando>',
              messageName: '<opcional>',
              payload: {
                status: '<opcional>',
                code: '<opcional>',
                data:
                  payloadMode === 'CUSTOM' && outputMappingRules.length > 0
                    ? Object.fromEntries(outputMappingRules.map((rule) => [rule.name, `<valor de exemplo, tipo ${rule.type}>`]))
                    : { exemploDeCampo: 'valor de exemplo' },
              },
            }}
          />
        ) : (
          <PayloadPreview
            c={c}
            title="Exemplo de como a mensagem vai ser enviada"
            note="É exatamente esse formato que chega no outro lado — o identificador da execução é preenchido automaticamente."
            envelope={buildEnvelopePreview(
              payloadMode === 'GENERIC_DUMP'
                ? Object.fromEntries(variables.map((v) => [v.name, exampleValueForType(v.type)]))
                : payloadFieldsToObject(payloadFields),
              variables.some((v) => v.name === 'messageName') ? '<valor atual da variável messageName>' : undefined,
            )}
          />
        );

        return (
          <div>
            <div style={labelStyle(c)}>{isConsume ? 'O que fazer com a mensagem recebida' : 'O que enviar'}</div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              {options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => selectPayloadMode(option.value)}
                  style={{
                    flex: 1,
                    textAlign: 'left',
                    padding: '10px 12px',
                    borderRadius: 8,
                    border: `1px solid ${payloadMode === option.value ? c.accent : c.border}`,
                    background: payloadMode === option.value ? c.accentSoft : c.cardBg,
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary }}>{option.label}</div>
                  <div style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 2 }}>{option.description}</div>
                </button>
              ))}
            </div>

            {payloadMode === 'CUSTOM' && (
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {(
                  [
                    ['MAPPING', 'Mapeamento'],
                    ['PREVIEW', 'Preview'],
                  ] as const
                ).map(([tab, label]) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setDataTab(tab)}
                    style={{
                      padding: '6px 14px',
                      borderRadius: 999,
                      border: `1px solid ${activeTab === tab ? c.accent : c.border}`,
                      background: activeTab === tab ? c.accent : 'transparent',
                      color: activeTab === tab ? '#fff' : c.textSecondary,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}

            {activeTab === 'MAPPING' &&
              (isConsume ? (
                <OutputMappingEditor
                  rules={outputMappingRules}
                  onChange={(rules) => updateDraftConfig(OUTPUT_MAPPING_FIELD, rules)}
                  sourceResponse={null}
                />
              ) : (
                <PayloadFieldsEditor
                  fields={payloadFields}
                  onChange={(fields) =>
                    updateDraft({ config: { ...(draft.config ?? {}), payloadFields: fields, payload: payloadFieldsToObject(fields) } })
                  }
                />
              ))}

            {activeTab === 'PREVIEW' && previewNode}
          </div>
        );
      }
      default:
        return null;
    }
  }

  const currentLabel = steps[stepIndex];
  const stepContent = draft.connectorType === 'REST' ? renderRestStep(currentLabel) : renderBrokerStep(currentLabel);
  const isLastStep = stepIndex === steps.length - 1;
  const backdrop = useBackdropClose(requestClose);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      {...backdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: 640, maxHeight: '80vh', overflowY: 'auto', background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary }}>
            Assistente de configuração — Conector {connectorConfig.connectorType}
          </div>
          <button
            type="button"
            onClick={requestClose}
            title="Fechar"
            style={{
              width: 26,
              height: 26,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              background: c.cardBg,
              color: c.textSecondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <X size={14} />
          </button>
        </div>

        <div style={{ display: 'flex', gap: 4, marginBottom: 18, flexWrap: 'wrap' }}>
          {steps.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStepIndex(i)}
              style={{
                padding: '5px 10px',
                borderRadius: 999,
                border: `1px solid ${i === stepIndex ? c.accent : c.border}`,
                background: i === stepIndex ? c.accent : 'transparent',
                color: i === stepIndex ? '#fff' : c.textSecondary,
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>

        <div style={{ minHeight: 220 }}>{stepContent}</div>

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button
            type="button"
            onClick={requestClose}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              border: `1px solid ${c.border}`,
              background: 'none',
              color: c.textSecondary,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Cancelar
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              type="button"
              onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
              disabled={stepIndex === 0}
              style={{
                padding: '8px 16px',
                borderRadius: 8,
                border: `1px solid ${c.border}`,
                background: c.cardBg,
                color: c.textPrimary,
                cursor: stepIndex === 0 ? 'default' : 'pointer',
                opacity: stepIndex === 0 ? 0.5 : 1,
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Voltar
            </button>
            {isLastStep ? (
              <button
                type="button"
                onClick={finish}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: c.accent,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Concluir
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setStepIndex((i) => Math.min(steps.length - 1, i + 1))}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: c.accent,
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                Avançar
              </button>
            )}
          </div>
        </div>
      </div>

      {confirmingDiscard && (
        <div onClick={(e) => e.stopPropagation()}>
          <ConfirmDialog
            title="Descartar alterações?"
            message="As alterações feitas no assistente ainda não concluídas. Se fechar agora, elas são perdidas."
            confirmLabel="Descartar"
            cancelLabel="Continuar editando"
            onConfirm={discardAndClose}
            onCancel={() => setConfirmingDiscard(false)}
          />
        </div>
      )}
    </div>
  );
}
