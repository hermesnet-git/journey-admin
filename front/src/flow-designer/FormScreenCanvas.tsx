import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { useFlowTheme } from './theme';
import { ChannelScreenFrame } from './ChannelScreenFrame';
import { SduiFieldPreview } from '../execution/SduiFormRenderer';
import { groupFieldsBySections, ROOT_ZONE_ID, sectionZoneId, MOBILE_SIZE_PRESETS, fieldToSduiNode } from './formScreenModel';
import type { FormField } from '../api/forms';
import type { ChannelType } from '../api/products';

export function FormScreenCanvas({
  fields,
  channelType,
  selectedName,
  dragActive,
  onSelect,
  onRemove,
  mobileWidth,
  mobileHeight,
  onMobileSizeChange,
}: {
  fields: FormField[];
  channelType: ChannelType;
  selectedName: string | null;
  /** Verdadeiro enquanto um arrasto está em andamento — só aí mostra o contorno das zonas de solta. */
  dragActive: boolean;
  onSelect: (name: string | null) => void;
  onRemove: (name: string) => void;
  /** Proporção do celular escolhida no seletor (só usado/mostrado quando channelType === MOBILE) —
   * altura fixa + scroll interno, senão a moldura crescia com a quantidade de componentes e parava
   * de parecer um celular de verdade. */
  mobileWidth: number;
  mobileHeight: number;
  onMobileSizeChange: (width: number, height: number) => void;
}) {
  const { c } = useFlowTheme();

  return (
    <div onClick={() => onSelect(null)} className="flex-1 relative overflow-y-auto p-4" style={{ background: c.canvasBg }}>
      {channelType === 'MOBILE' && (
        <div
          className="absolute top-2 left-2 z-10 flex items-center gap-1 rounded-lg px-1 py-1"
          style={{ background: c.cardBg, border: `1px solid ${c.border}` }}
          onClick={(e) => e.stopPropagation()}
        >
          <select
            value={mobileWidth}
            onChange={(e) => {
              const preset = MOBILE_SIZE_PRESETS.find((p) => p.width === Number(e.target.value));
              if (preset) onMobileSizeChange(preset.width, preset.height);
            }}
            title="Proporção do celular"
            className="text-[11px] font-medium rounded-md cursor-pointer"
            style={{ border: 0, background: 'transparent', color: c.textSecondary, height: 26, padding: '0 4px' }}
          >
            {MOBILE_SIZE_PRESETS.map((p) => (
              <option key={p.width} value={p.width}>
                {p.label} · {p.width}×{p.height}
              </option>
            ))}
          </select>
        </div>
      )}
      <ChannelScreenFrame
        channelType={channelType}
        width={channelType === 'MOBILE' ? mobileWidth : undefined}
        height={channelType === 'MOBILE' ? mobileHeight : undefined}
      >
        {fields.length === 0 ? (
          // Convite permanente (não só durante o arrasto) — é o único conteúdo do canvas nesse ponto.
          <DropZone id={ROOT_ZONE_ID} active columns={1} minHeight={160}>
            <div className="col-span-full h-full min-h-[144px] flex items-center justify-center text-[12.5px]" style={{ color: c.textSecondary }}>
              Arraste um componente da paleta pra começar
            </div>
          </DropZone>
        ) : (
          <SortableContext items={fields.map((f) => f.name)} strategy={verticalListSortingStrategy}>
            <div className="flex flex-col gap-3">
              {groupFieldsBySections(fields).map((block, i) => (
                <div
                  key={block.section?.name ?? `root-${i}`}
                  className="flex flex-col gap-2 rounded-lg"
                  style={block.section ? { border: `1px solid ${c.border}`, background: c.hoverBg, padding: '10px 12px' } : undefined}
                >
                  {block.section && (
                    <SortableField
                      field={block.section}
                      selected={block.section.name === selectedName}
                      onSelect={() => onSelect(block.section!.name)}
                      onRemove={() => onRemove(block.section!.name)}
                    />
                  )}
                  <DropZone
                    id={block.section ? sectionZoneId(block.section.name) : ROOT_ZONE_ID}
                    active={dragActive}
                    columns={block.section?.columns ?? 1}
                    minHeight={block.children.length === 0 ? 48 : undefined}
                  >
                    {block.children.length === 0 && (
                      <div className="col-span-full text-[11.5px] flex items-center justify-center" style={{ color: c.textSecondary }}>
                        Solte aqui
                      </div>
                    )}
                    {block.children.map((field) => (
                      <SortableField
                        key={field.name}
                        field={field}
                        selected={field.name === selectedName}
                        onSelect={() => onSelect(field.name)}
                        onRemove={() => onRemove(field.name)}
                      />
                    ))}
                  </DropZone>
                </div>
              ))}
            </div>
          </SortableContext>
        )}
      </ChannelScreenFrame>
    </div>
  );
}

// Contorno tracejado que só aparece durante um arrasto (dragActive), acende quando o cursor está
// em cima (isOver) — mostra de cara todo lugar onde dá pra soltar, inclusive uma seção ainda vazia
// (que sem isto não teria nenhum alvo de solta registrado).
function DropZone({
  id,
  active,
  columns,
  minHeight,
  children,
}: {
  id: string;
  active: boolean;
  columns: number;
  minHeight?: number;
  children: React.ReactNode;
}) {
  const { c } = useFlowTheme();
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className="grid gap-2 rounded-md transition-colors"
      style={{
        gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`,
        minHeight,
        outline: active ? `2px dashed ${isOver ? c.accent : c.border}` : 'none',
        outlineOffset: 4,
        background: active && isOver ? c.accentSoft : 'transparent',
      }}
    >
      {children}
    </div>
  );
}

function SortableField({
  field,
  selected,
  onSelect,
  onRemove,
}: {
  field: FormField;
  selected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}) {
  const { c } = useFlowTheme();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: field.name,
    data: { source: 'canvas' },
  });

  return (
    <div
      ref={setNodeRef}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className="group relative rounded-lg px-3 py-2 cursor-pointer"
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
        border: `1px solid ${selected ? c.accent : 'transparent'}`,
        background: selected ? c.accentSoft : 'transparent',
      }}
    >
      <div className="flex items-start gap-2">
        <button
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 mt-1 border-0 bg-transparent cursor-grab opacity-0 group-hover:opacity-100"
          style={{ color: c.textSecondary }}
          title="Arrastar"
        >
          <GripVertical size={14} />
        </button>
        {/* pointerEvents:none — mesmo padrão do canvas WEB (ScreenFieldNode em
            FormScreenCanvasWeb.tsx): isto é um builder, não o formulário sendo preenchido. Editar
            é sempre via painel de Configuração, que abre ao selecionar. */}
        <div className="flex-1 min-w-0" style={{ pointerEvents: 'none' }}>
          {field.type === 'SECTION' ? (
            <div className="text-[12.5px] font-semibold pb-1" style={{ color: c.textPrimary, borderBottom: `1px solid ${c.border}` }}>
              {field.label} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {field.columns ?? 1} coluna(s)</span>
            </div>
          ) : (
            <SduiFieldPreview node={fieldToSduiNode(field)} />
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="shrink-0 mt-1 border-0 bg-transparent cursor-pointer opacity-0 group-hover:opacity-100"
          style={{ color: c.danger }}
          title="Remover"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

