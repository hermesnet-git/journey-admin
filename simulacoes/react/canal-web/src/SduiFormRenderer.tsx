import { useState } from 'react';
import {
  ButtonLayout,
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  ButtonLink,
  Callout,
  Checkbox,
  Counter,
  DataCard,
  MediaCard,
  NakedCard,
  DateField,
  DecimalField,
  Divider,
  EmailField,
  SearchField,
  IntegerField,
  TimeField,
  PinField,
  IbanField,
  PhoneNumberField,
  PasswordField,
  FileItem,
  FileUpload,
  Form,
  Image,
  RadioButton,
  RadioGroup,
  Rating,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextField,
  Title2,
  Avatar,
  Badge,
  Tag,
  Meter,
  Tabs,
  Carousel,
  Table,
  skinVars,
} from '@telefonica/mistica';
import type { FormValues } from '@telefonica/mistica';
import type { SduiNode } from './api';

interface Props {
  sdui: SduiNode;
  onSubmit: (answers: Record<string, unknown>) => void;
  submitting: boolean;
  /** WEB usa posição livre (x/y/width já vem em cada prop, calculado pelo backend) — os demais
   * canais mantêm o fluxo linear de sempre. */
  channelType: string;
}

type OptionSpec = { label: string; value: string };
type TagVariant = 'promo' | 'info' | 'active' | 'inactive' | 'success' | 'warning' | 'error';

// name técnico do campo -> valor de cada campo que não se integra à coleta automática do Form da
// Mística (só componentes baseados em CommonFormFieldProps o fazem — TextField/Select/DecimalField/
// DateField/EmailField). Checkbox (multiselect), RadioGroup, Switch, Slider, Rating e Counter ficam
// de fora disso, então cada um guarda seu valor aqui e entra no payload final na hora do submit.
const MULTISELECT_SEPARATOR = '::';

export function SduiFormRenderer({ sdui, onSubmit, submitting, channelType }: Props) {
  const children = (sdui[2] ?? []) as SduiNode[];
  const [extraValues, setExtraValues] = useState<Record<string, unknown>>({});

  // Sem initialValues, o Form começa com values[name] undefined até a 1ª digitação — os campos
  // tipados (DecimalField/DateField) passam esse undefined direto pro <input>, que o React acusa
  // como "uncontrolled virando controlled" assim que o primeiro valor chega. Uma string vazia por
  // campo (name/select) evita essa transição. Percorre também dentro de seções, já que os campos
  // continuam registrados pelo mesmo Form ao redor de tudo.
  const initialValues: Record<string, string> = {};
  collectInitialValues(children, initialValues);

  function handleFormSubmit(values: FormValues) {
    const answers: Record<string, unknown> = { ...values, ...extraValues };
    onSubmit(answers);
  }

  function setExtraValue(name: string, value: unknown) {
    setExtraValues((prev) => ({ ...prev, [name]: value }));
  }

  function toggleMultiselect(name: string, optionValue: string, checked: boolean) {
    setExtraValues((prev) => {
      const current = (prev[name] as string[] | undefined) ?? [];
      const next = checked ? [...current, optionValue] : current.filter((v) => v !== optionValue);
      return { ...prev, [name]: next };
    });
  }

  return (
    <Form onSubmit={handleFormSubmit} initialValues={initialValues}>
      <Stack space={24}>
        {channelType === 'WEB' ? (
          <WebPositionedFields nodes={children} extraValues={extraValues} onSetExtraValue={setExtraValue} onToggleMultiselect={toggleMultiselect} />
        ) : (
          children.map((child, i) => (
            <FieldRenderer
              key={i}
              node={child}
              extraValues={extraValues}
              onSetExtraValue={setExtraValue}
              onToggleMultiselect={toggleMultiselect}
            />
          ))
        )}
        <ButtonLayout align="right" primaryButton={<ButtonPrimary submit showSpinner={submitting}>Avançar</ButtonPrimary>} />
      </Stack>
    </Form>
  );
}

