import { useDroppable } from '@dnd-kit/core';
import { useSortable, SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import {
  Text,
  Title2,
  TextField,
  EmailField,
  DecimalField,
  DateField,
  PhoneNumberField,
  PasswordField,
  Select,
  Checkbox,
  RadioButton,
  RadioGroup,
  Switch,
  Slider,
  Rating,
  FileUpload,
  ButtonSecondary,
  Divider,
  NakedCard,
  Callout,
  Stack,
  skinVars,
} from '@telefonica/mistica';
import { useFlowTheme } from './theme';
import { ChannelScreenFrame } from './ChannelScreenFrame';
import { groupFieldsBySections, ROOT_ZONE_ID, sectionZoneId } from './formScreenModel';
import type { FormField, FormFieldOption } from '../api/forms';
import type { ChannelType } from '../api/products';

export function FormScreenCanvas({
  fields,
  channelType,
  selectedName,
  dragActive,
  onSelect,
  onRemove,
}: {
  fields: FormField[];
  channelType: ChannelType;
  selectedName: string | null;
  /** Verdadeiro enquanto um arrasto está em andamento — só aí mostra o contorno das zonas de solta. */
  dragActive: boolean;
  onSelect: (name: string | null) => void;
  onRemove: (name: string) => void;
}) {
  const { c } = useFlowTheme();

  return (
    <div onClick={() => onSelect(null)} className="flex-1 overflow-y-auto p-4" style={{ background: c.canvasBg }}>
      <ChannelScreenFrame channelType={channelType}>
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
        <div className="flex-1 min-w-0">
          <FieldMisticaPreview field={field} />
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

// Renderização "de verdade" com componentes Mística — WYSIWYG do que o canal vai mostrar. Modo
// autoria, não coleta de dado: sem value/onChange controlado (visibleIf/dataSource ficam pra uma
// próxima rodada, ver formScreenModel.ts), só o suficiente pra mostrar a aparência e o rótulo.
export function FieldMisticaPreview({ field }: { field: FormField }) {
  const config = field.config ?? {};
  const options: FormFieldOption[] = field.options ?? [];

  switch (field.type) {
    case 'SECTION':
      return (
        <div className="text-[12.5px] font-semibold pb-1" style={{ color: skinVars.colors.textPrimary, borderBottom: `1px solid ${skinVars.colors.border}` }}>
          {field.label} <span style={{ fontWeight: 400, opacity: 0.6 }}>· {field.columns ?? 1} coluna(s)</span>
        </div>
      );
    case 'TEXT':
      return <Text size={14}>{field.label}</Text>;
    case 'TITLE':
      return <Title2>{field.label}</Title2>;
    case 'INPUT': {
      const subtype = field.inputSubtype ?? 'TEXT';
      if (subtype === 'EMAIL') return <EmailField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'NUMBER') return <DecimalField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'DATE') return <DateField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'PHONE') return <PhoneNumberField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'PASSWORD') return <PasswordField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      return <TextField name={field.name} label={field.label} optional={!field.required} fullWidth />;
    }
    case 'SINGLE_SELECT':
    case 'AUTOCOMPLETE':
      return (
        <Select
          name={field.name}
          label={field.label}
          optional={!field.required}
          fullWidth
          options={options.map((o) => ({ value: o.value, text: o.label }))}
        />
      );
    case 'MULTI_SELECT':
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          {options.map((o) => (
            <Checkbox key={o.value} name={`${field.name}::${o.value}`}>
              {o.label}
            </Checkbox>
          ))}
        </Stack>
      );
    case 'RADIO':
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <RadioGroup name={field.name}>
            {options.map((o) => (
              <RadioButton key={o.value} value={o.value}>
                {o.label}
              </RadioButton>
            ))}
          </RadioGroup>
        </Stack>
      );
    case 'SWITCH':
      return <Switch name={field.name}>{field.label}</Switch>;
    case 'SLIDER':
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <Slider name={field.name} min={Number(config.min ?? 0)} max={Number(config.max ?? 100)} step={Number(config.step ?? 1)} defaultValue={Number(config.min ?? 0)} />
        </Stack>
      );
    case 'RATING':
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <Rating value={0} />
        </Stack>
      );
    case 'STEPPER':
      // ponytail: Mística não tem um "stepper numérico" (+/-) — o componente Stepper de lá é um
      // indicador de progresso multi-etapa (steps/currentIndex), coisa bem diferente. Preview
      // simplificado por enquanto; se decidirmos manter esse tipo de campo, vale um input numérico
      // com botões +/- feito à mão.
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <DecimalField name={field.name} label="Valor" optional={!field.required} fullWidth />
        </Stack>
      );
    case 'FILE_UPLOAD':
      // FileUpload da Mística é "headless" pro botão — renderButton é obrigatório (sem ele, a lib
      // chama undefined como função e quebra o render). Mesmo botão que SduiFormRenderer já usa.
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <FileUpload
            id={field.name}
            name={field.name}
            accept={(field.acceptedExtensions ?? []).join(',')}
            renderButton={(buttonProps) => <ButtonSecondary {...buttonProps}>Selecionar arquivo</ButtonSecondary>}
          />
        </Stack>
      );
    case 'IMAGE': {
      const url = typeof config.url === 'string' ? config.url : '';
      return url ? (
        // eslint-disable-next-line -- preview de autoria, não é o render final do canal
        <img src={url} alt={typeof config.alt === 'string' ? config.alt : ''} className="max-w-full rounded-md" />
      ) : (
        <div className="text-[12px] p-3 rounded-md text-center" style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textSecondary }}>
          Sem URL configurada
        </div>
      );
    }
    case 'DIVIDER':
      return <Divider />;
    case 'CARD':
      return (
        <NakedCard
          title={field.label}
          description={typeof config.description === 'string' ? config.description : undefined}
        />
      );
    case 'CALLOUT': {
      const variant = config.variant === 'erro' ? 'inverse' : config.variant === 'aviso' ? 'default' : 'brand';
      return (
        <Callout
          variant={variant}
          title={field.label}
          description={typeof config.description === 'string' ? config.description : ''}
        />
      );
    }
    default:
      // Inalcançável: o switch já cobre todo FormFieldType (TS prova isso tipando `field` como
      // `never` aqui) — mantido só como rede de segurança contra um tipo novo esquecido no switch.
      return null;
  }
}
