import { useEffect, useRef, useState } from 'react';
import { Play, Search } from 'lucide-react';
import { Callout, Stack, Text, TextFieldBase, skinVars } from '@telefonica/mistica';
import { listJourneys, startInstance, type FlowBundle, type JourneySummary, type StepResponse } from './api';
import { SimulationApiError, SimulationNetworkError } from './api';
import { recordSimulationStart } from './auditApi';

interface Props {
  onStarted: (processInstanceId: string, journey: JourneySummary, flow: FlowBundle, step: StepResponse) => void;
}

export function JourneySearch({ onStarted }: Props) {
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<JourneySummary | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listJourneys()
      .then(setJourneys)
      .catch((e) => setLoadError(errorMessage(e)));
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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

  function handleSelect(journey: JourneySummary) {
    setSelected(journey);
    setQuery(journey.name);
    setOpen(false);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    setOpen(true);
    if (selected && value !== selected.name) {
      setSelected(null);
    }
  }

  async function handleExecute() {
    if (!selected) return;
    setStarting(true);
    setStartError(null);
    try {
      const { processInstanceId, flow, step } = await startInstance(selected.journeyId);
      recordSimulationStart(selected.journeyId, selected.name, processInstanceId).catch(() => {
        /* falha ao registrar auditoria não deve impedir a simulação de continuar */
      });
      onStarted(processInstanceId, selected, flow, step);
    } catch (e) {
      setStartError(errorMessage(e));
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: skinVars.colors.background }}>
      <div className="w-full max-w-[560px] px-6">
        <Stack space={24}>
          <Stack space={4}>
            <Text size={24} weight="bold" color={skinVars.colors.textPrimary} textAlign="center">
              Simulações
            </Text>
            <Text size={14} color={skinVars.colors.textSecondary} textAlign="center">
              Busque uma jornada publicada para executá-la de ponta a ponta
            </Text>
          </Stack>

          {loadError && <Callout variant="default" title="Não foi possível carregar as jornadas" description={loadError} />}

          <div ref={containerRef} className="relative">
            <TextFieldBase
              label="Buscar jornada"
              placeholder="Nome da jornada, produto ou canal..."
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onFocus={() => setOpen(true)}
              startIcon={<Search size={16} />}
              fullWidth
              autoComplete="off"
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
                {journeys === null ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      Carregando...
                    </Text>
                  </div>
                ) : results.length === 0 ? (
                  <div className="px-4 py-3">
                    <Text size={13} color={skinVars.colors.textSecondary}>
                      Nenhuma jornada publicada encontrada para &quot;{query}&quot;.
                    </Text>
                  </div>
                ) : (
                  results.map((journey) => (
                    <button
                      key={journey.journeyId}
                      type="button"
                      onClick={() => handleSelect(journey)}
                      className="w-full text-left px-4 py-[10px] cursor-pointer border-0"
                      style={{ background: 'transparent' }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.backgroundAlternative)}
                      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                    >
                      <Stack space={2}>
                        <Text size={14} weight="medium" color={skinVars.colors.textPrimary}>
                          {journey.name}
                        </Text>
                        <Text size={12} color={skinVars.colors.textSecondary}>
                          {journey.productName} · {journey.channelName}
                        </Text>
                      </Stack>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {startError && <Callout variant="default" title="Não foi possível iniciar" description={startError} />}

          <button
            type="button"
            disabled={!selected || starting}
            onClick={handleExecute}
            className="flex items-center justify-center gap-2 rounded-lg py-3 w-full border-0 font-semibold cursor-pointer transition-opacity"
            style={{
              background: skinVars.colors.buttonPrimaryBackground,
              color: skinVars.colors.textButtonPrimary,
              opacity: !selected || starting ? 0.5 : 1,
              cursor: !selected || starting ? 'default' : 'pointer',
            }}
          >
            <Play size={16} />
            {starting ? 'Iniciando...' : 'Executar'}
          </button>
        </Stack>
      </div>
    </div>
  );
}

function errorMessage(e: unknown): string {
  if (e instanceof SimulationNetworkError) return e.message;
  if (e instanceof SimulationApiError) return e.message;
  return 'Erro inesperado.';
}
