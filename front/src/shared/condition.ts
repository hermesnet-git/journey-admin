import type { VariableType } from '../flow-designer/model';

// Extraído de flow-designer/PropertiesPanel.tsx (GatewayFields) pra ser reaproveitado também pela
// Exibição condicional do form builder — mesma sintaxe {{variavel}} OP valor (REQ-03.11.003),
// mesmo split de responsabilidade do backend: aqui só a estrutura é validada, a existência da
// variável referenciada é responsabilidade de quem monta a lista de `availableRules`.
export const EQUALITY_OPERATORS = [
  { value: '==', label: 'Igual' },
  { value: '!=', label: 'Diferente' },
];
export const ORDERED_OPERATORS = [
  { value: '==', label: 'Igual' },
  { value: '!=', label: 'Diferente' },
  { value: '>', label: 'Maior que' },
  { value: '<', label: 'Menor que' },
];
export const OPERATORS_BY_TYPE: Record<VariableType, { value: string; label: string }[]> = {
  string: EQUALITY_OPERATORS,
  boolean: EQUALITY_OPERATORS,
  number: ORDERED_OPERATORS,
  date: ORDERED_OPERATORS,
  datetime: ORDERED_OPERATORS,
};
export const QUOTED_TYPES = new Set<VariableType>(['string', 'date', 'datetime']);
export const VALUE_INPUT_TYPE: Partial<Record<VariableType, string>> = { number: 'number', date: 'date', datetime: 'datetime-local' };
export const CONDITION_PATTERN = /^\{\{\s*([A-Za-z_][A-Za-z0-9_]*)\s*\}\}\s*(==|!=|>|<)\s*(.*)$/;

export function parseCondition(condition: string | undefined): { variable: string; operator: string; value: string } {
  const match = condition?.match(CONDITION_PATTERN);
  if (!match) return { variable: '', operator: '==', value: '' };
  let value = match[3].trim();
  if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
  return { variable: match[1], operator: match[2], value };
}

export function composeCondition(variable: string, operator: string, value: string, type: VariableType): string {
  if (!variable) return '';
  const literal = QUOTED_TYPES.has(type) ? `'${value.replace(/'/g, "\\'")}'` : value.trim() || (type === 'boolean' ? 'false' : '0');
  return `{{${variable}}} ${operator} ${literal}`;
}
