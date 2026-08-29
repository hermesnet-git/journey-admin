import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, History, Lock, PlayCircle, Search, Square } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import type { HistoricInstanceSummary, JourneySummary } from './api';

const STOP_ARM_TIMEOUT_MS = 2800;

export type ExecutionMode = 'live' | 'history';

interface Props {
  mode: ExecutionMode;
  onModeChange: (mode: ExecutionMode) => void;
  journeys: JourneySummary[] | null;
  loadError: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  selected: JourneySummary | null;
  onSelect: (journey: JourneySummary) => void;
  // Presente = uma instância está de pé (rodando ou já finalizada, mas a tela ainda não voltou pra
  // busca) — a busca fica travada nesse estado inteiro, não só enquanto está ativamente executando,
  // porque só existe uma aba de Execuções: trocar de jornada no meio precisa ser um ato explícito
  // (o botão "Parar execução" abaixo), nunca um efeito colateral de digitar na busca. Pelo mesmo
  // motivo, o toggle Ao vivo/Histórico fica desabilitado nesse estado — trocar de aba perderia o
  // log/nodeIO acumulados ao vivo (ExecutionWorkspace reconstrói tudo do zero ao montar).
  running: JourneySummary | null;
  onStop: () => void;
  stopping: boolean;
  // Busca de instâncias históricas (aba Histórico) — mesmo padrão da busca de jornada acima, só que
  // sobre HistoricInstanceSummary; filtragem por texto acontece no componente pai (mesmo texto pode
  // bater tanto com o nome da jornada quanto com o business key).
  historyQuery: string;
  onHistoryQueryChange: (value: string) => void;
  historyResults: HistoricInstanceSummary[] | null;
  historyLoadError: string | null;
  historyOnlyFinished: boolean;
  onHistoryOnlyFinishedChange: (value: boolean) => void;
  onSelectHistoryInstance: (instance: HistoricInstanceSummary) => void;
  // Instância histórica aberta (drill-down) — trava a busca igual `running` trava a de jornada, com
  // um botão de voltar em vez de "Parar execução" (não há nada pra encerrar, só fechar o detalhe).
  historySelected: HistoricInstanceSummary | null;
  onHistoryBack: () => void;
}

export function ExecutionToolbar({
  mode,
  onModeChange,
  journeys,
  loadError,
  query,
  onQueryChange,
  selected,
  onSelect,
  running,
  onStop,
  stopping,
  historyQuery,
  onHistoryQueryChange,
  historyResults,
  historyLoadError,
  historyOnlyFinished,
  onHistoryOnlyFinishedChange,
  onSelectHistoryInstance,
  historySelected,
  onHistoryBack,
}: Props) {
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
      <ModeToggle mode={mode} onChange={onModeChange} disabled={!!running} />

      {mode === 'live' ? (
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
              {running.publishedVersionNumber != null && (
                <Text size={11.5} color={skinVars.colors.textSecondary}>
                  · v{running.publishedVersionNumber}
                </Text>
              )}
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
                          {journey.publishedVersionNumber != null && ` · v${journey.publishedVersionNumber}`}
                        </Text>
                      </button>
                    ))
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        <HistorySearchBar
          query={historyQuery}
          onQueryChange={onHistoryQueryChange}
          results={historyResults}
          loadError={historyLoadError}
          onlyFinished={historyOnlyFinished}
          onOnlyFinishedChange={onHistoryOnlyFinishedChange}
          onSelect={onSelectHistoryInstance}
          selected={historySelected}
          onBack={onHistoryBack}
        />
      )}

      {mode === 'live' && running && (
        <>
          <LiveIndicator />
          <div className="flex-1" />
          <StopButton onStop={onStop} stopping={stopping} />
        </>
      )}
    </div>
  );
}

