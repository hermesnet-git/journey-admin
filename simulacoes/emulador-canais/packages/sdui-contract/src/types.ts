export const SDUI_COMPONENT_TYPES = [
  'ui.screen', 'ui.container', 'ui.stack', 'ui.card', 'ui.text', 'ui.image',
  'ui.icon', 'ui.divider', 'ui.spacer', 'ui.textInput', 'ui.textArea',
  'ui.select', 'ui.checkbox', 'ui.datePicker', 'ui.button', 'ui.link',
  'ui.alert', 'ui.progress', 'ui.loading',
] as const;

export type SduiComponentType = (typeof SDUI_COMPONENT_TYPES)[number];
export const RENDER_TARGETS = ['react.web', 'react.mobile', 'flutter.web', 'flutter.mobile', 'whatsapp'] as const;
export type RenderTarget = (typeof RENDER_TARGETS)[number];
export const SDUI_ACTION_TYPES = ['action.submit', 'action.navigate', 'action.openUrl', 'action.setValue', 'action.track', 'action.dismiss'] as const;
export type SduiActionType = (typeof SDUI_ACTION_TYPES)[number];
export type BindingMode = 'oneWay' | 'twoWay';
export type BindingNamespace = 'form' | 'data' | 'session' | 'route' | 'computed';
export type ConditionRule = 'equals' | 'notEquals' | 'in' | 'notIn';
export type ComponentVersion = `${number}.${number}.${number}`;

export interface SduiBinding { path: `${BindingNamespace}.${string}`; mode: BindingMode }
export interface SduiEvent { action: SduiActionType; params?: Record<string, unknown> | null }
export interface SduiCondition { rule: ConditionRule; path: `${BindingNamespace}.${string}`; value: unknown }
export interface ValidationRule { rule: string; value?: unknown; message: string }
export interface SelectOption { value: string; label: string; disabled?: boolean }

export type SduiAttributes = Record<string, unknown> & {
  id: string;
  version: ComponentVersion;
  $bindings?: Record<string, SduiBinding>;
  $events?: Record<string, SduiEvent>;
  $visibility?: SduiCondition;
  $active?: SduiCondition;
};

export type SduiLeafTuple = readonly [SduiComponentType, SduiAttributes];
export type SduiContainerTuple = readonly [SduiComponentType, SduiAttributes, readonly SduiTuple[]];
export type SduiTuple = SduiLeafTuple | SduiContainerTuple;
export type SduiScreenTuple = readonly ['ui.screen', SduiAttributes, readonly SduiTuple[]];

export interface SduiSnapshot {
  schemaVersion: ComponentVersion;
  catalogVersion: ComponentVersion;
  journeyId: string;
  journeyVersion: number;
  uiStepId: string;
  status: 'published' | 'deprecated';
  publishedAt: string;
  supportedTargets: RenderTarget[];
  minRendererVersion: Partial<Record<RenderTarget, ComponentVersion>>;
  dataSources: Record<string, never>;
  data: SduiScreenTuple;
}

export type SduiDocument = SduiScreenTuple | SduiSnapshot;

/** Árvore normalizada exclusivamente para uso interno de runtimes e adapters. */
export interface SduiNode<T extends SduiComponentType = SduiComponentType> {
  id: string;
  type: T;
  version: ComponentVersion;
  attributes: Record<string, unknown>;
  bindings: Record<string, SduiBinding>;
  events: Record<string, SduiEvent>;
  visibility: SduiCondition | null;
  active: SduiCondition | null;
  children: SduiNode[];
}
