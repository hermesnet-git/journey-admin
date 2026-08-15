import { useState } from 'react';
import { Plus, X, RefreshCw, Play, Loader2 } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import {
  NODE_META,
  CONNECTOR_TYPES_BY_NODE,
  KAFKA_OPERATION_BY_NODE,
  availableVariablesAt,
  availableVariableRulesAt,
  flattenJsonToOutputMappingRules,
  type ConnectorConfig,
  type ConnectorType,
  type NodeType,
  type OutputMappingRule,
  type VariableType,
  type WFNode,
  type WFEdge,
  type WFEdgeData,
  type WFNodeData,
} from './model';
import { Section } from './PropertiesSection';
import type { Form } from '../api/forms';
import { testConnector, type ConnectorTestResponse } from '../api/flows';
import { PropertyGrid, PropertyRow, PropertyGroupHeader, Modal, gridInputStyle } from './PropertyGrid';

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

// A property row whose value is edited in a popup dialog instead of inline — the cell itself just
// shows a compact read-only summary plus the "..." trigger, object-inspector style.
function ComplexPropertyRow({
  label,
  summary,
  dialogTitle,
  children,
}: {
  label: string;
  summary: string;
  dialogTitle: string;
  children: React.ReactNode;
}) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  return (
    <PropertyRow label={label}>
      <div style={{ display: 'flex', gap: 4, width: '100%' }}>
        <div
          style={{
            ...gridInputStyle(c),
            color: c.textSecondary,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            display: 'flex',
            alignItems: 'center',
            cursor: 'default',
          }}
        >
          {summary}
        </div>
        <button
          onClick={() => setOpen(true)}
          title={`Editar ${label}`}
          style={{
            flex: '0 0 auto',
            width: 24,
            height: 24,
            border: `1px solid ${c.border}`,
            borderRadius: 4,
            background: c.cardBg,
            color: c.textSecondary,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          …
        </button>
      </div>
      {open && (
        <Modal title={dialogTitle} onClose={() => setOpen(false)}>
          {children}
        </Modal>
      )}
    </PropertyRow>
  );
}

function jsonFieldSummary(value: unknown): string {
  if (!value || typeof value !== 'object') return 'Vazio';
  const n = Object.keys(value as object).length;
  return n === 0 ? 'Vazio' : `${n} campo${n > 1 ? 's' : ''}`;
}

function headersSummary(headers: Record<string, string> | undefined): string {
  const n = headers ? Object.keys(headers).length : 0;
  return n === 0 ? 'Nenhum' : `${n} header${n > 1 ? 's' : ''}`;
}

function outputMappingSummary(rules: OutputMappingRule[] | undefined): string {
  const n = rules?.length ?? 0;
  return n === 0 ? 'Nenhuma' : `${n} variável${n > 1 ? 'is' : ''}`;
}

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
  allNodes,
  allEdges,
  journeyId,
  onUpdate,
  onUpdateEdge,
  onDelete,
  onOpenNewForm,
  onRefreshForms,
}: {
  node: WFNode;
  forms: Form[];
  allNodes: WFNode[];
  allEdges: WFEdge[];
  journeyId: string;
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<WFEdgeData>) => void;
  onDelete: () => void;
  onOpenNewForm: () => void;
  onRefreshForms: () => void;
}) {
  const { c } = useFlowTheme();
  const [generalOpen, setGeneralOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [connectorOpen, setConnectorOpen] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(true);
  const data = node.data;
  const isConnectorNode = !!node.type && CONNECTOR_NODE_TYPES.has(node.type);

  return (
    <div>
      <div style={{ fontSize: 12.5, color: c.textSecondary, marginBottom: 14 }}>
        {NODE_META[node.type as keyof typeof NODE_META].title}
      </div>

      <Section title="Informações Gerais" open={generalOpen} onToggle={() => setGeneralOpen((o) => !o)}>
        <PropertyGrid>
          <PropertyRow label="Nome" first>
            <input style={gridInputStyle(c)} value={data.name} onChange={(e) => onUpdate({ name: e.target.value })} />
          </PropertyRow>
          <PropertyRow label="Descrição">
            <textarea
              style={{ ...gridInputStyle(c), height: 'auto', minHeight: 50, resize: 'vertical', padding: '4px 6px' }}
              value={data.description}
              onChange={(e) => onUpdate({ description: e.target.value })}
            />
          </PropertyRow>
        </PropertyGrid>
      </Section>

      {node.type === 'userTask' && (
        <Section title="Formulário" open={formOpen} onToggle={() => setFormOpen((o) => !o)}>
          <PropertyGrid>
            <PropertyRow label="Formulário" first>
              <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                <select
                  style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }}
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
                <MiniIconButton onClick={onRefreshForms} title="Atualizar lista de formulários">
                  <RefreshCw size={13} />
                </MiniIconButton>
                <MiniIconButton onClick={onOpenNewForm} title="Novo formulário">
                  <Plus size={13} />
                </MiniIconButton>
              </div>
            </PropertyRow>
          </PropertyGrid>
        </Section>
      )}

      {isConnectorNode && (
        <Section title="Conector" open={connectorOpen} onToggle={() => setConnectorOpen((o) => !o)}>
          <ConnectorFields
            key={node.id}
            nodeType={node.type as NodeType}
            connectorConfig={data.connectorConfig}
            availableVariables={availableVariablesAt(node.id, allNodes, allEdges)}
            journeyId={journeyId}
            nodeId={node.id}
            onUpdate={onUpdate}
          />
        </Section>
      )}

      {node.type === 'gateway' && (
        <Section title="Decisão" open={decisionOpen} onToggle={() => setDecisionOpen((o) => !o)}>
          <GatewayFields
            key={node.id}
            nodeId={node.id}
            allNodes={allNodes}
            allEdges={allEdges}
            availableRules={availableVariableRulesAt(node.id, allNodes, allEdges)}
            onUpdateEdge={onUpdateEdge}
          />
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

// REQ-03.11.003: {{variavel}} OP valor. Which operators make sense, and how the value is entered,
// depends on the chosen variable's declared type (REQ-03.09.010's OutputMappingRule.type) — string
// only makes sense compared for (in)equality, number/boolean get their own value widget.
const EQUALITY_OPERATORS = [
  { value: '==', label: 'Igual' },
  { value: '!=', label: 'Diferente' },
];
const ORDERED_OPERATORS = [
  { value: '==', label: 'Igual' },
  { value: '!=', label: 'Diferente' },
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
];
const OPERATORS_BY_TYPE: Record<VariableType, { value: string; label: string }[]> = {
  string: EQUALITY_OPERATORS,
  boolean: EQUALITY_OPERATORS,
  // Date/date-time are compared chronologically (ISO 8601 strings sort lexicographically the same
  // way they sort in time), same operator set as numbers.
  number: ORDERED_OPERATORS,
  date: ORDERED_OPERATORS,
  datetime: ORDERED_OPERATORS,
};
// Only string/date/datetime need quoting — number/boolean literals stay bare in the JUEL expression.
const QUOTED_TYPES = new Set<VariableType>(['string', 'date', 'datetime']);
// Boolean gets its own <select> (see render), so it isn't listed here.
const VALUE_INPUT_TYPE: Partial<Record<VariableType, string>> = { number: 'number', date: 'date', datetime: 'datetime-local' };
const CONDITION_PATTERN = /^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}\s*(==|!=|>|<)\s*(.*)$/;

function parseCondition(condition: string | undefined): { variable: string; operator: string; value: string } {
  const match = condition?.match(CONDITION_PATTERN);
  if (!match) return { variable: '', operator: '==', value: '' };
  let value = match[3].trim();
  if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
  return { variable: match[1], operator: match[2], value };
}

function composeCondition(variable: string, operator: string, value: string, type: VariableType): string {
  if (!variable) return '';
  const literal = QUOTED_TYPES.has(type) ? `'${value.replace(/'/g, "\\'")}'` : value.trim() || (type === 'boolean' ? 'false' : '0');
  return `{{${variable}}} ${operator} ${literal}`;
}

// REQ-03.11.001-005: a gateway's outgoing edges (found by source id, not a separate model) each
// get a row — a variable/operator/value picker for the non-default path, a checkbox for the
// default one. Checking "padrão" on one edge clears it on the other, since exactly one default is
// required (REQ-03.11.002). The picker composes the condition string; parseCondition decomposes an
// existing one back into its three parts when the panel re-renders.
function GatewayFields({
  nodeId,
  allNodes,
  allEdges,
  availableRules,
  onUpdateEdge,
}: {
  nodeId: string;
  allNodes: WFNode[];
  allEdges: WFEdge[];
  availableRules: OutputMappingRule[];
  onUpdateEdge: (edgeId: string, patch: Partial<WFEdgeData>) => void;
}) {
  const { c } = useFlowTheme();
  const outgoing = allEdges.filter((e) => e.source === nodeId);
  const typeByVariable = new Map(availableRules.map((r) => [r.name, r.type ?? 'string']));

  function toggleDefault(edge: WFEdge, checked: boolean) {
    onUpdateEdge(edge.id, { isDefault: checked, condition: checked ? undefined : edge.data?.condition });
    if (checked) {
      outgoing.filter((e) => e.id !== edge.id).forEach((e) => onUpdateEdge(e.id, { isDefault: false }));
    }
  }

  return (
    <div>
      {outgoing.length === 0 ? (
        <div style={{ fontSize: 12, color: c.textSecondary }}>Conecte este nó a duas tarefas para configurar os caminhos A e B.</div>
      ) : (
        <PropertyGrid>
          {outgoing.map((edge, i) => {
            const target = allNodes.find((n) => n.id === edge.target);
            const isDefault = !!edge.data?.isDefault;
            const parsed = parseCondition(edge.data?.condition);
            const variableNames = availableRules.map((r) => r.name);
            const variableOptions = parsed.variable && !variableNames.includes(parsed.variable)
              ? [parsed.variable, ...variableNames]
              : variableNames;
            const type: VariableType = typeByVariable.get(parsed.variable) ?? 'string';
            const operators = OPERATORS_BY_TYPE[type];

            function updateCondition(patch: Partial<typeof parsed>) {
              const next = { ...parsed, ...patch };
              const nextType: VariableType = typeByVariable.get(next.variable) ?? 'string';
              // Switching to a variable of a different type may leave a now-unsupported operator
              // selected (e.g. "maior que" on a string) — fall back to the type's first operator.
              if (!OPERATORS_BY_TYPE[nextType].some((op) => op.value === next.operator)) {
                next.operator = OPERATORS_BY_TYPE[nextType][0].value;
              }
              onUpdateEdge(edge.id, { condition: composeCondition(next.variable, next.operator, next.value, nextType) });
            }

            return (
              <PropertyRow key={edge.id} label={`Saída ${i === 0 ? 'A' : 'B'}`} first={i === 0}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, width: '100%', padding: '4px 0' }}>
                  <div style={{ fontSize: 11.5, color: c.textSecondary }}>→ {target?.data.name ?? edge.target}</div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11.5, color: c.textSecondary, cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDefault} onChange={(e) => toggleDefault(edge, e.target.checked)} />
                    Saída padrão (sem condição)
                  </label>
                  {!isDefault && (
                    <div style={{ display: 'flex', gap: 4 }}>
                      <select
                        style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1.4 }}
                        value={parsed.variable}
                        onChange={(e) => updateCondition({ variable: e.target.value })}
                      >
                        <option value="">Variável...</option>
                        {variableOptions.map((v) => (
                          <option key={v} value={v}>
                            {v}
                          </option>
                        ))}
                      </select>
                      <select
                        style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }}
                        value={parsed.operator}
                        onChange={(e) => updateCondition({ operator: e.target.value })}
                      >
                        {operators.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      {type === 'boolean' ? (
                        <select
                          style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }}
                          value={parsed.value || 'true'}
                          onChange={(e) => updateCondition({ value: e.target.value })}
                        >
                          <option value="true">Verdadeiro</option>
                          <option value="false">Falso</option>
                        </select>
                      ) : (
                        <input
                          style={{ ...gridInputStyle(c), flex: 1 }}
                          type={VALUE_INPUT_TYPE[type] ?? 'text'}
                          placeholder="valor"
                          value={parsed.value}
                          onChange={(e) => updateCondition({ value: e.target.value })}
                        />
                      )}
                    </div>
                  )}
                </div>
              </PropertyRow>
            );
          })}
        </PropertyGrid>
      )}
    </div>
  );
}

