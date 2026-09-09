import type { SduiNode } from '../../sdui/model';
import type { DesignChannel } from '../form-builder/designChannel';
import { labelFor } from '../../sdui/componentMeta';

export interface FormPreviewDiagnostic {
  id: string;
  tone: 'info' | 'warning';
  message: string;
}

const OMITTED_ON_WHATSAPP = new Set(['ui.icon', 'ui.divider', 'ui.spacer']);

/** Diagnósticos do preview são orientações de autoria e nunca integram a UI Spec publicada. */
export function collectPreviewDiagnostics(root: SduiNode, channel: DesignChannel): FormPreviewDiagnostic[] {
  const diagnostics: FormPreviewDiagnostic[] = [];
  function visit(node: SduiNode) {
    if (channel === 'WHATSAPP' && OMITTED_ON_WHATSAPP.has(node.type)) {
      diagnostics.push({ id: node.id, tone: 'info', message: `${labelFor(node.type)} será omitido no WhatsApp.` });
    }
    if (node.visibility) {
      diagnostics.push({ id: `${node.id}-visibility`, tone: 'info', message: `${labelFor(node.type)} possui visibilidade condicional; o preview mantém o componente visível.` });
    }
    if (node.active) {
      diagnostics.push({ id: `${node.id}-active`, tone: 'info', message: `${labelFor(node.type)} possui estado condicional; o preview não avalia dados da jornada.` });
    }
    (node.children ?? []).forEach(visit);
  }
  visit(root);
  return diagnostics;
}