// Telas WEB são posicionadas livremente (x/y/width já vêm calculados em cada prop pelo backend,
// FormSduiSerializer.serializeWeb — inclusive a cascata de fallback pra campo legado sem posição
// salva, então não precisa duplicar essa fórmula aqui, só ler o valor).
function WebPositionedFields({
  nodes,
  extraValues,
  onSetExtraValue,
  onToggleMultiselect,
}: {
  nodes: SduiNode[];
  extraValues: Record<string, unknown>;
  onSetExtraValue: (name: string, value: unknown) => void;
  onToggleMultiselect: (name: string, optionValue: string, checked: boolean) => void;
}) {
  const maxBottom = nodes.reduce((max, [, props]) => {
    const y = typeof props.y === 'number' ? props.y : 0;
    return Math.max(max, y + 40);
  }, 0);
  return (
    <div style={{ position: 'relative', width: 720, minHeight: maxBottom }}>
      {nodes.map((node, i) => {
        const [, props] = node;
        const x = typeof props.x === 'number' ? props.x : 40;
        const y = typeof props.y === 'number' ? props.y : 40;
        const width = typeof props.width === 'number' ? props.width : 320;
        const height = typeof props.height === 'number' ? props.height : undefined;
        return (
          <div key={i} style={{ position: 'absolute', left: x, top: y, width, height }}>
            <FieldRenderer node={node} extraValues={extraValues} onSetExtraValue={onSetExtraValue} onToggleMultiselect={onToggleMultiselect} />
          </div>
        );
      })}
    </div>
  );
}

function collectInitialValues(nodes: SduiNode[], acc: Record<string, string>) {
  for (const [tag, props, nodeChildren] of nodes) {
    // ui.input é o único tag que a serialização do backend preenche com defaultValue (inclusive já
    // resolvido de um {{token}} — ver StepResolver.resolveSduiNode) — os demais nunca tiveram esse
    // prop, então continuam só com a string vazia de sempre.
    if (tag === 'ui.input' && typeof props.name === 'string') {
      const defaultValue = props.defaultValue;
      acc[props.name] = typeof defaultValue === 'string' ? defaultValue : '';
    } else if ((tag === 'ui.select' || tag === 'ui.autocomplete') && typeof props.name === 'string') {
      acc[props.name] = '';
    }
    if (tag === 'ui.section') {
      collectInitialValues((nodeChildren ?? []) as SduiNode[], acc);
    }
  }
}

// Noop compartilhado pelas 2 props de callback do preview somente-leitura (SduiFieldPreview) — uma
// função só, não uma nova por render, já que nenhuma delas precisa fazer nada mesmo.
function noop() {}

// Preview somente-leitura de UM node SDUI — reaproveitado pelo form builder (FormScreenCanvas/
// FormScreenCanvasWeb/FormScreenPreview) pra desenhar exatamente o que a execução real desenha,
// campo a campo. Antes disso o builder tinha uma implementação Mística própria e separada
// (FieldMisticaPreview), que foi divergindo desta aqui com o tempo — ex.: só esta sabia colocar a
// pergunta completa acima do campo (withQuestion), o que fazia telas WEB (posição livre/absoluta)
// sobrepor componentes na execução real sem sobrepor no editor, já que a altura medida no editor
// não incluía essa linha extra.
export function SduiFieldPreview({ node }: { node: SduiNode }) {
  return <FieldRenderer node={node} extraValues={{}} onSetExtraValue={noop} onToggleMultiselect={noop} />;
}

