import { useState } from 'react';
import { ClipboardList, CheckCircle2, ChevronLeft, ChevronRight, type LucideIcon } from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_META, TYPE_COLOR, type NodeType } from './model';
import { JourneyMetaBar } from './JourneyMetaBar';
import type { Product, Channel } from '../api/products';

// 'start' is excluded: exactly one is required and it always exists from the
// initial flow, so it is never offered again in the palette.
const PALETTE_TYPES: NodeType[] = ['userTask', 'end'];
const ICON: Partial<Record<NodeType, LucideIcon>> = { userTask: ClipboardList, end: CheckCircle2 };

interface JourneyMetaProps {
  products: Product[];
  channels: Channel[];
  productId: string;
  channelId: string;
  onProductChange: (productId: string) => void;
  onChannelChange: (channelId: string) => void;
  lockedProductName?: string;
  lockedChannelName?: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

export function Palette({ onAdd, journey }: { onAdd: (type: NodeType) => void; journey: JourneyMetaProps }) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);

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
          className="relative flex items-center justify-center px-3 py-2 border-b border-l-[3px]"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-center" style={{ color: c.textPrimary }}>
            Dados da jornada
          </div>
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher painel"
            className="absolute right-2 w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronLeft size={15} />
          </button>
        </div>
        <div className="p-3">
          <JourneyMetaBar {...journey} />
        </div>
      </div>

      <div className="flex flex-col">
        <div
          className="px-3 py-2 border-y border-l-[3px]"
          style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
        >
          <div className="text-[11px] font-semibold uppercase tracking-wide text-center" style={{ color: c.textPrimary }}>
            Componentes
          </div>
        </div>
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
      </div>
    </div>
  );
}
