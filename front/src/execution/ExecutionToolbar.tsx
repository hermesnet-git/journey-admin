import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Lock, Search, Square } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import type { JourneySummary } from './api';

const STOP_ARM_TIMEOUT_MS = 2800;

interface Props {
  journeys: JourneySummary[] | null;
  loadError: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  selected: JourneySummary | null;
  onSelect: (journey: JourneySummary) => void;
  // Presente = uma instância está de pé (rodando ou já finalizada, mas a tela ainda não voltou pra
  // busca) — a busca fica travada nesse estado inteiro, não só enquanto está ativamente executando,
  // porque só existe uma aba de Execuções: trocar de jornada no meio precisa ser um ato explícito
  // (o botão "Parar execução" abaixo), nunca um efeito colateral de digitar na busca.
  running: JourneySummary | null;
  onStop: () => void;
  stopping: boolean;
}

export function ExecutionToolbar({ journeys, loadError, query, onQueryChange, selected, onSelect, running, onStop, stopping }: Props) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [open]);

  const q = query.trim().toLowerCase();
  const results = (journeys ?? []).filter(
    (j) =>
      q.length === 0 ||
      j.name.toLowerCase().includes(q) ||
      j.productName.toLowerCase().includes(q) ||
      j.channelName.toLowerCase().includes(q),
  );

  return (
    <div
      className="shrink-0 flex items-center gap-3 px-4 border-b"
      style={{ height: 56, background: skinVars.colors.backgroundContainer, borderColor: skinVars.colors.border }}
    >
      <div ref={containerRef} className="relative flex-1 min-w-0 max-w-[420px]">
        {running ? (
          <div
            className="flex items-center gap-2 h-9 px-3 rounded-lg"
            style={{ background: skinVars.colors.backgroundAlternative, border: `1px solid ${skinVars.colors.border}` }}
          >
            <Lock size={13} color={skinVars.colors.textSecondary} />
            <Text size={13} color={skinVars.colors.textSecondary} truncate>
              {running.name}
            </Text>
          </div>
        ) : (
          <>
            <div className="relative">
              <Search
                size={15}
                color={skinVars.colors.textSecondary}
                style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
              />
              <input
                value={query}
                onChange={(e) => onQueryChange(e.target.value)}
                onFocus={() => setOpen(true)}
                placeholder="Buscar jornada para executar..."
                autoComplete="off"
                className="w-full h-9 box-border rounded-lg outline-none"
                style={{
                  padding: '0 10px 0 32px',
                  fontSize: 13,
                  border: `1px solid ${skinVars.colors.border}`,
                  background: skinVars.colors.background,
                  color: skinVars.colors.textPrimary,
                }}
              />
            </div>
            {open && (
              <div
                className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-lg overflow-y-auto max-h-[360px]"
                style={{
                  background: skinVars.colors.backgroundContainer,
                  border: `1px solid ${skinVars.colors.border}`,
                  boxShadow: '0 12px 32px -10px rgba(0,0,0,.18)',
                }}
              >
                {loadError ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.error}>
                      {loadError}
                    </Text>
                  </div>
                ) : journeys === null ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      Carregando...
                    </Text>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      {q.length === 0
                        ? 'Nenhuma jornada publicada disponível.'
                        : `Nenhuma jornada publicada encontrada para "${query}".`}
                    </Text>
                  </div>
                ) : (
                  results.map((journey) => (
                    <button
                      key={journey.journeyId}
                      type="button"
                      onClick={() => {
                        onSelect(journey);
                        setOpen(false);
                      }}
                      className="w-full text-left px-4 py-[10px] cursor-pointer border-0 flex items-baseline gap-2"
                      style={{ background: journey.journeyId === selected?.journeyId ? skinVars.colors.backgroundAlternative : 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.backgroundAlternative)}
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background =
                          journey.journeyId === selected?.journeyId ? skinVars.colors.backgroundAlternative : 'transparent')
                      }
                    >
                      <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
                        {journey.name}
                      </Text>
                      <Text size={11.5} color={skinVars.colors.textSecondary}>
                        {journey.productName} · {journey.channelName}
                      </Text>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      {running && (
        <>
          <LiveIndicator />
          <div className="flex-1" />
          <StopButton onStop={onStop} stopping={stopping} />
        </>
      )}
    </div>
  );
}

function LiveIndicator() {
  return (
    <div className="flex items-center gap-[7px] shrink-0">
      <span className="relative inline-flex w-[7px] h-[7px]">
        <span
          className="absolute inset-0 rounded-full"
          style={{ background: skinVars.colors.success, animation: 'live-dot-ring 1.8s ease-out infinite' }}
        />
        <span className="relative w-[7px] h-[7px] rounded-full" style={{ background: skinVars.colors.success }} />
      </span>
      <Text size={12.5} weight="medium" color={skinVars.colors.success}>
        Em execução
      </Text>
    </div>
  );
}

// Confirmação de dois estágios embutida no próprio botão, não um modal: parar uma execução de
// simulação não é destrutivo o bastante pra justificar interromper o fluxo com uma caixa separada,
// mas um clique só (sem confirmação nenhuma) arrisca demais perder o passo em que a pessoa estava.
// Primeiro clique arma ("Confirmar parada?"), segundo clique dentro da janela executa; sem segundo
// clique, desarma sozinho.
function StopButton({ onStop, stopping }: { onStop: () => void; stopping: boolean }) {
  const [armed, setArmed] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  function handleClick() {
    if (stopping) return;
    if (!armed) {
      setArmed(true);
      timeoutRef.current = setTimeout(() => setArmed(false), STOP_ARM_TIMEOUT_MS);
      return;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setArmed(false);
    onStop();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={stopping}
      className="flex items-center gap-[6px] h-9 px-3 rounded-lg text-[13px] font-medium cursor-pointer border-0 shrink-0 transition-colors disabled:opacity-60 disabled:cursor-default"
      style={{
        background: armed ? skinVars.colors.error : skinVars.colors.errorLow,
        color: armed ? '#fff' : skinVars.colors.error,
      }}
      title="Encerra a instância no motor e libera a tela para executar outra jornada"
    >
      {armed ? <AlertTriangle size={14} /> : <Square size={12} fill="currentColor" />}
      {stopping ? 'Encerrando...' : armed ? 'Confirmar parada?' : 'Parar execução'}
    </button>
  );
}
