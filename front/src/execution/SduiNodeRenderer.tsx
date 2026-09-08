import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Loader2 } from 'lucide-react';
import {
  ButtonPrimary,
  ButtonSecondary,
  ButtonDanger,
  ButtonLink,
  Callout,
  Checkbox,
  DateField,
  DecimalField,
  Divider,
  EmailField,
  IntegerField,
  Form,
  Image,
  Meter,
  PhoneNumberField,
  Select,
  Stack,
  Text,
  TextField,
  TextLink,
  Title2,
  skinVars,
} from '@telefonica/mistica';
import type { FormValues } from '@telefonica/mistica';
import type { SduiNode, SduiEvent } from '../sdui/model';

interface Props {
  sdui: SduiNode;
  onSubmit: (answers: Record<string, unknown>) => void;
  submitting: boolean;
}

// --- Resolução aproximada de tokens (seção 10 do catálogo) — cada alvo de renderização real
// resolveria contra o design system vigente; aqui é uma escala fixa razoável (o React Web deste
// admin não tem um resolvedor de token semântico por string), suficiente pro simulador de execução.
// ponytail: sem indireção de tema real — trocar por um resolvedor de verdade se/quando existir um.
const SPACING_PX: Record<string, number> = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };
const ELEVATION_SHADOW: Record<string, string> = { none: 'none', low: '0 1px 3px rgba(0,0,0,.12)', medium: '0 4px 12px rgba(0,0,0,.16)' };
const LAYOUT_WIDTH: Record<string, number> = { compact: 480, default: 640, wide: 960 };

function tokenSuffix(token: unknown): string {
  return typeof token === 'string' ? (token.split('.').pop() ?? '') : '';
}
function spacingOf(token: unknown, fallback = 0): number {
  return SPACING_PX[tokenSuffix(token)] ?? fallback;
}
function elevationOf(token: unknown): string {
  return ELEVATION_SHADOW[tokenSuffix(token)] ?? 'none';
}
function colorOf(token: unknown): string | undefined {
  const suffix = typeof token === 'string' ? token : '';
  if (suffix.includes('text.secondary')) return skinVars.colors.textSecondary;
  if (suffix.includes('text.primary')) return skinVars.colors.textPrimary;
  if (suffix.includes('feedback.negative')) return skinVars.colors.error;
  if (suffix.includes('background')) return skinVars.colors.background;
  return undefined;
}

function pascalCase(name: string): string {
  return name
    .split(/[-_\s]+/)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join('');
}

// name técnico (parte final do binding value.path = "form.<nome>") — mesma convenção do backend
// (FlowValidator.java/VariableConversion.java). Componentes sem binding de valor (conteúdo/ação/
// feedback) não têm nome, não entram no payload de respostas.
function fieldName(node: SduiNode): string | null {
  const path = node.bindings?.value?.path;
  return path?.startsWith('form.') ? path.slice('form.'.length) : null;
}

// Convenção server-side (ver ms-espec-registry, resolução por binding): o valor já resolvido do
// binding chega em props.value (chave sintética, fora do propsSchema autorado).
function initialValueOf(node: SduiNode): unknown {
  return node.props.value;
}

// Só os tipos com CommonFormFieldProps entram na coleta automática do <Form> da Mística
// (TextField/EmailField/.../Select/DateField) — mesmo subconjunto que o renderer anterior já usava.
const FORM_AUTO_COLLECTED = new Set(['ui.textInput', 'ui.select', 'ui.datePicker']);

function collectInitialValues(node: SduiNode, acc: Record<string, string>) {
  const name = fieldName(node);
  if (name && FORM_AUTO_COLLECTED.has(node.type)) {
    const value = initialValueOf(node);
    acc[name] = typeof value === 'string' ? value : '';
  }
  (node.children ?? []).forEach((child) => collectInitialValues(child, acc));
}

