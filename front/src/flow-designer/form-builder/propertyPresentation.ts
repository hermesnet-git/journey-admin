import type { PropDescriptor } from '../../api/componentDefinitions';

export type PropertyGroup = 'CONTENT' | 'APPEARANCE' | 'LAYOUT' | 'BEHAVIOR' | 'VALIDATION' | 'ACCESSIBILITY';

export interface PropertyPresentation {
  label: string;
  help?: string;
  group: PropertyGroup;
  advanced?: boolean;
  multiline?: boolean;
  enumLabels?: Record<string, string>;
}

export const PROPERTY_GROUP_LABEL: Record<PropertyGroup, string> = {
  CONTENT: 'Conteúdo',
  APPEARANCE: 'Aparência',
  LAYOUT: 'Layout',
  BEHAVIOR: 'Comportamento',
  VALIDATION: 'Validação',
  ACCESSIBILITY: 'Acessibilidade',
};

export const PROPERTY_GROUP_ORDER: PropertyGroup[] = ['CONTENT', 'LAYOUT', 'APPEARANCE', 'BEHAVIOR', 'VALIDATION', 'ACCESSIBILITY'];

const GENERIC: Record<string, Partial<PropertyPresentation>> = {
  title: { label: 'Título', group: 'CONTENT' },
  label: { label: 'Rótulo', group: 'CONTENT' },
  text: { label: 'Texto', group: 'CONTENT', multiline: true },
  message: { label: 'Mensagem', group: 'CONTENT', multiline: true },
  placeholder: { label: 'Texto de orientação', group: 'CONTENT' },
  source: { label: 'Origem', group: 'CONTENT' },
  alt: { label: 'Descrição da imagem', help: 'Descreva a imagem para quem utiliza recursos de acessibilidade.', group: 'ACCESSIBILITY', multiline: true },
  accessibilityLabel: { label: 'Descrição acessível', group: 'ACCESSIBILITY' },
  required: { label: 'Preenchimento obrigatório', group: 'VALIDATION' },
  validation: { label: 'Regras de validação', group: 'VALIDATION' },
  minDate: { label: 'Data mínima', group: 'VALIDATION' },
  maxDate: { label: 'Data máxima', group: 'VALIDATION' },
  minLines: { label: 'Mínimo de linhas', group: 'VALIDATION' },
  maxLines: { label: 'Máximo de linhas', group: 'VALIDATION' },
  maxLength: { label: 'Máximo de caracteres', group: 'VALIDATION' },
  backgroundToken: { label: 'Cor de fundo', group: 'APPEARANCE' },
  colorToken: { label: 'Cor', group: 'APPEARANCE' },
  borderRadiusToken: { label: 'Arredondamento', group: 'APPEARANCE' },
  elevationToken: { label: 'Elevação', group: 'APPEARANCE' },
  sizeToken: { label: 'Tamanho', group: 'APPEARANCE' },
  variant: { label: 'Estilo', group: 'APPEARANCE' },
  paddingToken: { label: 'Espaçamento interno', group: 'LAYOUT' },
  spacingToken: { label: 'Espaçamento', group: 'LAYOUT' },
  direction: { label: 'Direção', group: 'LAYOUT', enumLabels: { vertical: 'Vertical', horizontal: 'Horizontal' } },
  orientation: { label: 'Orientação', group: 'LAYOUT', enumLabels: { vertical: 'Vertical', horizontal: 'Horizontal' } },
  alignment: { label: 'Alinhamento', group: 'LAYOUT', enumLabels: { start: 'Início', center: 'Centro', end: 'Fim', stretch: 'Preencher espaço' } },
  align: { label: 'Alinhamento', group: 'LAYOUT', enumLabels: { left: 'Esquerda', center: 'Centro', right: 'Direita' } },
  axis: { label: 'Eixo', group: 'LAYOUT', enumLabels: { vertical: 'Vertical', horizontal: 'Horizontal', both: 'Ambos' } },
  fullWidth: { label: 'Ocupar toda a largura', group: 'LAYOUT' },
  aspectRatio: { label: 'Proporção', group: 'LAYOUT' },
  scrollable: { label: 'Permitir rolagem', group: 'BEHAVIOR' },
  readOnly: { label: 'Somente leitura', group: 'BEHAVIOR' },
  searchable: { label: 'Permitir busca', group: 'BEHAVIOR' },
  loading: { label: 'Exibir carregamento', group: 'BEHAVIOR' },
  disabled: { label: 'Iniciar desabilitado', group: 'BEHAVIOR' },
  dismissible: { label: 'Permitir fechar', group: 'BEHAVIOR' },
  external: { label: 'Abrir externamente', group: 'BEHAVIOR' },
  overlay: { label: 'Sobrepor ao conteúdo', group: 'BEHAVIOR' },
  showValue: { label: 'Exibir valor', group: 'BEHAVIOR' },
  indeterminate: { label: 'Estado indeterminado', group: 'BEHAVIOR' },
  inputMode: { label: 'Tipo de entrada', group: 'BEHAVIOR', enumLabels: { text: 'Texto', email: 'E-mail', tel: 'Telefone', numeric: 'Numérico', decimal: 'Decimal' } },
  mode: { label: 'Formato', group: 'BEHAVIOR', enumLabels: { date: 'Data', time: 'Hora', datetime: 'Data e hora' } },
  format: { label: 'Formato de exibição', group: 'BEHAVIOR' },
  fit: { label: 'Ajuste da imagem', group: 'APPEARANCE', enumLabels: { cover: 'Preencher', contain: 'Conter', fill: 'Esticar' } },
  emphasis: { label: 'Ênfase', group: 'APPEARANCE' },
  severity: { label: 'Severidade', group: 'APPEARANCE', enumLabels: { info: 'Informação', success: 'Sucesso', warning: 'Atenção', error: 'Erro' } },
  options: { label: 'Opções', group: 'CONTENT' },
  value: { label: 'Valor', group: 'CONTENT' },
  name: { label: 'Nome', group: 'CONTENT' },
  size: { label: 'Tamanho', group: 'APPEARANCE' },
};

