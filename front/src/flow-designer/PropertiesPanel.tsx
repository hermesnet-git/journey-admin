import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, Play, Loader2, Braces, Copy, Check } from 'lucide-react';
import { IconButton, skinVars, type IconProps } from '@telefonica/mistica';
import { useFlowTheme, type FlowColors } from './theme';
import {
  NODE_META,
  CONNECTOR_TYPES_BY_NODE,
  BROKER_OPERATION_BY_NODE,
  MESSAGE_BROKER_TYPES,
  connectorMissingFields,
  availableVariableRulesAt,
  availableVariableOriginsAt,
  flattenJsonToOutputMappingRules,
  type ConnectorConfig,
  type ConnectorType,
  type NodeType,
  type OutputMappingRule,
  type StartVariable,
  type VariableOrigin,
  type VariableType,
  type WFNode,
  type WFEdge,
  type WFEdgeData,
  type WFNodeData,
} from './model';
import { Section } from './PropertiesSection';
import { ConnectorWizard } from './ConnectorWizard';
import { testConnector, type ConnectorTestResponse } from '../api/flows';
import { type MessagingCluster, type CredentialReference } from '../api/messaging';
import { PropertyGrid, PropertyRow, PropertyGroupHeader, gridInputStyle } from './PropertyGrid';
import { OPERATORS_BY_TYPE, VALUE_INPUT_TYPE, parseCondition, composeCondition } from '../shared/condition';

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

// Inserts `token` at the caret position of the given input (falls back to appending at the end
// when there's no live selection, e.g. the field was never focused) — native selectionStart/End +
// setSelectionRange, no extra dependency needed for this.
export function insertTokenAtCursor(
  inputEl: HTMLInputElement | HTMLTextAreaElement | null,
  currentValue: string,
  token: string,
  onChange: (next: string) => void,
) {
  if (!inputEl) {
    onChange(currentValue + token);
    return;
  }
  const start = inputEl.selectionStart ?? currentValue.length;
  const end = inputEl.selectionEnd ?? start;
  const next = currentValue.slice(0, start) + token + currentValue.slice(end);
  onChange(next);
  requestAnimationFrame(() => {
    inputEl.focus();
    const pos = start + token.length;
    inputEl.setSelectionRange(pos, pos);
  });
}

function groupByOrigin(variables: VariableOrigin[]): [string, VariableOrigin[]][] {
  const map = new Map<string, VariableOrigin[]>();
  variables.forEach((v) => {
    const list = map.get(v.sourceLabel) ?? [];
    list.push(v);
    map.set(v.sourceLabel, list);
  });
  return [...map.entries()];
}

// Mesma matemática com consciência de flip do computeDropdownRect de SearchSelect.tsx, mas ancorada
// pela borda DIREITA do gatilho em vez da esquerda — esse botão fica na ponta direita de uma linha de campo,
// então crescer o popover a partir da borda direita (pra esquerda) evita que ele ultrapasse a borda
// direita do painel, o que ancorar pela esquerda faria.
function computeRightAnchoredRect(trigger: HTMLElement): { right: number; width: number; maxHeight: number; top?: number; bottom?: number } {
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - margin;
  const spaceAbove = r.top - margin;
  const placeBelow = spaceBelow >= spaceAbove;
  const maxHeight = Math.min(260, Math.max(0, placeBelow ? spaceBelow : spaceAbove));
  const right = window.innerWidth - r.right;
  return placeBelow
    ? { right, width: 220, maxHeight, top: r.bottom + gap }
    : { right, width: 220, maxHeight, bottom: window.innerHeight - r.top + gap };
}