// ponytail: só avalia contra `extraValues` (checkbox/textArea, os únicos tipos que este renderer
// controla de verdade) — os campos coletados automaticamente pelo <Form> da Mística (textInput/
// select/datePicker) não têm seu valor exposto aqui sem um render-prop de Form nunca antes usado
// neste código (arriscado adivinhar), então uma visibilidade condicionada a um desses tipos não
// reage ao vivo no simulador ainda. Upgrade: expor o valor ao vivo desses campos quando houver uma
// necessidade real confirmada contra a API real do Form.
function evaluateCondition(condition: SduiNode['visibility'], extraValues: Record<string, unknown>): boolean {
  if (!condition || !condition.path.startsWith('form.')) return true;
  const name = condition.path.slice('form.'.length);
  const actual = extraValues[name];
  const expected = condition.value;
  const equal = String(actual ?? '') === String(expected ?? '');
  if (condition.rule === 'notEquals') return !equal;
  if (condition.rule === 'in') return Array.isArray(expected) && expected.includes(actual);
  if (condition.rule === 'notIn') return !(Array.isArray(expected) && expected.includes(actual));
  return equal;
}

export function SduiNodeRenderer({ sdui, onSubmit, submitting }: Props) {
  const [extraValues, setExtraValues] = useState<Record<string, unknown>>({});
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const initialValues: Record<string, string> = {};
  collectInitialValues(sdui, initialValues);

  function setExtraValue(name: string, value: unknown) {
    setExtraValues((prev) => ({ ...prev, [name]: value }));
  }

  function handleFormSubmit(formValues: FormValues) {
    onSubmit({ ...formValues, ...extraValues });
  }

  // action.submit é tratado nativamente pelo <ButtonPrimary submit> (ver FieldRenderer/ui.button) —
  // chega aqui só quando outro tipo de componente (link/card) foi configurado com essa ação, fora
  // do caminho principal. ponytail: sem os valores coletados pelo <Form> nesse caminho alternativo
  // (não exposto sem um render-prop nunca antes usado neste código) — só repassa extraValues.
  // Cobrir de verdade se um caso real precisar de action.submit fora de um ui.button.
  function dispatch(event: SduiEvent | undefined) {
    if (!event) return;
    const params = event.params ?? {};
    switch (event.action) {
      case 'action.submit':
        onSubmit(extraValues);
        return;
      case 'action.setValue': {
        const path = typeof params.path === 'string' ? params.path : '';
        if (path.startsWith('form.')) setExtraValue(path.slice('form.'.length), params.value);
        return;
      }
      case 'action.openUrl':
        if (typeof params.url === 'string') window.open(params.url, '_blank', 'noopener,noreferrer');
        return;
      case 'action.navigate':
      case 'action.track':
        return; // fora do escopo deste simulador — sem navegação SPA interna nem telemetria aqui
      case 'action.dismiss':
        return; // tratado no próprio FieldRenderer (fecha localmente via dismissed)
    }
  }

  return (
    <Form onSubmit={handleFormSubmit} initialValues={initialValues}>
      <FieldRenderer
        node={sdui}
        extraValues={extraValues}
        setExtraValue={setExtraValue}
        dismissed={dismissed}
        setDismissed={setDismissed}
        dispatch={dispatch}
        submitting={submitting}
      />
    </Form>
  );
}