const SPECIFIC: Record<string, Partial<PropertyPresentation>> = {
  'ui.progress.value': { label: 'Progresso', help: 'Informe o valor apresentado pelo indicador.' },
  'ui.icon.name': { label: 'Ícone' },
  'ui.datePicker.mode': { help: 'Escolha se o campo receberá data, hora ou ambas.' },
  'ui.button.variant': { enumLabels: { primary: 'Principal', secondary: 'Secundário', danger: 'Destrutivo' } },
  'ui.text.variant': { enumLabels: { title: 'Título', subtitle: 'Subtítulo', body: 'Corpo', caption: 'Legenda' } },
};

function humanize(name: string): string {
  const spaced = name.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ');
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Metadados exclusivos da experiência de autoria. Propriedades novas continuam editáveis por
 * meio do fallback, sem ampliar ou modificar o contrato publicado pelo catálogo SDUI. */
const ADVANCED_PROPERTY_NAMES = new Set([
  'accessibilityLabel',
  'alt',
  'aspectRatio',
  'backgroundToken',
  'borderRadiusToken',
  'colorToken',
  'disabled',
  'dismissible',
  'elevationToken',
  'external',
  'format',
  'indeterminate',
  'inputMode',
  'loading',
  'maxDate',
  'maxLength',
  'maxLines',
  'minDate',
  'minLines',
  'mode',
  'name',
  'overlay',
  'paddingToken',
  'readOnly',
  'searchable',
  'showValue',
  'sizeToken',
  'spacingToken',
  'validation',
]);

/** Classificação visual do Form Builder: não muda o contrato SDUI, apenas evita que propriedades
 * raras, muito específicas ou de ajuste fino disputem espaço com a configuração principal. */
function isAdvancedProperty(prop: PropDescriptor): boolean {
  return ADVANCED_PROPERTY_NAMES.has(prop.name);
}

export function propertyPresentation(type: string, prop: PropDescriptor): PropertyPresentation {
  const generic = GENERIC[prop.name] ?? {};
  const specific = SPECIFIC[`${type}.${prop.name}`] ?? {};
  return {
    label: specific.label ?? generic.label ?? humanize(prop.name),
    help: specific.help ?? generic.help,
    group: specific.group ?? generic.group ?? 'BEHAVIOR',
    advanced: specific.advanced ?? generic.advanced ?? isAdvancedProperty(prop),
    multiline: specific.multiline ?? generic.multiline ?? false,
    enumLabels: { ...(generic.enumLabels ?? {}), ...(specific.enumLabels ?? {}) },
  };
}
