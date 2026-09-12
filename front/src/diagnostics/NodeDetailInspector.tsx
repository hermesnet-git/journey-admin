import { skinVars } from '@telefonica/mistica';
import type { NodeLayoutProps } from './nodeLayoutTypes';
import { CopyTextButton } from './CopyTextButton';
import { prettifyJson } from '../execution/InspectorPanel';
import type { BackendConnectorType, ConnectorConfigInfo } from '../execution/api';

// Painel único do Diagnóstico: denso, monospace, seções colapsáveis (linguagem de DevTools do
// navegador) — acompanha o tema claro/escuro do resto do app via skinVars, não fixo.
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const pretty = prettifyJson(value);
  if (typeof pretty === 'object') return JSON.stringify(pretty, null, 2);
  return String(pretty);
}

const CONNECTOR_TYPE_LABEL: Record<BackendConnectorType, string> = {
  REST: 'API REST',
  KAFKA: 'Kafka',
  EVENT_HUBS: 'Event Hubs',
  SERVICE_BUS: 'Service Bus',
};

const CONSUMER_NODE_TYPES = new Set(['RECEIVE_TASK', 'MESSAGE_START_EVENT']);

function ConnectorDetails({ connectorConfig, nodeType }: { connectorConfig: ConnectorConfigInfo; nodeType?: string }) {
  const cfg = connectorConfig.config ?? {};
  const typeLabel = CONNECTOR_TYPE_LABEL[connectorConfig.connectorType] ?? connectorConfig.connectorType;

  return (
    <div style={{ margin: '14px 18px 0', padding: '10px 13px', borderRadius: 6, background: skinVars.colors.backgroundAlternative, border: `1px solid ${skinVars.colors.border}` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: skinVars.colors.textSecondary }}>
          Configuração do conector
        </span>
        <span style={{ fontSize: 10.5, fontWeight: 600, color: skinVars.colors.brand, background: skinVars.colors.background, borderRadius: 10, padding: '2px 8px' }}>
          {typeLabel}
        </span>
      </div>
      {connectorConfig.connectorType === 'REST' ? (
        <RestConnectorDetails cfg={cfg} />
      ) : (
        <TopicConnectorDetails cfg={cfg} connectorType={connectorConfig.connectorType} nodeType={nodeType} />
      )}
    </div>
  );
}

function RestConnectorDetails({ cfg }: { cfg: Record<string, unknown> }) {
  const method = (cfg.method as string) || null;
  const url = (cfg.url as string) || null;
  const headers = (cfg.headers as Record<string, string>) ?? {};
  const headerEntries = Object.entries(headers);
  const hasBody = !!cfg.body && Object.keys(cfg.body as object).length > 0;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ color: skinVars.colors.textPrimary, wordBreak: 'break-all' }}>
        {method && url ? `${method} ${url}` : 'URL ainda não configurada'}
      </div>
      {headerEntries.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: skinVars.colors.textSecondary, marginBottom: 2 }}>HEADERS ({headerEntries.length})</div>
          {headerEntries.map(([key, value]) => (
            <div key={key} style={{ color: skinVars.colors.textSecondary }}>
              {key}: {value}
            </div>
          ))}
        </div>
      )}
      {hasBody && <div style={{ color: skinVars.colors.textSecondary }}>Body configurado</div>}
    </div>
  );
}

