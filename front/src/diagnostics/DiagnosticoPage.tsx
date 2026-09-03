import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ArrowLeft,
  ArrowUpDown,
  CircleCheck,
  ChevronRight,
  Fingerprint,
  KeyRound,
  Layers,
  Route,
  Search,
  Stethoscope,
  XCircle,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { useAppTheme, type AppColors } from '../shell/theme';
import { formatDateTime, formatDuration, HistoryWorkspace, STATE_LABEL } from '../execution/HistoryWorkspace';
import {
  getInstanceHistory,
  searchInstanceHistory,
  type HistoricInstanceSummary,
  type InstanceHistoryResponse,
  type InstanceHistorySearchFilters,
  type JourneySummary,
} from '../execution/api';
import { listJourneys } from '../api/journeys';

type Bucket = 'active' | 'completed' | 'other';

function bucketOf(state: string): Bucket {
  if (state === 'ACTIVE') return 'active';
  if (state === 'COMPLETED') return 'completed';
  return 'other';
}

function bucketMeta(bucket: Bucket, c: AppColors): { fg: string; bg: string; Icon: ComponentType<{ size?: number }> } {
  if (bucket === 'active') return { fg: c.accent, bg: c.accentSoft, Icon: Activity };
  if (bucket === 'completed') return { fg: c.success, bg: c.successSoft, Icon: CircleCheck };
  return { fg: c.danger, bg: c.dangerSoft, Icon: XCircle };
}

const GRID_COLS = 'minmax(0,1fr) 160px 150px 110px';

type SearchType = 'journey' | 'businessKey' | 'instanceId';

const SEARCH_TYPES: { key: SearchType; label: string; icon: typeof Route; placeholder: string }[] = [
  { key: 'journey', label: 'Jornada', icon: Route, placeholder: 'Buscar jornada...' },
  { key: 'businessKey', label: 'Business key', icon: KeyRound, placeholder: 'Colar business key...' },
  { key: 'instanceId', label: 'Instance ID', icon: Fingerprint, placeholder: 'Colar instance ID...' },
];

interface Group {
  key: string;
  journeyName: string;
  version: number | null;
  items: HistoricInstanceSummary[];
}

function groupByVersion(items: HistoricInstanceSummary[]): Group[] {
  const byKey = new Map<string, Group>();
  for (const item of items) {
    const key = `${item.journeyName}·${item.version ?? '—'}`;
    let group = byKey.get(key);
    if (!group) {
      group = { key, journeyName: item.journeyName, version: item.version, items: [] };
      byKey.set(key, group);
    }
    group.items.push(item);
  }
  return [...byKey.values()];
}

interface Props {
  // Setado só nas abas dedicadas abertas a partir do card "Execuções recentes" do Dashboard — a
  // página já nasce mostrando o detalhe desta instância, em vez da busca em branco.
  initialInstanceId?: string;
}

