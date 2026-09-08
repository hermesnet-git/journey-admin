// WhatsApp É um RenderTarget do Component Registry (ver RENDER_TARGETS em api/componentDefinitions.ts) —
// SUPPORTED/UNSUPPORTED por componente vem de lá agora (ver designChannel.ts), não mais fixo aqui.
// O que ESTE arquivo ainda decide é só a FORMA da mensagem pra quem já é suportado: WhatsApp não tem
// container/card/stack de layout livre, então a árvore SDUI é achatada numa sequência de mensagens
// (texto/botões/lista/mídia) em vez de renderizada como componentes aninhados.
import type { SduiNode } from './model';
import { labelFor } from './componentMeta';

export type WhatsAppMessageKind = 'structural' | 'text' | 'buttons' | 'list' | 'media' | 'unsupported';

export const WHATSAPP_MESSAGE_KIND: Record<string, WhatsAppMessageKind> = {
  'ui.screen': 'structural',
  'ui.container': 'structural',
  'ui.stack': 'structural',
  'ui.card': 'structural',
  'ui.text': 'text',
  'ui.image': 'media',
  'ui.icon': 'unsupported',
  'ui.divider': 'unsupported',
  'ui.spacer': 'unsupported',
  'ui.textInput': 'text',
  'ui.textArea': 'text',
  'ui.select': 'list',
  'ui.checkbox': 'unsupported',
  'ui.datePicker': 'text',
  'ui.button': 'buttons',
  'ui.link': 'buttons',
  'ui.alert': 'text',
  'ui.progress': 'unsupported',
  'ui.loading': 'unsupported',
};

export function whatsappKindFor(type: string): WhatsAppMessageKind {
  return WHATSAPP_MESSAGE_KIND[type] ?? 'unsupported';
}

export interface WhatsAppMessage {
  id: string;
  nodeType: string;
  kind: WhatsAppMessageKind;
  text: string;
  options?: { label: string; value: string }[];
}

function textOf(node: SduiNode): string {
  const props = node.props;
  if (typeof props.text === 'string' && props.text) return props.text;
  if (typeof props.title === 'string' && props.title) return props.title;
  if (typeof props.message === 'string' && props.message) return props.message;
  if (typeof props.label === 'string' && props.label) return props.label;
  return labelFor(node.type);
}

/** Achata a árvore SDUI numa sequência de mensagens de WhatsApp — containers/stack/card não geram
 * bolha própria, só repassam os filhos (não existe agrupamento visual lá). */
export function sduiToWhatsAppMessages(root: SduiNode): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  function visit(node: SduiNode) {
    const kind = whatsappKindFor(node.type);
    if (kind === 'structural') {
      (node.children ?? []).forEach(visit);
      return;
    }
    const message: WhatsAppMessage = { id: node.id, nodeType: node.type, kind, text: textOf(node) };
    if (kind === 'list') {
      message.options = Array.isArray(node.props.options) ? (node.props.options as { label: string; value: string }[]) : [];
    }
    messages.push(message);
  }
  visit(root);
  return messages;
}