function ModeToggle({ mode, onChange, disabled }: { mode: ExecutionMode; onChange: (m: ExecutionMode) => void; disabled: boolean }) {
  const options: { key: ExecutionMode; label: string; icon: typeof PlayCircle }[] = [
    { key: 'live', label: 'Ao vivo', icon: PlayCircle },
    { key: 'history', label: 'Histórico', icon: History },
  ];
  return (
    <div
      className="shrink-0 flex items-center gap-[2px] rounded-lg p-[2px]"
      style={{ background: skinVars.colors.backgroundAlternative, opacity: disabled ? 0.5 : 1 }}
      title={disabled ? 'Pare a execução atual para trocar de aba' : undefined}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const active = opt.key === mode;
        return (
          <button
            key={opt.key}
            type="button"
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className="flex items-center gap-[6px] h-8 px-3 rounded-md text-[12.5px] font-medium border-0 disabled:cursor-not-allowed"
            style={{
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: active ? skinVars.colors.background : 'transparent',
              color: active ? skinVars.colors.textPrimary : skinVars.colors.textSecondary,
              boxShadow: active ? `0 1px 3px 0 rgba(0,0,0,.08)` : 'none',
            }}
          >
            <Icon size={13} />
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function HistorySearchBar({
  query,
  onQueryChange,
  results,
  loadError,
  onlyFinished,
  onOnlyFinishedChange,
  onSelect,
  selected,
  onBack,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  results: HistoricInstanceSummary[] | null;
  loadError: string | null;
  onlyFinished: boolean;
  onOnlyFinishedChange: (value: boolean) => void;
  onSelect: (instance: HistoricInstanceSummary) => void;
  selected: HistoricInstanceSummary | null;
  onBack: () => void;
}) {
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

  if (selected) {
    return (
      <div
        className="flex items-center gap-2 h-9 px-3 rounded-lg flex-1 min-w-0 max-w-[520px]"
        style={{ background: skinVars.colors.backgroundAlternative, border: `1px solid ${skinVars.colors.border}` }}
      >
        <button
          type="button"
          onClick={onBack}
          title="Voltar à busca"
          className="shrink-0 cursor-pointer border-0 bg-transparent flex items-center"
          style={{ color: skinVars.colors.textSecondary }}
        >
          <ArrowLeft size={15} />
        </button>
        <Text size={13} color={skinVars.colors.textSecondary} truncate>
          {selected.journeyName}
        </Text>
        <Text size={11.5} color={skinVars.colors.textSecondary} truncate>
          · {selected.businessKey}
        </Text>
      </div>
    );
  }

  const q = query.trim().toLowerCase();
  const filtered = (results ?? []).filter(
    (r) => q.length === 0 || r.journeyName.toLowerCase().includes(q) || r.businessKey.toLowerCase().includes(q),
  );

  return (
    <div ref={containerRef} className="relative flex-1 min-w-0 max-w-[520px] flex items-center gap-2">
      <div className="relative flex-1 min-w-0">
        <Search
          size={15}
          color={skinVars.colors.textSecondary}
          style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="Buscar por jornada ou business key..."
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
            ) : results === null ? (
              <div className="px-4 py-3">
                <Text size={13} color={skinVars.colors.textSecondary}>
                  Carregando...
                </Text>
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-4 py-3">
                <Text size={13} color={skinVars.colors.textSecondary}>
                  {q.length === 0 ? 'Nenhuma instância encontrada.' : `Nenhuma instância encontrada para "${query}".`}
                </Text>
              </div>
            ) : (
              filtered.map((instance) => (
                <button
                  key={instance.id}
                  type="button"
                  onClick={() => {
                    onSelect(instance);
                    setOpen(false);
                  }}
                  className="w-full text-left px-4 py-[10px] cursor-pointer border-0 flex items-baseline justify-between gap-2"
                  onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.backgroundAlternative)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <span className="min-w-0 flex items-baseline gap-2 truncate">
                    <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary} truncate>
                      {instance.journeyName}
                    </Text>
                    <Text size={11} color={skinVars.colors.textSecondary} truncate>
                      {instance.businessKey}
                    </Text>
                  </span>
                  <Text size={11} color={skinVars.colors.textSecondary}>
                    {instance.state}
                  </Text>
                </button>
              ))
            )}
          </div>
        )}
      </div>
      <label className="shrink-0 flex items-center gap-[6px] cursor-pointer select-none">
        <input type="checkbox" checked={onlyFinished} onChange={(e) => onOnlyFinishedChange(e.target.checked)} />
        <Text size={12} color={skinVars.colors.textSecondary}>
          Só concluídas
        </Text>
      </label>
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
