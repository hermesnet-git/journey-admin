import type { SduiNode } from '../../sdui/model';

export type WhatsAppPreviewItem =
  | { id: string; kind: 'text'; text: string; emphasis?: boolean }
  | { id: string; kind: 'media'; text: string; source?: string }
  | { id: string; kind: 'question'; text: string }
  | { id: string; kind: 'choices'; text: string; choices: string[]; presentation: 'buttons' | 'list' }
  | { id: string; kind: 'action'; text: string; actionKind: 'reply' | 'link' };

function textProp(node: SduiNode, name: string, fallback: string): string {
  const value = node.props[name];
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/** Projeção visual de autoria. Ela não executa ações nem coleta respostas. */
export function projectToWhatsApp(root: SduiNode): WhatsAppPreviewItem[] {
  const items: WhatsAppPreviewItem[] = [];

  function visit(node: SduiNode) {
    const children = node.children ?? [];
    switch (node.type) {
      case 'ui.screen': {
        const title = textProp(node, 'title', '');
        if (title) items.push({ id: `${node.id}-title`, kind: 'text', text: title, emphasis: true });
        children.forEach(visit);
        return;
      }
      case 'ui.container':
      case 'ui.stack':
      case 'ui.card':
        children.forEach(visit);
        return;
      case 'ui.icon':
      case 'ui.divider':
      case 'ui.spacer':
        return;
      case 'ui.text':
        items.push({ id: node.id, kind: 'text', text: textProp(node, 'text', 'Texto') });
        return;
      case 'ui.image':
        items.push({ id: node.id, kind: 'media', text: textProp(node, 'alt', 'Imagem'), source: typeof node.props.source === 'string' ? node.props.source : undefined });
        return;
      case 'ui.textInput':
      case 'ui.textArea':
        items.push({ id: node.id, kind: 'question', text: textProp(node, 'label', 'Informe uma resposta') });
        return;
      case 'ui.datePicker':
        items.push({ id: node.id, kind: 'question', text: `${textProp(node, 'label', 'Informe a data')} — formato ${textProp(node, 'format', 'DD/MM/AAAA')}` });
        return;
      case 'ui.checkbox':
        items.push({ id: node.id, kind: 'choices', text: textProp(node, 'label', 'Confirme'), choices: ['Sim', 'Não'], presentation: 'buttons' });
        return;
      case 'ui.select': {
        const options = Array.isArray(node.props.options) ? node.props.options as { label?: string; disabled?: boolean }[] : [];
        const choices = options.filter((option) => option.disabled !== true).map((option) => option.label || 'Opção');
        items.push({ id: node.id, kind: 'choices', text: textProp(node, 'label', 'Selecione uma opção'), choices, presentation: choices.length <= 3 ? 'buttons' : 'list' });
        return;
      }
      case 'ui.button':
        items.push({ id: node.id, kind: 'action', text: textProp(node, 'label', 'Continuar'), actionKind: 'reply' });
        return;
      case 'ui.link':
        items.push({ id: node.id, kind: 'action', text: textProp(node, 'label', 'Abrir link'), actionKind: 'link' });
        return;
      case 'ui.alert': {
        const title = textProp(node, 'title', '');
        const message = textProp(node, 'message', 'Aviso');
        items.push({ id: node.id, kind: 'text', text: title ? `${title}\n${message}` : message, emphasis: true });
        return;
      }
      case 'ui.progress': {
        const value = typeof node.props.value === 'number' ? node.props.value : 0;
        items.push({ id: node.id, kind: 'text', text: `${textProp(node, 'label', 'Progresso')}: ${Math.round(Math.max(0, Math.min(1, value)) * 100)}%` });
        return;
      }
      case 'ui.loading':
        items.push({ id: node.id, kind: 'text', text: textProp(node, 'label', 'Aguarde um momento…') });
        return;
      default:
        return;
    }
  }

  visit(root);
  return items;
}
