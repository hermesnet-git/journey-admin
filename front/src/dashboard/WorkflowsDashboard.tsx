import { useMemo, useState } from 'react';
import { Search, LayoutGrid, List as ListIcon } from 'lucide-react';
import { Tag } from '@telefonica/mistica';
import { INITIAL_WORKFLOWS, WORKFLOW_STATUS_META, type Workflow, type WorkflowStatus } from '../data/workflows';

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
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]">Painel de Workflows</h1>
          <p className="m-0 text-[13.5px] text-[#71717a]">Crie e acompanhe processos em execução</p>
        </div>
        <div className="relative w-[220px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          <input
            aria-label="Buscar workflow"
            placeholder="Buscar workflow..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md border border-[#e4e4e7] text-[13px] bg-white outline-none box-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-[22px]">
        <StatCard label="Workflows ativos" value={kpis.totalWorkflows} />
        <StatCard label="Execuções hoje" value={kpis.execToday} />
        <StatCard label="Taxa de sucesso média" value={`${kpis.avgSuccessRate}%`} />
        <StatCard
          label="Falhas em aberto"
          value={kpis.openFailures}
          color={kpis.openFailures > 0 ? '#b91c1c' : '#1a1a1a'}
        />
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
                  borderColor: isActive ? '#019DF4' : '#e4e4e7',
                  background: isActive ? '#019DF4' : '#fff',
                  color: isActive ? '#fff' : '#1a1a1a',
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="flex gap-1 p-[3px] bg-[#f4f4f5] rounded-lg shrink-0">
          <button
            onClick={() => setViewMode('cards')}
            title="Cards"
            className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
            style={{ background: viewMode === 'cards' ? '#fff' : 'transparent' }}
          >
            <LayoutGrid size={14} color={viewMode === 'cards' ? '#019DF4' : '#a1a1aa'} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="Lista"
            className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
            style={{ background: viewMode === 'list' ? '#fff' : 'transparent' }}
          >
            <ListIcon size={14} color={viewMode === 'list' ? '#019DF4' : '#a1a1aa'} />
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
        <div className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden">
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold text-[#71717a] border-b border-[#f4f4f5] bg-[#fafafa]"
            style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 1fr' }}
          >
            <span>Workflow</span><span>Status</span><span>Etapas</span><span>Execuções</span><span>Responsável</span><span>Últ. execução</span>
          </div>
          {filtered.map((w) => {
            const meta = WORKFLOW_STATUS_META[w.status];
            return (
              <div
                key={w.id}
                onClick={() => onOpenWorkflow(w.id, w.name)}
                className="grid items-center px-4 py-3 text-[13px] cursor-pointer border-b border-[#f4f4f5] box-border hover:bg-[#fafafa]"
                style={{ gridTemplateColumns: '2fr 1fr 0.8fr 1fr 1fr 1fr' }}
              >
                <div>
                  <div className="text-[13px] font-semibold text-[#1a1a1a]">{w.name}</div>
                  <div className="text-[11.5px] text-[#a1a1aa]">{w.description}</div>
                </div>
                <span className="w-fit"><Tag type={tagTypeFor(w.status)} small>{meta.label}</Tag></span>
                <span className="text-[#71717a]">{w.tasksCount}</span>
                <span className="text-[#71717a]">{totalRuns(w).toLocaleString('pt-BR')}</span>
                <span className="text-[#71717a]">{w.owner}</span>
                <span className="text-[#71717a]">{w.lastRun}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 mt-8 pt-4 border-t border-[#e4e4e7] text-[11.5px] text-[#a1a1aa] flex-wrap">
        <span>© 2026 Elastic Journey · Todos os direitos reservados</span>
        <div className="flex gap-4">
          <a href="#" className="text-[#019DF4] no-underline hover:text-[#0284d1]">Documentação</a>
          <a href="#" className="text-[#019DF4] no-underline hover:text-[#0284d1]">Status do sistema</a>
          <a href="#" className="text-[#019DF4] no-underline hover:text-[#0284d1]">Suporte</a>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-2xl p-[14px_16px] box-border">
      <div className="text-[11.5px] text-[#71717a] mb-[6px]">{label}</div>
      <div className="text-[22px] font-semibold" style={{ color: color ?? '#1a1a1a' }}>{value}</div>
    </div>
  );
}

function WorkflowCard({ workflow: w, onOpen }: { workflow: Workflow; onOpen: () => void }) {
  const meta = WORKFLOW_STATUS_META[w.status];
  return (
    <div
      onClick={onOpen}
      className="bg-white border border-[#e4e4e7] rounded-2xl p-[18px] cursor-pointer flex flex-col gap-3 box-border transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] hover:border-[#e4e4e7]"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-[14.5px] font-semibold text-[#1a1a1a] mb-[3px]">{w.name}</div>
          <div className="text-[12.5px] text-[#71717a]">{w.description}</div>
        </div>
        <Tag type={tagTypeFor(w.status)} small>{meta.label}</Tag>
      </div>
      <div className="flex items-center gap-[14px] text-[12px] text-[#71717a] pt-[10px] border-t border-[#f4f4f5] flex-wrap">
        <span>{w.tasksCount} etapas</span>
        <span>·</span>
        <span>{totalRuns(w).toLocaleString('pt-BR')} execuções</span>
        <span>·</span>
        <span>Últ.: {w.lastRun}</span>
      </div>
      <div className="flex items-center justify-between text-[12px] text-[#a1a1aa]">
        <span>Responsável: {w.owner}</span>
        <span>Dur. média: {w.avgDuration}</span>
      </div>
    </div>
  );
}
