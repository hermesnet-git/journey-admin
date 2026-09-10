import type { SduiNode } from '../../sdui/model';
import type { DesignChannel } from '../form-builder/designChannel';
import { labelFor } from '../../sdui/componentMeta';
import type { PreviewProjectionResult } from './previewProjection';

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
  projection: PreviewProjectionResult,
): FormPreviewDiagnostic[] {
  const diagnostics: FormPreviewDiagnostic[] = [
    ...projection.omittedByCompatibility.map((node) => ({
      id: `${node.id}-compatibility`,
      tone: 'warning' as const,
      message: `${labelFor(node.type)} não será apresentado em ${channel === 'WHATSAPP' ? 'WhatsApp' : channel === 'MOBILE' ? 'Mobile' : 'Web'}.`,
    })),
    ...projection.omittedByVisibility.map((node) => ({
      id: `${node.id}-visibility`,
      tone: 'info' as const,
      message: `${labelFor(node.type)} está oculto pelos dados informados no preview.`,
    })),
    ...projection.unresolvedVisibility.map((node) => ({
      id: `${node.id}-unresolved`,
      tone: 'info' as const,
      message: `A condição de ${labelFor(node.type)} não pôde ser avaliada com os dados informados.`,
    })),
    ...projection.inactive.map((node) => ({
      id: `${node.id}-inactive`,
      tone: 'info' as const,
      message: `${labelFor(node.type)} está visível, mas inativo pelos dados do preview.`,
    })),
  ];
  const alreadyOmitted = new Set([
    ...projection.omittedByCompatibility.map((node) => node.id),
    ...projection.omittedByVisibility.map((node) => node.id),
  ]);
  function visit(node: SduiNode) {
    if (alreadyOmitted.has(node.id)) return;
    if (channel === 'WHATSAPP' && OMITTED_ON_WHATSAPP.has(node.type)) {
      diagnostics.push({ id: node.id, tone: 'info', message: `${labelFor(node.type)} será omitido no WhatsApp.` });
    }
    (node.children ?? []).forEach(visit);
  }
  visit(root);
  return diagnostics;
}
