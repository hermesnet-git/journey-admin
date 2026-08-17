import type { ReactNode } from 'react';
import { skinVars } from '@telefonica/mistica';

/** Moldura simples de celular (a Mística não tem um componente de mockup de dispositivo pronto)
 * — usada só quando o canal da jornada é MOBILE, pra deixar claro que aquele conteúdo é o que
 * apareceria no app, não uma tela do próprio Admin Portal. */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex justify-center">
      <div
        className="w-full box-border"
        style={{
          maxWidth: 390,
          border: `10px solid ${skinVars.colors.neutralHigh}`,
          borderRadius: 40,
          background: skinVars.colors.neutralHigh,
          boxShadow: '0 24px 48px -16px rgba(0,0,0,.35)',
        }}
      >
        <div
          className="mx-auto"
          style={{ width: 120, height: 22, background: skinVars.colors.neutralHigh, borderRadius: '0 0 14px 14px' }}
        />
        <div
          className="overflow-hidden"
          style={{ background: skinVars.colors.background, borderRadius: 28, minHeight: 480 }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
