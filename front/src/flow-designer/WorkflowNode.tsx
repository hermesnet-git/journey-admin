import { useEffect, useRef, useState } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Play, ClipboardList, CheckCircle2, Plus, X, FileText, Pencil, Server, Mail, Plug, Diamond } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import { NODE_META, NODE_WIDTH, TYPE_COLOR, type NodeType, type WFNode } from './model';

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

function QuickAdd({ nodeId }: { nodeId: string }) {
  const { c } = useFlowTheme();
  const actions = useWorkflowActions();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [open]);

  return (
    <div
      ref={ref}
      className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ right: -25, zIndex: open ? 20 : 1 }}
    >
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        title="Adicionar próxima etapa"
        className="w-[17px] h-[17px] rounded-full flex items-center justify-center cursor-pointer"
        style={{ border: `1.5px solid ${c.handleColor}`, background: c.cardBg, color: c.handleColor }}
      >
        <Plus size={11} />
      </button>
      {open && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-[22px] top-0 w-[180px] rounded-[8px] p-[5px]"
          style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: '0 10px 30px -8px rgba(0,0,0,.25)' }}
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
        </div>
      )}
    </div>
  );
}

export function WorkflowNode({ id, data, selected, type }: NodeProps<WFNode>) {
  const nodeType = type as NodeType;
  const actions = useWorkflowActions();
  const { c } = useFlowTheme();
  const Icon = ICON[nodeType];
  const hasInput = nodeType !== 'start' && nodeType !== 'messageStartEvent';
  const hasOutput = nodeType !== 'end';
  const outgoingLimitReached = !!data.outgoingLimitReached;
  const invalid = !!data.invalid;
  // Início/Fim carry no description or badges — just a label — so they shrink to the text
  // instead of matching the fixed width of task/integration nodes.
  const isCompact = nodeType === 'start' || nodeType === 'end';

  const borderColor = invalid ? c.danger : selected ? c.accent : c.cardBorder;
  const ringColor = invalid ? c.dangerSoft : c.accentSoft;
  // Both start-type elements are deletable so a MESSAGE_START_EVENT can replace the
  // default START (REQ-03.07.005 allows exactly one, of either type).
  const deletable = true;

  return (
    <div
      onDoubleClick={() => actions.onEdit(id)}
      style={{
        width: isCompact ? 'fit-content' : NODE_WIDTH,
        background: c.cardBg,
        borderColor,
        boxShadow: selected || invalid ? `0 0 0 4px ${ringColor}` : 'none',
      }}
      className={`group relative rounded-lg border cursor-grab select-none ${isCompact ? 'px-[10px] py-[6px]' : 'px-[10px] py-[7px]'}`}
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
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          style={{
            width: 7.5,
            height: 7.5,
            background: c.cardBg,
            border: `1.75px solid ${c.handleColor}`,
            zIndex: 5,
          }}
        />
      )}
      <div className="flex items-center gap-[8px]">
        <div className="relative shrink-0">
          <div
            className={isCompact ? 'w-[18px] h-[18px] rounded flex items-center justify-center' : 'w-[24px] h-[24px] rounded-md flex items-center justify-center'}
            style={{ background: `${TYPE_COLOR[nodeType]}22` }}
          >
            <Icon size={isCompact ? 11 : 13} color={TYPE_COLOR[nodeType]} strokeWidth={1.8} />
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
        {isCompact ? (
          <div className="text-[12px] font-bold whitespace-nowrap" style={{ color: c.textPrimary }}>
            {data.name}
          </div>
        ) : (
          <div className="min-w-0">
            <div className="text-[12.5px] font-bold truncate" style={{ color: c.textPrimary }}>
              {data.name}
            </div>
            <div className="text-[10.5px] truncate" style={{ color: c.textSecondary }}>
              {data.description}
            </div>
          </div>
        )}
      </div>
      {nodeType === 'userTask' && data.formId && (
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
            style={{
              width: 7.5,
              height: 7.5,
              background: c.cardBg,
              border: `1.75px solid ${c.handleColor}`,
              zIndex: 5,
              opacity: outgoingLimitReached ? 0.4 : 1,
            }}
          />
          {!outgoingLimitReached && <QuickAdd nodeId={id} />}
        </>
      )}
    </div>
  );
}
