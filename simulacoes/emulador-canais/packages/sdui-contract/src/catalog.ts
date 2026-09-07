import type { SduiActionType, SduiComponentType } from './types.js';

export type ComponentCategory = 'LAYOUT' | 'CONTENT' | 'INPUT' | 'ACTION' | 'FEEDBACK';

export interface ComponentContract {
  type: SduiComponentType;
  version: '1.0';
  level: 0 | 1 | 2 | 3;
  category: ComponentCategory;
  allowsChildren: boolean;
  requiredProps: readonly string[];
  events: readonly string[];
}

const define = (contract: ComponentContract): ComponentContract => contract;

export const COMPONENT_CATALOG_V1: Readonly<Record<SduiComponentType, ComponentContract>> = {
  'ui.screen': define({ type: 'ui.screen', version: '1.0', level: 1, category: 'LAYOUT', allowsChildren: true, requiredProps: [], events: [] }),
  'ui.container': define({ type: 'ui.container', version: '1.0', level: 1, category: 'LAYOUT', allowsChildren: true, requiredProps: [], events: [] }),
  'ui.stack': define({ type: 'ui.stack', version: '1.0', level: 1, category: 'LAYOUT', allowsChildren: true, requiredProps: ['direction'], events: [] }),
  'ui.card': define({ type: 'ui.card', version: '1.0', level: 1, category: 'LAYOUT', allowsChildren: true, requiredProps: [], events: ['onPress'] }),
  'ui.text': define({ type: 'ui.text', version: '1.0', level: 0, category: 'CONTENT', allowsChildren: false, requiredProps: ['text'], events: [] }),
  'ui.image': define({ type: 'ui.image', version: '1.0', level: 0, category: 'CONTENT', allowsChildren: false, requiredProps: ['source', 'alt'], events: [] }),
  'ui.icon': define({ type: 'ui.icon', version: '1.0', level: 0, category: 'CONTENT', allowsChildren: false, requiredProps: ['name', 'accessibilityLabel'], events: [] }),
  'ui.divider': define({ type: 'ui.divider', version: '1.0', level: 0, category: 'CONTENT', allowsChildren: false, requiredProps: [], events: [] }),
  'ui.spacer': define({ type: 'ui.spacer', version: '1.0', level: 0, category: 'CONTENT', allowsChildren: false, requiredProps: ['sizeToken'], events: [] }),
  'ui.textInput': define({ type: 'ui.textInput', version: '1.0', level: 2, category: 'INPUT', allowsChildren: false, requiredProps: ['label'], events: ['onChange', 'onBlur'] }),
  'ui.textArea': define({ type: 'ui.textArea', version: '1.0', level: 2, category: 'INPUT', allowsChildren: false, requiredProps: ['label'], events: ['onChange', 'onBlur'] }),
  'ui.select': define({ type: 'ui.select', version: '1.0', level: 2, category: 'INPUT', allowsChildren: false, requiredProps: ['label', 'options'], events: ['onChange'] }),
  'ui.checkbox': define({ type: 'ui.checkbox', version: '1.0', level: 2, category: 'INPUT', allowsChildren: false, requiredProps: ['label'], events: ['onChange'] }),
  'ui.datePicker': define({ type: 'ui.datePicker', version: '1.0', level: 2, category: 'INPUT', allowsChildren: false, requiredProps: ['label'], events: ['onChange'] }),
  'ui.button': define({ type: 'ui.button', version: '1.0', level: 3, category: 'ACTION', allowsChildren: false, requiredProps: ['label'], events: ['onPress'] }),
  'ui.link': define({ type: 'ui.link', version: '1.0', level: 3, category: 'ACTION', allowsChildren: false, requiredProps: ['label'], events: ['onPress'] }),
  'ui.alert': define({ type: 'ui.alert', version: '1.0', level: 3, category: 'FEEDBACK', allowsChildren: false, requiredProps: ['message'], events: ['onDismiss'] }),
  'ui.progress': define({ type: 'ui.progress', version: '1.0', level: 3, category: 'FEEDBACK', allowsChildren: false, requiredProps: ['value'], events: [] }),
  'ui.loading': define({ type: 'ui.loading', version: '1.0', level: 3, category: 'FEEDBACK', allowsChildren: false, requiredProps: [], events: [] }),
};

export const VALID_BINDING_NAMESPACES = ['form', 'data', 'session', 'route', 'computed'] as const;
export const VALID_VISIBILITY_RULES = ['equals', 'notEquals', 'in', 'notIn'] as const;
export const VALID_ACTIONS: readonly SduiActionType[] = [
  'action.submit',
  'action.navigate',
  'action.openUrl',
  'action.setValue',
  'action.track',
  'action.dismiss',
];

export const INPUT_COMPONENTS: ReadonlySet<SduiComponentType> = new Set([
  'ui.textInput',
  'ui.textArea',
  'ui.select',
  'ui.checkbox',
  'ui.datePicker',
]);

