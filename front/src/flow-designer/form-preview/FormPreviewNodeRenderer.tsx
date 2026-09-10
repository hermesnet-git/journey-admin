import { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { Loader2 } from 'lucide-react';
import { ButtonDanger, ButtonPrimary, ButtonSecondary, Callout, Divider, Image, Meter, Stack, Text, TextLink, Title2, skinVars } from '@telefonica/mistica';
import type { SduiNode } from '../../sdui/model';
import type { DesignChannel } from '../form-builder/designChannel';

const SPACING: Record<string, number> = { none: 0, xs: 4, sm: 8, md: 16, lg: 24, xl: 32 };

function suffix(value: unknown): string {
  return typeof value === 'string' ? value.split('.').pop() ?? '' : '';
}

function spacing(value: unknown, fallback = 0): number {
  return SPACING[suffix(value)] ?? fallback;
}

function color(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  if (value === 'color.background.primary' || value === 'color.surface.default') return skinVars.colors.background;
  if (value === 'color.background.secondary' || value === 'color.surface.highlight') return skinVars.colors.backgroundAlternative;
  if (value === 'color.background.elevated' || value === 'color.surface.selected') return skinVars.colors.backgroundContainer;
  if (value === 'color.background.inverse') return skinVars.colors.textPrimary;
  if (value === 'color.surface.disabled') return skinVars.colors.backgroundAlternative;
  if (value === 'color.text.primary') return skinVars.colors.textPrimary;
  if (value === 'color.text.secondary' || value === 'color.text.disabled') return skinVars.colors.textSecondary;
  if (value === 'color.text.inverse') return skinVars.colors.background;
  if (value === 'color.border.default') return skinVars.colors.border;
  if (value === 'color.border.strong' || value === 'color.border.focus') return skinVars.colors.brand;
  if (value === 'color.border.error' || value === 'color.action.danger' || value === 'color.feedback.negative') return skinVars.colors.error;
  if (value === 'color.action.primary') return skinVars.colors.buttonPrimaryBackground;
  if (value === 'color.action.secondary' || value === 'color.feedback.info') return skinVars.colors.brand;
  if (value === 'color.feedback.success') return skinVars.colors.success;
  if (value === 'color.feedback.warning') return skinVars.colors.brand;
  return undefined;
}

function text(node: SduiNode, name: string, fallback = ''): string {
  const value = node.props[name];
  return typeof value === 'string' && value ? value : fallback;
}

const staticFieldStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', borderRadius: 8, border: `1px solid ${skinVars.colors.border}`,
  padding: '10px 12px', background: skinVars.colors.background, color: skinVars.colors.textSecondary,
  fontFamily: 'inherit', fontSize: 14,
};

function valueKey(node: SduiNode): string {
  return node.bindings?.value?.path ?? node.id;
}

function StaticField({
  node,
  multiline = false,
  disabled,
  values,
  onValueChange,
}: {
  node: SduiNode;
  multiline?: boolean;
  disabled: boolean;
  values: Record<string, string | boolean>;
  onValueChange: (key: string, value: string | boolean) => void;
}) {
  const label = text(node, 'label', 'Campo sem rótulo');
  const placeholder = text(node, 'placeholder', multiline ? 'Digite uma resposta' : 'Preencha este campo');
  const key = valueKey(node);
  const value = typeof values[key] === 'string' ? values[key] as string : '';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <Text size={13.5} weight="medium">{label}{node.props.required === true ? ' *' : ''}</Text>
      {multiline
        ? <textarea disabled={disabled} rows={Number(node.props.minLines) || 3} placeholder={placeholder} value={value} onChange={(event) => onValueChange(key, event.target.value)} style={{ ...staticFieldStyle, resize: 'vertical' }} />
        : <input disabled={disabled} placeholder={placeholder} value={value} onChange={(event) => onValueChange(key, event.target.value)} style={staticFieldStyle} />}
    </label>
  );
}

/** Renderer exclusivamente visual do Form Designer. Nenhum controle dispara evento ou coleta valor. */
export function FormPreviewNodeRenderer({ node, channel }: { node: SduiNode; channel: Extract<DesignChannel, 'WEB' | 'MOBILE'> }) {
  const [values, setValues] = useState<Record<string, string | boolean>>({});
  function handleValueChange(key: string, value: string | boolean) {
    setValues((current) => ({ ...current, [key]: value }));
  }
  return <PreviewNode node={node} channel={channel} values={values} onValueChange={handleValueChange} />;
}

