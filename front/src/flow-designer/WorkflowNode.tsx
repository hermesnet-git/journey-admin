import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, ClipboardList, CheckCircle2, Plus, X, FileText, Pencil, Server, Mail, Plug, Diamond } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import { NODE_META, NODE_WIDTH, TYPE_COLOR, type NodeType, type WFNode } from './model';
import { FormPreview } from '../forms/FormBuilderPage';

const ICON: Record<NodeType, typeof Play> = {
  start: Play,
  userTask: ClipboardList,
  end: CheckCircle2,
  serviceTask: Server,
  receiveTask: Mail,
  messageStartEvent: Mail,
  gateway: Diamond,
};
const QUICK_ADD_TYPES: NodeType[] = ['userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];

// A lista de opções virou portal pro document.body (position: fixed, coordenadas a partir do
// getBoundingClientRect do próprio botão gatilho) — mesma técnica do dropdown do FormSearchSelect,
// pelo mesmo motivo: esse botão fica dentro do canvas do próprio React Flow, que recorta qualquer
// coisa que tente ultrapassar seus limites, então um nó perto da borda do canvas tinha seu popup
// renderizado parcialmente atrás do painel de propriedades (sempre aberto) em vez de por cima dele.
function QuickAdd({ nodeId }: { nodeId: string }) {
  const { c } = useFlowTheme();
  const actions = useWorkflowActions();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Fase de captura: o próprio canvas do React Flow trata o mousedown pro pan/drag e interrompe a
    // propagação, então um listener na fase de bolha aqui nunca via um clique no canvas — o menu
    // abria mas nada fora do próprio botão/popup conseguia fechá-lo de novo. A captura roda antes
    // disso, de cima pra baixo, então sempre vê o clique independente do que os handlers do alvo
    // fazem com ele depois.
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.right + 5, top: r.top });
    }
    setOpen((o) => !o);
  }

  return (
    <div
      ref={triggerRef}
      className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ right: -25, zIndex: open ? 20 : 1 }}
    >
      <button
        ref={buttonRef}
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
        title="Adicionar próxima etapa"
        className="w-[17px] h-[17px] rounded-full flex items-center justify-center cursor-pointer"
        style={{ border: `1.5px solid ${c.handleColor}`, background: c.cardBg, color: c.handleColor }}
      >
        <Plus size={11} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed w-[180px] rounded-[8px] p-[5px]"
            style={{
              left: rect.left,
              top: rect.top,
              zIndex: 2000,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              boxShadow: '0 10px 30px -8px rgba(0,0,0,.25)',
            }}
          >
            {QUICK_ADD_TYPES.map((t) => {
              const Icon = ICON[t];
              return (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    actions.onQuickAdd(nodeId, t);
                  }}
                  className="w-full flex items-center gap-[7px] text-left px-[8px] py-[6px] rounded-[6px] border-0 bg-transparent cursor-pointer text-[12px] hover:bg-[var(--flow-hover)]"
                  style={{ color: c.textPrimary, ['--flow-hover' as string]: c.hoverBg }}
                >
                  <Icon size={14} color={TYPE_COLOR[t]} strokeWidth={1.8} />
                  {NODE_META[t].title}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function WorkflowNode({ id, data, selected, type }: NodeProps<WFNode>) {
  const nodeType = type as NodeType;
  const actions = useWorkflowActions();
  const { c, dark } = useFlowTheme();
  const Icon = ICON[nodeType];
  const hasInput = nodeType !== 'start' && nodeType !== 'messageStartEvent';
  const hasOutput = nodeType !== 'end';
  const outgoingLimitReached = !!data.outgoingLimitReached;
  const invalid = !!data.invalid;
  // Semantic zoom: description and the linked-form/connector row are the first things that turn
  // to illegible noise once a wide flow is zoomed out to fit — drop them below a threshold instead
  // of rendering unreadable 4px text.
  const showDetails = (data.zoom ?? 1) >= 0.65;
  const linkedForm = nodeType === 'userTask' && data.formId ? actions.getForm(data.formId) : undefined;

  const borderColor = invalid ? c.danger : selected ? c.accent : c.cardBorder;
  const ringColor = invalid ? c.dangerSoft : c.accentSoft;
  // Resting elevation so cards read as raised, tappable surfaces against the dotted canvas
  // instead of flat rectangles — same shadow family the selection ring stacks on top of.
  const elevation = dark ? '0 1px 3px rgba(0,0,0,.35), 0 1px 2px rgba(0,0,0,.25)' : '0 1px 2px rgba(15,15,20,.07), 0 1px 1px rgba(15,15,20,.04)';
  // Both start-type elements are deletable so a MESSAGE_START_EVENT can replace the
  // default START (REQ-03.07.005 allows exactly one, of either type).
  const deletable = true;
  // Leve tom de categoria em vez de um card neutro chapado — mistura 10% da cor do tipo do nó no
  // fundo do card do tema, então continua legível/opaco nos dois temas.
  const cardFill = `color-mix(in srgb, ${TYPE_COLOR[nodeType]} 10%, ${c.cardBg})`;

  return (
    <div
      onDoubleClick={() => actions.onEdit(id)}
      style={{
        width: NODE_WIDTH,
        background: cardFill,
        borderColor,
        boxShadow: selected || invalid ? `0 0 0 4px ${ringColor}, ${elevation}` : elevation,
      }}
      className="group relative rounded-xl border cursor-grab select-none px-[12px] py-[9px]"
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          actions.onEdit(id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
        title="Editar propriedades"
        className="absolute -top-[7px] -left-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ background: c.cardBg, border: `1.5px solid ${c.handleColor}`, color: c.handleColor, zIndex: 10 }}
      >
        <Pencil size={10} strokeWidth={2.2} />
      </button>
      {deletable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onDelete(id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Remover nó"
          className="absolute -top-[7px] -right-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: c.danger, color: '#fff', zIndex: 10 }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
      {showDetails && linkedForm && (
        <div
          className="absolute bottom-full left-0 mb-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{ width: 260, maxHeight: 360, overflow: 'hidden', zIndex: 25, boxShadow: '0 14px 34px -10px rgba(0,0,0,.3)', borderRadius: 8 }}
        >
          <FormPreview name={linkedForm.name} description={linkedForm.description ?? ''} fields={linkedForm.fields} />
        </div>
      )}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="transition-transform duration-150 hover:scale-[1.8] [&.valid]:scale-[1.8] [&.valid]:!shadow-[0_0_0_4px_var(--handle-ring)]"
          style={{
            width: 7.5,
            height: 7.5,
            background: c.cardBg,
            border: `1.75px solid ${c.handleColor}`,
            zIndex: 5,
            ['--handle-ring' as string]: c.accentSoft,
          }}
        />
      )}
      <div className="flex items-center gap-[8px]">
        <div className="relative shrink-0">
          <div
            className="w-[24px] h-[24px] rounded-md flex items-center justify-center"
            style={{ background: c.cardBg }}
          >
            <Icon size={13} color={TYPE_COLOR[nodeType]} strokeWidth={1.8} />
          </div>
          {nodeType === 'userTask' && data.formId && (
            <div
              title="Formulário associado"
              className="absolute -bottom-1 -right-1 w-[13px] h-[13px] rounded-full flex items-center justify-center"
              style={{ background: c.accent, border: `1.5px solid ${c.cardBg}` }}
            >
              <FileText size={7.5} color="#fff" strokeWidth={2.5} />
            </div>
          )}
          {(nodeType === 'serviceTask' || nodeType === 'receiveTask' || nodeType === 'messageStartEvent') &&
            data.connectorConfig && (
              <div
                title={`Conector ${data.connectorConfig.connectorType} associado`}
                className="absolute -bottom-1 -right-1 w-[13px] h-[13px] rounded-full flex items-center justify-center"
                style={{ background: c.accent, border: `1.5px solid ${c.cardBg}` }}
              >
                <Plug size={7.5} color="#fff" strokeWidth={2.5} />
              </div>
            )}
        </div>
        <div className="min-w-0">
          <div className="text-[13px] font-bold truncate" style={{ color: c.textPrimary }}>
            {data.name}
          </div>
          {showDetails && (
            <div className="text-[11px] truncate mt-px" style={{ color: c.textSecondary }}>
              {data.description}
            </div>
          )}
        </div>
      </div>
      {showDetails && nodeType === 'userTask' && data.formId && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onOpenForm(data.formId!);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          onDoubleClick={(e) => e.stopPropagation()}
          title="Abrir formulário para edição"
          className="flex items-center gap-[5px] mt-[6px] pt-[6px] w-full min-w-0 text-[9.5px] font-semibold border-0 bg-transparent cursor-pointer text-left"
          style={{ borderTop: `1px solid ${c.border}`, color: c.accent }}
        >
          <FileText size={10} strokeWidth={2} className="shrink-0" />
          <span className="truncate">{actions.getFormName(data.formId) ?? 'Formulário vinculado'}</span>
        </button>
      )}
      {hasOutput && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={!outgoingLimitReached}
            className="transition-transform duration-150 hover:scale-[1.8] [&.connectingfrom]:scale-[1.8] [&.connectingfrom]:!shadow-[0_0_0_4px_var(--handle-ring)]"
            style={{
              width: 7.5,
              height: 7.5,
              background: c.cardBg,
              border: `1.75px solid ${c.handleColor}`,
              zIndex: 5,
              opacity: outgoingLimitReached ? 0.4 : 1,
              ['--handle-ring' as string]: c.accentSoft,
            }}
          />
          {!outgoingLimitReached && <QuickAdd nodeId={id} />}
        </>
      )}
    </div>
  );
}
