import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, type DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChevronRight, GripVertical, Layers } from 'lucide-react';
import { useFlowTheme } from './theme';
import { COMPONENT_META } from './formScreenModel';
import type { FormField } from '../api/forms';

// Lista de componentes da tela, na ordem do array `fields` — que é também a ordem de leitura/tab
// (ver resolveWebPosition/decisão de acessibilidade em formScreenModel.ts). No WEB, a posição
// visual no canvas é livre e decorrelacionada dessa ordem, então esta é a única forma de reordenar
// "o que vem depois do quê" pra quem usa teclado/leitor de tela; nos demais canais (lista linear,
// FormScreenCanvas.tsx) já dá pra reordenar direto no canvas, então aqui funciona mais como visão
// geral/atalho de seleção. DndContext próprio, isolado do canvas (React Flow no WEB, dnd-kit nos
// demais canais — sem conflito com nenhum dos dois). Começa recolhida (mesmo padrão de colapsar da
// paleta/configuração) — dá mais espaço de cara pro canvas, que é a área principal.
export function FormScreenLayersPanel({
  fields,
  selectedName,
  onSelect,
  onReorder,
}: {
  fields: FormField[];
  selectedName: string | null;
  onSelect: (name: string | null) => void;
  onReorder: (fields: FormField[]) => void;
}) {
  const { c } = useFlowTheme();
  const [expanded, setExpanded] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));
  const layered = fields.filter((f) => f.type !== 'SECTION');

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = fields.findIndex((f) => f.name === active.id);
    const newIndex = fields.findIndex((f) => f.name === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    onReorder(arrayMove(fields, oldIndex, newIndex));
  }

  if (!expanded) {
    return (
      <div className="w-[28px] shrink-0 border-l flex flex-col items-center py-2" style={{ background: c.sidebarBg, borderColor: c.border }}>
        <button
          onClick={() => setExpanded(true)}
          title="Expandir camadas"
          className="w-[22px] h-[22px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <Layers size={13} />
        </button>
      </div>
    );
  }

  return (
    <div className="w-[160px] shrink-0 border-l flex flex-col" style={{ background: c.sidebarBg, borderColor: c.border }}>
      <div className="relative flex items-center justify-center px-2 py-[6px] border-b" style={{ background: c.chipBg, borderColor: c.border }}>
        <div className="text-[12px] font-semibold text-center" style={{ color: c.textPrimary }}>
          Camadas
        </div>
        <button
          onClick={() => setExpanded(false)}
          title="Recolher"
          className="absolute right-1 w-[19px] h-[19px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronRight size={13} />
        </button>
      </div>
      <div className="p-2 flex flex-col gap-[4px] overflow-y-auto">
        {layered.length === 0 ? (
          <div className="text-[11px] p-2 text-center" style={{ color: c.textSecondary }}>
            Nenhum componente ainda.
          </div>
        ) : (
          <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
            <SortableContext items={layered.map((f) => f.name)} strategy={verticalListSortingStrategy}>
              {layered.map((field) => (
                <LayerRow key={field.name} field={field} selected={field.name === selectedName} onSelect={() => onSelect(field.name)} />
              ))}
            </SortableContext>
          </DndContext>
        )}
      </div>
    </div>
  );
}

function LayerRow({ field, selected, onSelect }: { field: FormField; selected: boolean; onSelect: () => void }) {
  const { c } = useFlowTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: field.name });
  const Icon = COMPONENT_META[field.type].icon;

  return (
    <div
      ref={setNodeRef}
      onClick={onSelect}
      className="flex items-center gap-[6px] px-[6px] py-[5px] rounded-md cursor-pointer"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        border: `1px solid ${selected ? c.accent : 'transparent'}`,
        background: selected ? c.accentSoft : 'transparent',
      }}
    >
      <button
        {...attributes}
        {...listeners}
        onClick={(e) => e.stopPropagation()}
        className="shrink-0 border-0 bg-transparent cursor-grab flex items-center justify-center"
        style={{ color: c.textSecondary }}
        title="Arrastar para reordenar"
      >
        <GripVertical size={12} />
      </button>
      <Icon size={12} color={c.textSecondary} strokeWidth={1.8} />
      <div className="text-[11.5px] font-medium truncate flex-1 min-w-0" style={{ color: c.textPrimary }}>
        {field.label || field.name}
      </div>
    </div>
  );
}
