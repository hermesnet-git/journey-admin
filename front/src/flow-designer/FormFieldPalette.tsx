import { useDraggable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlowTheme } from './theme';
import { COMPONENT_GROUPS, COMPONENT_META } from './formScreenModel';
import type { FormFieldType } from '../api/forms';

// Mesmo padrão visual/de interação do Palette.tsx do canvas de fluxo (recolhido por padrão,
// clique-pra-adicionar como caminho garantido, arrastar como atalho) — só que os itens são
// arrastáveis via dnd-kit (useDraggable) em vez do drag nativo HTML5, pra integrar com o
// DndContext único que também cuida do reordenar dentro do canvas (FormScreenCanvas).
function PaletteItem({ type, expanded, onAdd }: { type: FormFieldType; expanded: boolean; onAdd: () => void }) {
  const { c } = useFlowTheme();
  const meta = COMPONENT_META[type];
  const Icon = meta.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette', fieldType: type },
  });

  if (!expanded) {
    return (
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        onClick={onAdd}
        title={meta.label}
        className="w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0 cursor-grab"
        style={{ background: c.accentSoft, opacity: isDragging ? 0.4 : 1 }}
      >
        <Icon size={13} color={c.accent} strokeWidth={1.8} />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={onAdd}
      className="flex items-center gap-[8px] p-[7px] rounded-md cursor-grab"
      style={{ background: c.cardBg, border: `1px solid ${c.border}`, opacity: isDragging ? 0.4 : 1 }}
    >
      <div className="w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}>
        <Icon size={13} color={c.accent} strokeWidth={1.8} />
      </div>
      <div className="text-[11.5px] font-medium" style={{ color: c.textPrimary }}>
        {meta.label}
      </div>
    </div>
  );
}

export function FormFieldPalette({
  types,
  expanded,
  onExpandedChange,
  onAdd,
}: {
  types: FormFieldType[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onAdd: (type: FormFieldType) => void;
}) {
  const { c } = useFlowTheme();
  // Só os grupos com pelo menos um tipo disponível pro canal atual (CHANNEL_PALETTE já filtrou
  // `types` antes de chegar aqui — ex.: WhatsApp não tem nada de "Conteúdo").
  const groups = COMPONENT_GROUPS.map((g) => ({ ...g, types: g.types.filter((t) => types.includes(t)) })).filter(
    (g) => g.types.length > 0,
  );

  if (!expanded) {
    return (
      <div className="w-[36px] shrink-0 border-r flex flex-col items-center gap-[6px] py-2" style={{ background: c.sidebarBg, borderColor: c.border }}>
        <button
          onClick={() => onExpandedChange(true)}
          title="Expandir componentes"
          className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={14} />
        </button>
        <div className="w-5 h-px" style={{ background: c.border }} />
        {groups.map((group, i) => (
          <div key={group.label} className="flex flex-col items-center gap-[6px]">
            {i > 0 && <div className="w-5 h-px" style={{ background: c.border }} />}
            {group.types.map((type) => (
              <PaletteItem key={type} type={type} expanded={false} onAdd={() => onAdd(type)} />
            ))}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="w-[180px] shrink-0 border-r flex flex-col" style={{ background: c.sidebarBg, borderColor: c.border }}>
      <div
        className="relative flex items-center justify-center px-2 py-[6px] border-b border-l-[3px]"
        style={{ background: c.chipBg, borderColor: c.border, borderLeftColor: c.accent }}
      >
        <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
          Componentes
        </div>
        <button
          onClick={() => onExpandedChange(false)}
          title="Recolher"
          className="absolute right-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronLeft size={13} />
        </button>
      </div>
      <div className="p-2 flex flex-col gap-[10px] overflow-y-auto">
        {groups.map((group) => (
          <div key={group.label} className="flex flex-col gap-[6px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] px-1" style={{ color: c.textSecondary }}>
              {group.label}
            </div>
            {group.types.map((type) => (
              <PaletteItem key={type} type={type} expanded onAdd={() => onAdd(type)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
