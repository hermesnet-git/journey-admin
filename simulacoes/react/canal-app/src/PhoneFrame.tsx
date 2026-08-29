import type { ReactNode } from 'react';
import { skinVars } from '@telefonica/mistica';

/** Moldura simples de celular, adaptada de front/src/execution/PhoneFrame.tsx (troca as 2 classes
 * Tailwind por style inline — este app não tem Tailwind configurado). */
export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div
        style={{
          width: '100%',
          maxWidth: 390,
          boxSizing: 'border-box',
          border: `10px solid ${skinVars.colors.neutralHigh}`,
          borderRadius: 40,
          background: skinVars.colors.neutralHigh,
          boxShadow: '0 24px 48px -16px rgba(0,0,0,.35)',
        }}
      >
        <div
          style={{
            margin: '0 auto',
            width: 120,
            height: 22,
            background: skinVars.colors.neutralHigh,
            borderRadius: '0 0 14px 14px',
          }}
        />
        <div style={{ overflow: 'hidden', background: skinVars.colors.background, borderRadius: 28, minHeight: 480 }}>
          {children}
        </div>
      </div>
    </div>
  );
}
