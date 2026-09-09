// Metadado só de apresentação (ícone + rótulo pt-BR) pros 19 tipos `ui.*` do catálogo v1 — o
// Component Registry (back) não carrega isso, é decoração da paleta/camadas deste front. Único
// ponto de verdade dos TIPOS em si continua sendo o Registry (GET /component-registry).
import {
  LayoutTemplate,
  Square,
  Rows3,
  RectangleHorizontal,
  Type,
  Image as ImageIcon,
  Smile,
  Minus,
  MoveVertical,
  TextCursorInput,
  AlignLeft,
  ChevronDown,
  CheckSquare,
  Calendar,
  MousePointerClick,
  Link2,
  Info,
  Gauge,
  Loader2,
  Shapes,
  type LucideIcon,
} from 'lucide-react';
import type { ComponentCategory } from '../api/componentDefinitions';

export const COMPONENT_ICON: Record<string, LucideIcon> = {
  'ui.screen': LayoutTemplate,
  'ui.container': Square,
  'ui.stack': Rows3,
  'ui.card': RectangleHorizontal,
  'ui.text': Type,
  'ui.image': ImageIcon,
  'ui.icon': Smile,
  'ui.divider': Minus,
  'ui.spacer': MoveVertical,
  'ui.textInput': TextCursorInput,
  'ui.textArea': AlignLeft,
  'ui.select': ChevronDown,
  'ui.checkbox': CheckSquare,
  'ui.datePicker': Calendar,
  'ui.button': MousePointerClick,
  'ui.link': Link2,
  'ui.alert': Info,
  'ui.progress': Gauge,
  'ui.loading': Loader2,
};

export function iconFor(type: string): LucideIcon {
  return COMPONENT_ICON[type] ?? Shapes;
}

export const COMPONENT_LABEL: Record<string, string> = {
  'ui.screen': 'Tela',
  'ui.container': 'Contêiner',
  'ui.stack': 'Pilha',
  'ui.card': 'Card',
  'ui.text': 'Texto',
  'ui.image': 'Imagem',
  'ui.icon': 'Ícone',
  'ui.divider': 'Divisor',
  'ui.spacer': 'Espaçador',
  'ui.textInput': 'Campo de texto',
  'ui.textArea': 'Área de texto',
  'ui.select': 'Seleção',
  'ui.checkbox': 'Caixa de seleção',
  'ui.datePicker': 'Data',
  'ui.button': 'Botão',
  'ui.link': 'Link',
  'ui.alert': 'Alerta',
  'ui.progress': 'Progresso',
  'ui.loading': 'Carregando',
};

export function labelFor(type: string): string {
  return COMPONENT_LABEL[type] ?? type;
}

/** Descrição funcional curta usada nas superfícies de autoria. Não substitui o contrato nem cria
 * novos tipos: quando um componente customizado não possuir metadado local, a interface utiliza
 * uma descrição neutra e mantém o catálogo como fonte de verdade. */
export const COMPONENT_DESCRIPTION: Record<string, string> = {
  'ui.screen': 'Estrutura principal da tela.',
  'ui.container': 'Agrupa e organiza outros componentes.',
  'ui.stack': 'Distribui componentes em linha ou coluna.',
  'ui.card': 'Destaca um grupo de informações.',
  'ui.text': 'Apresenta títulos, textos e instruções.',
  'ui.image': 'Exibe uma imagem com descrição acessível.',
  'ui.icon': 'Adiciona um símbolo visual à tela.',
  'ui.divider': 'Separa visualmente blocos de conteúdo.',
  'ui.spacer': 'Cria espaço entre componentes.',
  'ui.textInput': 'Coleta uma informação em uma linha.',
  'ui.textArea': 'Coleta textos com várias linhas.',
  'ui.select': 'Permite escolher uma opção de uma lista.',
  'ui.checkbox': 'Registra confirmação ou aceite.',
  'ui.datePicker': 'Coleta data, hora ou ambas.',
  'ui.button': 'Executa a ação principal da tela.',
  'ui.link': 'Oferece navegação ou acesso a conteúdo.',
  'ui.alert': 'Comunica uma informação importante.',
  'ui.progress': 'Indica o avanço de uma operação.',
  'ui.loading': 'Informa que uma operação está em andamento.',
};

export function descriptionFor(type: string): string {
  return COMPONENT_DESCRIPTION[type] ?? 'Componente disponível no catálogo.';
}

export const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  CONTENT: 'Conteúdo',
  LAYOUT: 'Layout',
  INPUT: 'Campos de entrada',
  ACTION: 'Ação',
  FEEDBACK: 'Feedback',
};
