import { useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { useFlowTheme } from './theme';
import { COMPONENT_GROUPS, COMPONENT_META } from './formScreenModel';
import type { FormFieldType } from '../api/forms';

// Mesmo padrão visual/de interação do Palette.tsx do canvas de fluxo (recolhido por padrão,
// clique-pra-adicionar como caminho garantido, arrastar como atalho). Dois motores de arrasto
// coexistem no mesmo componente: dnd-kit (useDraggable) pro canvas linear, que compartilha o
// DndContext com o reordenar dentro do canvas (FormScreenCanvas) — e HTML5 nativo (`draggable`)
// pro canvas WEB, que usa o motor de arrasto do próprio React Flow (FormScreenCanvasWeb.tsx),
// incompatível com dnd-kit. `nativeDrag` escolhe qual dos dois fica ativo; o outro nunca é anexado
// ao elemento (o hook do dnd-kit ainda precisa ser chamado incondicionalmente — Rules of Hooks —
// mas sem attributes/listeners no DOM ele fica inerte).
function PaletteItem({
  type,
  expanded,
  nativeDrag,
  onAdd,
}: {
  type: FormFieldType;
  expanded: boolean;
  nativeDrag?: boolean;
  onAdd: () => void;
}) {
  const { c } = useFlowTheme();
  const meta = COMPONENT_META[type];
  const Icon = meta.icon;
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `palette-${type}`,
    data: { source: 'palette', fieldType: type },
  });
  const dragProps = nativeDrag
    ? { draggable: true, onDragStart: (e: React.DragEvent) => e.dataTransfer.setData('text/plain', type) }
    : { ref: setNodeRef, ...listeners, ...attributes };

  if (!expanded) {
    return (
      <div
        {...dragProps}
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
      {...dragProps}
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
  nativeDrag,
}: {
  types: FormFieldType[];
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
  onAdd: (type: FormFieldType) => void;
  /** Canal WEB usa o motor de arrasto do React Flow (drag nativo HTML5), incompatível com o
   * dnd-kit que os demais canais usam — ver PaletteItem. */
  nativeDrag?: boolean;
}) {
  const { c } = useFlowTheme();
  // Só os grupos com pelo menos um tipo disponível pro canal atual (CHANNEL_PALETTE já filtrou
  // `types` antes de chegar aqui — ex.: WhatsApp não tem nada de "Conteúdo").
  const groups = COMPONENT_GROUPS.map((g) => ({ ...g, types: g.types.filter((t) => types.includes(t)) })).filter(
    (g) => g.types.length > 0,
  );
  // Colapsada, a paleta mostra só o grupo (1 ícone cada) — passar o mouse já abre um flyout com a
  // lista de componentes daquele grupo (clique continua funcionando, útil sem hover/touch), pra
  // poder arrastar direto de lá pra prancheta sem precisar expandir a paleta inteira. Só um grupo
  // aberto por vez; sai do flyout (mouse) fecha, já que rail+flyout são o mesmo container (mover o
  // mouse de um botão pro flyout ao lado não conta como "sair").
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  // offsetTop de cada botão de grupo (relativo ao containerRef, que é o ancestral posicionado dos
  // dois) — sem isto o flyout sempre abria grudado no topo do rail, longe do grupo com o mouse em
  // cima quando ele fica mais pra baixo na lista.
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [search, setSearch] = useState('');
  // Busca só existe no modo expandido (colapsada é só ícone de grupo, sem espaço pra um input) —
  // grupo sem nenhum resultado some, mesmo padrão de filtro que CHANNEL_PALETTE já aplica.
  const filteredGroups = search.trim()
    ? groups
        .map((g) => ({ ...g, types: g.types.filter((t) => COMPONENT_META[t].label.toLowerCase().includes(search.trim().toLowerCase())) }))
        .filter((g) => g.types.length > 0)
    : groups;

  useEffect(() => {
    if (!openGroup) return;
    function onDocClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpenGroup(null);
    }
    // Fase de captura — o canvas do React Flow interrompe a propagação do mousedown pro próprio
    // pan/drag, então um clique no canvas nunca chegaria a um listener na fase de bolha aqui
    // (mesmo padrão de EdgeShapePicker em Toolbar.tsx).
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [openGroup]);

  if (!expanded) {
    const activeGroup = groups.find((g) => g.label === openGroup) ?? null;
    return (
      <div ref={containerRef} className="relative shrink-0" onMouseLeave={() => setOpenGroup(null)}>
        <div className="w-[36px] border-r flex flex-col items-center gap-[6px] py-2" style={{ background: c.sidebarBg, borderColor: c.border }}>
          <button
            onClick={() => onExpandedChange(true)}
            title="Expandir componentes"
            className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronRight size={14} />
          </button>
          <div className="w-5 h-px" style={{ background: c.border }} />
          {groups.map((group) => {
            const Icon = COMPONENT_META[group.types[0]].icon;
            const isOpen = group.label === openGroup;
            return (
              <button
                key={group.label}
                ref={(el) => {
                  groupButtonRefs.current[group.label] = el;
                }}
                onClick={() => setOpenGroup(isOpen ? null : group.label)}
                onMouseEnter={() => setOpenGroup(group.label)}
                title={group.label}
                className="w-[24px] h-[24px] rounded-md flex items-center justify-center shrink-0 cursor-pointer border-0"
                style={{ background: isOpen ? c.accentSoft : 'transparent' }}
              >
                <Icon size={13} color={isOpen ? c.accent : c.textSecondary} strokeWidth={1.8} />
              </button>
            );
          })}
        </div>
        {activeGroup && (
          <div
            className="absolute left-full w-[180px] border-r flex flex-col z-10"
            style={{
              top: groupButtonRefs.current[activeGroup.label]?.offsetTop ?? 0,
              background: c.sidebarBg,
              borderColor: c.border,
              boxShadow: '2px 0 8px rgba(0,0,0,0.16)',
            }}
          >
            <div className="flex items-center justify-center px-2 py-[6px] border-b" style={{ background: c.chipBg, borderColor: c.border }}>
              <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
                {activeGroup.label}
              </div>
            </div>
            <div className="p-2 flex flex-col gap-[6px] max-h-[420px] overflow-y-auto">
              {activeGroup.types.map((type) => (
                <PaletteItem
                  key={type}
                  type={type}
                  expanded
                  nativeDrag={nativeDrag}
                  onAdd={() => {
                    onAdd(type);
                    setOpenGroup(null);
                  }}
                />
              ))}
            </div>
          </div>
        )}
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
      <div className="shrink-0 px-2 pt-2 relative">
        <Search size={11} className="absolute left-[16px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textSecondary }} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar componente..."
          className="w-full rounded-md pl-[24px] pr-2 py-[5px] text-[11.5px] outline-none"
          style={{ border: `1px solid ${c.border}`, background: c.cardBg, color: c.textPrimary }}
        />
      </div>
      <div className="p-2 flex flex-col gap-[10px] overflow-y-auto">
        {filteredGroups.length === 0 && (
          <div className="text-[11px] text-center py-4" style={{ color: c.textSecondary }}>
            Nenhum componente encontrado.
          </div>
        )}
        {filteredGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-[6px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.04em] px-1" style={{ color: c.textSecondary }}>
              {group.label}
            </div>
            {group.types.map((type) => (
              <PaletteItem key={type} type={type} expanded nativeDrag={nativeDrag} onAdd={() => onAdd(type)} />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
