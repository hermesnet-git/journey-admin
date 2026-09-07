import { useState, useSyncExternalStore, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react';
import {
  ButtonDanger,
  ButtonLink,
  ButtonPrimary,
  ButtonSecondary,
  Callout,
  Checkbox,
  DateField,
  Divider,
  IconCloseRegular,
  IconInformationRegular,
  IconSuccess,
  IconWarningRegular,
  Meter,
  Select,
  Spinner,
  Stack,
  Text,
  TextFieldBase,
  TextLink,
  Title2,
  skinVars,
} from '@telefonica/mistica';
import type { SduiNode } from '@elastic-journey/sdui-contract';
import type { FieldError, SduiRuntime } from '@elastic-journey/sdui-runtime';
import { align, color, elevation, iconSize, justify, maxWidth, spacing } from './tokens.js';

export interface RendererDiagnostic {
  code: string;
  nodeId: string;
  message: string;
}

export interface IconAdapterProps {
  size: number;
  color?: string;
  'aria-label'?: string;
}

export type IconRegistry = Record<string, (props: IconAdapterProps) => ReactNode>;

export interface SduiRendererProps {
  runtime: SduiRuntime;
  submitting?: boolean;
  iconRegistry?: IconRegistry;
  onDiagnostics?: (diagnostic: RendererDiagnostic) => void;
}

const DEFAULT_ICONS: IconRegistry = {
  info: (props) => <IconInformationRegular {...props} />,
  information: (props) => <IconInformationRegular {...props} />,
  warning: (props) => <IconWarningRegular {...props} />,
  success: (props) => <IconSuccess {...props} />,
  close: (props) => <IconCloseRegular {...props} />,
};

function stringValue(value: unknown): string {
  return value == null ? '' : String(value);
}

function dateValue(value: unknown): Date | undefined {
  if (typeof value !== 'string' || value === 'today') return undefined;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.valueOf()) ? undefined : date;
}

function eventValue(node: SduiNode, value: string): unknown {
  const inputMode = node.props.inputMode;
  if ((inputMode === 'number' || inputMode === 'decimal') && value !== '') return Number(value);
  return value;
}

function typography(node: SduiNode): { size: number; weight?: 'regular' | 'medium' | 'bold' } {
  const variant = String(node.props.variant ?? 'typography.body.regular');
  if (variant.includes('heading')) return { size: 20, weight: 'bold' };
  if (variant.includes('caption')) return { size: 12, weight: 'regular' };
  return { size: 16, weight: variant.includes('medium') ? 'medium' : 'regular' };
}