function PreviewNode({
  node,
  channel,
  values,
  onValueChange,
}: {
  node: SduiNode;
  channel: Extract<DesignChannel, 'WEB' | 'MOBILE'>;
  values: Record<string, string | boolean>;
  onValueChange: (key: string, value: string | boolean) => void;
}) {
  const children = (node.children ?? []).map((child) => (
    <PreviewNode key={child.id} node={child} channel={channel} values={values} onValueChange={onValueChange} />
  ));
  const disabled = node.props.disabled === true || node.props.readOnly === true;
  const mobile = channel === 'MOBILE';

  switch (node.type) {
    case 'ui.screen':
      return <Stack space={mobile ? 16 : 24}>{text(node, 'title') && <Title2>{text(node, 'title')}</Title2>}<Stack space={mobile ? 16 : 24}>{children}</Stack></Stack>;
    case 'ui.container':
      return <div style={{ padding: spacing(node.props.paddingToken), background: color(node.props.backgroundToken), borderRadius: spacing(node.props.borderRadiusToken) }}><Stack space={16}>{children}</Stack></div>;
    case 'ui.stack':
      return <div style={{ display: 'flex', flexDirection: node.props.direction === 'horizontal' ? 'row' : 'column', flexWrap: mobile && node.props.direction === 'horizontal' ? 'wrap' : undefined, gap: spacing(node.props.spacingToken, mobile ? 12 : 16), alignItems: String(node.props.alignment ?? 'stretch') as React.CSSProperties['alignItems'] }}>{children}</div>;
    case 'ui.card':
      return <div style={{ padding: spacing(node.props.paddingToken, 16), border: `1px solid ${skinVars.colors.border}`, borderRadius: 10, boxShadow: suffix(node.props.elevationToken) === 'medium' ? '0 6px 18px rgba(0,0,0,.14)' : suffix(node.props.elevationToken) === 'low' ? '0 2px 8px rgba(0,0,0,.10)' : 'none' }}><Stack space={12}>{children}</Stack></div>;
    case 'ui.text':
      return <Text size={suffix(node.props.variant) === 'caption' ? 12 : suffix(node.props.variant).includes('heading') ? 18 : 15} color={color(node.props.colorToken)} textAlign={node.props.align as 'left' | 'center' | 'right' | undefined}>{text(node, 'text', 'Texto')}</Text>;
    case 'ui.image':
      return text(node, 'source') ? <div style={{ maxHeight: mobile ? 220 : 360, overflow: 'hidden' }}><Image src={text(node, 'source')} alt={text(node, 'alt')} width="100%" /></div> : <div style={{ ...staticFieldStyle, textAlign: 'center' }}>{text(node, 'alt', 'Prévia da imagem')}</div>;
    case 'ui.icon': {
      const name = text(node, 'name', 'Circle').replace(/(^|-|_)(\w)/g, (_, __, letter: string) => letter.toUpperCase());
      const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ size?: number; color?: string }>>)[name] ?? LucideIcons.Circle;
      return <Icon size={20} color={color(node.props.colorToken)} />;
    }
    case 'ui.divider':
      return <Divider />;
    case 'ui.spacer':
      return <div style={node.props.axis === 'horizontal' ? { width: spacing(node.props.sizeToken, 16) } : { height: spacing(node.props.sizeToken, 16) }} />;
    case 'ui.textInput':
      return <StaticField node={node} disabled={disabled} values={values} onValueChange={onValueChange} />;
    case 'ui.textArea':
      return <StaticField node={node} multiline disabled={disabled} values={values} onValueChange={onValueChange} />;
    case 'ui.select': {
      const options = Array.isArray(node.props.options) ? node.props.options as { label?: string; value?: string }[] : [];
      const key = valueKey(node);
      const value = typeof values[key] === 'string' ? values[key] as string : '';
      return (
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <Text size={13.5} weight="medium">{text(node, 'label', 'Seleção')}{node.props.required === true ? ' *' : ''}</Text>
          <select disabled={disabled} value={value} onChange={(event) => onValueChange(key, event.target.value)} style={{ ...staticFieldStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}>
            <option value="">{text(node, 'placeholder', 'Selecione uma opção')}</option>
            {options.map((option, index) => {
              const optionValue = String(option.value ?? option.label ?? index);
              return <option key={`${optionValue}-${index}`} value={optionValue}>{option.label ?? optionValue}</option>;
            })}
          </select>
        </label>
      );
    }
    case 'ui.checkbox':
      return <label style={{ display: 'flex', alignItems: 'center', gap: 8, opacity: disabled ? .55 : 1 }}><input type="checkbox" disabled={disabled} checked={values[valueKey(node)] === true} onChange={(event) => onValueChange(valueKey(node), event.target.checked)} /><Text size={13.5}>{text(node, 'label', 'Confirmação')}{node.props.required === true ? ' *' : ''}</Text></label>;
    case 'ui.datePicker':
      return <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}><Text size={13.5} weight="medium">{text(node, 'label', 'Data')}{node.props.required === true ? ' *' : ''}</Text><input disabled={disabled} value={typeof values[valueKey(node)] === 'string' ? values[valueKey(node)] as string : ''} onChange={(event) => onValueChange(valueKey(node), event.target.value)} type={node.props.mode === 'time' ? 'time' : node.props.mode === 'datetime' ? 'datetime-local' : 'date'} style={staticFieldStyle} /></label>;
    case 'ui.button': {
      const label = text(node, 'label', 'Botão');
      const noop = () => {};
      if (node.props.variant === 'secondary') return <ButtonSecondary disabled={disabled} onPress={noop}>{label}</ButtonSecondary>;
      if (node.props.variant === 'danger') return <ButtonDanger disabled={disabled} onPress={noop}>{label}</ButtonDanger>;
      return <ButtonPrimary disabled={disabled} onPress={noop}>{label}</ButtonPrimary>;
    }
    case 'ui.link':
      return <TextLink disabled={disabled} onPress={() => {}} underline="always">{text(node, 'label', 'Link')}</TextLink>;
    case 'ui.alert':
      return <Callout variant={node.props.severity === 'positive' || node.props.severity === 'informative' ? 'brand' : 'default'} title={text(node, 'title') || undefined} description={text(node, 'message', 'Mensagem de alerta')} />;
    case 'ui.progress':
      return <Stack space={4}>{text(node, 'label') && <Text size={13}>{text(node, 'label')}</Text>}<Meter type="linear" values={[typeof node.props.value === 'number' ? node.props.value : 0]} /></Stack>;
    case 'ui.loading':
      return <Stack space={4}><Loader2 size={20} /><Text size={13}>{text(node, 'label', 'Carregando…')}</Text></Stack>;
    default:
      return null;
  }
}