export function DiagnosticoPage({ initialInstanceId }: Props) {
  const { colors: c } = useAppTheme();

  const [searchType, setSearchType] = useState<SearchType>('journey');
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [journeyQuery, setJourneyQuery] = useState('');
  const [journeyOpen, setJourneyOpen] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<JourneySummary | null>(null);
  const [businessKeyInput, setBusinessKeyInput] = useState('');
  const [instanceIdInput, setInstanceIdInput] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const journeyBoxRef = useRef<HTMLDivElement>(null);

  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [raw, setRaw] = useState<HistoricInstanceSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [grouped, setGrouped] = useState(true);

  const [selectedId, setSelectedId] = useState<string | null>(initialInstanceId ?? null);
  const [detail, setDetail] = useState<InstanceHistoryResponse | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  // Fonte do autocomplete de jornada — carregada em silêncio, não é a listagem de execuções em si
  // (essa só aparece depois de uma busca de verdade).
  useEffect(() => {
    listJourneys({ status: 'PUBLISHED' }).then(setJourneys).catch(() => setJourneys([]));
  }, []);

  useEffect(() => {
    if (initialInstanceId) openDetail(initialInstanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!journeyOpen) return;
    function handleClick(e: MouseEvent) {
      if (journeyBoxRef.current && !journeyBoxRef.current.contains(e.target as Node)) setJourneyOpen(false);
    }
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, [journeyOpen]);

  function runSearch(filters: InstanceHistorySearchFilters) {
    setSearching(true);
    setLoadError(null);
    setHasSearched(true);
    searchInstanceHistory(filters)
      .then((results) => {
        setRaw(results);
        setSearching(false);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Erro ao buscar execuções.');
        setSearching(false);
      });
  }

  function handleSelectJourney(journey: JourneySummary) {
    setSelectedJourney(journey);
    setJourneyQuery(journey.name);
    setJourneyOpen(false);
    runSearch({ journeyId: journey.journeyId, startedFrom: from || undefined, startedTo: to || undefined });
  }

  function handleSearchClick() {
    if (searchType === 'journey') {
      if (selectedJourney) runSearch({ journeyId: selectedJourney.journeyId, startedFrom: from || undefined, startedTo: to || undefined });
      return;
    }
    if (searchType === 'businessKey') {
      const value = businessKeyInput.trim();
      if (!value) return;
      runSearch({ businessKey: value, startedFrom: from || undefined, startedTo: to || undefined });
      return;
    }
    const id = instanceIdInput.trim();
    if (id) handleInstanceIdSearch(id);
  }

  // Diferente de openDetail (usado ao clicar numa linha já sabida existir): aqui ainda não se sabe
  // se o ID digitado existe, então só navega pro detalhe se a busca der certo — se não, o erro
  // aparece na própria tela de busca (mesmo card de resultado, ver `loadError` abaixo), sem trocar
  // de tela pra mostrar "não encontrada".
  function handleInstanceIdSearch(id: string) {
    setSearching(true);
    setLoadError(null);
    setHasSearched(true);
    getInstanceHistory(id)
      .then((history) => {
        setSelectedId(id);
        setDetail(history);
        setSearching(false);
      })
      .catch((e) => {
        setLoadError(e instanceof Error ? e.message : 'Instância não encontrada.');
        setSearching(false);
      });
  }

  const searchDisabled =
    (searchType === 'journey' && !selectedJourney) ||
    (searchType === 'businessKey' && !businessKeyInput.trim()) ||
    (searchType === 'instanceId' && !instanceIdInput.trim());

  function openDetail(id: string) {
    setSelectedId(id);
    setDetail(null);
    setDetailError(null);
    getInstanceHistory(id)
      .then(setDetail)
      .catch((e) => setDetailError(e instanceof Error ? e.message : 'Erro ao carregar esta execução.'));
  }

  function closeDetail() {
    setSelectedId(null);
    setDetail(null);
    setDetailError(null);
  }

  const sorted = useMemo(() => {
    const list = raw ?? [];
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...list].sort((a, b) => dir * (new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
  }, [raw, sortDir]);

  const groups = useMemo(() => groupByVersion(sorted), [sorted]);

  const journeyResults = (journeys ?? []).filter((j) => {
    const q = journeyQuery.trim().toLowerCase();
    return q.length === 0 || j.name.toLowerCase().includes(q);
  });

  if (selectedId) {
    return (
      <div className="flex-1 min-h-0 flex flex-col">
        <button
          type="button"
          onClick={closeDetail}
          className="shrink-0 flex items-center gap-[6px] px-6 py-3 text-[12.5px] font-medium cursor-pointer border-0 bg-transparent w-fit"
          style={{ color: c.accent }}
        >
          <ArrowLeft size={14} />
          Diagnóstico
        </button>
        {detailError ? (
          <div className="flex-1 min-h-0 flex items-center justify-center px-6">
            <span className="text-[13.5px]" style={{ color: c.danger }}>
              {detailError}
            </span>
          </div>
        ) : detail ? (
          <HistoryWorkspace key={detail.processInstanceId} history={detail} />
        ) : (
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="h-[72px] shrink-0 mx-6 rounded-lg animate-pulse" style={{ background: c.chipBg }} />
            <div className="flex-1 min-h-0 p-6">
              <div className="h-full rounded-lg animate-pulse" style={{ background: c.chipBg }} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6 flex items-start gap-4 flex-wrap">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: c.accent }}>
          <Stethoscope size={24} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
            Diagnóstico
          </h1>
          <p className="m-0 text-[13.5px] max-w-[640px]" style={{ color: c.textSecondary }}>
            Investigue o comportamento de qualquer execução de jornada no runtime engine.
          </p>
        </div>
      </div>

      <div className="rounded-xl p-3 mb-6" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
        <div className="flex items-center gap-2 flex-wrap">
          <SearchTypeToggle
            value={searchType}
            onChange={(t) => {
              setSearchType(t);
              setJourneyOpen(false);
            }}
            c={c}
          />

          {searchType === 'journey' ? (
            <div ref={journeyBoxRef} className="relative flex-1 min-w-[220px] max-w-[360px]">
              <Search size={14} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
              <input
                value={journeyQuery}
                onChange={(e) => {
                  setJourneyQuery(e.target.value);
                  setSelectedJourney(null);
                }}
                onFocus={() => setJourneyOpen(true)}
                placeholder="Buscar jornada..."
                aria-label="Buscar jornada"
                autoComplete="off"
                className="w-full py-[8px] pl-[30px] pr-3 rounded-md text-[12.5px] outline-none box-border"
                style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.textPrimary }}
              />
              {journeyOpen && (
                <div
                  className="absolute left-0 right-0 top-[calc(100%+6px)] z-20 rounded-lg overflow-y-auto max-h-[300px]"
                  style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -10px ${c.shadow}` }}
                >
                  {journeys === null ? (
                    <div className="px-4 py-3 text-[12.5px]" style={{ color: c.textSecondary }}>
                      Carregando...
                    </div>
                  ) : journeyResults.length === 0 ? (
                    <div className="px-4 py-3 text-[12.5px]" style={{ color: c.textSecondary }}>
                      Nenhuma jornada encontrada.
                    </div>
                  ) : (
                    journeyResults.map((j) => (
                      <button
                        key={j.journeyId}
                        type="button"
                        onClick={() => handleSelectJourney(j)}
                        className="w-full text-left px-3 py-[8px] cursor-pointer border-0 bg-transparent text-[12.5px]"
                        style={{ color: c.textPrimary }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        {j.name}
                        {j.publishedVersionNumber != null && (
                          <span style={{ color: c.textMuted }}> · v{j.publishedVersionNumber}</span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          ) : searchType === 'businessKey' ? (
            <input
              value={businessKeyInput}
              onChange={(e) => setBusinessKeyInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              placeholder="Colar business key..."
              aria-label="Buscar por business key"
              autoComplete="off"
              className="flex-1 min-w-[220px] max-w-[360px] py-[8px] px-3 rounded-md text-[12.5px] font-mono outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.textPrimary }}
            />
          ) : (
            <input
              value={instanceIdInput}
              onChange={(e) => setInstanceIdInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchClick()}
              placeholder="Colar instance ID..."
              aria-label="Buscar por instance ID"
              autoComplete="off"
              className="flex-1 min-w-[220px] max-w-[360px] py-[8px] px-3 rounded-md text-[12.5px] font-mono outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.textPrimary }}
            />
          )}

          {searchType !== 'instanceId' && (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                aria-label="Início do período"
                className="py-[7px] px-[10px] rounded-md text-[12.5px] outline-none box-border"
                style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.textPrimary }}
              />
              <span className="text-[12.5px]" style={{ color: c.textMuted }}>
                até
              </span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                aria-label="Fim do período"
                className="py-[7px] px-[10px] rounded-md text-[12.5px] outline-none box-border"
                style={{ border: `1px solid ${c.border}`, background: c.bg, color: c.textPrimary }}
              />
            </>
          )}

          <button
            type="button"
            onClick={handleSearchClick}
            disabled={searchDisabled}
            className="flex items-center gap-[6px] px-[14px] py-[8px] rounded-md text-[12.5px] font-medium border-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            style={{ background: c.accent, color: '#fff' }}
          >
            <Search size={13} />
            Buscar
          </button>
        </div>
      </div>

      {!hasSearched ? (
        <BlankState c={c} />
      ) : (
        <>
          <div className="flex items-center justify-end mb-3">
            <button
              type="button"
              onClick={() => setGrouped((g) => !g)}
              className="flex items-center gap-[6px] px-[10px] py-[7px] rounded-md text-[12px] font-medium cursor-pointer"
              style={{
                border: `1px solid ${grouped ? c.accent : c.border}`,
                background: grouped ? c.accentSoft : c.surface,
                color: grouped ? c.accent : c.textSecondary,
              }}
            >
              <Layers size={13} />
              {grouped ? 'Agrupado por versão' : 'Agrupar por versão'}
            </button>
          </div>

          <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
            <div className="grid items-center px-3" style={{ gridTemplateColumns: GRID_COLS, minHeight: 34 }}>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] py-2" style={{ color: c.textMuted }}>
                Execução
              </span>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
                Estado
              </span>
              <button
                type="button"
                onClick={() => setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-[4px] text-[10.5px] font-semibold uppercase tracking-[0.04em] border-0 bg-transparent cursor-pointer p-0 w-fit"
                style={{ color: c.textMuted }}
                title="Ordenar por início"
              >
                Início
                <ArrowUpDown size={11} />
              </button>
              <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
                Duração
              </span>
            </div>
            {loadError ? (
              <p className="m-0 p-4 text-[12.5px]" style={{ color: c.danger, borderTop: `1px solid ${c.border}` }}>
                {loadError}
              </p>
            ) : searching ? (
              <div className="p-3 flex flex-col gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-[38px] rounded-lg animate-pulse" style={{ background: c.chipBg }} />
                ))}
              </div>
            ) : sorted.length === 0 ? (
              <p className="m-0 p-4 text-[12.5px]" style={{ color: c.textSecondary, borderTop: `1px solid ${c.border}` }}>
                Nenhuma execução encontrada.
              </p>
            ) : grouped ? (
              groups.map((group) => <InstanceGroup key={group.key} group={group} onOpen={openDetail} c={c} />)
            ) : (
              sorted.map((item) => <InstanceRow key={item.id} item={item} onClick={() => openDetail(item.id)} c={c} />)
            )}
          </div>
        </>
      )}
    </div>
  );
}

function SearchTypeToggle({ value, onChange, c }: { value: SearchType; onChange: (t: SearchType) => void; c: AppColors }) {
  return (
    <div className="shrink-0 flex items-center gap-[2px] rounded-lg p-[2px]" style={{ background: c.chipBg }}>
      {SEARCH_TYPES.map((opt) => {
        const Icon = opt.icon;
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className="flex items-center gap-[6px] h-8 px-3 rounded-md text-[12.5px] font-medium border-0 cursor-pointer"
            style={{
              background: active ? c.surface : 'transparent',
              color: active ? c.textPrimary : c.textSecondary,
              boxShadow: active ? `0 1px 3px 0 ${c.shadow}` : 'none',
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

function BlankState({ c }: { c: AppColors }) {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center gap-2 py-16 px-6 text-center"
      style={{ border: `1px dashed ${c.border}` }}
    >
      <Search size={20} style={{ color: c.textMuted }} />
      <span className="text-[13.5px] font-medium" style={{ color: c.textSecondary }}>
        Busque por jornada, business key ou instance ID para começar
      </span>
      <span className="text-[12px] max-w-[420px]" style={{ color: c.textMuted }}>
        Escolha o tipo de busca acima — buscar por instance ID vai direto ao detalhe da execução.
      </span>
    </div>
  );
}

function InstanceGroup({ group, onOpen, c }: { group: Group; onOpen: (id: string) => void; c: AppColors }) {
  const [open, setOpen] = useState(true);
  return (
    <>
      <div
        className="grid items-center px-3 cursor-pointer"
        style={{ gridTemplateColumns: GRID_COLS, minHeight: 40, background: c.chipBg, borderTop: `1px solid ${c.border}` }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-[8px] min-w-0 py-[8px]">
          <ChevronRight
            size={13}
            className="shrink-0 transition-transform"
            style={{ color: c.textMuted, transform: open ? 'rotate(90deg)' : 'none' }}
          />
          <span className="text-[12.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
            {group.journeyName}
          </span>
          <span className="text-[11px] font-mono shrink-0" style={{ color: c.accent }}>
            {group.version != null ? `v${group.version}` : 'sem versão'}
          </span>
        </div>
        <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
          {group.items.length} execuç{group.items.length === 1 ? 'ão' : 'ões'}
        </span>
      </div>
      {open && group.items.map((item) => <InstanceRow key={item.id} item={item} onClick={() => onOpen(item.id)} c={c} indent />)}
    </>
  );
}

function InstanceRow({
  item,
  onClick,
  c,
  indent,
}: {
  item: HistoricInstanceSummary;
  onClick: () => void;
  c: AppColors;
  indent?: boolean;
}) {
  const bucket = bucketOf(item.state);
  const meta = bucketMeta(bucket, c);
  return (
    <div
      onClick={onClick}
      className="grid items-center px-3 cursor-pointer"
      style={{ gridTemplateColumns: GRID_COLS, minHeight: 46, borderTop: `1px solid ${c.border}` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 py-[8px] pr-3" style={{ paddingLeft: indent ? 21 : 0 }}>
        {!indent && (
          <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
            {item.journeyName}
          </div>
        )}
        <div className={indent ? 'text-[12px] font-mono truncate' : 'text-[11px] font-mono truncate'} style={{ color: indent ? c.textPrimary : c.textMuted }}>
          {item.businessKey}
        </div>
      </div>
      <span
        className="inline-flex items-center gap-[5px] text-[10.5px] font-semibold px-[8px] py-[3px] rounded-full w-fit"
        style={{ background: meta.bg, color: meta.fg }}
      >
        <meta.Icon size={11} />
        {STATE_LABEL[item.state] ?? item.state}
      </span>
      <span className="text-[12px]" style={{ color: c.textSecondary }}>
        {formatDateTime(item.startTime)}
      </span>
      <span className="text-[12px] tabular-nums" style={{ color: c.textSecondary }}>
        {formatDuration(item.durationMillis)}
      </span>
    </div>
  );
}
