import { useState } from 'react';
import {
  Play,
  ClipboardList,
  CheckCircle2,
  Server,
  Mail,
  Diamond,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  type LucideIcon,
} from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_META, TYPE_COLOR, type NodeType } from './model';

// Both start-type elements are offered since 'start' is now deletable/re-addable
// (only one of start/messageStartEvent may exist at a time — validated at save).
const PALETTE_TYPES: NodeType[] = ['start', 'messageStartEvent', 'userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];
const ICON: Partial<Record<NodeType, LucideIcon>> = {
  start: Play,
  userTask: ClipboardList,
  end: CheckCircle2,
  serviceTask: Server,
  receiveTask: Mail,
  messageStartEvent: Mail,
  gateway: Diamond,
};

export function Palette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(true);

  if (collapsed) {
    return (
      <div
        className="w-[44px] shrink-0 border-r flex flex-col items-center gap-[6px] pt-2"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir painel"
          className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={14} />
        </button>
        <div className="w-5 h-px" style={{ background: c.border }} />
        {PALETTE_TYPES.map((type) => {
          const Icon = ICON[type]!;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
              onClick={() => onAdd(type)}
              title={NODE_META[type].title}
              className="w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0 cursor-grab"
              style={{ background: `${TYPE_COLOR[type]}22` }}
            >
              <Icon size={13} color={TYPE_COLOR[type]} strokeWidth={1.8} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="w-[190px] shrink-0 border-r flex flex-col overflow-auto"
      style={{ background: c.sidebarBg, borderColor: c.border }}
    >
      <div className="flex flex-col">
        <div
          className="relative flex items-center justify-center px-2 py-[6px] border-b border-l-[3px] cursor-pointer"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
          onClick={() => setComponentsOpen((o) => !o)}
        >
          <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
            Componentes
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setComponentsOpen((o) => !o);
            }}
            title={componentsOpen ? 'Recolher seção' : 'Expandir seção'}
            className="absolute left-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            {componentsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            title="Recolher painel"
            className="absolute right-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronLeft size={13} />
          </button>
        </div>
        {componentsOpen && (
          <div className="p-2 flex flex-col gap-[6px]">
            {PALETTE_TYPES.map((type) => {
              const Icon = ICON[type]!;
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
                  onClick={() => onAdd(type)}
                  className="flex items-center gap-[8px] p-[7px] rounded-md cursor-grab"
                  style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
                >
                  <div
                    className="w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0"
                    style={{ background: `${TYPE_COLOR[type]}22` }}
                  >
                    <Icon size={13} color={TYPE_COLOR[type]} strokeWidth={1.8} />
                  </div>
                  <div className="text-[11.5px] font-medium" style={{ color: c.textPrimary }}>
                    {NODE_META[type].title}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
