import { useMemo, useState } from 'react';
import { Search, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Tag } from '@telefonica/mistica';
import { INITIAL_WORKFLOWS, WORKFLOW_STATUS_META, type Workflow, type WorkflowStatus } from '../data/workflows';
import { useAppTheme } from '../shell/theme';

type StatusFilter = 'all' | WorkflowStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todos' },
  { key: 'draft', label: 'Rascunho' },
  { key: 'review', label: 'Em Aprovação' },
  { key: 'published', label: 'Publicado' },
];

function totalRuns(w: Workflow): number {
  return w.executionStats
    ? w.executionStats.processing + w.executionStats.completed + w.executionStats.errors + w.executionStats.paused
    : w.executions.length;
}

function tagTypeFor(status: WorkflowStatus): 'inactive' | 'warning' | 'success' {
  if (status === 'draft') return 'inactive';
  if (status === 'review') return 'warning';
  return 'success';
}

interface WorkflowsDashboardProps {
  onOpenWorkflow: (id: string, name: string) => void;
}

export function WorkflowsDashboard({ onOpenWorkflow }: WorkflowsDashboardProps) {
  const { colors: c } = useAppTheme();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');

  const workflows = INITIAL_WORKFLOWS;

  const kpis = useMemo(() => {
    const totalWorkflows = workflows.length;
    const execToday = workflows.reduce(
      (acc, w) => acc + w.executions.filter((e) => e.startedAt === 'Agora' || e.startedAt.startsWith('Hoje')).length,
      0,
    );
    const avgSuccessRate = Math.round(
      workflows.reduce((acc, w) => {
        const t = w.executions.length;
        const f = w.executions.filter((e) => e.status === 'failed').length;
        return acc + (t ? ((t - f) / t) * 100 : 100);
      }, 0) / (workflows.length || 1),
    );
    const openFailures = workflows.reduce(
      (acc, w) => acc + (w.executionStats ? w.executionStats.errors : w.executions.filter((e) => e.status === 'failed').length),
      0,
    );
    return { totalWorkflows, execToday, avgSuccessRate, openFailures };
  }, [workflows]);

  const filtered = useMemo(
    () =>
      workflows
        .filter((w) => w.name.toLowerCase().includes(search.toLowerCase()))
        .filter((w) => statusFilter === 'all' || w.status === statusFilter),
    [workflows, search, statusFilter],
  );

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
            Painel de Workflows
          </h1>
          <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
            Crie e acompanhe processos em execução
          </p>
        </div>
        <div className="relative w-[220px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar workflow"
            placeholder="Buscar workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
            style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-[22px]">
        <StatCard label="Workflows ativos" value={kpis.totalWorkflows} />
        <StatCard label="Execuções hoje" value={kpis.execToday} />
        <StatCard label="Taxa de sucesso média" value={`${kpis.avgSuccessRate}%`} />
        <StatCard label="Falhas em aberto" value={kpis.openFailures} color={kpis.openFailures > 0 ? c.danger : undefined} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="flex gap-2 flex-wrap">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="px-[14px] py-[7px] rounded-full text-[12.5px] font-medium cursor-pointer border"
                style={{
                  borderColor: isActive ? c.accent : c.border,
                  background: isActive ? c.accent : c.surface,
                  color: isActive ? '#fff' : c.textPrimary,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 p-[3px] rounded-lg shrink-0" style={{ background: c.chipBg }}>
          <button
            onClick={() => setViewMode('cards')}
            title="Cards"
            className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
            style={{ background: viewMode === 'cards' ? c.surface : 'transparent' }}
          >
            <LayoutGrid size={14} color={viewMode === 'cards' ? c.accent : c.textMuted} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Lista"
            className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
            style={{ background: viewMode === 'list' ? c.surface : 'transparent' }}
          >
            <ListIcon size={14} color={viewMode === 'list' ? c.accent : c.textMuted} />
          </button>
        </div>
      </div>

      {viewMode === 'cards' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {filtered.map((w) => (
            <WorkflowCard key={w.id} workflow={w} onOpen={() => onOpenWorkflow(w.id, w.name)} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
            style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 1fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
          >
            <span>Workflow</span><span>Status</span><span>Etapas</span><span>Execuções</span><span>Responsável</span><span>Últ. execução</span>
          </div>
          {filtered.map((w) => {
            const meta = WORKFLOW_STATUS_META[w.status];
            return (
              <div
                key={w.id}
                onClick={() => onOpenWorkflow(w.id, w.name)}
                className="grid items-center px-4 py-3 text-[13px] cursor-pointer border-b box-border"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 1fr', borderColor: c.border }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div>
                  <div className="text-[13px] font-semibold" style={{ color: c.textPrimary }}>
                    {w.name}
                  </div>
                  <div className="text-[11.5px]" style={{ color: c.textMuted }}>
                    {w.description}
                  </div>
                </div>
                <span className="w-fit"><Tag type={tagTypeFor(w.status)} small>{meta.label}</Tag></span>
                <span style={{ color: c.textSecondary }}>{w.tasksCount}</span>
                <span style={{ color: c.textSecondary }}>{totalRuns(w).toLocaleString('pt-BR')}</span>
                <span style={{ color: c.textSecondary }}>{w.owner}</span>
                <span style={{ color: c.textSecondary }}>{w.lastRun}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t text-[11.5px] flex-wrap" style={{ borderColor: c.border, color: c.textMuted }}>
        <span>© 2026 Elastic Journey · Todos os direitos reservados</span>
        <div className="flex gap-4">
          <a href="#" className="no-underline" style={{ color: c.accent }}>Documentação</a>
          <a href="#" className="no-underline" style={{ color: c.accent }}>Status do sistema</a>
          <a href="#" className="no-underline" style={{ color: c.accent }}>Suporte</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-2xl p-[14px_16px] box-border" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="text-[11.5px] mb-[6px]" style={{ color: c.textSecondary }}>
        {label}
      </div>
      <div className="text-[22px] font-semibold" style={{ color: color ?? c.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

function WorkflowCard({ workflow: w, onOpen }: { workflow: Workflow; onOpen: () => void }) {
  const { colors: c } = useAppTheme();
  const meta = WORKFLOW_STATUS_META[w.status];
  return (
    <div
      onClick={onOpen}
      className="rounded-2xl p-[18px] cursor-pointer flex flex-col gap-3 box-border transition-shadow"
      style={{ background: c.surface, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14.5px] font-semibold mb-[3px]" style={{ color: c.textPrimary }}>
            {w.name}
          </div>
          <div className="text-[12.5px]" style={{ color: c.textSecondary }}>
            {w.description}
          </div>
        </div>
        <Tag type={tagTypeFor(w.status)} small>{meta.label}</Tag>
      </div>
      <div className="flex items-center gap-[14px] text-[12px] pt-[10px] border-t flex-wrap" style={{ borderColor: c.border, color: c.textSecondary }}>
        <span>{w.tasksCount} etapas</span>
        <span>·</span>
        <span>{totalRuns(w).toLocaleString('pt-BR')} execuções</span>
        <span>·</span>
        <span>Últ.: {w.lastRun}</span>
      </div>
      <div className="flex items-center justify-between text-[12px]" style={{ color: c.textMuted }}>
        <span>Responsável: {w.owner}</span>
        <span>Dur. média: {w.avgDuration}</span>
      </div>
    </div>
  );
}
