import { useState } from 'react';
import {
  Play,
  ClipboardList,
  CheckCircle2,
  Server,
  Mail,
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
const PALETTE_TYPES: NodeType[] = ['start', 'messageStartEvent', 'userTask', 'serviceTask', 'receiveTask', 'end'];
const ICON: Partial<Record<NodeType, LucideIcon>> = {
  start: Play,
  userTask: ClipboardList,
  end: CheckCircle2,
  serviceTask: Server,
  receiveTask: Mail,
  messageStartEvent: Mail,
};

export function Palette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [componentsOpen, setComponentsOpen] = useState(true);

  if (collapsed) {
    return (
      <div
        className="w-[52px] shrink-0 border-r flex flex-col items-center gap-2 pt-3"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir painel"
          className="w-[26px] h-[26px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={16} />
        </button>
        <div className="w-6 h-px" style={{ background: c.border }} />
        {PALETTE_TYPES.map((type) => {
          const Icon = ICON[type]!;
          return (
            <div
              key={type}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
              onClick={() => onAdd(type)}
              title={NODE_META[type].title}
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0 cursor-grab"
              style={{ background: `${TYPE_COLOR[type]}22` }}
            >
              <Icon size={16} color={TYPE_COLOR[type]} strokeWidth={1.8} />
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div
      className="w-[240px] shrink-0 border-r flex flex-col overflow-auto"
      style={{ background: c.sidebarBg, borderColor: c.border }}
    >
      <div className="flex flex-col">
        <div
          className="relative flex items-center justify-center px-3 py-2 border-b border-l-[3px] cursor-pointer"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
          onClick={() => setComponentsOpen((o) => !o)}
        >
          <div className="text-[14px] font-semibold text-center" style={{ color: c.textPrimary }}>
            Componentes
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setComponentsOpen((o) => !o);
            }}
            title={componentsOpen ? 'Recolher seção' : 'Expandir seção'}
            className="absolute left-2 w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            {componentsOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed(true);
            }}
            title="Recolher painel"
            className="absolute right-2 w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronLeft size={15} />
          </button>
        </div>
        {componentsOpen && (
          <div className="p-3 flex flex-col gap-2">
            {PALETTE_TYPES.map((type) => {
              const Icon = ICON[type]!;
              return (
                <div
                  key={type}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
                  onClick={() => onAdd(type)}
                  className="flex items-center gap-[10px] p-[10px] rounded-lg cursor-grab"
                  style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
                >
                  <div
                    className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `${TYPE_COLOR[type]}22` }}
                  >
                    <Icon size={16} color={TYPE_COLOR[type]} strokeWidth={1.8} />
                  </div>
                  <div className="text-[13px] font-medium" style={{ color: c.textPrimary }}>
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