// Small "🔗" button placed next to any free-text field that may reference a variable (URL, header
// value, body/params row value) — opens a popover of variables in scope, grouped by origin
// (availableVariableOriginsAt), and inserts `{{nome}}` at the field's caret on selection. Reused
// identically everywhere instead of one global "click a chip, insert wherever was last focused"
// mechanism, which would need fragile cross-component focus tracking.
//
// Virou portal pro document.body pelo mesmo motivo do dropdown de SearchSelect.tsx: o container
// rolável do PropertiesDock recorta qualquer coisa que não caiba no painel de ~300px de largura —
// exatamente o que uma lista de variáveis, um item por nó ancestral, pode ultrapassar.
export function VariablePickerButton({ variables, onInsert }: { variables: VariableOrigin[]; onInsert: (token: string) => void }) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ right: number; width: number; maxHeight: number; top?: number; bottom?: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  function toggle() {
    if (!open && buttonRef.current) setRect(computeRightAnchoredRect(buttonRef.current));
    setOpen((o) => !o);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function reposition() {
      if (buttonRef.current) setRect(computeRightAnchoredRect(buttonRef.current));
    }
    // Fase de captura — o canvas do React Flow interrompe a propagação do mousedown pro próprio
    // pan/drag, então um clique no canvas nunca chegaria a um listener na fase de bolha aqui.
    window.addEventListener('mousedown', handleClick, true);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('mousedown', handleClick, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const groups = groupByOrigin(variables);

  return (
    <div ref={containerRef} style={{ position: 'relative', flex: '0 0 auto' }}>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        title={variables.length === 0 ? 'Nenhuma variável disponível ainda' : 'Inserir variável'}
        disabled={variables.length === 0}
        style={{
          width: 24,
          height: 24,
          border: `1px solid ${c.accent}`,
          borderRadius: 4,
          background: c.accentSoft,
          color: c.accent,
          cursor: variables.length === 0 ? 'default' : 'pointer',
          opacity: variables.length === 0 ? 0.5 : 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Braces size={12} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              right: rect.right,
              width: rect.width,
              maxHeight: rect.maxHeight,
              ...(rect.top !== undefined ? { top: rect.top } : { bottom: rect.bottom }),
              zIndex: 2000,
              overflowY: 'auto',
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              boxShadow: '0 12px 32px -10px rgba(0,0,0,.25)',
              padding: 6,
            }}
          >
            {groups.map(([label, vars]) => (
              <div key={label} style={{ marginBottom: 6 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: c.textSecondary, padding: '2px 6px' }}>{label}</div>
                {vars.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    onClick={() => {
                      onInsert(`{{${v.name}}}`);
                      setOpen(false);
                    }}
                    style={{
                      display: 'block',
                      width: '100%',
                      textAlign: 'left',
                      padding: '4px 6px',
                      border: 'none',
                      background: 'transparent',
                      color: c.textPrimary,
                      fontSize: 12.5,
                      fontFamily: 'monospace',
                      cursor: 'pointer',
                      borderRadius: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = c.canvasBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {v.name}
                  </button>
                ))}
              </div>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Read-only reference for "what's in scope here and where does it come from" — grouped by origin
// (VariableOrigin.sourceLabel), click a chip to copy `{{nome}}`. Insertion into a specific field
// is a separate concern, handled by VariablePickerButton next to that field.
function VariableOriginsPanel({ variables }: { variables: VariableOrigin[] }) {
  const { c } = useFlowTheme();
  const [copied, setCopied] = useState<string | null>(null);

  function copy(name: string) {
    navigator.clipboard.writeText(`{{${name}}}`);
    setCopied(name);
    setTimeout(() => setCopied((cur) => (cur === name ? null : cur)), 1500);
  }

  if (variables.length === 0) {
    return (
      <div style={{ fontSize: 12.5, color: c.textSecondary, padding: '2px 0' }}>
        Nenhuma variável disponível ainda neste ponto do fluxo.
      </div>
    );
  }

  return (
    <div>
      {groupByOrigin(variables).map(([label, vars]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: c.textSecondary, marginBottom: 4 }}>{label}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {vars.map((v) => (
              <button
                key={v.name}
                type="button"
                onClick={() => copy(v.name)}
                title="Clique para copiar {{nome}}"
                style={{
                  fontSize: 11,
                  fontFamily: 'monospace',
                  padding: '2px 8px',
                  borderRadius: 999,
                  border: `1px solid ${c.border}`,
                  background: c.cardBg,
                  color: c.textSecondary,
                  cursor: 'pointer',
                }}
              >
                {copied === v.name ? 'copiado!' : `{{${v.name}}}`}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}


// Content only — PropertiesDock owns the panel chrome (width, collapse,
// resize, header).
export function PropertiesPanel({
  node,
  clusters,
  credentials,
  allNodes,
  allEdges,
  journeyId,
  onUpdate,
  onUpdateEdge,
  onDelete,
  freshNodeId,
  onFreshNodeConsumed,
  generalOpen,
  setGeneralOpen,
  startVariablesOpen,
  setStartVariablesOpen,
  variablesOpen,
  setVariablesOpen,
  connectorOpen,
  setConnectorOpen,
  decisionOpen,
  setDecisionOpen,
}: {
  node: WFNode;
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
  allNodes: WFNode[];
  allEdges: WFEdge[];
  journeyId: string;
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<WFEdgeData>) => void;
  onDelete: () => void;
  // Nó recém-criado — na primeira vez que este painel mostra ele, só "Informações Gerais" nasce
  // aberta (o resto ainda não tem nada configurado). Consumido uma vez via onFreshNodeConsumed pra
  // não recolapsar se o usuário voltar a este nó mais tarde, já com algo configurado.
  freshNodeId: string | null;
  onFreshNodeConsumed: () => void;
  // Estado de aberto/fechado de cada seção — vive em PropertiesDock (nunca desmonta ao trocar de
  // nó ou ir pro painel da jornada) em vez de local aqui: local resetaria tudo pra aberto sempre
  // que o usuário clicasse no fundo do canvas (troca pra JourneyPropertiesPanel, desmontando este
  // componente) e voltasse a selecionar um nó.
  generalOpen: boolean;
  setGeneralOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  startVariablesOpen: boolean;
  setStartVariablesOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  variablesOpen: boolean;
  setVariablesOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  connectorOpen: boolean;
  setConnectorOpen: (v: boolean | ((o: boolean) => boolean)) => void;
  decisionOpen: boolean;
  setDecisionOpen: (v: boolean | ((o: boolean) => boolean)) => void;
}) {
  const { c } = useFlowTheme();

  useEffect(() => {
    if (node.id !== freshNodeId) return;
    setGeneralOpen(true);
    setStartVariablesOpen(false);
    setVariablesOpen(false);
    setConnectorOpen(false);
    setDecisionOpen(false);
    onFreshNodeConsumed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [node.id, freshNodeId]);

  const data = node.data;
  const isConnectorNode = !!node.type && CONNECTOR_NODE_TYPES.has(node.type);
  // Computed once, shared by the "Variáveis" reference panel below e ConnectorFields (URL/
  // headers/body pickers) — same data, two presentations.
  const connectorVariableOrigins = isConnectorNode ? availableVariableOriginsAt(node.id, allNodes, allEdges) : [];

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

      {node.type === 'start' && (
        <Section title="Variáveis de Entrada" open={startVariablesOpen} onToggle={() => setStartVariablesOpen((o) => !o)}>
          <StartVariablesEditor
            variables={data.startVariables ?? []}
            onChange={(startVariables) => onUpdate({ startVariables })}
          />
        </Section>
      )}

      {isConnectorNode && (
        <Section title="Variáveis" open={variablesOpen} onToggle={() => setVariablesOpen((o) => !o)}>
          <VariableOriginsPanel variables={connectorVariableOrigins} />
        </Section>
      )}

      {isConnectorNode && (
        <Section title="Conector" open={connectorOpen} onToggle={() => setConnectorOpen((o) => !o)}>
          <ConnectorFields
            key={node.id}
            nodeType={node.type as NodeType}
            connectorConfig={data.connectorConfig}
            availableVariables={connectorVariableOrigins}
            clusters={clusters}
            credentials={credentials}
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
            variableOrigins={availableVariableOriginsAt(node.id, allNodes, allEdges)}
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
// Extraído pra shared/condition.ts — a Exibição condicional do form builder reaproveita a mesma
// sintaxe/lógica.

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
  variableOrigins,
  onUpdateEdge,
}: {
  nodeId: string;
  allNodes: WFNode[];
  allEdges: WFEdge[];
  availableRules: OutputMappingRule[];
  variableOrigins: VariableOrigin[];
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
              onUpdateEdge(edge.id, {
                condition: composeCondition(next.variable, next.operator, next.value, nextType, next.valueIsVariable),
              });
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
                      {type === 'boolean' && !parsed.valueIsVariable ? (
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
                          type={parsed.valueIsVariable ? 'text' : (VALUE_INPUT_TYPE[type] ?? 'text')}
                          placeholder="valor"
                          readOnly={parsed.valueIsVariable}
                          value={parsed.valueIsVariable ? `{{${parsed.value}}}` : parsed.value}
                          onChange={(e) => updateCondition({ value: e.target.value, valueIsVariable: false })}
                        />
                      )}
                      <VariablePickerButton
                        variables={variableOrigins}
                        onInsert={(token) => updateCondition({ value: token.replace(/^\{\{\s*|\s*\}\}$/g, ''), valueIsVariable: true })}
                      />
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

export const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
// Methods whose semantics include a request body — GET/DELETE requests are query-driven, so the
// Body editor stays hidden for them instead of inviting a field that has no effect on the call.
export const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
// outputMapping (REQ-03.09.010) gets a dedicated editor, same reasoning as headers.
export const OUTPUT_MAPPING_FIELD = 'outputMapping';

// Resumo em prosa da configuração atual — não é mais tabela propriedade/valor (isso agora vive só
// dentro do ConnectorWizard, o único lugar onde o conector é editado). Cada linha já junta os fatos
// relevantes daquele aspecto (conexão, dados enviados, mapeamento) em vez de um campo por linha.
function describeConnector(connectorConfig: ConnectorConfig, brokerOperation?: 'PRODUCE' | 'CONSUME'): string[] {
  const cfg = connectorConfig.config ?? {};
  const mappingCount = ((cfg[OUTPUT_MAPPING_FIELD] as OutputMappingRule[]) ?? []).length;
  const mappingLine =
    mappingCount > 0
      ? `${mappingCount} variável${mappingCount > 1 ? 'is' : ''} de saída mapeada${mappingCount > 1 ? 's' : ''}`
      : 'Nenhuma variável de saída mapeada';

  if (connectorConfig.connectorType === 'REST') {
    const method = (cfg.method as string) || null;
    const url = (cfg.url as string) || null;
    const headersCount = Object.keys((cfg.headers as Record<string, string>) ?? {}).length;
    const hasBody = !!cfg.body && Object.keys(cfg.body as object).length > 0;
    const details = [
      headersCount > 0 ? `${headersCount} header${headersCount > 1 ? 's' : ''}` : null,
      hasBody ? 'Body configurado' : null,
      connectorConfig.credentialRef ? `Credencial: ${connectorConfig.credentialRef}` : null,
    ].filter((v): v is string => !!v);
    return [
      method && url ? `${method} ${url}` : 'URL ainda não configurada',
      ...(details.length > 0 ? [details.join(' · ')] : []),
      mappingLine,
    ];
  }

  const topicLabel = connectorConfig.connectorType === 'EVENT_HUBS' ? 'Event Hub' : 'Tópico';
  return [
    `${connectorConfig.connectorType}${brokerOperation ? ` · ${brokerOperation}` : ''}`,
    `Cluster: ${(cfg.clusterId as string) || '—'} · ${topicLabel}: ${(cfg.topic as string) || '—'}`,
    `Credencial: ${connectorConfig.credentialRef || '—'} · ${mappingLine}`,
  ];
}

// O ConnectorWizard é o único lugar onde o conector é de fato editado — aqui só escolhe o Tipo
// (o que existe ou não) e mostra um resumo somente-leitura do que já está configurado, com um botão
// pra abrir o assistente. Antes havia também uma edição inline campo a campo em paralelo ao
// assistente; duas formas de editar a mesma coisa é que gerava confusão, não a existência do resumo.
function ConnectorFields({
  nodeType,
  connectorConfig,
  availableVariables,
  clusters,
  credentials,
  journeyId,
  nodeId,
  onUpdate,
}: {
  nodeType: NodeType;
  connectorConfig: ConnectorConfig | null;
  availableVariables: VariableOrigin[];
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
  journeyId: string;
  nodeId: string;
  onUpdate: (patch: Partial<WFNodeData>) => void;
}) {
  const { c } = useFlowTheme();
  const availableConnectors = CONNECTOR_TYPES_BY_NODE[nodeType] ?? [];
  const brokerOperation = BROKER_OPERATION_BY_NODE[nodeType];
  const [wizardOpen, setWizardOpen] = useState(false);
  const missingFields = connectorMissingFields(connectorConfig);

  function update(patch: Partial<ConnectorConfig>) {
    const current: ConnectorConfig = connectorConfig ?? { connectorType: 'REST', config: {}, credentialRef: null };
    onUpdate({ connectorConfig: { ...current, ...patch } });
  }

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
              // A operação de conector de mensageria é implícita ao papel do nó (REQ-03.09.008),
              // então já vem preenchida em vez de deixar o usuário escolher.
              const config =
                MESSAGE_BROKER_TYPES.includes(value as ConnectorType) && brokerOperation
                  ? { operation: brokerOperation }
                  : {};
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

        {connectorConfig && missingFields.length > 0 && (
          <div
            style={{
              padding: '6px 10px',
              borderTop: `1px solid ${c.border}`,
              background: c.dangerSoft,
              color: c.danger,
              fontSize: 11.5,
              fontWeight: 600,
            }}
          >
            Conector incompleto — falta: {missingFields.join(', ')}
          </div>
        )}
      </PropertyGrid>

      {connectorConfig && (
        <>
          <button
            type="button"
            onClick={() => setWizardOpen(true)}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
              padding: '8px 12px',
              borderRadius: 8,
              border: `1px solid ${c.accent}`,
              background: c.accentSoft,
              color: c.accent,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: 'pointer',
              marginBottom: 10,
            }}
          >
            ⚙ Configurar conector
          </button>

          <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.canvasBg }}>
            {describeConnector(connectorConfig, brokerOperation).map((line, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12.5,
                  color: i === 0 ? c.textPrimary : c.textSecondary,
                  fontWeight: i === 0 ? 600 : 400,
                  fontFamily: i === 0 && connectorConfig.connectorType === 'REST' ? 'monospace' : undefined,
                  marginBottom: 3,
                  wordBreak: 'break-word',
                }}
              >
                {line}
              </div>
            ))}
          </div>

          {wizardOpen && (
            <ConnectorWizard
              connectorConfig={connectorConfig}
              variables={availableVariables}
              clusters={clusters}
              credentials={credentials}
              journeyId={journeyId}
              nodeId={nodeId}
              onConfigUpdate={update}
              onClose={() => setWizardOpen(false)}
            />
          )}
        </>
      )}
    </div>
  );
}

export function HeadersEditor({
  headers,
  onChange,
  variables,
}: {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
  variables: VariableOrigin[];
}) {
  const { c } = useFlowTheme();
  const [rows, setRows] = useState<[string, string][]>(() => Object.entries(headers));
  const valueRefs = useRef<(HTMLInputElement | null)[]>([]);

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
            ref={(el) => {
              valueRefs.current[i] = el;
            }}
            style={inputStyle(c)}
            placeholder="Valor"
            value={value}
            onChange={(e) => commit(rows.map((row, ri) => (ri === i ? [row[0], e.target.value] : row)))}
          />
          <VariablePickerButton
            variables={variables}
            onInsert={(token) =>
              insertTokenAtCursor(valueRefs.current[i] ?? null, value, token, (next) =>
                commit(rows.map((row, ri) => (ri === i ? [row[0], next] : row))),
              )
            }
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

// REQ-03.12.001: {name, type} declarations on the START node — same list-of-rules shape as
// OutputMappingEditor below, minus the jsonPath column (the value arrives direct, isn't extracted).
function StartVariablesEditor({
  variables,
  onChange,
}: {
  variables: StartVariable[];
  onChange: (variables: StartVariable[]) => void;
}) {
  const { c } = useFlowTheme();

  function commit(next: StartVariable[]) {
    onChange(next);
  }

  return (
    <div style={{ width: '100%' }}>
      <div style={{ fontSize: 12, color: c.textSecondary, marginBottom: 10 }}>
        Todas as variáveis abaixo são obrigatórias: a aplicação cliente (canal digital/BFF) precisa
        informar um valor para cada uma ao iniciar uma instância dessa jornada — o início é
        recusado se faltar alguma.
      </div>
      {variables.map((v, i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            style={inputStyle(c)}
            placeholder="nome"
            value={v.name}
            onChange={(e) => commit(variables.map((r, ri) => (ri === i ? { ...r, name: e.target.value } : r)))}
          />
          <select
            style={{ ...inputStyle(c), cursor: 'pointer', flex: '0 0 110px' }}
            title="Tipo da variável"
            value={v.type}
            onChange={(e) => commit(variables.map((r, ri) => (ri === i ? { ...r, type: e.target.value as VariableType } : r)))}
          >
            <option value="string">Texto</option>
            <option value="number">Número</option>
            <option value="boolean">Booleano</option>
            <option value="date">Data</option>
            <option value="datetime">Data e hora</option>
          </select>
          <button
            onClick={() => commit(variables.filter((_, ri) => ri !== i))}
            title="Remover variável"
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
        onClick={() => commit([...variables, { name: '', type: 'string' }])}
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
        <Plus size={14} /> Adicionar variável de entrada
      </button>
    </div>
  );
}

// The "what did the API actually return" reference block — shared by OutputMappingEditor's own
// trailing section (inline panel) and ConnectorWizard, which renders it standalone, positioned
// before the rules instead of after (REQ: no duplicate payload display, Origem first).
export function ResponsePreview({ response }: { response: ConnectorTestResponse | null | undefined }) {
  const { c } = useFlowTheme();
  const [copied, setCopied] = useState(false);

  async function copyJson() {
    if (!response) return;
    try {
      await navigator.clipboard.writeText(formatBody(response.body));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Sem permissão de clipboard (contexto não seguro, navegador antigo) — nada a fazer além de
      // deixar o usuário selecionar/copiar o texto manualmente, já visível no <pre> abaixo.
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <div style={{ ...labelStyle(c), marginBottom: 0 }}>Origem (resposta da API)</div>
        {response && (
          <button
            type="button"
            onClick={copyJson}
            title="Copiar JSON"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 4,
              border: `1px solid ${c.border}`,
              borderRadius: 6,
              background: c.cardBg,
              color: copied ? c.accent : c.textSecondary,
              padding: '3px 8px',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        )}
      </div>
      {response ? (
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
          {formatBody(response.body)}
        </pre>
      ) : (
        <div style={{ fontSize: 12, color: c.textSecondary }}>
          Execute "Testar API" para ver aqui a resposta de referência e localizar os caminhos JSONPath.
        </div>
      )}
    </div>
  );
}

// Larguras padrão das 3 colunas redimensionáveis (px) — a 4ª (remover) fica fixa e sem handle.
const DEFAULT_MAPPING_COL_WIDTHS = { name: 140, jsonPath: 240, type: 110 };
type MappingColumn = keyof typeof DEFAULT_MAPPING_COL_WIDTHS;
const MIN_MAPPING_COL_WIDTH = 60;
// Só cabe o "x" de remover — não precisa de handle nem de espaço de sobra.
const ACTION_COL_WIDTH = 32;

// Borda sem cantos arredondados numa célula específica da grade — cada `<input>`/`<select>` some
// dentro da própria célula (sem caixa própria) pra ler como planilha, não como formulário empilhado.
const cellInputStyle = (c: FlowColors): React.CSSProperties => ({
  width: '100%',
  height: 28,
  padding: '2px 8px',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: c.textPrimary,
  fontSize: 12,
  boxSizing: 'border-box',
});

// IconButton do Mística espera um componente de ícone com a assinatura (props: IconProps) =>
// JSX.Element — os ícones lucide-react são forwardRef, não batem estruturalmente com esse tipo,
// então precisam desse adaptador fino em vez de serem passados direto.
function MisticaXIcon(props: IconProps) {
  return <X size={props.size as number | undefined} color={props.color} className={props.className} style={props.style} />;
}

export function OutputMappingEditor({
  rules,
  onChange,
  sourceResponse,
  hideSourcePreview,
}: {
  rules: OutputMappingRule[];
  onChange: (rules: OutputMappingRule[]) => void;
  sourceResponse?: ConnectorTestResponse | null;
  // ConnectorWizard shows its own ResponsePreview before the rules instead of this trailing one.
  hideSourcePreview?: boolean;
}) {
  const { c } = useFlowTheme();
  const [colWidths, setColWidths] = useState(DEFAULT_MAPPING_COL_WIDTHS);
  const dragRef = useRef<{ col: MappingColumn; startX: number; startWidth: number } | null>(null);

  function commit(next: OutputMappingRule[]) {
    onChange(next);
  }

  function onResizeMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = Math.max(MIN_MAPPING_COL_WIDTH, drag.startWidth + (e.clientX - drag.startX));
    setColWidths((w) => ({ ...w, [drag.col]: next }));
  }

  function onResizeEnd() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  function startResize(col: MappingColumn, e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { col, startX: e.clientX, startWidth: colWidths[col] };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function ResizeHandle({ col }: { col: MappingColumn }) {
    return (
      <div
        onPointerDown={(e) => startResize(col, e)}
        title="Arrastar para redimensionar"
        style={{ position: 'absolute', top: 0, bottom: 0, right: -3, width: 6, cursor: 'col-resize', zIndex: 1 }}
      />
    );
  }

  // JSONPath usa minmax(...,1fr): a largura arrastada vira o mínimo, mas ela ainda estica pra
  // preencher o diálogo inteiro — sem isso (tudo em px fixo) a tabela ficava mais estreita que o
  // diálogo, com espaço vazio sobrando à direita em vez de acompanhar o mesmo respiro da esquerda.
  const gridTemplateColumns = `${colWidths.name}px minmax(${colWidths.jsonPath}px, 1fr) ${colWidths.type}px ${ACTION_COL_WIDTH}px`;
  const cellBorder = `1px solid ${c.border}`;

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={() => commit([...rules, { name: '', jsonPath: '', type: 'string' }])}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'none',
          padding: '4px 0',
          marginBottom: rules.length > 0 ? 10 : 0,
          color: c.accent,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} /> Adicionar variável de saída
      </button>

      {rules.length > 0 && (
        <div style={{ border: cellBorder, borderRadius: 6, overflow: 'hidden', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns, background: c.canvasBg, borderBottom: cellBorder }}>
            {(
              [
                ['name', 'Nome'],
                ['jsonPath', 'JSONPath (ex.: $.campo)'],
                ['type', 'Tipo'],
              ] as const
            ).map(([col, label]) => (
              <div
                key={col}
                style={{
                  position: 'relative',
                  padding: '6px 8px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: c.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                  borderRight: cellBorder,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
                <ResizeHandle col={col} />
              </div>
            ))}
            <div />
          </div>

          {rules.map((rule, i) => (
            <div
              key={i}
              style={{ display: 'grid', gridTemplateColumns, borderTop: i === 0 ? 'none' : cellBorder }}
            >
              <div style={{ borderRight: cellBorder }}>
                <input
                  style={cellInputStyle(c)}
                  placeholder="nome"
                  value={rule.name}
                  onChange={(e) => commit(rules.map((r, ri) => (ri === i ? { ...r, name: e.target.value } : r)))}
                />
              </div>
              <div style={{ borderRight: cellBorder }}>
                <input
                  style={{ ...cellInputStyle(c), fontFamily: 'monospace' }}
                  placeholder="$.campo"
                  value={rule.jsonPath}
                  onChange={(e) => commit(rules.map((r, ri) => (ri === i ? { ...r, jsonPath: e.target.value } : r)))}
                />
              </div>
              <div style={{ borderRight: cellBorder }}>
                <select
                  style={{
                    ...cellInputStyle(c),
                    cursor: 'pointer',
                    color: skinVars.colors.textPrimary,
                    background: skinVars.colors.background,
                  }}
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
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconButton
                  Icon={MisticaXIcon}
                  type="danger"
                  small
                  aria-label="Remover regra"
                  onPress={() => commit(rules.filter((_, ri) => ri !== i))}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {!hideSourcePreview && (
        <div style={{ marginTop: 12 }}>
          <ResponsePreview response={sourceResponse} />
        </div>
      )}
    </div>
  );
}

export interface PayloadField {
  name: string;
  value: string;
  type: VariableType;
}

const DEFAULT_PAYLOAD_COL_WIDTHS = { name: 160, value: 260, type: 110 };
type PayloadColumn = keyof typeof DEFAULT_PAYLOAD_COL_WIDTHS;

// Editor de payload customizado (lado de quem produz uma mensagem de mensageria) com o mesmo visual
// de tabela do OutputMappingEditor (REST/consumo) — VALOR no lugar de JSONPATH, porque aqui não
// existe resposta nenhuma pra apontar um caminho: o valor é texto fixo ou {{variável}} da jornada.
// TIPO é só uma dica pro preview mostrar um exemplo mais fiel — não muda como o valor é enviado.
export function PayloadFieldsEditor({ fields, onChange }: { fields: PayloadField[]; onChange: (fields: PayloadField[]) => void }) {
  const { c } = useFlowTheme();
  const [colWidths, setColWidths] = useState(DEFAULT_PAYLOAD_COL_WIDTHS);
  const dragRef = useRef<{ col: PayloadColumn; startX: number; startWidth: number } | null>(null);

  function commit(next: PayloadField[]) {
    onChange(next);
  }

  function onResizeMove(e: PointerEvent) {
    const drag = dragRef.current;
    if (!drag) return;
    const next = Math.max(MIN_MAPPING_COL_WIDTH, drag.startWidth + (e.clientX - drag.startX));
    setColWidths((w) => ({ ...w, [drag.col]: next }));
  }

  function onResizeEnd() {
    dragRef.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  function startResize(col: PayloadColumn, e: React.PointerEvent) {
    e.preventDefault();
    dragRef.current = { col, startX: e.clientX, startWidth: colWidths[col] };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function ResizeHandle({ col }: { col: PayloadColumn }) {
    return (
      <div
        onPointerDown={(e) => startResize(col, e)}
        title="Arrastar para redimensionar"
        style={{ position: 'absolute', top: 0, bottom: 0, right: -3, width: 6, cursor: 'col-resize', zIndex: 1 }}
      />
    );
  }

  const gridTemplateColumns = `${colWidths.name}px minmax(${colWidths.value}px, 1fr) ${colWidths.type}px ${ACTION_COL_WIDTH}px`;
  const cellBorder = `1px solid ${c.border}`;

  return (
    <div style={{ width: '100%' }}>
      <button
        onClick={() => commit([...fields, { name: '', value: '', type: 'string' }])}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          border: 'none',
          background: 'none',
          padding: '4px 0',
          marginBottom: fields.length > 0 ? 10 : 0,
          color: c.accent,
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        <Plus size={14} /> Adicionar campo
      </button>

      {fields.length > 0 && (
        <div style={{ border: cellBorder, borderRadius: 6, overflow: 'hidden', width: '100%' }}>
          <div style={{ display: 'grid', gridTemplateColumns, background: c.canvasBg, borderBottom: cellBorder }}>
            {(
              [
                ['name', 'Nome'],
                ['value', 'Valor (texto fixo ou {{variável}})'],
                ['type', 'Tipo'],
              ] as const
            ).map(([col, label]) => (
              <div
                key={col}
                style={{
                  position: 'relative',
                  padding: '6px 8px',
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: c.textSecondary,
                  textTransform: 'uppercase',
                  letterSpacing: 0.3,
                  borderRight: cellBorder,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {label}
                <ResizeHandle col={col} />
              </div>
            ))}
            <div />
          </div>

          {fields.map((field, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns, borderTop: i === 0 ? 'none' : cellBorder }}>
              <div style={{ borderRight: cellBorder }}>
                <input
                  style={cellInputStyle(c)}
                  placeholder="nome"
                  value={field.name}
                  onChange={(e) => commit(fields.map((f, fi) => (fi === i ? { ...f, name: e.target.value } : f)))}
                />
              </div>
              <div style={{ borderRight: cellBorder }}>
                <input
                  style={{ ...cellInputStyle(c), fontFamily: 'monospace' }}
                  placeholder="{{variavel}} ou texto fixo"
                  value={field.value}
                  onChange={(e) => commit(fields.map((f, fi) => (fi === i ? { ...f, value: e.target.value } : f)))}
                />
              </div>
              <div style={{ borderRight: cellBorder }}>
                <select
                  style={{
                    ...cellInputStyle(c),
                    cursor: 'pointer',
                    color: skinVars.colors.textPrimary,
                    background: skinVars.colors.background,
                  }}
                  title="Tipo do valor"
                  value={field.type ?? 'string'}
                  onChange={(e) => commit(fields.map((f, fi) => (fi === i ? { ...f, type: e.target.value as VariableType } : f)))}
                >
                  <option value="string">Texto</option>
                  <option value="number">Número</option>
                  <option value="boolean">Booleano</option>
                  <option value="date">Data</option>
                  <option value="datetime">Data e hora</option>
                </select>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <IconButton
                  Icon={MisticaXIcon}
                  type="danger"
                  small
                  aria-label="Remover campo"
                  onPress={() => commit(fields.filter((_, fi) => fi !== i))}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// REQ-03.10.005: {{name}} references in the current config get an input for a sample value here,
// so the call can be resolved and tested without a real journey execution.
const VARIABLE_TOKEN = /\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}/g;

export function tokensIn(config: Record<string, unknown> | null | undefined): string[] {
  const found = new Set<string>();
  const text = JSON.stringify(config ?? {});
  for (const match of text.matchAll(VARIABLE_TOKEN)) found.add(match[1]);
  return [...found];
}

// Ponto único de "testar rápido e mapear" — substitui os antigos botão "Testar API" (modal à
// parte, um clique só pra abrir e outro pra rodar) e diálogo "Saída" separado (sem ver a resposta
// ao lado). Este passo só testa e mapeia — método/URL/headers/body já foram fechados na etapa
// Conexão e aqui aparecem só como resumo somente-leitura, não editável de novo. Reaproveitado pelo
// ConnectorWizard (seu último passo) também.
export function TestAndMapPanel({
  connectorConfig,
  journeyId,
  nodeId,
  outputMappingRules,
  onChangeOutputMapping,
}: {
  connectorConfig: ConnectorConfig;
  journeyId: string;
  nodeId: string;
  outputMappingRules: OutputMappingRule[];
  onChangeOutputMapping: (rules: OutputMappingRule[]) => void;
}) {
  const { c } = useFlowTheme();
  const [sampleVariables, setSampleVariables] = useState<Record<string, string>>({});
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<ConnectorTestResponse | null>(null);
  const [generatedCount, setGeneratedCount] = useState<number | null>(null);
  // Lado a lado (Origem/Mapeamento) espremia demais as duas colunas quando a resposta tem muitos
  // campos — em abas, cada uma usa a largura toda do diálogo.
  const [activeTab, setActiveTab] = useState<'mapeamento' | 'resposta'>('mapeamento');

  const cfg = connectorConfig.config ?? {};
  const method = (cfg.method as string) ?? '';
  const url = (cfg.url as string) ?? '';
  const headersCount = Object.keys((cfg.headers as Record<string, string>) ?? {}).length;
  const hasBody = !!cfg.body && Object.keys(cfg.body as object).length > 0;
  const tokens = tokensIn(connectorConfig.config);

  async function runTest() {
    setTesting(true);
    setTestError(null);
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
      setTestResult(response);
      setActiveTab('mapeamento');
      // REQ-03.10.001: the test's whole purpose is to see the real response shape, so wire it
      // into the output mapping immediately instead of leaving the user to type each rule by hand.
      try {
        const generated = flattenJsonToOutputMappingRules(JSON.parse(response.body));
        const existingNames = new Set(outputMappingRules.map((r) => r.name));
        const toAdd = generated.filter((r) => !existingNames.has(r.name));
        if (toAdd.length > 0) onChangeOutputMapping([...outputMappingRules, ...toAdd]);
        setGeneratedCount(toAdd.length);
      } catch {
        // Non-JSON response (e.g. plain text) — nothing to flatten, mapping stays manual.
      }
    } catch (e) {
      setTestError(e instanceof Error ? e.message : 'Falha ao testar o conector');
    } finally {
      setTesting(false);
    }
  }

  return (
    <div>
      <div style={{ padding: '10px 12px', borderRadius: 8, border: `1px solid ${c.border}`, background: c.canvasBg, marginBottom: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: c.textPrimary, fontFamily: 'monospace', wordBreak: 'break-word' }}>
          {method || '—'} {url || '(URL não configurada — volte pra etapa Conexão)'}
        </div>
        {(headersCount > 0 || hasBody) && (
          <div style={{ fontSize: 11.5, color: c.textSecondary, marginTop: 4 }}>
            {[headersCount > 0 ? `${headersCount} header${headersCount > 1 ? 's' : ''}` : null, hasBody ? 'Body configurado' : null]
              .filter(Boolean)
              .join(' · ')}
          </div>
        )}
      </div>

      {tokens.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={labelStyle(c)}>Valores de exemplo para o teste</div>
          {tokens.map((t) => (
            <div key={t} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <div style={{ fontSize: 11.5, fontFamily: 'monospace', color: c.textSecondary, flex: '0 0 auto' }}>{`{{${t}}}`}</div>
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
        onClick={runTest}
        disabled={testing || !method || !url.trim()}
        title={!method || !url.trim() ? 'Configure Método e URL na etapa Conexão antes de testar' : undefined}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 8,
          border: 'none',
          background: c.accent,
          color: '#fff',
          fontSize: 13,
          fontWeight: 700,
          cursor: testing || !method || !url.trim() ? 'default' : 'pointer',
          opacity: !method || !url.trim() ? 0.55 : 1,
          marginBottom: 14,
        }}
      >
        {testing ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        {testing ? 'Testando...' : 'Testar Integração'}
      </button>

      {testError && <div style={{ fontSize: 12.5, color: c.danger, marginBottom: 14 }}>Falha ao testar: {testError}</div>}

      {testResult && (
        <div style={{ fontSize: 12.5, fontWeight: 700, color: c.textPrimary, marginBottom: 10 }}>
          Status: {testResult.status}
          {generatedCount !== null && generatedCount > 0 && (
            <span style={{ color: c.accent, fontWeight: 600, marginLeft: 8 }}>
              · {generatedCount} variável{generatedCount > 1 ? 'is' : ''} adicionada{generatedCount > 1 ? 's' : ''} automaticamente
            </span>
          )}
        </div>
      )}

      {testResult ? (
        <div>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12, borderBottom: `1px solid ${c.border}` }}>
            {(
              [
                ['mapeamento', `Mapeamento de saída${outputMappingRules.length > 0 ? ` (${outputMappingRules.length})` : ''}`],
                ['resposta', 'Origem (resposta da API)'],
              ] as const
            ).map(([tab, tabLabel]) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '7px 4px',
                  marginBottom: -1,
                  border: 'none',
                  borderBottom: `2px solid ${activeTab === tab ? c.accent : 'transparent'}`,
                  background: 'none',
                  color: activeTab === tab ? c.accent : c.textSecondary,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {tabLabel}
              </button>
            ))}
          </div>

          {activeTab === 'resposta' ? (
            <ResponsePreview response={testResult} />
          ) : (
            <>
              <div style={{ fontSize: 11.5, color: c.textSecondary, marginBottom: 8 }}>
                Copie o caminho da aba "Origem" (ex.: $.campo) pro JSONPath de cada variável.
              </div>
              <OutputMappingEditor rules={outputMappingRules} onChange={onChangeOutputMapping} hideSourcePreview />
            </>
          )}
        </div>
      ) : (
        <div>
          <div style={labelStyle(c)}>Mapeamento de saída</div>
          <div style={{ fontSize: 11.5, color: c.textSecondary, marginBottom: 8 }}>
            Teste a integração pra gerar o mapeamento automaticamente a partir da resposta real, ou monte manualmente
            abaixo — útil quando a integração ainda não pode ser testada a partir daqui.
          </div>
          <OutputMappingEditor rules={outputMappingRules} onChange={onChangeOutputMapping} hideSourcePreview />
        </div>
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

function isFlatObject(value: unknown): value is Record<string, string | number | boolean | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  return Object.values(value as Record<string, unknown>).every(
    (v) => v === null || typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean',
  );
}

const linkButtonStyle = (c: FlowColors): React.CSSProperties => ({
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
});

// Default editor for Body/Params (REST): a flat name→value row list (like HeadersEditor) with a
// VariablePickerButton per value, instead of making the user hand-type `{{nome}}` inside raw JSON.
// Falls back to the original JsonFieldEditor ("modo avançado") for a body that's already nested —
// never force-flattens a config authored before this editor existed — or when the user opts in,
// e.g. because the real API needs a nested/array body this row list can't represent.
export function StructuredJsonEditor({
  value,
  onChange,
  variables,
}: {
  value: unknown;
  onChange: (value: unknown) => void;
  variables: VariableOrigin[];
}) {
  const { c } = useFlowTheme();
  const [advanced, setAdvanced] = useState(() => value != null && !isFlatObject(value));
  const [rows, setRows] = useState<[string, string][]>(() =>
    isFlatObject(value) ? Object.entries(value).map(([k, v]) => [k, v === null ? '' : String(v)]) : [],
  );
  const valueRefs = useRef<(HTMLInputElement | null)[]>([]);

  function commitRows(next: [string, string][]) {
    setRows(next);
    const result: Record<string, string> = {};
    next.forEach(([key, val]) => {
      if (key.trim()) result[key] = val;
    });
    onChange(result);
  }

  function switchToSimple() {
    setRows(isFlatObject(value) ? Object.entries(value).map(([k, v]) => [k, v === null ? '' : String(v)]) : []);
    setAdvanced(false);
  }

  if (advanced) {
    return (
      <div>
        <JsonFieldEditor value={value} onChange={onChange} />
        <button
          type="button"
          onClick={switchToSimple}
          style={{ border: 'none', background: 'none', padding: '6px 0 0', color: c.textSecondary, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Modo simples
        </button>
      </div>
    );
  }

  return (
    <div style={{ width: '100%' }}>
      {rows.map(([key, val], i) => (
        <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
          <input
            style={inputStyle(c)}
            placeholder="Nome"
            value={key}
            onChange={(e) => commitRows(rows.map((row, ri) => (ri === i ? [e.target.value, row[1]] : row)))}
          />
          <input
            ref={(el) => {
              valueRefs.current[i] = el;
            }}
            style={inputStyle(c)}
            placeholder="Valor"
            value={val}
            onChange={(e) => commitRows(rows.map((row, ri) => (ri === i ? [row[0], e.target.value] : row)))}
          />
          <VariablePickerButton
            variables={variables}
            onInsert={(token) =>
              insertTokenAtCursor(valueRefs.current[i] ?? null, val, token, (next) =>
                commitRows(rows.map((row, ri) => (ri === i ? [row[0], next] : row))),
              )
            }
          />
          <button
            onClick={() => commitRows(rows.filter((_, ri) => ri !== i))}
            title="Remover campo"
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
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <button onClick={() => commitRows([...rows, ['', '']])} style={linkButtonStyle(c)}>
          <Plus size={14} /> Adicionar campo
        </button>
        <button
          type="button"
          onClick={() => setAdvanced(true)}
          style={{ border: 'none', background: 'none', color: c.textSecondary, fontSize: 11.5, cursor: 'pointer', textDecoration: 'underline' }}
        >
          Modo avançado (JSON)
        </button>
      </div>
    </div>
  );
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
