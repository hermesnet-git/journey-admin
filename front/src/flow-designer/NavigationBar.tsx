import type { ReactNode } from 'react';
import { Group, Minus, Plus, Scan, Search } from 'lucide-react';
import { useFlowTheme } from './theme';

interface Props {
  zoomPct: number;
  selectedCount: number;
  // Busca aberta: o campo de busca ocupa o lugar do botão "Buscar etapa".
  search: ReactNode | null;
  onSearch: () => void;
  onZoom: (pct: number) => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFit: () => void;
  onZoomToSelection: () => void;
  onGroup: () => void;
}

// Barra de navegação no topo do canvas: busca, zoom e, com etapas selecionadas, zoom na seleção e
// agrupar em seção — cada um com a tecla de atalho à mostra.
export function NavigationBar({ zoomPct, selectedCount, search, onSearch, onZoom, onZoomIn, onZoomOut, onFit, onZoomToSelection, onGroup }: Props) {
  const { c } = useFlowTheme();
  const box = { background: c.cardBg, border: `1px solid ${c.border}` };
  const kbd = (text: string) => (
    <kbd
      className="text-[10.5px] font-medium px-[5px] rounded-[4px] leading-[16px]"
      style={{ color: c.textSecondary, background: c.hoverBg, border: `1px solid ${c.border}`, fontFamily: 'inherit' }}
    >
      {text}
    </kbd>
  );
  const item = 'h-[32px] px-[11px] text-[12.5px] font-medium border-0 cursor-pointer flex items-center gap-[6px] whitespace-nowrap';
  const divider = { borderRight: `1px solid ${c.border}` };

  return (
    <div className="absolute left-1/2 -translate-x-1/2 top-[8px] flex items-start gap-[8px] whitespace-nowrap" style={{ zIndex: 30 }}>
      {search ?? (
        <button onClick={onSearch} className={`${item} rounded-lg min-w-[200px]`} style={{ ...box, color: c.textSecondary }}>
          <Search size={13} />
          <span className="flex-1 text-left font-normal">Buscar etapa</span>
          {kbd('Ctrl F')}
        </button>
      )}

      <div className="flex items-center rounded-lg overflow-hidden" style={box}>
        <button onClick={onZoomOut} title="Diminuir zoom" className={item} style={{ ...divider, background: 'transparent', color: c.textSecondary, paddingInline: 9 }}>
          <Minus size={13} />
        </button>
        {[50, 75, 100].map((pct) => {
          const active = zoomPct === pct;
          return (
            <button
              key={pct}
              onClick={() => onZoom(pct)}
              className={item}
              style={{ ...divider, background: active ? c.accentSoft : 'transparent', color: active ? c.accent : c.textPrimary }}
            >
              {pct}%
            </button>
          );
        })}
        <button onClick={onZoomIn} title="Aumentar zoom" className={item} style={{ ...divider, background: 'transparent', color: c.textSecondary, paddingInline: 9 }}>
          <Plus size={13} />
        </button>
        <button onClick={onFit} className={item} style={{ background: 'transparent', color: c.textPrimary }}>
          Ajustar {kbd('F')}
        </button>
      </div>

      {selectedCount > 0 && (
        <button onClick={onZoomToSelection} className={`${item} rounded-lg`} style={{ ...box, color: c.textPrimary }}>
          <Scan size={13} /> Zoom na seleção {kbd('Shift 2')}
        </button>
      )}
      {selectedCount >= 2 && (
        <button onClick={onGroup} className={`${item} rounded-lg`} style={{ ...box, color: c.textPrimary }}>
          <Group size={13} /> Agrupar em seção {kbd('Ctrl G')}
        </button>
      )}
    </div>
  );
}
