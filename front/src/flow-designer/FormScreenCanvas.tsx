import { useState } from 'react';
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
  SearchField,
  IntegerField,
  TimeField,
  PinField,
  IbanField,
  Select,
  Checkbox,
  RadioButton,
  RadioGroup,
  Switch,
  Slider,
  Rating,
  FileUpload,
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  ButtonLink,
  Divider,
  NakedCard,
  DataCard,
  MediaCard,
  Callout,
  Avatar,
  Badge,
  Tag,
  Meter,
  Tabs,
  Carousel,
  Table,
  Image,
  Stack,
  skinVars,
} from '@telefonica/mistica';
import { useFlowTheme } from './theme';
import { ChannelScreenFrame } from './ChannelScreenFrame';
import { groupFieldsBySections, ROOT_ZONE_ID, sectionZoneId, MOBILE_SIZE_PRESETS } from './formScreenModel';
import type { FormField, FormFieldOption } from '../api/forms';
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
      if (subtype === 'SEARCH') return <SearchField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'INTEGER') return <IntegerField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      if (subtype === 'TIME') return <TimeField name={field.name} label={field.label} optional={!field.required} fullWidth />;
      // ponytail: PinField não é um CommonFormFieldProps como os demais (sem label/optional) — é um
      // widget de OTP de tamanho fixo. Rótulo entra como Text separado, mesmo padrão já usado pra
      // RADIO/SWITCH/SLIDER mais abaixo.
      if (subtype === 'PIN')
        return (
          <Stack space={4}>
            <Text size={12.5} color={skinVars.colors.textSecondary}>
              {field.label}
            </Text>
            <PinField name={field.name} />
          </Stack>
        );
      if (subtype === 'IBAN') return <IbanField name={field.name} label={field.label} optional={!field.required} fullWidth />;
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
    case 'CARD': {
      const variant = config.variant as string | undefined;
      const description = typeof config.description === 'string' ? config.description : undefined;
      const imageUrl = typeof config.imageUrl === 'string' ? config.imageUrl : undefined;
      if (variant === 'data') return <DataCard title={field.label} description={description} />;
      if (variant === 'media')
        return <MediaCard title={field.label} description={description} imageSrc={imageUrl} mediaAspectRatio="16:9" />;
      return <NakedCard title={field.label} description={description} imageSrc={imageUrl} mediaAspectRatio="16:9" />;
    }
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
    case 'BUTTON': {
      const variant = config.variant as string | undefined;
      const label = field.label || 'Botão';
      if (variant === 'secondary') return <ButtonSecondary onPress={() => {}}>{label}</ButtonSecondary>;
      if (variant === 'danger') return <ButtonDanger onPress={() => {}}>{label}</ButtonDanger>;
      if (variant === 'link') return <ButtonLink onPress={() => {}}>{label}</ButtonLink>;
      return <ButtonPrimary onPress={() => {}}>{label}</ButtonPrimary>;
    }
    case 'AVATAR': {
      const initials = typeof config.initials === 'string' ? config.initials : undefined;
      const src = typeof config.imageUrl === 'string' ? config.imageUrl : undefined;
      const size = typeof config.size === 'number' ? config.size : 40;
      return <Avatar size={size} initials={initials} src={src} />;
    }
    case 'BADGE':
      return (
        <div className="flex items-center gap-2">
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <Badge value={typeof config.value === 'number' ? config.value : undefined} />
        </div>
      );
    case 'TAG': {
      const variant = (config.variant as TagVariant | undefined) ?? 'info';
      return <Tag type={variant}>{field.label}</Tag>;
    }
    case 'METER': {
      const meterValue = typeof config.value === 'number' ? config.value : 0;
      const meterType = (config.type as 'linear' | 'circular' | undefined) ?? 'linear';
      return (
        <Stack space={4}>
          <Text size={12.5} color={skinVars.colors.textSecondary}>
            {field.label}
          </Text>
          <Meter type={meterType} values={[meterValue]} />
        </Stack>
      );
    }
    case 'TABS':
      return <TabsPreview field={field} />;
    case 'CAROUSEL': {
      const items = Array.isArray(config.items) ? (config.items as CarouselItemConfig[]) : [];
      return (
        <Carousel
          items={items.map((it, i) => (
            <DataCard
              key={i}
              title={it.title ?? ''}
              description={it.description}
              asset={it.imageUrl ? <Image src={it.imageUrl} width={48} height={48} /> : undefined}
            />
          ))}
          withBullets
        />
      );
    }
    case 'TABLE': {
      const heading = Array.isArray(config.heading) ? (config.heading as { label?: string }[]).map((h) => h.label ?? '') : [];
      const rows = Array.isArray(config.rows)
        ? (config.rows as { cells?: string }[]).map((r) => (r.cells ?? '').split(';').map((cell) => cell.trim()))
        : [];
      return <Table heading={heading} content={rows} />;
    }
    default:
      // Inalcançável: o switch já cobre todo FormFieldType (TS prova isso tipando `field` como
      // `never` aqui) — mantido só como rede de segurança contra um tipo novo esquecido no switch.
      return null;
  }
}

type TagVariant = 'promo' | 'info' | 'active' | 'inactive' | 'success' | 'warning' | 'error';
type CarouselItemConfig = { title?: string; description?: string; imageUrl?: string };

// TABS precisa de estado local (aba selecionada) — como Hooks não podem entrar num case de switch
// condicional, isso vira um subcomponente próprio em vez de mais um `case` inline (CAROUSEL não
// precisa disso: o componente da Mística já é não controlado).
function TabsPreview({ field }: { field: FormField }) {
  const config = field.config ?? {};
  const items = Array.isArray(config.items) ? (config.items as { text?: string; content?: string }[]) : [];
  const [selectedIndex, setSelectedIndex] = useState(0);
  if (items.length === 0) return null;
  const safeIndex = Math.min(selectedIndex, items.length - 1);
  return (
    <Stack space={8}>
      <Tabs selectedIndex={safeIndex} onChange={setSelectedIndex} tabs={items.map((it) => ({ text: it.text ?? '' }))} />
      {items[safeIndex]?.content && <Text size={13.5}>{items[safeIndex].content}</Text>}
    </Stack>
  );
}
