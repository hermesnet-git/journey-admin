import { useEffect } from 'react';
import { Pause, Play, RotateCcw, X } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';

interface Props {
  total: number;
  // Passos visíveis (1…total); null = reprodução desligada, tudo à mostra.
  position: number | null;
  playing: boolean;
  stepLabel: string | null;
  onPositionChange: (position: number | null) => void;
  onPlayingChange: (playing: boolean) => void;
}

const STEP_MS = 1200;

// Reprodução da execução: avança passo a passo (ou pelo controle deslizante) e o resto da tela mostra
// o estado da jornada até aquele passo.
export function ReplayBar({ total, position, playing, stepLabel, onPositionChange, onPlayingChange }: Props) {
  useEffect(() => {
    if (!playing) return;
    if (position !== null && position >= total) {
      onPlayingChange(false);
      return;
    }
    const timer = setTimeout(() => onPositionChange(position === null ? 1 : position + 1), position === null ? 0 : STEP_MS);
    return () => clearTimeout(timer);
  }, [playing, position, total, onPositionChange, onPlayingChange]);

  if (total === 0) return null;
  const btn = 'shrink-0 w-[30px] h-[30px] rounded-full flex items-center justify-center border-0 cursor-pointer';

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-6 py-2"
      style={{ borderBottom: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.backgroundContainer }}
    >
      <button
        type="button"
        onClick={() => {
          if (!playing && position !== null && position >= total) onPositionChange(0);
          onPlayingChange(!playing);
        }}
        title={playing ? 'Pausar' : 'Reproduzir a execução passo a passo'}
        className={btn}
        style={{ background: skinVars.colors.brand, color: '#fff' }}
      >
        {playing ? <Pause size={14} /> : <Play size={14} />}
      </button>
      <span className="shrink-0 text-[12.5px] font-medium" style={{ color: skinVars.colors.textPrimary }}>
        Reprodução
      </span>
      <input
        type="range"
        min={0}
        max={total}
        value={position ?? total}
        onChange={(e) => {
          onPlayingChange(false);
          onPositionChange(Number(e.target.value));
        }}
        aria-label="Passo da execução"
        className="flex-1 min-w-[120px]"
        style={{ accentColor: skinVars.colors.brand }}
      />
      <span className="shrink-0 text-[12px] tabular-nums min-w-[220px] truncate" style={{ color: skinVars.colors.textSecondary }}>
        {position === null ? `${total} passos — execução completa` : position === 0 ? 'Antes do primeiro passo' : `Passo ${position} de ${total}${stepLabel ? ` — ${stepLabel}` : ''}`}
      </span>
      {position !== null && (
        <>
          <button
            type="button"
            onClick={() => {
              onPlayingChange(false);
              onPositionChange(0);
            }}
            title="Voltar ao começo"
            className={btn}
            style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textPrimary }}
          >
            <RotateCcw size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              onPlayingChange(false);
              onPositionChange(null);
            }}
            title="Sair da reprodução (mostrar tudo)"
            className={btn}
            style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textPrimary }}
          >
            <X size={13} />
          </button>
        </>
      )}
    </div>
  );
}
