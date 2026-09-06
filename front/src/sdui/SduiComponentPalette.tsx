import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { Search } from 'lucide-react';
import { useFlowTheme } from '../flow-designer/theme';
import type { ComponentDefinition, ComponentCategory } from '../api/componentDefinitions';
import { iconFor, labelFor, CATEGORY_LABEL } from './componentMeta';

const CATEGORY_ORDER: ComponentCategory[] = ['CONTENT', 'LAYOUT', 'INPUT', 'ACTION', 'FEEDBACK'];

export interface PaletteDragData {
  source: 'palette';
  definition: ComponentDefinition;
}

function PaletteItem({ definition }: { definition: ComponentDefinition }) {
  const { c } = useFlowTheme();
  const dragData: PaletteDragData = { source: 'palette', definition };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}@${definition.version}`,
    data: dragData,
  });
  const Icon = iconFor(definition.type);
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      title={labelFor(definition.type)}
      className="flex items-center gap-[8px] px-2 py-[6px] rounded-md cursor-grab select-none"
      style={{ opacity: isDragging ? 0.4 : 1, color: c.textPrimary, fontSize: 12.5 }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <Icon size={15} color={c.accent} strokeWidth={1.8} />
      {labelFor(definition.type)}
    </div>
  );
}

/** Paleta de componentes SDUI — sucessora de FormFieldPalette.tsx: grupos vêm de
 * ComponentDefinition.category (Component Registry), não de uma lista curada em código. Só mostra
 * componentes não-removidos (REMOVED continua existindo pra telas antigas, mas não é oferecido pra
 * novas). `ui.screen` nunca aparece — é a raiz fixa, nunca solto pelo usuário. */
export function SduiComponentPalette({ definitions }: { definitions: ComponentDefinition[] }) {
  const { c } = useFlowTheme();
  const [search, setSearch] = useState('');

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = definitions.filter((d) => d.type !== 'ui.screen' && d.status !== 'REMOVED');
    const filtered = q ? visible.filter((d) => labelFor(d.type).toLowerCase().includes(q) || d.type.toLowerCase().includes(q)) : visible;
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((d) => d.category === cat).sort((a, b) => labelFor(a.type).localeCompare(labelFor(b.type))),
    })).filter((g) => g.items.length > 0);
  }, [definitions, search]);

  return (
    <div className="flex flex-col h-full" style={{ width: 200, borderRight: `1px solid ${c.border}`, background: c.cardBg }}>
      <div className="p-2" style={{ borderBottom: `1px solid ${c.border}` }}>
        <div className="flex items-center gap-[6px] px-2" style={{ height: 28, border: `1px solid ${c.border}`, borderRadius: 6 }}>
          <Search size={12} color={c.textSecondary} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar componente..."
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: c.textPrimary, width: '100%' }}
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {grouped.map((g) => (
          <div key={g.category} className="mb-2">
            <div className="px-2 py-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: c.textSecondary }}>
              {CATEGORY_LABEL[g.category]}
            </div>
            {g.items.map((d) => (
              <PaletteItem key={`${d.type}@${d.version}`} definition={d} />
            ))}
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="p-3 text-[11.5px]" style={{ color: c.textSecondary }}>
            Nenhum componente encontrado.
          </div>
        )}
      </div>
    </div>
  );
}