function FieldRenderer({
  node,
  extraValues,
  setExtraValue,
  dismissed,
  setDismissed,
  dispatch,
  submitting,
}: {
  node: SduiNode;
  extraValues: Record<string, unknown>;
  setExtraValue: (name: string, value: unknown) => void;
  dismissed: Set<string>;
  setDismissed: (next: Set<string>) => void;
  dispatch: (event: SduiEvent | undefined) => void;
  submitting: boolean;
}) {
  if (dismissed.has(node.id) || !evaluateCondition(node.visibility, extraValues)) return null;
  const active = evaluateCondition(node.active, extraValues);

  const props = node.props;
  const label = (props.label as string | undefined) ?? '';
  const required = props.required === true;
  const name = fieldName(node);
  const children = node.children ?? [];

  const renderChild = (child: SduiNode) => (
    <FieldRenderer
      key={child.id}
      node={child}
      extraValues={extraValues}
      setExtraValue={setExtraValue}
      dismissed={dismissed}
      setDismissed={setDismissed}
      dispatch={dispatch}
      submitting={submitting}
    />
  );

  switch (node.type) {
    case 'ui.screen':
      return (
        <Stack space={24}>
          {typeof props.title === 'string' && props.title && <Title2>{props.title}</Title2>}
          <Stack space={24}>{children.map(renderChild)}</Stack>
        </Stack>
      );

    case 'ui.container':
      return (
        <div
          style={{
            padding: spacingOf(props.paddingToken),
            margin: spacingOf(props.marginToken),
            background: colorOf(props.backgroundToken),
            maxWidth: LAYOUT_WIDTH[tokenSuffix(props.maxWidthToken)],
          }}
        >
          <Stack space={16}>{children.map(renderChild)}</Stack>
        </div>
      );

    case 'ui.stack': {
      const direction = (props.direction as string | undefined) ?? 'vertical';
      const isRow = direction === 'horizontal';
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: isRow ? 'row' : 'column',
            flexWrap: 'nowrap',
            gap: spacingOf(props.spacingToken, 16),
            alignItems: ({ start: 'flex-start', end: 'flex-end', center: 'center', stretch: 'stretch' } as Record<string, string>)[String(props.alignment ?? 'stretch')] as React.CSSProperties['alignItems'],
          }}
        >
          {children.map(renderChild)}
        </div>
      );
    }

    case 'ui.card': {
      return (
        <div
          aria-disabled={!active}
          style={{
            padding: spacingOf(props.paddingToken, 16),
            boxShadow: elevationOf(props.elevationToken),
            borderRadius: 8,
            border: `1px solid ${skinVars.colors.border}`,
          }}
        >
          <Stack space={12}>{children.map(renderChild)}</Stack>
        </div>
      );
    }

    case 'ui.text':
      return (
        <Text
          size={tokenSuffix(props.variant).includes('heading') ? 17 : tokenSuffix(props.variant) === 'caption' ? 12 : 15}
          color={colorOf(props.colorToken) ?? skinVars.colors.textPrimary}
          textAlign={props.align as 'left' | 'center' | 'right' | undefined}
        >
          {props.text as string}
        </Text>
      );

    case 'ui.image': {
      const src = props.source as string | undefined;
      if (!src) return null;
      return <Image src={src} alt={(props.alt as string | undefined) ?? ''} width="100%" />;
    }

    case 'ui.icon': {
      const iconName = typeof props.name === 'string' ? pascalCase(props.name) : '';
      const IconComp =
        (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[iconName] ?? LucideIcons.Circle;
      return <IconComp size={20} color={colorOf(props.colorToken) ?? skinVars.colors.textPrimary} />;
    }

    case 'ui.divider':
      return <Divider />;

    case 'ui.spacer': {
      const size = spacingOf(props.sizeToken, 16);
      return props.axis === 'horizontal' ? <div style={{ width: size }} /> : <div style={{ height: size }} />;
    }

    case 'ui.textInput': {
      if (!name) return null;
      const inputMode = (props.inputMode as string | undefined) ?? 'text';
      const optional = !required;
      const question = (
        <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
          {label}
          {required ? ' *' : ''}
        </Text>
      );
      const field =
        inputMode === 'email' ? (
          <EmailField name={name} label="E-mail" optional={optional} fullWidth />
        ) : inputMode === 'tel' ? (
          <PhoneNumberField name={name} label="Telefone" optional={optional} fullWidth />
        ) : inputMode === 'number' ? (
          <IntegerField name={name} label="Valor" optional={optional} fullWidth />
        ) : inputMode === 'decimal' ? (
          <DecimalField name={name} label="Valor" optional={optional} fullWidth />
        ) : (
          <TextField name={name} label="Resposta" optional={optional} fullWidth maxLength={props.maxLength as number | undefined} />
        );
      return (
        <Stack space={8}>
          {question}
          {field}
        </Stack>
      );
    }

    // ponytail: sem componente Mística com precedente já testado no código pra área de texto —
    // fallback HTML puro (mesma decisão já tomada antes pra este caso, fora da coleta do <Form>).
    case 'ui.textArea': {
      if (!name) return null;
      const value = (extraValues[name] as string | undefined) ?? '';
      return (
        <Stack space={8}>
          <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
            {label}
            {required ? ' *' : ''}
          </Text>
          <textarea
            value={value}
            onChange={(e) => setExtraValue(name, e.target.value)}
            rows={(props.minLines as number | undefined) ?? 3}
            maxLength={props.maxLength as number | undefined}
            style={{ width: '100%', padding: 8, borderRadius: 6, border: `1px solid ${skinVars.colors.border}`, fontFamily: 'inherit', fontSize: 14 }}
          />
        </Stack>
      );
    }

    case 'ui.select': {
      if (!name) return null;
      const options = (props.options as { value: string; label: string }[] | undefined) ?? [];
      return (
        <Stack space={8}>
          <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
            {label}
            {required ? ' *' : ''}
          </Text>
          <Select name={name} label="Selecione" optional={!required} fullWidth options={options.map((o) => ({ value: o.value, text: o.label }))} />
        </Stack>
      );
    }

    case 'ui.checkbox': {
      if (!name) return null;
      const checked = extraValues[name] === true;
      return (
        <Checkbox name={name} checked={checked} onChange={(v) => setExtraValue(name, v)}>
          {label}
        </Checkbox>
      );
    }

    case 'ui.datePicker': {
      if (!name) return null;
      return (
        <Stack space={8}>
          <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
            {label}
            {required ? ' *' : ''}
          </Text>
          <DateField name={name} label="Data" optional={!required} fullWidth />
        </Stack>
      );
    }

    case 'ui.button': {
      const variant = props.variant as string | undefined;
      const onPress = node.events?.onPress;
      const isSubmit = onPress?.action === 'action.submit';
      const disabled = props.disabled === true || !active;
      // submit/onPress são mutuamente exclusivos na API da Mística — um botão de ação.submit usa a
      // coleta/validação nativa do <Form>; qualquer outra ação despacha manualmente.
      const commonProps = isSubmit
        ? { submit: true as const, showSpinner: submitting, disabled }
        : { onPress: () => dispatch(onPress), showSpinner: submitting, disabled };
      if (variant === 'secondary') return <ButtonSecondary {...commonProps}>{label}</ButtonSecondary>;
      if (variant === 'danger') return <ButtonDanger {...commonProps}>{label}</ButtonDanger>;
      if (variant === 'link') return <ButtonLink onPress={() => dispatch(onPress)}>{label}</ButtonLink>;
      return <ButtonPrimary {...commonProps}>{label}</ButtonPrimary>;
    }

    case 'ui.link': {
      const onPress = node.events?.onPress;
      return (
        <TextLink onPress={() => dispatch(onPress)} underline="always">
          {label}
        </TextLink>
      );
    }

    case 'ui.alert': {
      const severity = props.severity as string | undefined;
      // ponytail: Callout da Mística só tem variant default/brand/inverse, sem equivalente
      // semântico de negativo/aviso — mesmo gap já documentado no renderer anterior.
      const variant = severity === 'positive' || severity === 'informative' ? 'brand' : 'default';
      const onDismiss = node.events?.onDismiss;
      return (
        <Callout
          title={props.title as string | undefined}
          description={(props.message as string | undefined) ?? ''}
          variant={variant}
          onClose={
            props.dismissible === true
              ? () => {
                  setDismissed(new Set([...dismissed, node.id]));
                  dispatch(onDismiss);
                }
              : undefined
          }
        />
      );
    }

    case 'ui.progress': {
      const value = typeof props.value === 'number' ? props.value : 0;
      return (
        <Stack space={4}>
          {typeof props.label === 'string' && <Text size={13}>{props.label}</Text>}
          <Meter type="linear" values={[value]} />
        </Stack>
      );
    }

    // ponytail: sem spinner Mística com precedente testado — ícone lucide girando via CSS (mesma
    // decisão já tomada antes pra este caso).
    case 'ui.loading':
      return (
        <Stack space={4}>
          <Loader2 className="animate-spin" size={20} color={skinVars.colors.textPrimary} />
          {typeof props.label === 'string' && <Text size={13}>{props.label}</Text>}
        </Stack>
      );

    default:
      return null;
  }
}
