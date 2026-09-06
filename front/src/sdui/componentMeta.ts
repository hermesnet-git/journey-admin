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

export const CATEGORY_LABEL: Record<ComponentCategory, string> = {
  CONTENT: 'Conteúdo',
  LAYOUT: 'Layout',
  INPUT: 'Campos de entrada',
  ACTION: 'Ação',
  FEEDBACK: 'Feedback',
};
