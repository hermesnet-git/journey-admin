import { useMemo, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { AlertTriangle, ChevronDown, ChevronRight, PackageOpen, Search, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { ComponentDefinition, ComponentCategory } from '../../api/componentDefinitions';
import { descriptionFor, iconFor, labelFor, CATEGORY_LABEL } from '../../sdui/componentMeta';
import { compatibilityForDesignChannel, compatibilityMessage, type DesignChannel } from './designChannel';

const CATEGORY_ORDER: ComponentCategory[] = ['LAYOUT', 'INPUT', 'ACTION', 'CONTENT', 'FEEDBACK'];
const INITIALLY_COLLAPSED_CATEGORIES = new Set<ComponentCategory>(['INPUT', 'ACTION', 'CONTENT', 'FEEDBACK']);

export interface PaletteDragData {
  source: 'palette';
  definition: ComponentDefinition;
}

function PaletteItem({
  definition,
  onAdd,
  designChannel,
}: {
  definition: ComponentDefinition;
  onAdd: (definition: ComponentDefinition) => void;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  const dragData: PaletteDragData = { source: 'palette', definition };
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${definition.type}@${definition.version}`,
    data: dragData,
  });
  const Icon = iconFor(definition.type);
  const compatibility = compatibilityForDesignChannel(definition, designChannel);
  const compatible = compatibility === 'COMPATIBLE';
  const title = compatible ? 'Clique para adicionar ou arraste para a tela' : compatibilityMessage(compatibility, designChannel) ?? undefined;
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      onClick={() => onAdd(definition)}
      title={title}
      className="group flex items-start gap-2.5 mx-2 mb-1.5 p-2.5 rounded-lg cursor-grab select-none"
      style={{ opacity: isDragging ? 0.4 : 1, color: c.textPrimary, border: `1px solid ${c.border}`, background: c.cardBg }}
      onMouseEnter={(e) => { e.currentTarget.style.borderColor = c.accent; e.currentTarget.style.background = c.hoverBg; }}
      onMouseLeave={(e) => { e.currentTarget.style.borderColor = c.border; e.currentTarget.style.background = c.cardBg; }}
    >
      <span className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}>
        <Icon size={16} color={c.accent} strokeWidth={1.8} />
      </span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-1.5">
          <span className="truncate text-[12px] font-semibold">{labelFor(definition.type)}</span>
          {definition.status === 'EXPERIMENTAL' && (
            <span className="rounded px-1 py-0.5 text-[8px] font-bold uppercase" style={{ background: c.accentSoft, color: c.accent }}>Experimental</span>
          )}
        </span>
        <span className="block mt-0.5 text-[10.5px] leading-[1.35]" style={{ color: c.textSecondary }}>{descriptionFor(definition.type)}</span>
        <span className="block mt-1 font-mono text-[9px]" style={{ color: c.textSecondary }}>v{definition.version}</span>
      </span>
      {!compatible && <AlertTriangle size={11} color={c.danger} />}
    </div>
  );
}

/** Paleta de componentes SDUI — sucessora de FormFieldPalette.tsx: grupos vêm de
 * ComponentDefinition.category (Component Registry), não de uma lista curada em código. Só mostra
 * componentes não-removidos (REMOVED continua existindo pra telas antigas, mas não é oferecido pra
 * novas). `ui.screen` nunca aparece — é a raiz fixa, nunca solto pelo usuário. */
export function ComponentPalette({
  definitions,
  onAdd,
  designChannel,
}: {
  definitions: ComponentDefinition[];
  onAdd: (definition: ComponentDefinition) => void;
  designChannel: DesignChannel;
}) {
  const { c } = useFlowTheme();
  const [search, setSearch] = useState('');
  const [collapsedCategories, setCollapsedCategories] = useState<Set<ComponentCategory>>(
    () => new Set(INITIALLY_COLLAPSED_CATEGORIES),
  );

  const grouped = useMemo(() => {
    const q = search.trim().toLowerCase();
    const visible = definitions.filter((d) => d.type !== 'ui.screen' && d.status !== 'REMOVED'
      && compatibilityForDesignChannel(d, designChannel) === 'COMPATIBLE');
    const filtered = q ? visible.filter((d) => [labelFor(d.type), d.type, descriptionFor(d.type)]
      .some((value) => value.toLowerCase().includes(q))) : visible;
    return CATEGORY_ORDER.map((cat) => ({
      category: cat,
      items: filtered.filter((d) => d.category === cat).sort((a, b) => {
        // Texto abre o grupo de conteúdo; os demais itens permanecem em ordem alfabética funcional.
        if (cat === 'CONTENT' && a.type === 'ui.text') return -1;
        if (cat === 'CONTENT' && b.type === 'ui.text') return 1;
        return labelFor(a.type).localeCompare(labelFor(b.type));
      }),
    })).filter((g) => g.items.length > 0);
  }, [definitions, search, designChannel]);

  const unavailableCount = useMemo(() => definitions.filter((d) => d.type !== 'ui.screen'
    && d.status !== 'REMOVED' && compatibilityForDesignChannel(d, designChannel) !== 'COMPATIBLE').length,
  [definitions, designChannel]);

  const availableCount = grouped.reduce((total, group) => total + group.items.length, 0);

  function toggleCategory(category: ComponentCategory) {
    setCollapsedCategories((current) => {
      const next = new Set(current);
      if (next.has(category)) next.delete(category); else next.add(category);
      return next;
    });
  }

  return (
    <div className="flex flex-col h-full shrink-0" style={{ width: 248, borderRight: `1px solid ${c.border}`, background: c.cardBg }}>
      <div className="px-3 pt-3 pb-2" style={{ borderBottom: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-between mb-2">
          <div>
            <div className="text-[12px] font-semibold" style={{ color: c.textPrimary }}>Componentes</div>
            <div className="text-[10px]" style={{ color: c.textSecondary }}>{availableCount} disponíveis neste canal</div>
          </div>
        </div>
        <div className="flex items-center gap-2 px-2.5" style={{ height: 34, border: `1px solid ${c.border}`, borderRadius: 8, background: c.canvasBg }}>
          <Search size={14} color={c.textSecondary} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar componente..."
            aria-label="Buscar componentes"
            style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 12, color: c.textPrimary, width: '100%' }}
          />
          {search && <button type="button" onClick={() => setSearch('')} title="Limpar busca" className="border-0 bg-transparent cursor-pointer p-0 flex" style={{ color: c.textSecondary }}><X size={13} /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {unavailableCount > 0 && !search && (
          <div className="mx-1 mb-2 rounded-md px-2 py-1.5 text-[10.5px]" style={{ background: c.hoverBg, color: c.textSecondary }}>
            {unavailableCount} {unavailableCount === 1 ? 'componente indisponível' : 'componentes indisponíveis'} para este canal.
          </div>
        )}
        {grouped.map((g) => (
          <div key={g.category} className="mb-2">
            <button type="button" onClick={() => toggleCategory(g.category)} className="w-full flex items-center gap-1.5 px-3 py-1.5 border-0 bg-transparent cursor-pointer text-left" style={{ color: c.textSecondary }}>
              {collapsedCategories.has(g.category) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
              <span className="text-[10px] font-bold uppercase tracking-wide flex-1">{CATEGORY_LABEL[g.category]}</span>
              <span className="text-[9px]">{g.items.length}</span>
            </button>
            {!collapsedCategories.has(g.category) && g.items.map((d) => (
              <PaletteItem key={`${d.type}@${d.version}`} definition={d} onAdd={onAdd} designChannel={designChannel} />
            ))}
          </div>
        ))}
        {grouped.length === 0 && (
          <div className="px-5 py-10 text-center" style={{ color: c.textSecondary }}>
            <PackageOpen size={24} className="mx-auto mb-2" strokeWidth={1.5} />
            <div className="text-[11.5px] font-medium">{search ? 'Nenhum componente encontrado' : 'Nenhum componente disponível'}</div>
            <div className="mt-1 text-[10px]">{search ? 'Tente buscar por outro termo.' : 'Revise o canal selecionado.'}</div>
          </div>
        )}
      </div>
    </div>
  );
}
