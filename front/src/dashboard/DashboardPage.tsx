import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Layers,
  ListTodo,
  Loader2,
  Play,
  PowerOff,
  RefreshCw,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import { useAppTheme, type AppColors } from '../shell/theme';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { getDashboardOverview, terminateInstance, type DashboardOverview, type InstanceEntry, type TrendGranularity } from './api';
import { dailyToPoints, hourlyToPoints, HorizontalBarChart, TrendChart } from './charts';

const AUTO_REFRESH_MS = 30_000;

const GRANULARITY_OPTIONS: { key: TrendGranularity; label: string; title: string }[] = [
  { key: 'day', label: 'Dia', title: 'Instâncias — últimas 24 horas' },
  { key: 'week', label: 'Semana', title: 'Instâncias — últimos 7 dias' },
  { key: 'month', label: 'Mês', title: 'Instâncias — últimos 30 dias' },
];

export function DashboardPage() {
  const { colors: c } = useAppTheme();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const firstLoad = useRef(true);

  const [granularity, setGranularity] = useState<TrendGranularity>('day');

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [terminatingIds, setTerminatingIds] = useState<Set<string>>(new Set());
  const [confirmTargets, setConfirmTargets] = useState<string[] | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setRefreshing(true);
    try {
      const data = await getDashboardOverview();
      setOverview(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar o dashboard.');
    } finally {
      setRefreshing(false);
      firstLoad.current = false;
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(load, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, load]);

  function toggleSelected(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(ids: string[]) {
    setSelectedIds((prev) => (ids.every((id) => prev.has(id)) ? new Set() : new Set(ids)));
  }

  async function confirmTerminate() {
    const ids = confirmTargets ?? [];
    setConfirmTargets(null);
    setActionError(null);
    setTerminatingIds((prev) => new Set([...prev, ...ids]));
    try {
      await Promise.all(ids.map((id) => terminateInstance(id)));
      setSelectedIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
      await load();
    } catch (e) {
      setActionError(e instanceof Error ? e.message : 'Erro ao encerrar instância(s).');
    } finally {
      setTerminatingIds((prev) => {
        const next = new Set(prev);
        ids.forEach((id) => next.delete(id));
        return next;
      });
    }
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
            Dashboard
          </h1>
          <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
            Retrato ao vivo dos processos em execução no motor de runtime
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="text-[12px]" style={{ color: c.textMuted }}>
              Atualizado {lastUpdated.toLocaleTimeString('pt-BR')}
            </span>
          )}
          <AutoRefreshToggle checked={autoRefresh} onChange={setAutoRefresh} c={c} />
          <button
            type="button"
            onClick={load}
            disabled={refreshing}
            className="flex items-center gap-[6px] rounded-md px-3 py-[7px] text-[12.5px] font-medium cursor-pointer border disabled:opacity-60"
            style={{ borderColor: c.border, background: c.surface, color: c.textPrimary }}
          >
            <RefreshCw size={13} style={{ animation: refreshing ? 'dashboard-spin 0.8s linear infinite' : 'none' }} />
            Atualizar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-5 rounded-lg px-4 py-3 text-[13px]" style={{ background: c.dangerSoft, color: c.danger, border: `1px solid ${c.dangerBorder}` }}>
          {error}
        </div>
      )}

      {!overview && !error ? (
        <DashboardSkeleton c={c} />
      ) : overview ? (
        <div className="flex flex-col gap-6">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
            <KpiCard icon={Activity} label="Instâncias ativas" value={overview.kpis.runningInstances} tone="accent" c={c} />
            <KpiCard icon={ListTodo} label="Tarefas pendentes" value={overview.kpis.pendingTasks} tone="neutral" c={c} />
            <KpiCard
              icon={AlertTriangle}
              label="Incidentes abertos"
              value={overview.kpis.openIncidents}
              tone={overview.kpis.openIncidents > 0 ? 'danger' : 'success'}
              c={c}
            />
            <KpiCard icon={Layers} label="Jornadas implantadas" value={overview.kpis.deployedJourneys} tone="neutral" c={c} />
            <KpiCard icon={CheckCircle2} label="Concluídas hoje" value={overview.kpis.completedToday} tone="success" c={c} />
          </div>

          <Card
            c={c}
            title={GRANULARITY_OPTIONS.find((g) => g.key === granularity)!.title}
            subtitle="Iniciadas vs. concluídas"
            headerAction={<GranularityToggle value={granularity} onChange={setGranularity} c={c} />}
          >
            <TrendChart
              data={granularity === 'day' ? hourlyToPoints(overview.trend.day) : dailyToPoints(overview.trend[granularity])}
              granularity={granularity}
            />
          </Card>

          <div className="grid gap-6" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
            <Card c={c} title="Processos por volume" subtitle="Instâncias por jornada, somadas entre todas as versões implantadas">
              {overview.processDefinitions.length === 0 ? (
                <EmptyHint c={c}>Nenhum processo implantado.</EmptyHint>
              ) : (
                <HorizontalBarChart
                  data={overview.processDefinitions.slice(0, 8).map((p) => ({
                    label: p.name,
                    value: p.instances,
                    accent: p.incidents > 0 ? p.incidents : undefined,
                    accentLabel: `${p.incidents} incidente(s)`,
                  }))}
                />
              )}
            </Card>

            <Card c={c} title="Incidentes" subtitle="Falhas ativas no motor" icon={ShieldAlert} iconTone={overview.incidents.length > 0 ? 'danger' : 'success'}>
              {overview.incidents.length === 0 ? (
                <EmptyHint c={c}>Nenhum incidente ativo — tudo saudável.</EmptyHint>
              ) : (
                <div className="flex flex-col gap-2">
                  {overview.incidents.map((inc) => (
                    <div key={inc.id} className="rounded-lg px-3 py-[10px]" style={{ background: c.dangerSoft, border: `1px solid ${c.dangerBorder}` }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
                          {inc.processDefinitionName}
                        </span>
                        <span className="shrink-0 text-[11px]" style={{ color: c.textMuted }}>
                          {timeAgo(inc.timestamp)}
                        </span>
                      </div>
                      <p className="m-0 mt-[3px] text-[12px] truncate" style={{ color: c.danger }} title={inc.message ?? undefined}>
                        {inc.incidentType}
                        {inc.message ? ` — ${inc.message}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {actionError && (
            <div className="rounded-lg px-4 py-3 text-[13px]" style={{ background: c.dangerSoft, color: c.danger, border: `1px solid ${c.dangerBorder}` }}>
              {actionError}
            </div>
          )}

          <div className="grid gap-6" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Card
              c={c}
              title="Instâncias pendentes"
              subtitle="Em execução há mais tempo primeiro — candidatas a abandonadas"
              icon={PowerOff}
              iconTone="neutral"
              headerAction={
                selectedIds.size > 0 ? (
                  <button
                    type="button"
                    onClick={() => setConfirmTargets([...selectedIds])}
                    className="flex items-center gap-[6px] rounded-md px-[10px] py-[5px] text-[11.5px] font-semibold cursor-pointer border-0"
                    style={{ background: c.dangerSoft, color: c.danger }}
                  >
                    <Trash2 size={12} />
                    Encerrar {selectedIds.size} selecionada{selectedIds.size > 1 ? 's' : ''}
                  </button>
                ) : undefined
              }
            >
              {overview.pendingInstances.length === 0 ? (
                <EmptyHint c={c}>Nenhuma instância ativa.</EmptyHint>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="w-[26px] pb-2">
                        <Checkbox
                          checked={overview.pendingInstances.every((i) => selectedIds.has(i.id))}
                          onChange={() => toggleSelectAll(overview.pendingInstances.map((i) => i.id))}
                          c={c}
                        />
                      </th>
                      <th />
                      <th />
                      <th className="w-[26px]" />
                    </tr>
                  </thead>
                  <tbody>
                    {overview.pendingInstances.slice(0, 10).map((inst) => {
                      const busy = terminatingIds.has(inst.id);
                      return (
                        <tr key={inst.id} className="border-t" style={{ borderColor: c.border }}>
                          <td className="py-2 pr-1">
                            <Checkbox checked={selectedIds.has(inst.id)} onChange={() => toggleSelected(inst.id)} c={c} />
                          </td>
                          <td className="py-2 pr-2 min-w-0">
                            <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
                              {inst.processDefinitionName}
                            </div>
                            <div className="text-[11px] truncate font-mono" style={{ color: c.textMuted }}>
                              {inst.businessKey ?? inst.id.slice(0, 8)}
                            </div>
                          </td>
                          <td className="py-2 pl-2 text-right shrink-0 text-[11.5px]" style={{ color: c.textSecondary }}>
                            {timeAgo(inst.startTime)}
                          </td>
                          <td className="py-2 pl-2 text-right shrink-0">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => setConfirmTargets([inst.id])}
                              title="Encerrar instância"
                              className="inline-flex items-center justify-center w-6 h-6 rounded-md border-0 cursor-pointer disabled:cursor-default"
                              style={{ background: 'transparent', color: c.textMuted }}
                              onMouseEnter={(e) => !busy && (e.currentTarget.style.color = c.danger)}
                              onMouseLeave={(e) => (e.currentTarget.style.color = c.textMuted)}
                            >
                              {busy ? <Loader2 size={13} style={{ animation: 'dashboard-spin 0.8s linear infinite' }} /> : <Trash2 size={13} />}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </Card>

            <Card c={c} title="Executando recentemente" subtitle="Instâncias iniciadas mais recentemente" icon={Play} iconTone="accent">
              {overview.executingRecently.length === 0 ? (
                <EmptyHint c={c}>Nenhuma instância em execução.</EmptyHint>
              ) : (
                <table className="w-full text-left border-collapse">
                  <tbody>
                    {overview.executingRecently.slice(0, 10).map((inst) => (
                      <tr key={inst.id} className="border-t" style={{ borderColor: c.border }}>
                        <td className="py-2 pr-2 min-w-0">
                          <div className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
                            {inst.processDefinitionName}
                          </div>
                          <div className="text-[11px] truncate font-mono" style={{ color: c.textMuted }}>
                            {inst.businessKey ?? inst.id.slice(0, 8)}
                          </div>
                        </td>
                        <td className="py-2 px-2 shrink-0">
                          <InstanceStateTag state={inst.state} c={c} />
                        </td>
                        <td className="py-2 pl-2 text-right shrink-0 text-[11.5px] tabular-nums" style={{ color: c.textSecondary }}>
                          {durationLabel(inst)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Card>
          </div>
        </div>
      ) : null}

      {confirmTargets && (
        <ConfirmDialog
          title={confirmTargets.length > 1 ? `Encerrar ${confirmTargets.length} instâncias?` : 'Encerrar instância?'}
          message="A instância é interrompida onde estiver — isso não é uma conclusão normal do fluxo e não pode ser desfeito."
          confirmLabel="Encerrar"
          onConfirm={confirmTerminate}
          onCancel={() => setConfirmTargets(null)}
        />
      )}
    </div>
  );
}

function Checkbox({ checked, onChange, c }: { checked: boolean; onChange: () => void; c: AppColors }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className="w-[15px] h-[15px] rounded flex items-center justify-center cursor-pointer"
      style={{ background: checked ? c.accent : 'transparent', border: `1.5px solid ${checked ? c.accent : c.border}` }}
    >
      {checked && (
        <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
          <path d="M1 3.5L3.2 5.7L8 1" stroke="white" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

function GranularityToggle({
  value,
  onChange,
  c,
}: {
  value: TrendGranularity;
  onChange: (v: TrendGranularity) => void;
  c: AppColors;
}) {
  return (
    <div className="flex items-center gap-[2px] rounded-md p-[2px]" style={{ background: c.chipBg }}>
      {GRANULARITY_OPTIONS.map((opt) => (
        <button
          key={opt.key}
          type="button"
          onClick={() => onChange(opt.key)}
          className="rounded px-[10px] py-[4px] text-[12px] font-medium cursor-pointer border-0 transition-colors"
          style={{
            background: value === opt.key ? c.surface : 'transparent',
            color: value === opt.key ? c.textPrimary : c.textMuted,
            boxShadow: value === opt.key ? `0 1px 3px 0 ${c.shadow}` : 'none',
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function AutoRefreshToggle({ checked, onChange, c }: { checked: boolean; onChange: (v: boolean) => void; c: AppColors }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-[7px] rounded-md px-3 py-[7px] text-[12.5px] font-medium cursor-pointer border"
      style={{ borderColor: c.border, background: c.surface, color: checked ? c.textPrimary : c.textMuted }}
      title="Atualizar automaticamente a cada 30s"
    >
      <span
        className="relative inline-block w-[26px] h-[15px] rounded-full shrink-0"
        style={{ background: checked ? c.accent : c.chipBg, transition: 'background 200ms ease' }}
      >
        <span
          className="absolute top-[2px] w-[11px] h-[11px] rounded-full bg-white"
          style={{ left: checked ? 13 : 2, transition: 'left 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </span>
      Auto
    </button>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  tone,
  c,
}: {
  icon: typeof Activity;
  label: string;
  value: number;
  tone: 'accent' | 'success' | 'danger' | 'neutral';
  c: AppColors;
}) {
  const toneColor = { accent: c.accent, success: c.success, danger: c.danger, neutral: c.textSecondary }[tone];
  const toneSoft = { accent: c.accentSoft, success: c.successSoft, danger: c.dangerSoft, neutral: c.chipBg }[tone];
  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="w-8 h-8 rounded-full flex items-center justify-center" style={{ background: toneSoft }}>
        <Icon size={15} color={toneColor} />
      </div>
      <div>
        <div className="text-[24px] font-semibold tracking-[-0.02em] tabular-nums" style={{ color: c.textPrimary }}>
          {value.toLocaleString('pt-BR')}
        </div>
        <div className="text-[12px]" style={{ color: c.textSecondary }}>
          {label}
        </div>
      </div>
    </div>
  );
}

function Card({
  c,
  title,
  subtitle,
  icon: Icon,
  iconTone,
  headerAction,
  children,
}: {
  c: AppColors;
  title: string;
  subtitle?: string;
  icon?: typeof Activity;
  iconTone?: 'success' | 'danger' | 'neutral' | 'accent';
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  const toneColor = Icon
    ? { success: c.success, danger: c.danger, neutral: c.textSecondary, accent: c.accent }[iconTone ?? 'neutral']
    : undefined;
  return (
    <div className="rounded-xl p-5" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          {Icon && <Icon size={14} color={toneColor} />}
          <div>
            <h3 className="m-0 text-[13.5px] font-semibold" style={{ color: c.textPrimary }}>
              {title}
            </h3>
            {subtitle && (
              <p className="m-0 mt-[1px] text-[11.5px]" style={{ color: c.textMuted }}>
                {subtitle}
              </p>
            )}
          </div>
        </div>
        {headerAction}
      </div>
      {children}
    </div>
  );
}

function EmptyHint({ c, children }: { c: AppColors; children: React.ReactNode }) {
  return (
    <p className="m-0 py-3 text-[12.5px]" style={{ color: c.textSecondary }}>
      {children}
    </p>
  );
}

function InstanceStateTag({ state, c }: { state: string; c: AppColors }) {
  const meta =
    state === 'ACTIVE'
      ? { label: 'Ativa', bg: c.accentSoft, color: c.accent }
      : state === 'COMPLETED'
        ? { label: 'Concluída', bg: c.successSoft, color: c.success }
        : { label: state, bg: c.chipBg, color: c.textSecondary };
  return (
    <span className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[10.5px] font-medium" style={{ background: meta.bg, color: meta.color }}>
      {meta.label}
    </span>
  );
}

function DashboardSkeleton({ c }: { c: AppColors }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(5, minmax(0, 1fr))' }}>
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-[92px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
        ))}
      </div>
      <div className="h-[240px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
      <div className="grid gap-6" style={{ gridTemplateColumns: '1.3fr 1fr' }}>
        <div className="h-[220px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
        <div className="h-[220px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  return `há ${Math.floor(diffH / 24)} d`;
}

function durationLabel(inst: InstanceEntry): string {
  if (inst.state === 'ACTIVE') return timeAgo(inst.startTime);
  if (inst.durationMillis == null) return '—';
  const s = inst.durationMillis / 1000;
  if (s < 60) return `${s.toFixed(1)} s`;
  const m = s / 60;
  if (m < 60) return `${m.toFixed(1)} min`;
  return `${(m / 60).toFixed(1)} h`;
}
