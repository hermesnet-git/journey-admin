import type { SduiNode, ValidationRule } from '@elastic-journey/sdui-contract';

export interface FieldError {
  nodeId: string;
  path: string;
  rule: string;
  message: string;
}

function isEmpty(value: unknown): boolean {
  return value == null || value === '' || (Array.isArray(value) && value.length === 0);
}

function defaultMessage(rule: string): string {
  const messages: Record<string, string> = {
    required: 'Campo obrigatório.',
    minLength: 'Valor menor que o permitido.',
    maxLength: 'Valor maior que o permitido.',
    email: 'Informe um e-mail válido.',
    min: 'Valor menor que o permitido.',
    max: 'Valor maior que o permitido.',
  };
  return messages[rule] ?? 'Valor inválido.';
}

function passes(rule: ValidationRule, value: unknown): boolean {
  switch (rule.rule) {
    case 'required':
      return !isEmpty(value) && value !== false;
    case 'minLength':
      return isEmpty(value) || String(value).length >= Number(rule.value);
    case 'maxLength':
      return isEmpty(value) || String(value).length <= Number(rule.value);
    case 'email':
      return isEmpty(value) || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value));
    case 'min':
      return isEmpty(value) || Number(value) >= Number(rule.value);
    case 'max':
      return isEmpty(value) || Number(value) <= Number(rule.value);
    default:
      return true;
  }
}

export function validateNodeValue(node: SduiNode, path: string, value: unknown): FieldError[] {
  const rules = Array.isArray(node.props.validation)
    ? node.props.validation.filter((rule): rule is ValidationRule => typeof rule === 'object' && rule !== null && typeof (rule as ValidationRule).rule === 'string')
    : [];

  if (node.props.required === true && !rules.some((rule) => rule.rule === 'required')) {
    rules.unshift({ rule: 'required', message: 'Campo obrigatório.' });
  }
  if (typeof node.props.maxLength === 'number' && !rules.some((rule) => rule.rule === 'maxLength')) {
    rules.push({ rule: 'maxLength', value: node.props.maxLength, message: 'Limite de caracteres excedido.' });
  }

  return rules
    .filter((rule) => !passes(rule, value))
    .map((rule) => ({
      nodeId: node.id,
      path,
      rule: rule.rule,
      message: rule.message || defaultMessage(rule.rule),
    }));
}

