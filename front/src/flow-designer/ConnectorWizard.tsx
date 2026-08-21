import { useEffect, useRef, useState } from 'react';
import { Play, Loader2, X } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { useBackdropClose } from './PropertyGrid';
import {
  HeadersEditor,
  StructuredJsonEditor,
  OutputMappingEditor,
  ResponsePreview,
  VariablePickerButton,
  insertTokenAtCursor,
  REST_METHODS,
  METHODS_WITH_BODY,
  OUTPUT_MAPPING_FIELD,
} from './PropertiesPanel';
import { SearchSelect } from './SearchSelect';
import {
  flattenJsonToOutputMappingRules,
  type ConnectorConfig,
  type ConnectorType,
  type OutputMappingRule,
  type VariableOrigin,
} from './model';
import { testConnector, type ConnectorTestResponse } from '../api/flows';
import { testCredentialConnection, type MessagingCluster, type CredentialReference } from '../api/messaging';

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

const VARIABLE_TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;
function tokensIn(config: Record<string, unknown> | null | undefined): string[] {
  const found = new Set<string>();
  const text = JSON.stringify(config ?? {});
  for (const match of text.matchAll(VARIABLE_TOKEN)) found.add(match[1]);
  return [...found];
}

const REST_STEPS = ['Conexão', 'Headers', 'Parâmetros & Corpo', 'Testar e Mapear'] as const;
const BROKER_STEPS = ['Conexão', 'Payload', 'Mapear saída'] as const;

// REQ-14.05.005: Event Hubs/Service Bus reaproveitam o mesmo formato de 3 etapas do Kafka.
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
  const [draft, setDraft] = useState<ConnectorConfig>(connectorConfig);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);

  // Test state — local and inline (no nested modal), separate from TestConnectorButton/"Testar API"
  // which keeps its own modal working exactly as-is for the inline panel.
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ConnectorTestResponse | null>(null);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);

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
  const tokens = tokensIn(draft.config);

  async function runTest() {
    setTesting(true);
    setTestError(null);
    setTestResult(null);
    setGeneratedCount(null);
    try {
      const config = draft.config ?? {};
      const response = await testConnector(journeyId, nodeId, {
        method: (config.method as string) ?? 'GET',
        url: (config.url as string) ?? '',
        headers: (config.headers as Record<string, string>) ?? {},
        body: (config.body as Record<string, unknown>) ?? null,
        sampleVariables,
      });
      setTestResult(response);
      try {
        const generated = flattenJsonToOutputMappingRules(JSON.parse(response.body));
        if (generated.length > 0) {
          const existingNames = new Set(outputMappingRules.map((r) => r.name));
          const merged = [...outputMappingRules, ...generated.filter((r) => !existingNames.has(r.name))];
          updateDraftConfig(OUTPUT_MAPPING_FIELD, merged);
          setGeneratedCount(generated.filter((r) => !existingNames.has(r.name)).length);
        }
      } catch {
        // Non-JSON response — nothing to flatten, mapping stays manual below.
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Falha ao testar o conector');
    } finally {
      setTesting(false);
    }
  }

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
          <div>
            <div style={{ fontSize: 12.5, color: c.textSecondary, marginBottom: 12 }}>
              Execute a chamada de verdade pra ver a resposta real e gerar o mapeamento automaticamente — ou pule o
              teste e monte o mapeamento manualmente abaixo, mesmo sem testar com sucesso.
            </div>

            {tokens.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle(c)}>Valores de exemplo para as variáveis usadas</div>
                {tokens.map((t) => (
                  <div key={t} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: c.textSecondary, marginBottom: 2 }}>{`{{${t}}}`}</div>
                    <input
                      style={inputStyle(c)}
                      value={sampleVariables[t] ?? ''}
                      onChange={(e) => setSampleVariables((sv) => ({ ...sv, [t]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={runTest}
              disabled={testing}
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
                cursor: testing ? 'default' : 'pointer',
                marginBottom: 14,
              }}
            >
              {testing ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />}
              {testing ? 'Testando...' : 'Testar chamada'}
            </button>

            {testError && (
              <div style={{ fontSize: 12.5, color: c.danger, marginBottom: 14 }}>Falha ao testar: {testError}</div>
            )}

            {testResult && (
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: c.textPrimary, marginBottom: 6 }}>
                  Status: {testResult.status}
                </div>
                {generatedCount !== null && generatedCount > 0 && (
                  <div style={{ fontSize: 12, color: c.accent, marginBottom: 8 }}>
                    {generatedCount} variável{generatedCount > 1 ? 'is' : ''} de saída gerada{generatedCount > 1 ? 's' : ''} automaticamente a partir da
                    resposta.
                  </div>
                )}
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <ResponsePreview response={testResult} />
            </div>

            <div style={{ borderTop: `1px solid ${c.border}`, paddingTop: 14 }}>
              <div style={labelStyle(c)}>Mapeamento de saída</div>
              <OutputMappingEditor
                rules={outputMappingRules}
                onChange={(rules) => updateDraftConfig(OUTPUT_MAPPING_FIELD, rules)}
                hideSourcePreview
              />
            </div>
          </div>
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
              />
            </div>
            <div style={labelStyle(c)}>{brokerTopicLabel}</div>
            <input
              style={{ ...inputStyle(c), marginBottom: 12 }}
              value={(draft.config?.topic as string) ?? ''}
              onChange={(e) => updateDraftConfig('topic', e.target.value)}
            />
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
      case 'Payload':
        return (
          <StructuredJsonEditor
            value={draft.config?.payload}
            onChange={(v) => updateDraftConfig('payload', v)}
            variables={variables}
          />
        );
      case 'Mapear saída':
        return (
          <OutputMappingEditor
            rules={outputMappingRules}
            onChange={(rules) => updateDraftConfig(OUTPUT_MAPPING_FIELD, rules)}
            sourceResponse={null}
          />
        );
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
          <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary }}>Assistente de configuração</div>
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
