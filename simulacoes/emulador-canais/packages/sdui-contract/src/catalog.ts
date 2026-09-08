import type { SduiActionType, SduiComponentType } from './types.js';

export type ComponentCategory = 'LAYOUT' | 'CONTENT' | 'INPUT' | 'ACTION' | 'FEEDBACK';
export type ReservedAttribute = '$bindings' | '$events' | '$visibility' | '$active';
export interface ComponentContract {
  type: SduiComponentType; version: '1.0.0'; category: ComponentCategory; container: boolean;
  required: readonly string[]; optional: readonly string[]; reserved: readonly ReservedAttribute[];
  events: readonly string[]; requiredBinding?: 'value';
}
const c = (type: SduiComponentType, category: ComponentCategory, container: boolean, required: string[], optional: string[], reserved: ReservedAttribute[], events: string[] = [], requiredBinding?: 'value'): ComponentContract =>
  ({ type, version: '1.0.0', category, container, required, optional, reserved, events, ...(requiredBinding ? { requiredBinding } : {}) });

export const COMPONENT_CATALOG_V1: Readonly<Record<SduiComponentType, ComponentContract>> = {
  'ui.screen': c('ui.screen', 'LAYOUT', true, [], ['title', 'backgroundToken', 'scrollable', 'paddingToken'], []),
  'ui.container': c('ui.container', 'LAYOUT', true, [], ['backgroundToken', 'paddingToken', 'borderRadiusToken'], ['$visibility', '$active']),
  'ui.stack': c('ui.stack', 'LAYOUT', true, [], ['direction', 'spacingToken', 'alignment'], ['$visibility', '$active']),
  'ui.card': c('ui.card', 'LAYOUT', true, [], ['variant', 'paddingToken', 'elevationToken'], ['$visibility', '$active']),
  'ui.text': c('ui.text', 'CONTENT', false, ['text'], ['variant', 'colorToken', 'align', 'maxLines'], ['$bindings', '$visibility']),
  'ui.image': c('ui.image', 'CONTENT', false, ['source', 'alt'], ['fit', 'aspectRatio'], ['$bindings', '$visibility']),
  'ui.icon': c('ui.icon', 'CONTENT', false, ['name', 'accessibilityLabel'], ['sizeToken', 'colorToken'], ['$visibility']),
  'ui.divider': c('ui.divider', 'CONTENT', false, [], ['orientation', 'colorToken', 'spacingToken'], ['$visibility']),
  'ui.spacer': c('ui.spacer', 'CONTENT', false, ['sizeToken'], ['axis'], ['$visibility']),
  'ui.textInput': c('ui.textInput', 'INPUT', false, ['label'], ['placeholder', 'inputMode', 'required', 'readOnly', 'maxLength', 'validation'], ['$bindings', '$visibility', '$active'], [], 'value'),
  'ui.textArea': c('ui.textArea', 'INPUT', false, ['label'], ['placeholder', 'required', 'readOnly', 'minLines', 'maxLines', 'maxLength', 'validation'], ['$bindings', '$visibility', '$active'], [], 'value'),
  'ui.select': c('ui.select', 'INPUT', false, ['label', 'options'], ['placeholder', 'required', 'searchable'], ['$bindings', '$visibility', '$active'], [], 'value'),
  'ui.checkbox': c('ui.checkbox', 'INPUT', false, ['label'], ['required', 'indeterminate'], ['$bindings', '$visibility', '$active'], [], 'value'),
  'ui.datePicker': c('ui.datePicker', 'INPUT', false, ['label', 'mode'], ['minDate', 'maxDate', 'format', 'required', 'validation'], ['$bindings', '$visibility', '$active'], [], 'value'),
  'ui.button': c('ui.button', 'ACTION', false, ['label'], ['variant', 'size', 'fullWidth', 'loading', 'disabled'], ['$events', '$visibility', '$active'], ['onPress']),
  'ui.link': c('ui.link', 'ACTION', false, ['label'], ['emphasis', 'external', 'accessibilityLabel'], ['$events', '$visibility', '$active'], ['onPress']),
  'ui.alert': c('ui.alert', 'FEEDBACK', false, ['severity', 'message'], ['title', 'dismissible'], ['$bindings', '$events', '$visibility', '$active'], ['onDismiss']),
  'ui.progress': c('ui.progress', 'FEEDBACK', false, ['value'], ['label', 'showValue'], ['$bindings', '$visibility']),
  'ui.loading': c('ui.loading', 'FEEDBACK', false, [], ['label', 'sizeToken', 'overlay'], ['$visibility']),
};
export const VALID_BINDING_NAMESPACES = ['form', 'data', 'session', 'route', 'computed'] as const;
export const VALID_CONDITION_RULES = ['equals', 'notEquals', 'in', 'notIn'] as const;
export const VALID_ACTIONS: readonly SduiActionType[] = ['action.submit', 'action.navigate', 'action.openUrl', 'action.setValue', 'action.track', 'action.dismiss'];
export const INPUT_COMPONENTS: ReadonlySet<SduiComponentType> = new Set(['ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker']);
