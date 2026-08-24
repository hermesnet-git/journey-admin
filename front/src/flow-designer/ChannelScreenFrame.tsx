import type { ReactNode } from 'react';
import { useFlowTheme } from './theme';
import type { ChannelType } from '../api/products';

const FRAME_WIDTH: Record<ChannelType, number> = {
  WEB: 720,
  MOBILE: 380,
  WHATSAPP: 380,
  CONTACT_CENTER: 720,
  OTHER: 720,
  URA: 720,
};

// Moldura que dá a sensação de estar construindo a tela real do canal (pedido explícito do
// usuário) — chrome de celular/navegador/chat só o suficiente pra dar contexto visual, não é uma
// simulação fiel do canal. Reaproveitada tanto pelo canvas de edição (FormScreenCanvas) quanto
// pelo preview somente-leitura (FormScreenPreview), pra os dois "sentirem" igual.
export function ChannelScreenFrame({ channelType, children }: { channelType: ChannelType; children: ReactNode }) {
  const { c } = useFlowTheme();
  const width = FRAME_WIDTH[channelType];

  if (channelType === 'MOBILE') {
    return (
      <div
        className="mx-auto rounded-[32px] overflow-hidden"
        style={{ width, border: `6px solid ${c.textPrimary}`, background: c.cardBg, boxShadow: '0 12px 32px -12px rgba(0,0,0,.35)' }}
      >
        <div className="h-[22px] flex items-center justify-center" style={{ background: c.textPrimary }}>
          <div className="w-[70px] h-[6px] rounded-full" style={{ background: c.cardBg }} />
        </div>
        <div className="p-4">{children}</div>
      </div>
    );
  }

  if (channelType === 'WHATSAPP') {
    return (
      <div className="mx-auto rounded-xl overflow-hidden" style={{ width, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px -12px rgba(0,0,0,.3)' }}>
        <div className="h-[34px] flex items-center px-3 text-[11.5px] font-semibold" style={{ background: '#075E54', color: '#fff' }}>
          WhatsApp
        </div>
        <div className="p-4" style={{ background: '#E5F5E0' }}>
          {children}
        </div>
      </div>
    );
  }

  // WEB / CONTACT_CENTER / OTHER / URA — chrome de navegador (URA na prática nunca chega aqui, o
  // canvas nem é montado pra esse canal sem formId).
  return (
    <div className="mx-auto rounded-lg overflow-hidden" style={{ width, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px -12px rgba(0,0,0,.25)' }}>
      <div className="h-[28px] flex items-center gap-[5px] px-3" style={{ background: c.chipBg, borderBottom: `1px solid ${c.border}` }}>
        <div className="w-[8px] h-[8px] rounded-full" style={{ background: c.border }} />
        <div className="w-[8px] h-[8px] rounded-full" style={{ background: c.border }} />
        <div className="w-[8px] h-[8px] rounded-full" style={{ background: c.border }} />
      </div>
      <div className="p-4" style={{ background: c.cardBg }}>
        {children}
      </div>
    </div>
  );
}