const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
// Methods whose semantics include a request body — GET/DELETE requests are query-driven, so the
// Body editor stays hidden for them instead of inviting a field that has no effect on the call.
const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
// outputMapping (REQ-03.09.010) gets a dedicated editor, same reasoning as headers.
const OUTPUT_MAPPING_FIELD = 'outputMapping';

function ConnectorFields({
  nodeType,
  connectorConfig,
  availableVariables,
  journeyId,
  nodeId,
  onUpdate,
}: {
  nodeType: NodeType;
  connectorConfig: ConnectorConfig | null;
  availableVariables: string[];
  journeyId: string;
  nodeId: string;
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

  function updateConfigJsonField(key: string, value: unknown) {
    update({ config: { ...(connectorConfig?.config ?? {}), [key]: value } });
  }

  const method = (connectorConfig?.config?.method as string) ?? '';
  const showBody = METHODS_WITH_BODY.has(method);

  const outputMappingRules = (connectorConfig?.config?.[OUTPUT_MAPPING_FIELD] as OutputMappingRule[]) ?? [];
  // Last "Testar API" response, kept around so the Mapeamento de saída dialog can show it as a
  // reference alongside the rules — the whole reason to test is to see the shape to map from.
  const [lastTestResponse, setLastTestResponse] = useState<ConnectorTestResponse | null>(null);

  return (
    <div>
      <PropertyGrid>
        <PropertyGroupHeader label="Geral" first />
        <PropertyRow label="Tipo">
          <select
            style={{ ...gridInputStyle(c), cursor: 'pointer' }}
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
        </PropertyRow>

        {connectorConfig && (
          <>
            <PropertyRow label="Credencial">
              <input
                style={gridInputStyle(c)}
                value={connectorConfig.credentialRef ?? ''}
                onChange={(e) => update({ credentialRef: e.target.value || null })}
                placeholder="ex.: credential-runtime-01 (opcional)"
              />
            </PropertyRow>

            <PropertyGroupHeader label="Conexão" />
            {connectorConfig.connectorType === 'REST' ? (
              <>
                <PropertyRow label="Método">
                  <select
                    style={{ ...gridInputStyle(c), cursor: 'pointer' }}
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
                </PropertyRow>
                <PropertyRow label="URL">
                  <input
                    style={gridInputStyle(c)}
                    value={(connectorConfig.config?.url as string) ?? ''}
                    onChange={(e) => updateConfigField('url', e.target.value)}
                    placeholder="https://..."
                  />
                </PropertyRow>
              </>
            ) : (
              <>
                <PropertyRow label="Tópico">
                  <input
                    style={gridInputStyle(c)}
                    value={(connectorConfig.config?.topic as string) ?? ''}
                    onChange={(e) => updateConfigField('topic', e.target.value)}
                  />
                </PropertyRow>
                <PropertyRow label="Operação">
                  <div style={{ color: c.textSecondary, fontSize: 12 }} title="Definida automaticamente pelo tipo de nó">
                    {kafkaOperation}
                  </div>
                </PropertyRow>
              </>
            )}

            <PropertyGroupHeader label="Dados" />
            <ComplexPropertyRow
              label="Headers"
              summary={headersSummary(connectorConfig.config?.headers as Record<string, string>)}
              dialogTitle="Headers"
            >
              <HeadersEditor
                headers={(connectorConfig.config?.headers as Record<string, string>) ?? {}}
                onChange={(headers) => update({ config: { ...(connectorConfig.config ?? {}), headers } })}
              />
            </ComplexPropertyRow>

            {connectorConfig.connectorType === 'REST' && (
              <ComplexPropertyRow label="Params" summary={jsonFieldSummary(connectorConfig.config?.params)} dialogTitle="Parâmetros de URL (query params)">
                <JsonFieldEditor value={connectorConfig.config?.params} onChange={(v) => updateConfigJsonField('params', v)} />
              </ComplexPropertyRow>
            )}
            {connectorConfig.connectorType === 'REST' && showBody && (
              <ComplexPropertyRow label="Body" summary={jsonFieldSummary(connectorConfig.config?.body)} dialogTitle="Body">
                <JsonFieldEditor value={connectorConfig.config?.body} onChange={(v) => updateConfigJsonField('body', v)} />
              </ComplexPropertyRow>
            )}
            {connectorConfig.connectorType === 'KAFKA' && (
              <ComplexPropertyRow label="Payload" summary={jsonFieldSummary(connectorConfig.config?.payload)} dialogTitle="Payload">
                <JsonFieldEditor value={connectorConfig.config?.payload} onChange={(v) => updateConfigJsonField('payload', v)} />
              </ComplexPropertyRow>
            )}

            <PropertyGroupHeader label="Mapeamento" />
            <ComplexPropertyRow
              label="Entrada"
              summary={jsonFieldSummary(connectorConfig.config?.inputMapping)}
              dialogTitle="Mapeamento de entrada"
            >
              <JsonFieldEditor value={connectorConfig.config?.inputMapping} onChange={(v) => updateConfigJsonField('inputMapping', v)} />
            </ComplexPropertyRow>
            <ComplexPropertyRow label="Saída" summary={outputMappingSummary(outputMappingRules)} dialogTitle="Mapeamento de saída (variável ← JSONPath)">
              <OutputMappingEditor
                rules={outputMappingRules}
                onChange={(rules) => update({ config: { ...(connectorConfig.config ?? {}), [OUTPUT_MAPPING_FIELD]: rules } })}
                sourceResponse={lastTestResponse}
              />
            </ComplexPropertyRow>

            {(availableVariables.length > 0 || connectorConfig.connectorType === 'REST') && <PropertyGroupHeader label="Teste" />}
            {availableVariables.length > 0 && (
              <PropertyRow label="Variáveis">
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }} title={`Use {{nome}} nos campos acima`}>
                  {availableVariables.map((v) => (
                    <span
                      key={v}
                      style={{
                        fontSize: 11,
                        fontFamily: 'monospace',
                        padding: '1px 6px',
                        borderRadius: 999,
                        border: `1px solid ${c.border}`,
                        color: c.textSecondary,
                      }}
                    >
                      {`{{${v}}}`}
                    </span>
                  ))}
                </div>
              </PropertyRow>
            )}

            {connectorConfig.connectorType === 'REST' && (
              <PropertyRow label="Testar">
                <TestConnectorButton
                  journeyId={journeyId}
                  nodeId={nodeId}
                  connectorConfig={connectorConfig}
                  onResult={setLastTestResponse}
                  onAddOutputMappingRules={(newRules) => {
                    const rules = (connectorConfig.config?.[OUTPUT_MAPPING_FIELD] as OutputMappingRule[]) ?? [];
                    const existingNames = new Set(rules.map((r) => r.name));
                    const merged = [...rules, ...newRules.filter((r) => !existingNames.has(r.name))];
                    update({ config: { ...(connectorConfig.config ?? {}), [OUTPUT_MAPPING_FIELD]: merged } });
                  }}
                />
              </PropertyRow>
            )}
          </>
        )}
      </PropertyGrid>
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
    <div style={{ width: '100%' }}>
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

function OutputMappingEditor({
  rules,
  onChange,
  sourceResponse,
}: {
  rules: OutputMappingRule[];
  onChange: (rules: OutputMappingRule[]) => void;
  sourceResponse?: ConnectorTestResponse | null;
}) {
  const { c } = useFlowTheme();

  function commit(next: OutputMappingRule[]) {
    onChange(next);
  }

  return (
    <div style={{ width: '100%' }}>
      {rules.length > 0 && (
        <PropertyGrid>
          {rules.map((rule, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns: '88px 1fr', minHeight: 26, borderTop: i === 0 ? 'none' : `1px solid ${c.border}` }}
            >
              <div style={{ padding: '2px 4px', background: c.canvasBg, display: 'flex', alignItems: 'center' }}>
                <input
                  style={{ ...gridInputStyle(c), border: 'none', background: 'transparent', padding: '0 4px', fontWeight: 600 }}
                  placeholder="nome"
                  value={rule.name}
                  onChange={(e) => commit(rules.map((r, ri) => (ri === i ? { ...r, name: e.target.value } : r)))}
                />
              </div>
              <div style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
                <input
                  style={{ ...gridInputStyle(c), fontFamily: 'monospace', flex: 1 }}
                  placeholder="$.campo"
                  value={rule.jsonPath}
                  onChange={(e) => commit(rules.map((r, ri) => (ri === i ? { ...r, jsonPath: e.target.value } : r)))}
                />
                <select
                  style={{ ...gridInputStyle(c), cursor: 'pointer', flex: '0 0 78px' }}
                  title="Tipo da variável"
                  value={rule.type ?? 'string'}
                  onChange={(e) => commit(rules.map((r, ri) => (ri === i ? { ...r, type: e.target.value as VariableType } : r)))}
                >
                  <option value="string">Texto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Booleano</option>
                  <option value="date">Data</option>
                  <option value="datetime">Data e hora</option>
                </select>
                <button
                  onClick={() => commit(rules.filter((_, ri) => ri !== i))}
                  title="Remover regra"
                  style={{
                    flex: '0 0 auto',
                    width: 24,
                    height: 24,
                    border: `1px solid ${c.border}`,
                    borderRadius: 4,
                    background: c.cardBg,
                    color: c.textSecondary,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <X size={12} />
                </button>
              </div>
            </div>
          ))}
        </PropertyGrid>
      )}
      <button
        onClick={() => commit([...rules, { name: '', jsonPath: '', type: 'string' }])}
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
        <Plus size={14} /> Adicionar variável de saída
      </button>

      <div style={{ marginTop: 12 }}>
        <div style={labelStyle(c)}>Origem (resposta da API)</div>
        {sourceResponse ? (
          <pre
            style={{
              fontSize: 11.5,
              fontFamily: 'monospace',
              background: c.canvasBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              padding: 10,
              margin: 0,
              maxHeight: 260,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            {formatBody(sourceResponse.body)}
          </pre>
        ) : (
          <div style={{ fontSize: 12, color: c.textSecondary }}>
            Execute "Testar API" para ver aqui a resposta de referência e localizar os caminhos JSONPath.
          </div>
        )}
      </div>
    </div>
  );
}

// REQ-03.10.005: {{name}} references in the current config get an input for a sample value here,
// so the call can be resolved and tested without a real journey execution.
const VARIABLE_TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

function tokensIn(config: Record<string, unknown> | null | undefined): string[] {
  const found = new Set<string>();
  const text = JSON.stringify(config ?? {});
  for (const match of text.matchAll(VARIABLE_TOKEN)) found.add(match[1]);
  return [...found];
}

function TestConnectorButton({
  journeyId,
  nodeId,
  connectorConfig,
  onAddOutputMappingRules,
  onResult,
}: {
  journeyId: string;
  nodeId: string;
  connectorConfig: ConnectorConfig;
  onAddOutputMappingRules: (rules: OutputMappingRule[]) => void;
  onResult: (response: ConnectorTestResponse) => void;
}) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ConnectorTestResponse | null>(null);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  const [newRule, setNewRule] = useState<OutputMappingRule>({ name: '', jsonPath: '', type: 'string' });
  const tokens = tokensIn(connectorConfig.config);

  async function runTest() {
    setLoading(true);
    setError(null);
    setResult(null);
    setGeneratedCount(null);
    try {
      const config = connectorConfig.config ?? {};
      const response = await testConnector(journeyId, nodeId, {
        method: (config.method as string) ?? 'GET',
        url: (config.url as string) ?? '',
        headers: (config.headers as Record<string, string>) ?? {},
        body: (config.body as Record<string, unknown>) ?? null,
        sampleVariables,
      });
      setResult(response);
      onResult(response);
      // REQ-03.10.001: the test's whole purpose is to see the real response shape, so wire it
      // into the output mapping immediately instead of leaving the user to type each rule by hand.
      try {
        const rules = flattenJsonToOutputMappingRules(JSON.parse(response.body));
        if (rules.length > 0) {
          onAddOutputMappingRules(rules);
          setGeneratedCount(rules.length);
        }
      } catch {
        // Non-JSON response (e.g. plain text) — nothing to flatten, mapping stays manual.
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao testar o conector');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={() => setOpen(true)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '3px 10px',
          height: 24,
          borderRadius: 4,
          border: `1px solid ${c.border}`,
          background: c.cardBg,
          color: c.textPrimary,
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Play size={12} /> Testar API
      </button>

      {open && (
        <Modal title="Testar API" onClose={() => setOpen(false)} width={480}>
            {tokens.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={labelStyle(c)}>Valores de exemplo para as variáveis usadas</div>
                {tokens.map((t) => (
                  <div key={t} style={{ marginBottom: 6 }}>
                    <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: c.textSecondary, marginBottom: 2 }}>{`{{${t}}}`}</div>
                    <input
                      style={inputStyle(c)}
                      value={sampleVariables[t] ?? ''}
                      onChange={(e) => setSampleVariables((prev) => ({ ...prev, [t]: e.target.value }))}
                    />
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={runTest}
              disabled={loading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '9px 14px',
                borderRadius: 8,
                border: 'none',
                background: c.accent,
                color: '#fff',
                fontSize: 13.5,
                fontWeight: 700,
                cursor: loading ? 'default' : 'pointer',
                marginBottom: 12,
              }}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
              {loading ? 'Chamando...' : 'Executar teste'}
            </button>

            {error && <div style={{ fontSize: 12.5, color: c.danger, marginBottom: 12 }}>{error}</div>}

            {result && (
              <div>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: c.textPrimary, marginBottom: 6 }}>
                  Status: {result.status}
                </div>
                {generatedCount !== null && (
                  <div style={{ fontSize: 12, color: c.accent, marginBottom: 8 }}>
                    {generatedCount} variável{generatedCount > 1 ? 'is' : ''} de saída gerada{generatedCount > 1 ? 's' : ''} automaticamente a partir
                    da resposta.
                  </div>
                )}
                <pre
                  style={{
                    fontSize: 11.5,
                    fontFamily: 'monospace',
                    background: c.canvasBg,
                    border: `1px solid ${c.border}`,
                    borderRadius: 8,
                    padding: 10,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {formatBody(result.body)}
                </pre>

                <div style={{ marginTop: 12 }}>
                  <div style={labelStyle(c)}>Adicionar variável manualmente (além das geradas automaticamente)</div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      style={inputStyle(c)}
                      placeholder="nome da variável"
                      value={newRule.name}
                      onChange={(e) => setNewRule((r) => ({ ...r, name: e.target.value }))}
                    />
                    <input
                      style={{ ...inputStyle(c), fontFamily: 'monospace' }}
                      placeholder="$.campo"
                      value={newRule.jsonPath}
                      onChange={(e) => setNewRule((r) => ({ ...r, jsonPath: e.target.value }))}
                    />
                    <select
                      style={{ ...inputStyle(c), cursor: 'pointer', flex: '0 0 100px' }}
                      title="Tipo da variável"
                      value={newRule.type ?? 'string'}
                      onChange={(e) => setNewRule((r) => ({ ...r, type: e.target.value as VariableType }))}
                    >
                      <option value="string">Texto</option>
                      <option value="number">Número</option>
                      <option value="boolean">Booleano</option>
                    </select>
                    <button
                      onClick={() => {
                        if (!newRule.name.trim() || !newRule.jsonPath.trim()) return;
                        onAddOutputMappingRules([newRule]);
                        setNewRule({ name: '', jsonPath: '', type: 'string' });
                      }}
                      title="Adicionar ao mapeamento de saída"
                      style={{
                        flex: '0 0 auto',
                        width: 34,
                        border: `1px solid ${c.border}`,
                        borderRadius: 8,
                        background: c.cardBg,
                        color: c.accent,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>
              </div>
            )}
        </Modal>
      )}
    </div>
  );
}

function formatBody(body: string): string {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
}

// One JSON box per declarative field (params/body/payload/inputMapping) instead of a single
// combined blob — lets REST hide Body for methods that don't send one (GET/DELETE); each field
// gets its own PropertyRow label, while still storing as free-form JSON in the extensible config
// map (REQ-03.08.005) since none of these have a defined schema yet.
function JsonFieldEditor({ value, onChange }: { value: unknown; onChange: (value: unknown) => void }) {
  const { c } = useFlowTheme();
  const [text, setText] = useState(() => JSON.stringify(value ?? {}, null, 2));
  const [error, setError] = useState<string | null>(null);

  return (
    <div style={{ width: '100%' }}>
      <textarea
        style={{
          ...inputStyle(c),
          minHeight: 90,
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
