import type { ComponentDefinition, RenderTarget } from '../api/componentDefinitions';
import { whatsappKindFor } from './whatsappMapping';

export type PreviewTarget = 'web' | 'mobile' | 'whatsapp';

export const PREVIEW_TARGETS: PreviewTarget[] = ['web', 'mobile', 'whatsapp'];

export const PREVIEW_TARGET_LABEL: Record<PreviewTarget, string> = {
  web: 'Web',
  mobile: 'Mobile',
  whatsapp: 'WhatsApp',
};

const RENDER_TARGET_FOR: Record<'web' | 'mobile', RenderTarget> = {
  web: 'react.web',
  mobile: 'react.mobile',
};

/** Suporte do tipo de componente no alvo de prévia selecionado. Web/Mobile consultam o campo real
 * do Component Registry (`supportedTargets`); WhatsApp não é um RenderTarget (sem layout livre em
 * mensagens), então usa a tabela fixa de whatsappMapping.ts. Sem `definition` carregada ainda, não
 * bloqueia (evita falso alarme antes do catálogo terminar de carregar). */
export function isSupportedOnPreviewTarget(definition: ComponentDefinition | null, type: string, target: PreviewTarget): boolean {
  if (target === 'whatsapp') return whatsappKindFor(type) !== 'unsupported';
  if (!definition) return true;
  return (definition.supportedTargets[RENDER_TARGET_FOR[target]]?.status ?? 'UNSUPPORTED') === 'SUPPORTED';
}
