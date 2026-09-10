import type { SduiNode } from '../../sdui/model';
import type { ComponentDefinition } from '../../api/componentDefinitions';
import type { DesignChannel } from '../form-builder/designChannel';
import { compatibilityForDesignChannel } from '../form-builder/designChannel';
import { labelFor } from '../../sdui/componentMeta';

export interface FormPreviewDiagnostic {
  id: string;
  tone: 'info' | 'warning';
  message: string;
}

const OMITTED_ON_WHATSAPP = new Set(['ui.icon', 'ui.divider', 'ui.spacer']);

/** Diagnósticos do preview são orientações de autoria e nunca integram a UI Spec publicada. */
export function collectPreviewDiagnostics(
  root: SduiNode,
  channel: DesignChannel,
  definitions: Map<string, ComponentDefinition>,
): FormPreviewDiagnostic[] {
  const diagnostics: FormPreviewDiagnostic[] = [];
  function visit(node: SduiNode) {
    const definition = definitions.get(`${node.type}@${node.version}`) ?? null;
    if (!definition) {
      diagnostics.push({
        id: `${node.id}-catalog`,
        tone: 'warning',
        message: `${labelFor(node.type)} não foi encontrado no catálogo e não pode ser apresentado.`,
      });
      return;
    }
    if (compatibilityForDesignChannel(definition, channel) !== 'COMPATIBLE') {
      diagnostics.push({
        id: `${node.id}-compatibility`,
        tone: 'warning',
        message: `${labelFor(node.type)} não será apresentado em ${channel === 'WHATSAPP' ? 'WhatsApp' : channel === 'MOBILE' ? 'Mobile' : 'Web'}.`,
      });
      return;
    }
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