export function FieldRenderer({
  node,
  extraValues,
  onSetExtraValue,
  onToggleMultiselect,
}: {
  node: SduiNode;
  extraValues: Record<string, unknown>;
  onSetExtraValue: (name: string, value: unknown) => void;
  onToggleMultiselect: (name: string, optionValue: string, checked: boolean) => void;
}) {
  const [tag, props, nodeChildren] = node;
  const name = props.name as string | undefined;
  const label = (props.label as string | undefined) ?? name ?? '';
  const required = props.required === true;
  const optional = !required;

  if (tag === 'ui.text') {
    return (
      <Stack space={4}>
        <Text size={15} color={skinVars.colors.textPrimary}>
          {props.text as string}
        </Text>
        {props.helpText != null && (
          <Text size={13} color={skinVars.colors.textSecondary}>
            {props.helpText as string}
          </Text>
        )}
      </Stack>
    );
  }

  if (tag === 'ui.title') {
    return <Title2>{label}</Title2>;
  }

  if (tag === 'ui.divider') {
    return <Divider />;
  }

  if (tag === 'ui.image') {
    const url = props.url as string | undefined;
    if (!url) return null;
    return <Image src={url} alt={(props.alt as string | undefined) ?? label} width="100%" />;
  }

  if (tag === 'ui.card') {
    const imageUrl = props.imageUrl as string | undefined;
    const description = props.description as string | undefined;
    const variant = props.variant as string | undefined;
    if (variant === 'data')
      return (
        <DataCard
          title={label}
          description={description}
          asset={imageUrl ? <Image src={imageUrl} width={64} height={64} /> : undefined}
        />
      );
    if (variant === 'media') return <MediaCard title={label} description={description} imageSrc={imageUrl} mediaAspectRatio="16:9" />;
    return <NakedCard title={label} description={description} imageSrc={imageUrl} mediaAspectRatio="16:9" />;
  }

  if (tag === 'ui.callout') {
    // ponytail: o schema de configuração (FormFieldConfigPanel) oferece variant
    // info/aviso/erro, mas o Callout da Mística só tem default/brand/inverse — sem um
    // equivalente semântico de aviso/erro. Cai pra "default" fora desses dois.
    const rawVariant = props.variant as string | undefined;
    const variant = rawVariant === 'brand' || rawVariant === 'inverse' ? rawVariant : 'default';
    return <Callout title={label} description={(props.description as string | undefined) ?? ''} variant={variant} />;
  }

  if (tag === 'ui.button') {
    const variant = props.variant as string | undefined;
    const href = props.href as string | undefined;
    const newTab = props.newTab === true;
    const buttonProps = href ? { href, newTab } : { onPress: () => {} };
    if (variant === 'secondary') return <ButtonSecondary {...buttonProps}>{label}</ButtonSecondary>;
    if (variant === 'danger') return <ButtonDanger {...buttonProps}>{label}</ButtonDanger>;
    if (variant === 'link') return <ButtonLink {...buttonProps}>{label}</ButtonLink>;
    return <ButtonPrimary {...buttonProps}>{label}</ButtonPrimary>;
  }

  if (tag === 'ui.avatar') {
    const initials = props.initials as string | undefined;
    const src = props.imageUrl as string | undefined;
    const size = (props.size as number | undefined) ?? 40;
    return <Avatar size={size} initials={initials} src={src} />;
  }

  if (tag === 'ui.badge') {
    return (
      <Stack space={4}>
        <Text size={13} color={skinVars.colors.textSecondary}>
          {label}
        </Text>
        <Badge value={props.value as number | undefined} />
      </Stack>
    );
  }

  if (tag === 'ui.tag') {
    const variant = (props.variant as TagVariant | undefined) ?? 'info';
    return <Tag type={variant}>{label}</Tag>;
  }

  if (tag === 'ui.meter') {
    const value = (props.value as number | undefined) ?? 0;
    const meterType = (props.type as 'linear' | 'circular' | undefined) ?? 'linear';
    return (
      <Stack space={4}>
        <Text size={13} color={skinVars.colors.textSecondary}>
          {label}
        </Text>
        <Meter type={meterType} values={[value]} />
      </Stack>
    );
  }

  if (tag === 'ui.tabs') {
    const items = (props.items as { text?: string; content?: string }[] | undefined) ?? [];
    return <TabsField items={items} />;
  }

  if (tag === 'ui.carousel') {
    const items = (props.items as { title?: string; description?: string; imageUrl?: string }[] | undefined) ?? [];
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

  if (tag === 'ui.table') {
    const heading = (props.heading as { label?: string }[] | undefined)?.map((h) => h.label ?? '') ?? [];
    const rows =
      (props.rows as { cells?: string }[] | undefined)?.map((r) => (r.cells ?? '').split(';').map((cell) => cell.trim())) ?? [];
    return <Table heading={heading} content={rows} />;
  }

  if (tag === 'ui.section') {
    const columns = (props.columns as number | undefined) ?? 1;
    const sectionChildren = (nodeChildren ?? []) as SduiNode[];
    return (
      <Stack space={12}>
        {label && (
          <Text size={16} weight="medium" color={skinVars.colors.textPrimary}>
            {label}
          </Text>
        )}
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))`, gap: 24 }}>
          {sectionChildren.map((child, i) => (
            <FieldRenderer
              key={i}
              node={child}
              extraValues={extraValues}
              onSetExtraValue={onSetExtraValue}
              onToggleMultiselect={onToggleMultiselect}
            />
          ))}
        </div>
      </Stack>
    );
  }

  if (!name) {
    return null;
  }

  // O rótulo da SDUI costuma ser a pergunta inteira ("Como você avalia..."), não um nome curto de
  // campo — o slot de "label" da Mística (TextField/Select/...) é pensado pro segundo caso e trunca
  // o primeiro. Por isso a pergunta vira um texto normal acima, e o próprio campo recebe um rótulo
  // curto e genérico (mesmo padrão usado nos demais tipos abaixo, que já faziam isso).
  const question = (
    <Text size={15} weight="medium" color={skinVars.colors.textPrimary}>
      {label}
      {required ? ' *' : ' (opcional)'}
    </Text>
  );

  if (tag === 'ui.input') {
    const inputType = props.type as string | undefined;
    const pattern = props.pattern as string | undefined;
    const min = props.min as number | undefined;
    const max = props.max as number | undefined;
    const maxLength = typeof props.maxLength === 'number' ? props.maxLength : undefined;
    // Alinhamento do rótulo — "top" (padrão, pergunta em cima) ou "left"/"right" (lado a lado).
    // config.labelPosition só existe pra ui.input (form builder só oferece isso pra INPUT hoje).
    const labelPosition = (props.labelPosition as string | undefined) ?? 'top';
    const withQuestion = (fieldEl: React.ReactNode) =>
      labelPosition === 'left' || labelPosition === 'right' ? (
        <div style={{ display: 'flex', flexDirection: labelPosition === 'left' ? 'row' : 'row-reverse', alignItems: 'center', gap: 12 }}>
          <div style={{ flexShrink: 0, maxWidth: '45%' }}>{question}</div>
          <div style={{ flex: 1, minWidth: 0 }}>{fieldEl}</div>
        </div>
      ) : (
        <Stack space={8}>
          {question}
          {fieldEl}
        </Stack>
      );

    if (inputType === 'email') {
      return withQuestion(<EmailField name={name} label="E-mail" optional={optional} fullWidth />);
    }
    if (inputType === 'number') {
      return withQuestion(
        <DecimalField
          name={name}
          label="Valor"
          optional={optional}
          fullWidth
          validate={(value) => {
            if (value === undefined || value === '') return undefined;
            const n = Number(value);
            if (min !== undefined && n < min) return `O valor mínimo é ${min}`;
            if (max !== undefined && n > max) return `O valor máximo é ${max}`;
            return undefined;
          }}
        />,
      );
    }
    if (inputType === 'date') {
      return withQuestion(<DateField name={name} label="Data" optional={optional} fullWidth />);
    }
    if (inputType === 'search') {
      return withQuestion(<SearchField name={name} label="Buscar" optional={optional} fullWidth />);
    }
    if (inputType === 'integer') {
      return withQuestion(<IntegerField name={name} label="Valor" optional={optional} fullWidth />);
    }
    if (inputType === 'time') {
      return withQuestion(<TimeField name={name} label="Horário" optional={optional} fullWidth />);
    }
    if (inputType === 'iban') {
      return withQuestion(<IbanField name={name} label="IBAN" optional={optional} fullWidth />);
    }
    if (inputType === 'phone') {
      return withQuestion(<PhoneNumberField name={name} label="Telefone" optional={optional} fullWidth />);
    }
    if (inputType === 'password') {
      return withQuestion(<PasswordField name={name} label="Senha" optional={optional} fullWidth />);
    }
    if (inputType === 'pin') {
      // ponytail: PinField não é um CommonFormFieldProps (sem label/optional) — widget de OTP de
      // tamanho fixo, mesma adaptação já usada no preview do editor (FormScreenCanvas.tsx).
      return withQuestion(<PinField name={name} />);
    }
    return withQuestion(
      <TextField
        name={name}
        label="Sua resposta"
        optional={optional}
        fullWidth
        maxLength={maxLength}
        validate={(value) => {
          if (!pattern || !value) return undefined;
          return new RegExp(pattern).test(String(value)) ? undefined : 'Formato inválido';
        }}
      />,
    );
  }

  if (tag === 'ui.select' || tag === 'ui.autocomplete') {
    // ponytail: dataSource (busca remota) ainda não é resolvida aqui — options estáticas por
    // enquanto, mesma limitação já assumida no form builder (COMPONENT_PROPERTIES/AUTOCOMPLETE).
    const options = (props.options as OptionSpec[] | undefined) ?? [];
    return (
      <Stack space={8}>
        {question}
        <Select
          name={name}
          label="Selecione uma opção"
          optional={optional}
          fullWidth
          options={options.map((o) => ({ value: o.value, text: o.label }))}
        />
      </Stack>
    );
  }

  if (tag === 'ui.multiselect') {
    const options = (props.options as OptionSpec[] | undefined) ?? [];
    const selected = (extraValues[name] as string[] | undefined) ?? [];
    return (
      <Stack space={8}>
        {question}
        <Stack space={4}>
          {options.map((o) => (
            <Checkbox
              key={o.value}
              name={`${name}${MULTISELECT_SEPARATOR}${o.value}`}
              checked={selected.includes(o.value)}
              onChange={(checked) => onToggleMultiselect(name, o.value, checked)}
            >
              {o.label}
            </Checkbox>
          ))}
        </Stack>
      </Stack>
    );
  }

  if (tag === 'ui.radio') {
    const options = (props.options as OptionSpec[] | undefined) ?? [];
    const selected = (extraValues[name] as string | undefined) ?? '';
    return (
      <Stack space={8}>
        {question}
        <RadioGroup name={name} value={selected} onChange={(value) => onSetExtraValue(name, value)}>
          <Stack space={4}>
            {options.map((o) => (
              <RadioButton key={o.value} value={o.value}>
                {o.label}
              </RadioButton>
            ))}
          </Stack>
        </RadioGroup>
      </Stack>
    );
  }

  if (tag === 'ui.switch') {
    const checked = (extraValues[name] as boolean | undefined) ?? false;
    return (
      <Stack space={8}>
        {question}
        <Switch name={name} checked={checked} onChange={(value) => onSetExtraValue(name, value)} aria-label={label} />
      </Stack>
    );
  }

  if (tag === 'ui.slider') {
    const min = props.min as number | undefined;
    const max = props.max as number | undefined;
    const step = props.step as number | undefined;
    const value = (extraValues[name] as number | undefined) ?? min ?? 0;
    return (
      <Stack space={8}>
        {question}
        <Slider name={name} min={min} max={max} step={step} value={value} onChangeValue={(v) => onSetExtraValue(name, v)} />
      </Stack>
    );
  }

  if (tag === 'ui.rating') {
    // ponytail: config chama a chave de "max" (máximo de estrelas), mas o prop da Mística é "count".
    const count = props.max as number | undefined;
    const value = (extraValues[name] as number | undefined) ?? 0;
    return (
      <Stack space={8}>
        {question}
        <Rating count={count} value={value} onChangeValue={(v) => onSetExtraValue(name, v)} />
      </Stack>
    );
  }

  if (tag === 'ui.stepper') {
    const min = props.min as number | undefined;
    const max = props.max as number | undefined;
    const value = (extraValues[name] as number | undefined) ?? min ?? 0;
    return (
      <Stack space={8}>
        {question}
        <Counter min={min} max={max} value={value} onChangeValue={(v) => onSetExtraValue(name, v)} />
      </Stack>
    );
  }

  if (tag === 'ui.upload') {
    // ponytail: FileUpload não expõe o arquivo escolhido ao componente pai fora do modo "render"
    // completo (dropzone/lista própria) — como nenhuma jornada atual usa o valor do upload em
    // outputMapping/condição de gateway, ele fica só visual (não entra no payload de "answers").
    // Upgrade: se algum fluxo passar a depender do nome do arquivo, trocar para o modo "render".
    const acceptedExtensions = props.acceptedExtensions as string[] | undefined;
    return (
      <Stack space={8}>
        {question}
        <FileUpload
          id={name}
          name={name}
          accept={acceptedExtensions?.join(',')}
          renderButton={(buttonProps) => <ButtonSecondary {...buttonProps}>Selecionar arquivo</ButtonSecondary>}
          renderFiles={({ files, removeFile }) =>
            files && files.length > 0 ? (
              <Stack space={4}>
                {Array.from(files).map((file) => (
                  <FileItem key={file.name} file={file} onRemove={removeFile} />
                ))}
              </Stack>
            ) : null
          }
        />
      </Stack>
    );
  }

  return null;
}

// TABS precisa de estado local (aba selecionada) — Hooks não podem entrar num `if` condicional
// dentro de FieldRenderer, então vira um subcomponente próprio (mesma solução usada no preview do
// editor, FormScreenCanvas.tsx/TabsPreview). CAROUSEL não precisa disso: o componente da Mística
// já é não controlado.
function TabsField({ items }: { items: { text?: string; content?: string }[] }) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  if (items.length === 0) return null;
  const safeIndex = Math.min(selectedIndex, items.length - 1);
  return (
    <Stack space={8}>
      <Tabs selectedIndex={safeIndex} onChange={setSelectedIndex} tabs={items.map((it) => ({ text: it.text ?? '' }))} />
      {items[safeIndex]?.content && <Text size={14}>{items[safeIndex].content}</Text>}
    </Stack>
  );
}
