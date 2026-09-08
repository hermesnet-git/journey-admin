import type { ChannelType } from '../api/products';
import type { ComponentDefinition, RenderTarget } from '../api/componentDefinitions';

export type DesignChannel = ChannelType;
export type ChannelCompatibility = 'COMPATIBLE' | 'PENDING' | 'INCOMPATIBLE';

export const DESIGN_CHANNEL_LABEL: Record<DesignChannel, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  WHATSAPP: 'WhatsApp',
};

const TARGETS_BY_CHANNEL: Record<DesignChannel, RenderTarget[]> = {
  WEB: ['react.web', 'flutter.web'],
  MOBILE: ['react.mobile', 'flutter.mobile'],
  WHATSAPP: ['whatsapp'],
};

/** Converte detalhes tecnológicos do catálogo em compatibilidade funcional para o designer. */
export function compatibilityForDesignChannel(
  definition: ComponentDefinition | null,
  channel: DesignChannel,
): ChannelCompatibility {
  if (!definition) return 'COMPATIBLE';
  const statuses = TARGETS_BY_CHANNEL[channel].map(
    (target) => definition.supportedTargets[target]?.status ?? 'UNSUPPORTED',
  );
  if (statuses.includes('SUPPORTED')) return 'COMPATIBLE';
  if (statuses.includes('PLANNED')) return 'PENDING';
  return 'INCOMPATIBLE';
}

export function compatibilityMessage(status: ChannelCompatibility, channel: DesignChannel): string | null {
  if (status === 'COMPATIBLE') return null;
  return status === 'PENDING'
    ? `Compatibilidade pendente para ${DESIGN_CHANNEL_LABEL[channel]}`
    : `Incompatível com ${DESIGN_CHANNEL_LABEL[channel]}`;
}
