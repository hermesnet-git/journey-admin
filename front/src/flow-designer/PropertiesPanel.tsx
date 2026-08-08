import { useState } from 'react';
import { Plus, X, RefreshCw } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import {
  NODE_META,
  CONNECTOR_TYPES_BY_NODE,
  KAFKA_OPERATION_BY_NODE,
  type ConnectorConfig,
  type ConnectorType,
  type NodeType,
  type WFNode,
  type WFNodeData,
} from './model';
import { Section } from './PropertiesSection';
import type { Form } from '../api/forms';

const CONNECTOR_NODE_TYPES = new Set(['serviceTask', 'receiveTask', 'messageStartEvent']);

// Ported from wf-designer's PropertiesPanel.tsx, kept visually faithful
// (inline styles, same tokens/spacing) and trimmed to admin's node data
// shape (name/description/formId — no headers/branches yet).
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
function MiniIconButton({
  onClick,
  title,
  children,
}: {
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { c } = useFlowTheme();
  const [hover, setHover] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      title={title}
      className="transition-transform active:scale-90"
      style={{
        width: 22,
        height: 22,
        border: `1px solid ${hover ? c.accent : c.border}`,
        borderRadius: 6,
        background: hover ? c.hoverBg : c.cardBg,
        color: hover ? c.accent : c.textSecondary,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {children}
    </button>
  );
}

// Content only — PropertiesDock owns the panel chrome (width, collapse,
// resize, header).
export function PropertiesPanel({
  node,
  forms,
  onUpdate,
  onDelete,
  onOpenNewForm,
  onRefreshForms,
}: {
  node: WFNode;
  forms: Form[];
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onDelete: () => void;
  onOpenNewForm: () => void;
  onRefreshForms: () => void;
}) {
  const { c } = useFlowTheme();
  const [generalOpen, setGeneralOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [connectorOpen, setConnectorOpen] = useState(true);
  const data = node.data;
  const isConnectorNode = !!node.type && CONNECTOR_NODE_TYPES.has(node.type);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: c.textSecondary, marginBottom: 14 }}>
        {NODE_META[node.type as keyof typeof NODE_META].title}
      </div>

      <Section title="Informações Gerais" open={generalOpen} onToggle={() => setGeneralOpen((o) => !o)}>
        <div style={{ marginBottom: 14 }}>
          <div style={labelStyle(c)}>Nome</div>
          <input style={inputStyle(c)} value={data.name} onChange={(e) => onUpdate({ name: e.target.value })} />
        </div>
        <div style={{ marginBottom: 6 }}>
          <div style={labelStyle(c)}>Descrição</div>
          <textarea
            style={{ ...inputStyle(c), minHeight: 70, resize: 'vertical' }}
            value={data.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
          />
        </div>
      </Section>

      {node.type === 'userTask' && (
        <Section title="Formulário" open={formOpen} onToggle={() => setFormOpen((o) => !o)}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <div style={{ ...labelStyle(c), marginBottom: 0 }}>Formulário associado</div>
              <div style={{ display: 'flex', gap: 4 }}>
                <MiniIconButton onClick={onRefreshForms} title="Atualizar lista de formulários">
                  <RefreshCw size={13} />
                </MiniIconButton>
                <MiniIconButton onClick={onOpenNewForm} title="Novo formulário">
                  <Plus size={13} />
                </MiniIconButton>
              </div>
            </div>
            <select
              style={{ ...inputStyle(c), cursor: 'pointer' }}
              value={data.formId ?? ''}
              onChange={(e) => onUpdate({ formId: e.target.value || null })}
            >
              <option value="">Nenhum</option>
              {forms.map((f) => (
                <option key={f.formId} value={f.formId}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        </Section>
      )}

      {isConnectorNode && (
        <Section title="Conector" open={connectorOpen} onToggle={() => setConnectorOpen((o) => !o)}>
          <ConnectorFields key={node.id} nodeType={node.type as NodeType} connectorConfig={data.connectorConfig} onUpdate={onUpdate} />
        </Section>
      )}

      <button
        onClick={onDelete}
        style={{
          width: '100%',
          padding: 11,
          borderRadius: 9,
          border: 'none',
          background: 'rgba(229,72,77,0.14)',
          color: '#e5484d',
          fontSize: 14,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        Excluir nó
      </button>
    </div>
  );
}

const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
// Quick fields and headers each get real inputs; everything else (params,
// body, payload, mapeamento de entrada/saída — FT-03.09) stays a single JSON
// block, matching the backend's extensible `Map<String,Object>` storage
// (REQ-03.08.005). Headers are flat key/value pairs with a well-known shape,
// unlike body/payload/mappings whose contract isn't defined yet, so they earn
// a dedicated editor instead of raw JSON.
const REST_QUICK_FIELDS = ['method', 'url'];
const KAFKA_QUICK_FIELDS = ['topic', 'operation'];

function omit(obj: Record<string, unknown>, keys: string[]): Record<string, unknown> {
  const result = { ...obj };
  keys.forEach((k) => delete result[k]);
  return result;
}

function ConnectorFields({
  nodeType,
  connectorConfig,
  onUpdate,
}: {
  nodeType: NodeType;
  connectorConfig: ConnectorConfig | null;
  onUpdate: (patch: Partial<WFNodeData>) => void;
}) {
  const { c } = useFlowTheme();
  const availableConnectors = CONNECTOR_TYPES_BY_NODE[nodeType] ?? [];
  const kafkaOperation = KAFKA_OPERATION_BY_NODE[nodeType];

  function update(patch: Partial<ConnectorConfig>) {
    const current: ConnectorConfig = connectorConfig ?? { connectorType: 'REST', config: {}, credentialRef: null };
    onUpdate({ connectorConfig: { ...current, ...patch } });
  }

  function updateConfigField(key: string, value: string) {
    update({ config: { ...(connectorConfig?.config ?? {}), [key]: value } });
  }

  const quickFields = connectorConfig?.connectorType === 'REST' ? REST_QUICK_FIELDS : KAFKA_QUICK_FIELDS;
  const structuredFields = [...quickFields, 'headers'];

  return (
    <div>
      <div style={labelStyle(c)}>Tipo de Conector</div>
      <select
        style={{ ...inputStyle(c), cursor: 'pointer', marginBottom: 10 }}
        value={connectorConfig?.connectorType ?? ''}
        onChange={(e) => {
          const value = e.target.value;
          if (!value) {
            onUpdate({ connectorConfig: null });
            return;
          }
          // Kafka's operation is implied by the node's role (REQ-03.09.008), so it's
          // pre-filled here rather than left for the user to pick.
          const config = value === 'KAFKA' && kafkaOperation ? { operation: kafkaOperation } : {};
          update({ connectorType: value as ConnectorType, config });
        }}
      >
        <option value="">Nenhum</option>
        {availableConnectors.map((type) => (
          <option key={type} value={type}>
            {type}
          </option>
        ))}
      </select>

      {connectorConfig && (
        <>
          <div style={{ marginBottom: 10 }}>
            <div style={labelStyle(c)}>Referência de credencial (opcional)</div>
            <input
              style={inputStyle(c)}
              value={connectorConfig.credentialRef ?? ''}
              onChange={(e) => update({ credentialRef: e.target.value || null })}
              placeholder="ex.: credential-runtime-01"
            />
          </div>

          {connectorConfig.connectorType === 'REST' ? (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 110 }}>
                <div style={labelStyle(c)}>Método</div>
                <select
                  style={{ ...inputStyle(c), cursor: 'pointer' }}
                  value={(connectorConfig.config?.method as string) ?? ''}
                  onChange={(e) => updateConfigField('method', e.target.value)}
                >
                  <option value="">—</option>
                  {REST_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <div style={labelStyle(c)}>URL</div>
                <input
                  style={inputStyle(c)}
                  value={(connectorConfig.config?.url as string) ?? ''}
                  onChange={(e) => updateConfigField('url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={labelStyle(c)}>Tópico</div>
                <input
                  style={inputStyle(c)}
                  value={(connectorConfig.config?.topic as string) ?? ''}
                  onChange={(e) => updateConfigField('topic', e.target.value)}
                />
              </div>
              <div style={{ width: 130 }}>
                <div style={labelStyle(c)}>Operação</div>
                <div style={{ ...inputStyle(c), color: c.textSecondary, cursor: 'not-allowed' }} title="Definida automaticamente pelo tipo de nó">
                  {kafkaOperation}
                </div>
              </div>
            </div>
          )}

          <div style={{ marginBottom: 10 }}>
            <HeadersEditor
              headers={(connectorConfig.config?.headers as Record<string, string>) ?? {}}
              onChange={(headers) => update({ config: { ...(connectorConfig.config ?? {}), headers } })}
            />
          </div>

          <ConnectorExtraConfig
            key={connectorConfig.connectorType}
            structuredFields={structuredFields}
            connectorType={connectorConfig.connectorType}
            config={connectorConfig.config ?? {}}
            onChange={(extra) => update({ config: { ...pickKeys(connectorConfig.config, structuredFields), ...extra } })}
          />
        </>
      )}
    </div>
  );
}

function HeadersEditor({
  headers,
  onChange,
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}) {
  const { c } = useFlowTheme();
  const [rows, setRows] = useState<[string, string][]>(() => Object.entries(headers));

  function commit(next: [string, string][]) {
    setRows(next);
    const result: Record<string, string> = {};
    next.forEach(([key, value]) => {
      if (key.trim()) result[key] = value;
    });
    onChange(result);
  }

  return (
    <div>
      <div style={labelStyle(c)}>Headers</div>
      {rows.map(([key, value], i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            style={inputStyle(c)}
            placeholder="Nome"
            value={key}
            onChange={(e) => commit(rows.map((row, ri) => (ri === i ? [e.target.value, row[1]] : row)))}
          />
          <input
            style={inputStyle(c)}
            placeholder="Valor"
            value={value}
            onChange={(e) => commit(rows.map((row, ri) => (ri === i ? [row[0], e.target.value] : row)))}
          />
          <button
            onClick={() => commit(rows.filter((_, ri) => ri !== i))}
            title="Remover header"
            style={{
              flex: '0 0 auto',
              width: 34,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
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
      ))}
      <button
        onClick={() => commit([...rows, ['', '']])}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'none',
          padding: '4px 0',
          color: c.accent,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} /> Adicionar header
      </button>
    </div>
  );
}

function pickKeys(obj: Record<string, unknown> | null | undefined, keys: string[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  keys.forEach((k) => {
    if (obj && k in obj) result[k] = obj[k];
  });
  return result;
}

function ConnectorExtraConfig({
  structuredFields,
  connectorType,
  config,
  onChange,
}: {
  structuredFields: string[];
  connectorType: ConnectorType;
  config: Record<string, unknown>;
  onChange: (extra: Record<string, unknown>) => void;
}) {
  const { c } = useFlowTheme();
  const [text, setText] = useState(() => JSON.stringify(omit(config, structuredFields), null, 2));
  const [error, setError] = useState<string | null>(null);
  const label = connectorType === 'REST' ? 'params, body, mapeamento de entrada/saída' : 'payload, mapeamento de entrada/saída';

  return (
    <div>
      <div style={labelStyle(c)}>Configuração adicional ({label})</div>
      <textarea
        style={{
          ...inputStyle(c),
          minHeight: 140,
          resize: 'vertical',
          fontFamily: 'monospace',
          fontSize: 12.5,
          borderColor: error ? c.danger : c.border,
        }}
        value={text}
        onChange={(e) => {
          const value = e.target.value;
          setText(value);
          try {
            const parsed = JSON.parse(value);
            setError(null);
            onChange(parsed);
          } catch {
            setError('JSON inválido');
          }
        }}
      />
      {error && <div style={{ fontSize: 11.5, color: c.danger, marginTop: 4 }}>{error}</div>}
    </div>
  );
}
