import type { ReactNode } from 'react';

export const MATCH_MARK_BG = 'rgba(250, 204, 21, 0.55)';
export const ACTIVE_MATCH_MARK_BG = 'rgba(249, 115, 22, 0.6)';

// Marca ocorrências de `query` dentro de `text` com <mark> — usado tanto na busca da lista de log
// quanto na busca dentro da árvore JSON, pro mesmo destaque visual nas duas. `strong` diferencia o
// resultado atualmente focado (laranja) dos demais (amarelo).
export function highlightText(text: string, query: string, strong: boolean): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(lowerQ);
  if (idx === -1) return text;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark
        key={idx}
        style={{ background: strong ? ACTIVE_MATCH_MARK_BG : MATCH_MARK_BG, color: 'inherit', borderRadius: 2, padding: '0 1px' }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(lowerQ, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}
