import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Plus, X, RefreshCw, Play, Loader2, Braces } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import {
  NODE_META,
  CONNECTOR_TYPES_BY_NODE,
  BROKER_OPERATION_BY_NODE,
  MESSAGE_BROKER_TYPES,
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
import { SearchSelect } from './SearchSelect';
import type { Form } from '../api/forms';
import { testConnector, type ConnectorTestResponse } from '../api/flows';
import type { MessagingCluster, CredentialReference } from '../api/messaging';
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

// Mesma matemática com consciência de flip do computeDropdownRect acima, mas ancorada pela borda
// DIREITA do gatilho em vez da esquerda — esse botão fica na ponta direita de uma linha de campo,
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
// Virou portal pro document.body pelo mesmo motivo do dropdown do FormSearchSelect: o container
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

interface DropdownRect {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

// Lê a posição atual do input na tela e escolhe o lado — abaixo ou acima — que tem mais espaço,
// limitando o maxHeight exatamente ao que está disponível naquele lado. Sem piso mínimo: uma versão
// anterior forçava pelo menos 120px mesmo quando havia menos que isso de verdade, o que era
// exatamente o que deixava a caixa passar da borda de uma janela de navegador curta/não maximizada,
// sem como rolar até o fim da lista — um piso que pode exceder o espaço que ele mesmo está medindo
// anula o propósito de medir o espaço disponível. "Acima" é ancorado via `bottom` (distância da
// borda inferior da viewport) em vez de calcular uma altura explícita de antemão, então cresce pra
// cima conforme conteúdo é adicionado, do mesmo jeito que cresce pra baixo quando fica embaixo.
function computeDropdownRect(input: HTMLElement): DropdownRect {
  const r = input.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - margin;
  const spaceAbove = r.top - margin;
  const width = Math.max(r.width, 220);
  const placeBelow = spaceBelow >= spaceAbove;
  const maxHeight = Math.min(240, Math.max(0, placeBelow ? spaceBelow : spaceAbove));
  return placeBelow
    ? { left: r.left, width, top: r.bottom + gap, maxHeight }
    : { left: r.left, width, bottom: window.innerHeight - r.top + gap, maxHeight };
}

// Seletor de formulário pesquisável: o input de texto filtra a lista de formulários conforme o
// usuário digita (substring no nome), dropdown embaixo pra escolher. Estilizado com gridInputStyle
// pra combinar com todo outro campo deste painel — um <select> simples não tem como filtrar
// conforme a lista de formulários cresce.
//
// O dropdown virou portal pro document.body (position: fixed, coordenadas lidas do
// getBoundingClientRect do próprio input — mesma técnica que o ErrorDetailsModal já usa pelo mesmo
// motivo) em vez de posicionado como absolute dentro do painel: o container rolável do
// PropertiesDock tem `overflow-x: hidden` (e rola em Y), o que recorta qualquer popover dentro do
// painel maior/mais alto que a fresta de espaço que sobra num painel lateral de ~300px de largura —
// nenhum ajuste de left/right/width escapa do recorte de overflow de um ancestral, só realmente sair
// dele resolve. Fica aberto e reacompanha a posição do input no scroll/resize em vez de fechar, já
// que fechar não deixava como reabrir sem tirar e devolver o foco (o gatilho era só por foco, e o
// input continua focado durante um scroll).
function FormSearchSelect({
  forms,
  value,
  onChange,
  onRefresh,
  onOpenNew,
}: {
  forms: Form[];
  value: string | null;
  onChange: (formId: string | null) => void;
  onRefresh: () => void;
  onOpenNew: () => void;
}) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = forms.find((f) => f.formId === value) ?? null;

  function openDropdown() {
    if (inputRef.current) setRect(computeDropdownRect(inputRef.current));
    setOpen(true);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
      setQuery('');
    }
    function reposition() {
      if (inputRef.current) setRect(computeDropdownRect(inputRef.current));
    }
    // Fase de captura — mesmo motivo do VariablePickerButton acima: o canvas do React Flow
    // interrompe a propagação do mousedown pro próprio pan/drag.
    window.addEventListener('mousedown', handleClick, true);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('mousedown', handleClick, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  const filtered = query.trim()
    ? forms.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()))
    : forms;

  const itemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '6px 8px',
    border: 'none',
    background: 'transparent',
    fontSize: 12.5,
    cursor: 'pointer',
    borderRadius: 5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 4, width: '100%' }}>
      <input
        ref={inputRef}
        style={{ ...gridInputStyle(c), cursor: 'text', flex: 1 }}
        value={open ? query : (selected?.name ?? '')}
        placeholder={selected ? undefined : 'Nenhum'}
        onFocus={openDropdown}
        onMouseDown={openDropdown}
        onChange={(e) => setQuery(e.target.value)}
      />
      <MiniIconButton onClick={onRefresh} title="Atualizar lista de formulários">
        <RefreshCw size={13} />
      </MiniIconButton>
      <MiniIconButton onClick={onOpenNew} title="Novo formulário">
        <Plus size={13} />
      </MiniIconButton>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: rect.left,
              ...(rect.top !== undefined ? { top: rect.top } : { bottom: rect.bottom }),
              width: rect.width,
              zIndex: 2000,
              maxHeight: rect.maxHeight,
              overflowY: 'auto',
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              boxShadow: '0 12px 32px -10px rgba(0,0,0,.35)',
              padding: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQuery('');
              }}
              style={{ ...itemStyle, color: c.textSecondary, borderBottom: `1px solid ${c.border}`, marginBottom: 2, borderRadius: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Nenhum
            </button>
            {filtered.length === 0 && (
              <div style={{ padding: '6px 8px', fontSize: 12, color: c.textSecondary }}>Nenhum formulário encontrado</div>
            )}
            {filtered.map((f) => (
              <button
                key={f.formId}
                type="button"
                onClick={() => {
                  onChange(f.formId);
                  setOpen(false);
                  setQuery('');
                }}
                title={f.name}
                style={{ ...itemStyle, color: c.textPrimary, fontWeight: f.formId === value ? 600 : 400 }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {f.name}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </div>
  );
}

// Content only — PropertiesDock owns the panel chrome (width, collapse,
// resize, header).
export function PropertiesPanel({
  node,
  forms,
  clusters,
  credentials,
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
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
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
  const [startVariablesOpen, setStartVariablesOpen] = useState(true);
  const [formOpen, setFormOpen] = useState(true);
  const [variablesOpen, setVariablesOpen] = useState(true);
  const [connectorOpen, setConnectorOpen] = useState(true);
  const [decisionOpen, setDecisionOpen] = useState(true);
  const data = node.data;
  const isConnectorNode = !!node.type && CONNECTOR_NODE_TYPES.has(node.type);
  // Computed once, shared by the "Variáveis" reference panel below and ConnectorFields (URL/
  // headers/body pickers) — same data, two presentations. userTask also needs it for the
  // formless-step message's variable picker (REQ-04.01.005).
  const connectorVariableOrigins =
    isConnectorNode || node.type === 'userTask' ? availableVariableOriginsAt(node.id, allNodes, allEdges, forms) : [];
  const messageTextRef = useRef<HTMLTextAreaElement>(null);

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

      {node.type === 'userTask' && (
        <Section title="Formulário" open={formOpen} onToggle={() => setFormOpen((o) => !o)}>
          <PropertyGrid>
            <PropertyRow label="Formulário" first>
              <FormSearchSelect
                forms={forms}
                value={data.formId ?? null}
                onChange={(formId) => onUpdate({ formId })}
                onRefresh={onRefreshForms}
                onOpenNew={onOpenNewForm}
              />
            </PropertyRow>
            {!data.formId && (
              <PropertyRow label="Mensagem exibida ao usuário">
                <div style={{ display: 'flex', gap: 4, width: '100%', alignItems: 'flex-start' }}>
                  <textarea
                    ref={messageTextRef}
                    style={{ ...gridInputStyle(c), flex: 1, minHeight: 64, resize: 'vertical', fontFamily: 'inherit' }}
                    value={data.messageText ?? ''}
                    onChange={(e) => onUpdate({ messageText: e.target.value || null })}
                    placeholder="Mensagem que o canal digital (app/site) deve apresentar ao usuário nessa etapa. Ex.: Sua solicitação foi registrada sob o protocolo {{numeroProtocolo}}."
                  />
                  <VariablePickerButton
                    variables={connectorVariableOrigins}
                    onInsert={(token) =>
                      insertTokenAtCursor(messageTextRef.current, data.messageText ?? '', token, (next) =>
                        onUpdate({ messageText: next || null }),
                      )
                    }
                  />
                </div>
              </PropertyRow>
            )}
          </PropertyGrid>
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
            availableRules={availableVariableRulesAt(node.id, allNodes, allEdges, forms)}
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

export const REST_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
// Methods whose semantics include a request body — GET/DELETE requests are query-driven, so the
// Body editor stays hidden for them instead of inviting a field that has no effect on the call.
export const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);
// outputMapping (REQ-03.09.010) gets a dedicated editor, same reasoning as headers.
export const OUTPUT_MAPPING_FIELD = 'outputMapping';

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
  const urlInputRef = useRef<HTMLInputElement>(null);
  const isBroker = !!connectorConfig && MESSAGE_BROKER_TYPES.includes(connectorConfig.connectorType);
  const selectedClusterId = (connectorConfig?.config?.clusterId as string) ?? null;
  const credentialsForCluster = selectedClusterId
    ? credentials.filter((cr) => cr.clusterId === selectedClusterId)
    : credentials;
  const topicLabel =
    connectorConfig?.connectorType === 'EVENT_HUBS'
      ? 'Nome do Event Hub'
      : connectorConfig?.connectorType === 'SERVICE_BUS'
        ? 'Fila/Tópico'
        : 'Tópico';

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
  const [wizardOpen, setWizardOpen] = useState(false);

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

        {connectorConfig && (
          <>
            <PropertyRow label="Assistente">
              <button
                type="button"
                onClick={() => setWizardOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 8,
                  border: `1px solid ${c.accent}`,
                  background: c.accentSoft,
                  color: c.accent,
                  fontSize: 12.5,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✨ Configurar com assistente
              </button>
            </PropertyRow>
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

            {!isBroker && (
              <PropertyRow label="Credencial">
                <input
                  style={gridInputStyle(c)}
                  value={connectorConfig.credentialRef ?? ''}
                  onChange={(e) => update({ credentialRef: e.target.value || null })}
                  placeholder="ex.: credential-runtime-01 (opcional)"
                />
              </PropertyRow>
            )}

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
                  <div style={{ display: 'flex', gap: 4, width: '100%' }}>
                    <input
                      ref={urlInputRef}
                      style={{ ...gridInputStyle(c), flex: 1 }}
                      value={(connectorConfig.config?.url as string) ?? ''}
                      onChange={(e) => updateConfigField('url', e.target.value)}
                      placeholder="https://..."
                    />
                    <VariablePickerButton
                      variables={availableVariables}
                      onInsert={(token) =>
                        insertTokenAtCursor(urlInputRef.current, (connectorConfig.config?.url as string) ?? '', token, (next) =>
                          updateConfigField('url', next),
                        )
                      }
                    />
                  </div>
                </PropertyRow>
              </>
            ) : (
              <>
                <PropertyRow label="Cluster">
                  <SearchSelect
                    items={clusters}
                    getId={(cluster) => cluster.clusterId}
                    getLabel={(cluster) => cluster.name}
                    value={selectedClusterId}
                    onChange={(clusterId) => {
                      updateConfigField('clusterId', clusterId ?? '');
                      // Trocar de cluster invalida a credencial escolhida (é filtrada por cluster).
                      update({ credentialRef: null });
                    }}
                    placeholder="Nenhum cluster cadastrado"
                    emptyLabel="Nenhum cluster encontrado — cadastre em Catálogo de Integrações"
                  />
                </PropertyRow>
                <PropertyRow label={topicLabel}>
                  <input
                    style={gridInputStyle(c)}
                    value={(connectorConfig.config?.topic as string) ?? ''}
                    onChange={(e) => updateConfigField('topic', e.target.value)}
                  />
                </PropertyRow>
                <PropertyRow label="Operação">
                  <div style={{ color: c.textSecondary, fontSize: 12 }} title="Definida automaticamente pelo tipo de nó">
                    {brokerOperation}
                  </div>
                </PropertyRow>
                <PropertyRow label="Credencial">
                  <SearchSelect
                    items={credentialsForCluster}
                    getId={(cred) => cred.referenceName}
                    getLabel={(cred) => cred.referenceName}
                    value={connectorConfig.credentialRef}
                    onChange={(referenceName) => update({ credentialRef: referenceName })}
                    placeholder={selectedClusterId ? 'Nenhuma credencial cadastrada' : 'Escolha um cluster primeiro'}
                    emptyLabel="Nenhuma credencial encontrada — cadastre em Catálogo de Integrações"
                  />
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
                variables={availableVariables}
              />
            </ComplexPropertyRow>

            {connectorConfig.connectorType === 'REST' && (
              <ComplexPropertyRow label="Params" summary={jsonFieldSummary(connectorConfig.config?.params)} dialogTitle="Parâmetros de URL (query params)">
                <StructuredJsonEditor
                  value={connectorConfig.config?.params}
                  onChange={(v) => updateConfigJsonField('params', v)}
                  variables={availableVariables}
                />
              </ComplexPropertyRow>
            )}
            {connectorConfig.connectorType === 'REST' && showBody && (
              <ComplexPropertyRow label="Body" summary={jsonFieldSummary(connectorConfig.config?.body)} dialogTitle="Body">
                <StructuredJsonEditor
                  value={connectorConfig.config?.body}
                  onChange={(v) => updateConfigJsonField('body', v)}
                  variables={availableVariables}
                />
              </ComplexPropertyRow>
            )}
            {isBroker && (
              <ComplexPropertyRow label="Payload" summary={jsonFieldSummary(connectorConfig.config?.payload)} dialogTitle="Payload">
                <JsonFieldEditor value={connectorConfig.config?.payload} onChange={(v) => updateConfigJsonField('payload', v)} />
              </ComplexPropertyRow>
            )}

            <PropertyGroupHeader label="Mapeamento" />
            <ComplexPropertyRow label="Saída" summary={outputMappingSummary(outputMappingRules)} dialogTitle="Mapeamento de saída (variável ← JSONPath)">
              <OutputMappingEditor
                rules={outputMappingRules}
                onChange={(rules) => update({ config: { ...(connectorConfig.config ?? {}), [OUTPUT_MAPPING_FIELD]: rules } })}
                sourceResponse={lastTestResponse}
              />
            </ComplexPropertyRow>
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
  return (
    <div>
      <div style={labelStyle(c)}>Origem (resposta da API)</div>
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

      {!hideSourcePreview && (
        <div style={{ marginTop: 12 }}>
          <ResponsePreview response={sourceResponse} />
        </div>
      )}
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

export function TestConnectorButton({
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
