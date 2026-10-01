import { CONDITION_PATTERN } from '../shared/condition';
import { walk, type SduiNode } from '../sdui/model';

// Condição de Decisão em linguagem de gente para o canvas: `{{form_perfil}} == "pequena"` vira
// `Perfil = Pequena empresa`, usando o rótulo do campo e da opção como aparecem na tela. A expressão
// original continua disponível no passar do mouse.

export interface VariableLabel {
  label: string;
  // valor gravado → rótulo da opção na tela (seleção, botões de opção…)
  options?: Map<string, string>;
}

// Nome técnico legível quando não há rótulo de tela: tira o prefixo do motor e separa as palavras.
export function humanizeVariableName(name: string): string {
  const bare = name.replace(/^(form|data)_/, '');
  if (bare === 'channel') return 'Canal';
  const words = bare
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

// Rótulos dos campos de todas as telas do fluxo, pela variável do motor (form_<nome>).
export function screenVariableLabels(roots: (SduiNode | null | undefined)[]): Map<string, VariableLabel> {
  const labels = new Map<string, VariableLabel>();
  roots.forEach((root) => {
    if (!root) return;
    walk(root, (node) => {
      const path = node.bindings?.value?.path;
      if (!path?.startsWith('form.') || path.length === 'form.'.length) return;
      const token = `form_${path.slice('form.'.length)}`;
      if (labels.has(token)) return;
      const label = typeof node.props.label === 'string' && node.props.label.trim() ? node.props.label.trim() : humanizeVariableName(token);
      const options = new Map<string, string>();
      if (Array.isArray(node.props.options)) {
        node.props.options.forEach((o) => {
          if (o && typeof o === 'object' && 'value' in o) {
            const { value, label: optionLabel } = o as { value: unknown; label?: unknown };
            options.set(String(value), typeof optionLabel === 'string' && optionLabel.trim() ? optionLabel.trim() : String(value));
          }
        });
      }
      labels.set(token, options.size > 0 ? { label, options } : { label });
    });
  });
  return labels;
}

const OPERATOR_TEXT: Record<string, string> = { '==': '=', '!=': '≠', '>': '>', '<': '<' };
const MAX_LENGTH = 42;

function unquote(value: string): string {
  const v = value.trim();
  if (v.length >= 2 && (v[0] === '"' || v[0] === "'") && v[v.length - 1] === v[0]) return v.slice(1, -1);
  return v;
}


// Nome do caminho padrão de uma Decisão no canvas (o que vale quando nenhuma condição vale).
export const DEFAULT_PATH_LABEL = 'senão';

// Palavras técnicas que não ajudam a ler a condição ("Http status cadastro" → "status").
const NOISE_WORDS = new Set(['http']);

function meaningfulWords(subject: string): string[] {
  const words = subject.split(/\s+/).filter((w) => w && !NOISE_WORDS.has(w.toLowerCase()));
  return words.length > 0 ? words : [subject];
}

const lower = (t: string) => t.charAt(0).toLowerCase() + t.slice(1);

// Condição curta, como alguém escreveria ao lado da linha:
// - campo de escolha da tela: só a opção ("Tentar de novo"; diferente: "não tentar de novo");
// - sim/não: o próprio nome ("Elegível" / "não elegível");
// - igual a um valor: a primeira palavra do nome e o valor ("status 201");
// - maior/menor/diferente: o nome, o sinal e o valor ("Nivel bateria < 10").
// null quando a expressão não segue o formato da Decisão (aí o canvas mostra o texto cru).
export function readableCondition(condition: string | undefined, labels: Map<string, VariableLabel>): string | null {
  const match = condition?.trim().match(CONDITION_PATTERN);
  if (!match) return null;
  const [, variable, operator, rawValue] = match;
  const info = labels.get(variable);
  const subject = info?.label ?? humanizeVariableName(variable);
  const sign = OPERATOR_TEXT[operator] ?? operator;
  const valueVariable = rawValue.trim().match(/^\{\{\s*([A-Za-z_][A-Za-z0-9_-]*)\s*\}\}$/);
  let text: string;
  if (valueVariable) {
    text = `${subject} ${sign} ${labels.get(valueVariable[1])?.label ?? humanizeVariableName(valueVariable[1])}`;
  } else {
    const literal = unquote(rawValue);
    const option = info?.options?.get(literal);
    const equality = operator === '==' || operator === '!=';
    if (option && equality) {
      text = operator === '==' ? option : `não ${lower(option)}`;
    } else if ((literal === 'true' || literal === 'false') && equality) {
      const positive = (literal === 'true') === (operator === '==');
      text = positive ? subject : `não ${lower(subject)}`;
    } else if (operator === '==' && !info) {
      text = `${lower(meaningfulWords(subject)[0])} ${literal}`;
    } else {
      text = `${meaningfulWords(subject).join(' ')} ${sign} ${literal}`;
    }
  }
  return text.length > MAX_LENGTH ? `${text.slice(0, MAX_LENGTH - 1)}…` : text;
}