function TopicConnectorDetails({
  cfg,
  connectorType,
  nodeType,
}: {
  cfg: Record<string, unknown>;
  connectorType: BackendConnectorType;
  nodeType?: string;
}) {
  const topicLabel = connectorType === 'EVENT_HUBS' ? 'Event Hub' : 'Tópico';
  const operationLabel = nodeType ? (CONSUMER_NODE_TYPES.has(nodeType) ? 'Consumer' : 'Producer') : null;
  const clusterId = (cfg.clusterId as string) || null;
  const topic = (cfg.topic as string) || null;

  return (
    <div style={{ fontFamily: MONO, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
      {operationLabel && <div style={{ color: skinVars.colors.textSecondary, fontWeight: 700 }}>{operationLabel}</div>}
      <div style={{ color: skinVars.colors.textPrimary, wordBreak: 'break-all' }}>
        {topicLabel}: {topic || '—'}
      </div>
      {clusterId && <div style={{ color: skinVars.colors.textSecondary }}>Cluster: {clusterId}</div>}
    </div>
  );
}

export function NodeDetailInspector({
  detail,
  fallbackName,
  typeLabel,
  timing,
  connectorConfig,
  isGateway,
  incident,
  reached,
}: NodeLayoutProps) {
  const isMessageConnector = connectorConfig && connectorConfig.connectorType !== 'REST';
  // Task id de verdade (Camunda) só existe pra User Task; qualquer outro tipo de nó não tem essa
  // entidade no motor, mas tem activityInstanceId — usado aqui como identificador equivalente pra
  // poder correlacionar qualquer etapa concluída, não só User Task.
  const stepId = detail?.taskDetail?.taskId ?? detail?.activityInstanceId;

  return (
    <div style={{ background: skinVars.colors.background, color: skinVars.colors.textPrimary, minHeight: '100%', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' }}>
      {/* Header */}
      <div style={{ padding: '16px 18px 12px', borderBottom: `1px solid ${skinVars.colors.border}` }}>
        {typeLabel && (
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.05em', textTransform: 'uppercase', color: skinVars.colors.brand, marginBottom: 4 }}>
            {typeLabel}
          </div>
        )}
        <div style={{ fontSize: 17, fontWeight: 700 }}>{detail?.nodeName ?? fallbackName}</div>
        <div style={{ fontFamily: MONO, fontSize: 11.5, color: skinVars.colors.textSecondary, marginTop: 4 }}>{timing}</div>
        {detail?.endTime && (
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: skinVars.colors.textSecondary, marginTop: 4 }}>
            concluída em {new Date(detail.endTime).toLocaleString('pt-BR')}
          </div>
        )}
        {stepId && (
          <div style={{ fontFamily: MONO, fontSize: 11.5, color: skinVars.colors.textSecondary, marginTop: 4 }}>
            task id: {stepId}
            <CopyTextButton text={stepId} />
          </div>
        )}
      </div>

      {/* Incidente */}
      {incident && (
        <div style={{ margin: '14px 18px 0', padding: '11px 13px', border: `1px solid ${skinVars.colors.error}`, borderRadius: 6, background: skinVars.colors.errorLow }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={skinVars.colors.error} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: skinVars.colors.error }}>{incident.incidentType}</span>
                <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.03em', color: skinVars.colors.error }}>
                  {incident.open ? 'Aberto' : 'Resolvido'}
                </span>
              </div>
              {incident.message && <div style={{ fontSize: 12, color: skinVars.colors.error, marginTop: 3, lineHeight: 1.4 }}>{incident.message}</div>}
              <div style={{ fontFamily: MONO, fontSize: 10, color: skinVars.colors.error, marginTop: 5 }}>
                {new Date(incident.createTime).toLocaleTimeString('pt-BR')}
                {incident.endTime ? ` → ${new Date(incident.endTime).toLocaleTimeString('pt-BR')}` : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancelada: qualquer tipo de nó, não só User Task */}
      {detail?.canceled && (
        <div style={{ margin: '14px 18px 0', padding: '10px 13px', borderRadius: 6, background: skinVars.colors.errorLow, border: `1px solid ${skinVars.colors.error}` }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: skinVars.colors.error }}>Etapa cancelada</div>
        </div>
      )}

      {/* Detalhes da tarefa (User Task) */}
      {detail?.taskDetail && (detail.taskDetail.deleteReason || detail.taskDetail.description) && (
        <div style={{ margin: '14px 18px 0', padding: '10px 13px', borderRadius: 6, background: detail.taskDetail.deleteReason ? skinVars.colors.errorLow : skinVars.colors.backgroundAlternative, border: `1px solid ${detail.taskDetail.deleteReason ? skinVars.colors.error : skinVars.colors.border}` }}>
          {detail.taskDetail.deleteReason && (
            <div style={{ fontSize: 12, fontWeight: 700, color: skinVars.colors.error, marginBottom: 4 }}>
              Não concluída normalmente: {detail.taskDetail.deleteReason}
            </div>
          )}
          {detail.taskDetail.description && (
            <div style={{ fontFamily: MONO, fontSize: 11, color: skinVars.colors.textSecondary }}>{detail.taskDetail.description}</div>
          )}
        </div>
      )}

      {/* Configuração do conector (Tarefa de serviço/recebimento) */}
      {connectorConfig && <ConnectorDetails connectorConfig={connectorConfig} nodeType={detail?.nodeType} />}

      {/* Entrada */}
      {detail?.input && (
        <details open style={{ borderBottom: `1px solid ${skinVars.colors.border}`, marginTop: 14 }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '13px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: skinVars.colors.textSecondary }}>
            {isMessageConnector ? 'Payload da Mensagem' : detail.nodeType === 'START' ? 'Informações enviadas ao motor' : 'Entrada'}
          </summary>
          <div style={{ padding: '0 18px 14px 18px', fontFamily: MONO, fontSize: 12 }}>
            {Object.entries(detail.input).map(([key, value]) => (
              <div key={key} style={{ display: 'flex', gap: 10, padding: '5px 0', borderTop: `1px solid ${skinVars.colors.border}` }}>
                <span style={{ color: skinVars.colors.textSecondary, flexShrink: 0, width: 96 }}>{key}</span>
                <span style={{ color: skinVars.colors.textPrimary, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{formatValue(value)}</span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Saida */}
      {(detail?.input || detail?.output) && !isGateway && (
        <details style={{ borderBottom: `1px solid ${skinVars.colors.border}` }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '13px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: skinVars.colors.textSecondary }}>
            Saída
          </summary>
          <div style={{ padding: '0 18px 14px 18px', fontFamily: MONO, fontSize: 12 }}>
            {detail.output ? (
              Object.entries(detail.output).map(([key, value]) => (
                <div key={key} style={{ display: 'flex', gap: 10, padding: '5px 0', borderTop: `1px solid ${skinVars.colors.border}` }}>
                  <span style={{ color: skinVars.colors.textSecondary, flexShrink: 0, width: 96 }}>{key}</span>
                  <span style={{ color: skinVars.colors.textPrimary, wordBreak: 'break-all', whiteSpace: 'pre-wrap' }}>{formatValue(value)}</span>
                </div>
              ))
            ) : (
              <span style={{ color: skinVars.colors.textSecondary, fontStyle: 'italic' }}>Sem resposta{incident ? ' — a chamada não completou' : ''}.</span>
            )}
          </div>
        </details>
      )}

      {/* Tentativas (Service/Receive Task Kafka) */}
      {!!detail?.attempts?.length && (
        <details style={{ borderBottom: `1px solid ${skinVars.colors.border}` }}>
          <summary style={{ cursor: 'pointer', listStyle: 'none', padding: '13px 18px', fontSize: 12, fontWeight: 700, letterSpacing: '.04em', textTransform: 'uppercase', color: skinVars.colors.textSecondary, display: 'flex', justifyContent: 'space-between' }}>
            <span>Tentativas</span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: skinVars.colors.textSecondary, fontWeight: 400, textTransform: 'none' }}>{detail.attempts.length}</span>
          </summary>
          <div style={{ padding: '0 18px 14px 18px', fontFamily: MONO, fontSize: 11.5, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {detail.attempts.map((a, i) => (
              <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <span style={{ color: a.succeeded ? skinVars.colors.success : skinVars.colors.error, flexShrink: 0 }}>{a.succeeded ? '✓' : '✕'}</span>
                <span style={{ color: skinVars.colors.textSecondary, flexShrink: 0 }}>{new Date(a.time).toLocaleTimeString('pt-BR')}</span>
                <span style={{ color: a.failed ? skinVars.colors.error : skinVars.colors.textPrimary, wordBreak: 'break-all' }}>
                  {a.errorMessage ?? (a.succeeded ? 'concluído' : '—')}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {!detail?.input && !reached && (
        <div style={{ padding: '16px 18px', fontSize: 12.5, color: skinVars.colors.textSecondary }}>
          A instância ainda não chegou nesta etapa.
        </div>
      )}
    </div>
  );
}
