export const SDUI_COMPONENT_TYPES = [
  'ui.screen',
  'ui.container',
  'ui.stack',
  'ui.card',
  'ui.text',
  'ui.image',
  'ui.icon',
  'ui.divider',
  'ui.spacer',
  'ui.textInput',
  'ui.textArea',
  'ui.select',
  'ui.checkbox',
  'ui.datePicker',
  'ui.button',
  'ui.link',
  'ui.alert',
  'ui.progress',
  'ui.loading',
] as const;

export type SduiComponentType = (typeof SDUI_COMPONENT_TYPES)[number];

export const RENDER_TARGETS = [
  'react.web',
  'react.mobile',
  'flutter.web',
  'flutter.mobile',
] as const;

export type RenderTarget = (typeof RENDER_TARGETS)[number];

export const SDUI_ACTION_TYPES = [
  'action.submit',
  'action.navigate',
  'action.openUrl',
  'action.setValue',
  'action.track',
  'action.dismiss',
] as const;

export type SduiActionType = (typeof SDUI_ACTION_TYPES)[number];
export type BindingMode = 'oneWay' | 'twoWay';
export type BindingNamespace = 'form' | 'data' | 'session' | 'route' | 'computed';
export type VisibilityRule = 'equals' | 'notEquals' | 'in' | 'notIn';
export type ComponentVersion = `${number}.${number}`;

export type SpacingToken = `spacing.${'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'}` | string;
export type ColorToken = `color.${string}`;
export type TypographyToken = `typography.${string}`;
export type RadiusToken = `radius.${string}`;
export type ElevationToken = `elevation.${string}`;
export type SizeToken = `size.${string}`;
export type LayoutToken = `layout.${string}`;

export interface SduiBinding {
  path: `${BindingNamespace}.${string}`;
  mode: BindingMode;
}

export interface SduiEvent {
  action: SduiActionType;
  params?: Record<string, unknown> | null;
}

export interface SduiVisibility {
  rule: VisibilityRule;
  path: `${BindingNamespace}.${string}`;
  value: unknown;
}

export interface ValidationRule {
  rule: string;
  value?: unknown;
  message: string;
}

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface ScreenProps {
  title?: string;
  backgroundToken?: ColorToken;
  scrollable?: boolean;
  paddingToken?: SpacingToken;
}

export interface ContainerProps {
  paddingToken?: SpacingToken;
  marginToken?: SpacingToken;
  backgroundToken?: ColorToken;
  borderToken?: ColorToken;
  maxWidthToken?: LayoutToken;
}

export interface StackProps {
  direction: 'vertical' | 'horizontal' | 'responsive';
  gapToken?: SpacingToken;
  align?: string;
  justify?: string;
  wrap?: boolean;
}

export interface CardProps {
  variant?: string;
  paddingToken?: SpacingToken;
  elevationToken?: ElevationToken;
  interactive?: boolean;
}

export interface TextProps {
  text: string;
  variant?: TypographyToken | string;
  colorToken?: ColorToken;
  align?: string;
  maxLines?: number;
}

export interface ImageProps {
  source: string;
  alt: string;
  fit?: string;
  aspectRatio?: number;
}

export interface IconProps {
  name: string;
  sizeToken?: SizeToken;
  colorToken?: ColorToken;
  accessibilityLabel: string;
}

export interface DividerProps {
  orientation?: string;
  colorToken?: ColorToken;
  spacingToken?: SpacingToken;
}

export interface SpacerProps {
  sizeToken: SpacingToken;
  axis?: string;
}

export interface TextInputProps {
  label: string;
  placeholder?: string;
  inputMode?: 'text' | 'email' | 'tel' | 'number' | 'decimal' | 'url';
  required?: boolean;
  readOnly?: boolean;
  maxLength?: number;
  validation?: ValidationRule[];
  value?: unknown;
}

export interface TextAreaProps {
  label: string;
  placeholder?: string;
  required?: boolean;
  minLines?: number;
  maxLines?: number;
  maxLength?: number;
  validation?: ValidationRule[];
  value?: unknown;
}

export interface SelectProps {
  label: string;
  placeholder?: string;
  options: SelectOption[];
  required?: boolean;
  searchable?: boolean;
  value?: unknown;
}

export interface CheckboxProps {
  label: string;
  required?: boolean;
  indeterminate?: boolean;
  value?: unknown;
}

export interface DatePickerProps {
  label: string;
  mode?: 'date' | 'time' | 'dateTime';
  minDate?: string;
  maxDate?: string;
  format?: string;
  required?: boolean;
  value?: unknown;
}

export interface ButtonProps {
  label: string;
  variant?: string;
  size?: string;
  fullWidth?: boolean;
  loading?: boolean;
  disabled?: boolean;
}

export interface LinkProps {
  label: string;
  emphasis?: string;
  external?: boolean;
  accessibilityLabel?: string;
}

export interface AlertProps {
  severity?: string;
  title?: string;
  message: string;
  dismissible?: boolean;
}

export interface ProgressProps {
  value: number;
  label?: string;
  showValue?: boolean;
}

export interface LoadingProps {
  label?: string;
  sizeToken?: SizeToken;
  overlay?: boolean;
}

export interface SduiPropsByType {
  'ui.screen': ScreenProps;
  'ui.container': ContainerProps;
  'ui.stack': StackProps;
  'ui.card': CardProps;
  'ui.text': TextProps;
  'ui.image': ImageProps;
  'ui.icon': IconProps;
  'ui.divider': DividerProps;
  'ui.spacer': SpacerProps;
  'ui.textInput': TextInputProps;
  'ui.textArea': TextAreaProps;
  'ui.select': SelectProps;
  'ui.checkbox': CheckboxProps;
  'ui.datePicker': DatePickerProps;
  'ui.button': ButtonProps;
  'ui.link': LinkProps;
  'ui.alert': AlertProps;
  'ui.progress': ProgressProps;
  'ui.loading': LoadingProps;
}

export interface SduiNode<T extends SduiComponentType = SduiComponentType> {
  id: string;
  type: T;
  version: ComponentVersion;
  props: SduiPropsByType[T] & Record<string, unknown>;
  bindings?: Record<string, SduiBinding> | null;
  events?: Record<string, SduiEvent> | null;
  visibility?: SduiVisibility | null;
  children?: SduiNode[] | null;
}

export interface SduiSnapshot {
  schemaVersion: ComponentVersion;
  catalogVersion: ComponentVersion;
  journeyId: string;
  screenId: string;
  revision: number;
  status: 'published' | string;
  publishedAt: string;
  supportedTargets: RenderTarget[];
  minRendererVersion: Partial<Record<RenderTarget, string>>;
  root: SduiNode<'ui.screen'>;
}

export type SduiDocument = SduiNode<'ui.screen'> | SduiSnapshot;

