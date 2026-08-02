import { ClipboardList, CheckCircle2, type LucideIcon } from 'lucide-react';
import { NODE_META, TYPE_COLOR, type NodeType } from './model';

// 'start' is excluded: exactly one is required and it always exists from the
// initial flow, so it is never offered again in the palette.
const PALETTE_TYPES: NodeType[] = ['userTask', 'end'];
const ICON: Partial<Record<NodeType, LucideIcon>> = { userTask: ClipboardList, end: CheckCircle2 };

export function Palette({ onAdd }: { onAdd: (type: NodeType) => void }) {
  return (
    <div className="w-[220px] shrink-0 border-r border-[#e4e4e7] bg-[#fafafa] p-3 flex flex-col gap-2 overflow-auto">
      <div className="text-[12px] font-semibold text-[#71717a] px-1 mb-1">Adicionar ao fluxo</div>
      {PALETTE_TYPES.map((type) => {
        const Icon = ICON[type]!;
        return (
          <div
            key={type}
            draggable
            onDragStart={(e) => e.dataTransfer.setData('text/plain', type)}
            onClick={() => onAdd(type)}
            className="flex items-center gap-[10px] p-[10px] rounded-lg bg-white border border-[#e4e4e7] cursor-grab hover:border-[#019DF4]"
          >
            <div
              className="w-[30px] h-[30px] rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${TYPE_COLOR[type]}22` }}
            >
              <Icon size={16} color={TYPE_COLOR[type]} strokeWidth={1.8} />
            </div>
            <div className="text-[13px] font-medium text-[#1a1a1a]">{NODE_META[type].title}</div>
          </div>
        );
      })}
    </div>
  );
}
