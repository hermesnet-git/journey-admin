import { useEffect, useRef, useState } from 'react';
import { Play, RotateCcw, Search } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import { ExecutionApiError, resumeInstance, type JourneySummary, type ResumeInstanceResponse } from './api';
import { searchInstanceHistory, type HistoricInstanceSummary } from '../diagnostics/api';

// Parece um ID de instância ou business key colado (UUID ou prefixo dele), não um nome de jornada.
const LOOKS_LIKE_KEY = /^[0-9a-f-]{8,}$/i;

function timeOf(iso: string) {
  const d = new Date(iso);
  return new Date().toDateString() === d.toDateString()
    ? d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

interface Props {
  journeys: JourneySummary[] | null;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (journey: JourneySummary) => void;
  onResumed: (response: ResumeInstanceResponse) => void;
}

type Option = { key: string; kind: 'execution' | 'journey'; run: () => void; title: React.ReactNode; detail: React.ReactNode };

// Campo único da tela inicial da Execução: um nome lista as jornadas publicadas para executar; um
// ID de instância ou business key colado mostra a execução em andamento correspondente, para
// retomar. Ao sair de uma execução sem parar, o campo já volta com o business key dela.
export function ExecutionEntryField({ journeys, query, onQueryChange, onSelect, onResumed }: Props) {
  const [running, setRunning] = useState<HistoricInstanceSummary[]>([]);
  const [open, setOpen] = useState(() => LOOKS_LIKE_KEY.test(query.trim()));
  const [active, setActive] = useState(0);
  const [resuming, setResuming] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  // Execuções abertas, buscadas de novo a cada vez que o campo ganha foco (podem ter mudado em outra aba).
  const loadRunning = () =>
    searchInstanceHistory({ finished: false })
      .then((list) => setRunning([...list].sort((a, b) => b.startTime.localeCompare(a.startTime))))
      .catch(() => setRunning([]));
  useEffect(() => {
    loadRunning();
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [open]);

  useEffect(() => setActive(0), [query]);

  async function resume(value: string) {
    if (resuming) return;
    setResuming(value);
    setError(null);
    try {
      onResumed(await resumeInstance(value));
    } catch (e) {
      setError(
        e instanceof ExecutionApiError && e.status === 404
          ? 'Nenhuma execução encontrada para esse valor.'
          : e instanceof ExecutionApiError && e.status === 409
            ? 'Essa execução já foi concluída ou encerrada. Consulte-a pelo Diagnóstico.'
            : e instanceof Error
              ? e.message
              : 'Erro ao retomar a execução.',
      );
    } finally {
      setResuming(null);
    }
  }

  const v = query.trim();
  const keyLike = LOOKS_LIKE_KEY.test(v);
  const lower = v.toLowerCase();
  // Por ID/business key: a execução exata. Por nome: as execuções abertas das jornadas com esse nome.
  const executions = !v
    ? []
    : keyLike
      ? running.filter((i) => i.id.startsWith(v) || i.businessKey.startsWith(v))
      : running.filter((i) => i.journeyName.toLowerCase().includes(lower));
  const journeyMatches = keyLike ? [] : (journeys ?? []).filter((j) => j.name.toLowerCase().includes(lower));
  const hiddenExecutions = Math.max(0, executions.length - 5);

  const executionOptions: Option[] = [
    ...executions.slice(0, 5).map((i) => ({
      key: `e-${i.id}`,
      kind: 'execution' as const,
      run: () => resume(i.id),
      title: (
        <>
          {i.journeyName}{' '}
          <span className="text-[11px] font-semibold ml-1" style={{ color: skinVars.colors.success }}>
            Em andamento
          </span>
        </>
      ),
      detail: (
        <>
          business key <span className="font-mono">{i.businessKey}</span> · iniciada {timeOf(i.startTime)}
          {i.channel && ` · ${i.channel}`}
        </>
      ),
    })),
    // Valor com cara de ID que não está na lista carregada: tenta retomar direto (o servidor diz se existe).
    ...(keyLike && executions.length === 0
      ? [{ key: 'raw', kind: 'execution' as const, run: () => resume(v), title: 'Retomar a execução', detail: <span className="font-mono">{v}</span> }]
      : []),
  ];
  const journeyOptions: Option[] = [
    ...journeyMatches.slice(0, 8).map((j) => ({
      key: `j-${j.journeyId}`,
      kind: 'journey' as const,
      run: () => {
        setOpen(false);
        onSelect(j);
      },
      title: j.name,
      detail: (
        <>
          {j.productName} · {j.channelTypes.join(', ')}
          {j.publishedVersionNumber != null && ` · v${j.publishedVersionNumber}`}
        </>
      ),
    })),
  ];
  // Busca por nome: jornadas primeiro (Enter escolhe a jornada); por ID: só a execução.
  const options = [...journeyOptions, ...executionOptions];

  return (
    <div ref={boxRef} className="relative max-w-[600px]">
      <div
        className="flex items-center gap-2 h-10 px-3 rounded-lg"
        style={{ border: `1px solid ${open ? skinVars.colors.brand : skinVars.colors.border}`, background: skinVars.colors.background }}
      >
        <Search size={15} color={skinVars.colors.textSecondary} />
        <input
          value={query}
          onChange={(e) => {
            onQueryChange(e.target.value);
            setError(null);
            setOpen(true);
          }}
          onFocus={() => {
            setOpen(true);
            loadRunning();
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') setActive((a) => Math.min(a + 1, options.length - 1));
            else if (e.key === 'ArrowUp') setActive((a) => Math.max(a - 1, 0));
            else if (e.key === 'Enter') options[active]?.run();
            else if (e.key === 'Escape') setOpen(false);
          }}
          placeholder="Nome da jornada, ID da instância ou business key…"
          aria-label="Nome da jornada, ID da instância ou business key"
          autoComplete="off"
          className={`flex-1 min-w-0 bg-transparent border-0 outline-none text-[13.5px] ${keyLike ? 'font-mono' : ''}`}
          style={{ color: skinVars.colors.textPrimary }}
        />
      </div>

      {open && (
        <div
          className="absolute left-0 right-0 top-[44px] z-20 rounded-lg max-h-[380px] overflow-y-auto"
          style={{ border: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.backgroundContainer, boxShadow: '0 8px 24px rgba(0,0,0,.18)' }}
        >
          {options.length === 0 && (
            <div className="px-3 py-3 text-[12.5px]" style={{ color: skinVars.colors.textSecondary }}>
              {journeys === null ? 'Carregando jornadas…' : 'Nada encontrado. Digite parte do nome de uma jornada, ou cole um ID da instância ou business key.'}
            </div>
          )}
          {options.map((o, i) => (
            <div key={o.key}>
              {(i === 0 || options[i - 1].kind !== o.kind) && (
                <div className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.07em]" style={{ color: skinVars.colors.textSecondary }}>
                  {o.kind === 'journey' ? 'Jornadas publicadas' : keyLike ? 'Execução em andamento' : `Execuções em andamento (${executions.length})`}
                </div>
              )}
              <button
                type="button"
                onMouseEnter={() => setActive(i)}
                onClick={o.run}
                className="w-full text-left flex items-center gap-3 px-3 py-2 border-0 cursor-pointer text-[13px]"
                style={{ background: i === active ? skinVars.colors.brandLow : 'transparent', color: skinVars.colors.textPrimary }}
              >
                <span
                  className="w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0"
                  style={{ background: i === active ? skinVars.colors.brand : skinVars.colors.backgroundAlternative, color: i === active ? '#fff' : skinVars.colors.textSecondary }}
                >
                  {o.kind === 'journey' ? <Play size={13} /> : <RotateCcw size={13} />}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-semibold truncate">{o.title}</span>
                  <span className="block text-[12px] truncate" style={{ color: skinVars.colors.textSecondary }}>
                    {o.detail}
                  </span>
                </span>
                {i === active && (
                  <span className="text-[12px] font-semibold shrink-0" style={{ color: skinVars.colors.brand }}>
                    {o.kind === 'journey' ? 'Escolher' : resuming ? 'Retomando…' : 'Retomar'}
                  </span>
                )}
              </button>
            </div>
          ))}
          {hiddenExecutions > 0 && (
            <div className="px-3 py-2 text-[12px]" style={{ color: skinVars.colors.textSecondary }}>
              Mais {hiddenExecutions} {hiddenExecutions === 1 ? 'execução' : 'execuções'} em andamento. Cole o business key para achar uma específica.
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="mt-2">
          <Text size={12} color={skinVars.colors.error}>
            {error}
          </Text>
        </div>
      )}
    </div>
  );
}