export function SduiRenderer({ runtime, submitting = false, iconRegistry, onDiagnostics }: SduiRendererProps) {
  useSyncExternalStore(runtime.subscribe.bind(runtime), runtime.getRevision, runtime.getRevision);
  const [errors, setErrors] = useState<FieldError[]>([]);

  const errorFor = (node: SduiNode): string | undefined => errors.find((error) => error.nodeId === node.id)?.message;

  const change = async (node: SduiNode, value: unknown): Promise<void> => {
    runtime.setNodeValue(node, value);
    setErrors((current) => current.filter((error) => error.nodeId !== node.id));
    await runtime.dispatch(node, 'onChange');
  };

  const dispatch = async (node: SduiNode, eventName: string): Promise<void> => {
    const result = await runtime.dispatch(node, eventName);
    setErrors(result.errors);
  };

  const renderNode = (node: SduiNode): ReactNode => {
    if (!runtime.isVisible(node)) return null;
    const props = node.props;
    const children = (node.children ?? []).map((child) => <div key={child.id}>{renderNode(child)}</div>);
    const text = (value: unknown): string => runtime.resolveText(value);

    switch (node.type) {
      case 'ui.screen': {
        const content = (
          <Stack space={16}>
            {typeof props.title === 'string' && props.title ? <Title2>{text(props.title)}</Title2> : null}
            {children}
          </Stack>
        );
        return (
          <main
            className="ej-sdui-screen"
            aria-label={text(props.title) || undefined}
            style={{
              background: color(props.backgroundToken),
              padding: spacing(props.paddingToken, 16),
              overflowY: props.scrollable === false ? 'hidden' : 'auto',
            }}
          >
            {content}
          </main>
        );
      }

      case 'ui.container':
        return (
          <section
            style={{
              background: color(props.backgroundToken),
              border: props.borderToken ? `1px solid ${color(props.borderToken) ?? skinVars.colors.border}` : undefined,
              boxSizing: 'border-box',
              margin: spacing(props.marginToken),
              maxWidth: maxWidth(props.maxWidthToken),
              padding: spacing(props.paddingToken),
              width: '100%',
            }}
          >
            {children}
          </section>
        );

      case 'ui.stack': {
        const direction = String(props.direction ?? 'vertical');
        return (
          <div
            className={`ej-sdui-stack${direction === 'responsive' ? ' ej-sdui-stack-responsive' : ''}`}
            style={{
              alignItems: align(props.align),
              flexDirection: direction === 'horizontal' ? 'row' : direction === 'vertical' ? 'column' : undefined,
              flexWrap: props.wrap === true ? 'wrap' : 'nowrap',
              gap: spacing(props.gapToken, 16),
              justifyContent: justify(props.justify),
            }}
          >
            {children}
          </div>
        );
      }

      case 'ui.card': {
        const interactive = props.interactive === true && Boolean(node.events?.onPress);
        const activate = (): void => { if (interactive) void dispatch(node, 'onPress'); };
        const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
          if (interactive && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            activate();
          }
        };
        return (
          <div
            className={interactive ? 'ej-sdui-card-interactive' : undefined}
            onClick={activate}
            onKeyDown={onKeyDown}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            style={{
              background: skinVars.colors.backgroundContainer,
              border: `1px solid ${skinVars.colors.border}`,
              borderRadius: 10,
              boxShadow: elevation(props.elevationToken),
              padding: spacing(props.paddingToken, 16),
            }}
          >
            {children}
          </div>
        );
      }

      case 'ui.text': {
        const preset = typography(node);
        const style: CSSProperties = props.maxLines
          ? { display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: Number(props.maxLines) }
          : {};
        return <Text size={preset.size} weight={preset.weight} color={color(props.colorToken) ?? skinVars.colors.textPrimary} textAlign={props.align as never} as="div"><span style={style}>{text(props.text)}</span></Text>;
      }

      case 'ui.image': {
        const source = text(props.source);
        if (!source) return null;
        return (
          <img
            src={source}
            alt={text(props.alt)}
            style={{ aspectRatio: typeof props.aspectRatio === 'number' ? String(props.aspectRatio) : undefined, display: 'block', maxWidth: '100%', objectFit: props.fit as CSSProperties['objectFit'], width: '100%' }}
          />
        );
      }

      case 'ui.icon': {
        const registry = { ...DEFAULT_ICONS, ...iconRegistry };
        const name = String(props.name ?? '').toLowerCase();
        const factory = registry[name];
        if (!factory) {
          onDiagnostics?.({ code: 'ICON_NOT_MAPPED', nodeId: node.id, message: `Ícone '${name}' não mapeado para react.web.` });
          return <IconInformationRegular size={iconSize(props.sizeToken)} color={color(props.colorToken)} aria-label={text(props.accessibilityLabel)} />;
        }
        return factory({ size: iconSize(props.sizeToken), color: color(props.colorToken), 'aria-label': text(props.accessibilityLabel) });
      }

      case 'ui.divider':
        return props.orientation === 'vertical'
          ? <div aria-hidden="true" style={{ alignSelf: 'stretch', borderLeft: `1px solid ${color(props.colorToken) ?? skinVars.colors.border}`, marginInline: spacing(props.spacingToken, 8) }} />
          : <div style={{ marginBlock: spacing(props.spacingToken, 8) }}><Divider /></div>;

      case 'ui.spacer': {
        const size = spacing(props.sizeToken, 16);
        return <div aria-hidden="true" style={props.axis === 'horizontal' ? { width: size } : { height: size }} />;
      }

      case 'ui.textInput': {
        const fieldError = errorFor(node);
        const mode = String(props.inputMode ?? 'text');
        return (
          <TextFieldBase
            id={node.id}
            name={node.id}
            label={text(props.label)}
            placeholder={text(props.placeholder)}
            type={mode === 'email' || mode === 'url' ? mode : mode === 'tel' ? 'tel' : mode === 'number' || mode === 'decimal' ? 'number' : 'text'}
            inputMode={mode}
            required={props.required === true}
            readOnly={props.readOnly === true}
            maxLength={typeof props.maxLength === 'number' ? props.maxLength : undefined}
            fullWidth
            value={stringValue(runtime.getNodeValue(node))}
            error={Boolean(fieldError)}
            helperText={fieldError}
            onChange={(event) => void change(node, eventValue(node, event.currentTarget.value))}
            onBlur={() => void dispatch(node, 'onBlur')}
          />
        );
      }

      case 'ui.textArea': {
        const fieldError = errorFor(node);
        return (
          <label htmlFor={node.id}>
            <Stack space={8}>
              <Text size={14} weight="medium">{text(props.label)}{props.required === true ? ' *' : ''}</Text>
              <textarea
                className="ej-sdui-text-area"
                id={node.id}
                value={stringValue(runtime.getNodeValue(node))}
                placeholder={text(props.placeholder)}
                required={props.required === true}
                rows={typeof props.minLines === 'number' ? props.minLines : 3}
                maxLength={typeof props.maxLength === 'number' ? props.maxLength : undefined}
                aria-invalid={Boolean(fieldError)}
                aria-describedby={fieldError ? `${node.id}-error` : undefined}
                onChange={(event) => void change(node, event.currentTarget.value)}
                onBlur={() => void dispatch(node, 'onBlur')}
              />
              {fieldError ? <Text id={`${node.id}-error`} size={13} color={skinVars.colors.error}>{fieldError}</Text> : null}
            </Stack>
          </label>
        );
      }

      case 'ui.select': {
        const fieldError = errorFor(node);
        const options = Array.isArray(props.options) ? props.options : [];
        return (
          <Select
            id={node.id}
            name={node.id}
            label={text(props.label)}
            value={stringValue(runtime.getNodeValue(node))}
            options={options.filter((option) => !option.disabled).map((option) => ({ value: String(option.value), text: text(option.label) }))}
            optional={props.required !== true}
            fullWidth
            native={!props.searchable}
            error={Boolean(fieldError)}
            helperText={fieldError ?? text(props.placeholder)}
            onChangeValue={(value) => void change(node, value)}
          />
        );
      }

      case 'ui.checkbox': {
        const fieldError = errorFor(node);
        return (
          <div>
            <Checkbox
              id={node.id}
              name={node.id}
              checked={runtime.getNodeValue(node) === true}
              onChange={(value) => void change(node, value)}
              aria-label={text(props.label)}
            >
              {text(props.label)}
            </Checkbox>
            {fieldError ? <Text size={13} color={skinVars.colors.error}>{fieldError}</Text> : null}
          </div>
        );
      }

      case 'ui.datePicker': {
        const fieldError = errorFor(node);
        const mode = String(props.mode ?? 'date');
        if (mode !== 'date') {
          return (
            <TextFieldBase
              id={node.id}
              name={node.id}
              label={text(props.label)}
              type={mode === 'time' ? 'time' : 'datetime-local'}
              required={props.required === true}
              fullWidth
              value={stringValue(runtime.getNodeValue(node))}
              error={Boolean(fieldError)}
              helperText={fieldError}
              onChange={(event) => void change(node, event.currentTarget.value)}
            />
          );
        }
        return (
          <DateField
            name={node.id}
            label={text(props.label)}
            value={stringValue(runtime.getNodeValue(node))}
            optional={props.required !== true}
            fullWidth
            min={dateValue(props.minDate)}
            max={props.maxDate === 'today' ? new Date() : dateValue(props.maxDate)}
            error={Boolean(fieldError)}
            helperText={fieldError}
            onChangeValue={(value) => void change(node, value)}
          />
        );
      }

      case 'ui.button': {
        const label = text(props.label);
        const common = {
          onPress: () => dispatch(node, 'onPress'),
          showSpinner: submitting || props.loading === true,
          disabled: props.disabled === true,
          small: props.size === 'small',
          style: props.fullWidth === true ? { width: '100%' } : undefined,
        };
        if (props.variant === 'secondary') return <ButtonSecondary {...common}>{label}</ButtonSecondary>;
        if (props.variant === 'danger') return <ButtonDanger {...common}>{label}</ButtonDanger>;
        if (props.variant === 'link') return <ButtonLink onPress={() => dispatch(node, 'onPress')}>{label}</ButtonLink>;
        return <ButtonPrimary {...common}>{label}</ButtonPrimary>;
      }

      case 'ui.link':
        return <TextLink onPress={() => dispatch(node, 'onPress')} underline={props.emphasis === 'low' ? 'on hover' : 'always'} aria-label={text(props.accessibilityLabel) || undefined}>{text(props.label)}</TextLink>;

      case 'ui.alert':
        return (
          <Callout
            title={text(props.title) || undefined}
            description={text(props.message)}
            variant={props.severity === 'positive' || props.severity === 'informative' ? 'brand' : 'default'}
            role={props.severity === 'negative' ? 'alert' : 'status'}
            closeButtonLabel="Fechar aviso"
            onClose={props.dismissible === true ? () => {
              if (node.events?.onDismiss) void dispatch(node, 'onDismiss');
              else runtime.dismiss(node.id);
            } : undefined}
          />
        );

      case 'ui.progress': {
        const rawValue = typeof props.value === 'number' ? props.value : 0;
        const value = Math.min(100, Math.max(0, rawValue <= 1 ? rawValue * 100 : rawValue));
        return (
          <Stack space={8}>
            {props.label ? <Text size={14}>{text(props.label)}</Text> : null}
            <Meter type="linear" values={[value]} aria-label={text(props.label) || 'Progresso'} />
            {props.showValue === true ? <Text size={12}>{Math.round(value)}%</Text> : null}
          </Stack>
        );
      }

      case 'ui.loading': {
        const body = <Stack space={8}><Spinner size={iconSize(props.sizeToken)} aria-label={text(props.label) || 'Carregando'} />{props.label ? <Text size={13}>{text(props.label)}</Text> : null}</Stack>;
        return props.overlay === true ? <div className="ej-sdui-loading-overlay">{body}</div> : body;
      }

      default:
        onDiagnostics?.({ code: 'COMPONENT_NOT_RENDERED', nodeId: node.id, message: `Componente '${String(node.type)}' sem adapter react.web.` });
        return null;
    }
  };

  return <>{renderNode(runtime.root)}</>;
}
