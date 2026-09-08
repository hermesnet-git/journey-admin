import type { ComponentDefinition, RenderTarget } from '../api/componentDefinitions';

export type PreviewTarget = 'web' | 'mobile' | 'whatsapp';

export const PREVIEW_TARGETS: PreviewTarget[] = ['web', 'mobile', 'whatsapp'];

export const PREVIEW_TARGET_LABEL: Record<PreviewTarget, string> = {
  web: 'Web',
  mobile: 'Mobile',
  whatsapp: 'WhatsApp',
};

const RENDER_TARGET_FOR: Record<PreviewTarget, RenderTarget> = {
  web: 'react.web',
  mobile: 'react.mobile',
  whatsapp: 'whatsapp',
};

/** Suporte do tipo de componente no alvo de prévia selecionado — sempre consulta o campo real do
 * Component Registry (`supportedTargets`), o mesmo mecanismo pros 3 alvos (`whatsapp` é um
 * RenderTarget como os outros, ver RenderTarget.java/back: "SUPPORTED" ali significa "tem
 * representação válida em mensagem", não "renderiza igual aos demais"). Sem `definition` carregada
 * ainda, não bloqueia (evita falso alarme antes do catálogo terminar de carregar). */
export function isSupportedOnPreviewTarget(definition: ComponentDefinition | null, target: PreviewTarget): boolean {
  if (!definition) return true;
  return (definition.supportedTargets[RENDER_TARGET_FOR[target]]?.status ?? 'UNSUPPORTED') === 'SUPPORTED';
}
