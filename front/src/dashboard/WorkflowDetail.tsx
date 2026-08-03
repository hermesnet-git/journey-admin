import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, CheckCircle2, XCircle, Clock, AlertTriangle } from 'lucide-react';
import { ButtonLink, Tag, Callout } from '@telefonica/mistica';
import {
  AGG_META,
  EXEC_STATUS_META,
  INITIAL_WORKFLOWS,
  WORKFLOW_STATUS_META,
  type ExecutionStats,
  type WorkflowStatus,
} from '../data/workflows';
import { useAppTheme } from '../shell/theme';

function tagTypeFor(status: WorkflowStatus): 'inactive' | 'warning' | 'success' {
  if (status === 'draft') return 'inactive';
  if (status === 'review') return 'warning';
  return 'success';
}

interface WorkflowDetailProps {
  workflowId: string;
  onBack: () => void;
}

export function WorkflowDetail({ workflowId, onBack }: WorkflowDetailProps) {
  const { colors: c } = useAppTheme();
  const [expandedExecId, setExpandedExecId] = useState<string | null>(null);
  const workflow = useMemo(() => INITIAL_WORKFLOWS.find((w) => w.id === workflowId), [workflowId]);

  if (!workflow) {
    return (
      <div className="flex-1 overflow-auto p-[28px_40px] box-border">
        <p className="text-[13px]" style={{ color: c.textSecondary }}>
          Workflow não encontrado.
        </p>
      </div>
    );
  }

  const meta = WORKFLOW_STATUS_META[workflow.status];
  const isPublished = workflow.status === 'published';
  const stats: ExecutionStats = workflow.executionStats ?? { processing: 0, completed: 0, errors: 0, paused: 0 };
  const aggTotal = stats.processing + stats.completed + stats.errors + stats.paused;
  const denom = stats.completed + stats.errors;
  const totalRuns = isPublished ? aggTotal : 0;
  const successRate = isPublished ? (denom ? `${Math.round((stats.completed / denom) * 100)}%` : '100%') : '—';
  const failedRuns = isPublished ? stats.errors : workflow.executions.filter((e) => e.status === 'failed').length;
  const hasFailure = failedRuns > 0;

  return (
    <div className="flex-1 overflow-auto p-[28px_40px] box-border">
      <ButtonLink small onPress={onBack} withChevron={false}>
        <span className="inline-flex items-center gap-[6px] text-[12.5px]" style={{ color: c.textSecondary }}>
          <ArrowLeft size={14} /> Voltar
        </span>
      </ButtonLink>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-[18px] mt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
            {workflow.name}
          </h1>
          <Tag type={tagTypeFor(workflow.status)}>{meta.label}</Tag>
        </div>
      </div>

      {hasFailure && (
        <div className="mb-5">
          <Callout
            variant="default"
            description="Há execuções com falha — veja o histórico abaixo."
            asset={<AlertTriangle size={20} color={c.danger} />}
          />
        </div>
      )}

      <div className="grid grid-cols-4 gap-[14px] mb-[26px]">
        <StatCard label="Total de execuções" value={totalRuns.toLocaleString('pt-BR')} />
        <StatCard label="Taxa de sucesso" value={successRate} />
        <StatCard label="Duração média" value={workflow.avgDuration} />
        <StatCard label="Responsável" value={workflow.owner} big={false} />
      </div>

      {isPublished ? (
        <>
          <h2 className="text-[14.5px] font-semibold m-0 mb-3" style={{ color: c.textPrimary }}>
            Execuções
          </h2>
          <div className="grid grid-cols-4 gap-[14px] mb-[14px]">
            {(['processing', 'completed', 'errors', 'paused'] as const).map((k) => (
              <StatCard key={k} label={AGG_META[k].label} value={stats[k].toLocaleString('pt-BR')} color={AGG_META[k].fg} />
            ))}
          </div>
          <div className="flex h-[10px] rounded-full overflow-hidden mb-7" style={{ background: c.chipBg }}>
            {(['processing', 'completed', 'errors', 'paused'] as const).map((k) => (
              <div
                key={k}
                title={AGG_META[k].label}
                style={{ width: `${aggTotal ? (stats[k] / aggTotal) * 100 : 0}%`, background: AGG_META[k].fg }}
              />
            ))}
          </div>

          <h2 className="text-[14.5px] font-semibold m-0 mb-3" style={{ color: c.textPrimary }}>
            Atividade recente
          </h2>
          <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <div
              className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
              style={{ gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 32px', color: c.textSecondary, borderColor: c.border, background: c.bg }}
            >
              <span>Início</span><span>Status</span><span>Duração</span><span>Iniciado por</span><span />
            </div>
            {workflow.executions.map((ex) => {
              const em = EXEC_STATUS_META[ex.status];
              const expanded = expandedExecId === ex.id;
              return (
                <div key={ex.id}>
                  <div
                    onClick={() => setExpandedExecId(expanded ? null : ex.id)}
                    className="grid items-center px-4 py-3 text-[13px] cursor-pointer border-b"
                    style={{ gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 32px', borderColor: c.border, color: c.textPrimary }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span>{ex.startedAt}</span>
                    <span className="w-fit">
                      <Tag small backgroundColor={em.bg} textColor={em.fg}>{em.label}</Tag>
                    </span>
                    <span style={{ color: c.textSecondary }}>{ex.duration}</span>
                    <span style={{ color: c.textSecondary }}>{ex.owner}</span>
                    <span className="flex justify-end">
                      <ChevronDown size={14} color={c.textMuted} style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                    </span>
                  </div>
                  {expanded && (
                    <div className="p-[14px_16px_16px_16px] border-b flex flex-col gap-2" style={{ background: c.bg, borderColor: c.border }}>
                      {ex.steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-[10px] text-[12.5px]">
                          {st.status === 'completed' && <CheckCircle2 size={14} color={c.success} className="mt-[1px] shrink-0" />}
                          {st.status === 'failed' && <XCircle size={14} color={c.danger} className="mt-[1px] shrink-0" />}
                          {st.status === 'running' && <Clock size={14} color={c.accent} className="mt-[1px] shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium" style={{ color: c.textPrimary }}>
                                {st.name}
                              </span>
                              <span style={{ color: c.textMuted }}>{st.duration}</span>
                            </div>
                            {st.status === 'failed' && st.error && (
                              <div
                                className="mt-[3px] text-[12px] font-mono rounded-[5px] px-2 py-[6px]"
                                style={{ color: c.danger, background: c.dangerSoft, border: `1px solid ${c.dangerBorder}` }}
                              >
                                {st.error}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="rounded-2xl p-10 text-center" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <Clock size={30} color={c.textMuted} className="mx-auto mb-3" />
          {workflow.status === 'draft' && (
            <>
              <div className="text-[13.5px] font-semibold mb-1" style={{ color: c.textPrimary }}>
                Ainda em rascunho
              </div>
              <div className="text-[12.5px]" style={{ color: c.textMuted }}>
                Este workflow ainda não foi publicado. Publique para começar a monitorar execuções em produção.
              </div>
            </>
          )}
          {workflow.status === 'review' && (
            <>
              <div className="text-[13.5px] font-semibold mb-1" style={{ color: c.textPrimary }}>
                Aguardando aprovação
              </div>
              <div className="text-[12.5px]" style={{ color: c.textMuted }}>
                Este workflow está em aprovação. O histórico completo de execuções ficará disponível após a publicação.
              </div>
            </>
          )}
          {workflow.executions.length > 0 && (
            <div className="mt-[22px] text-left">
              <div className="text-[11.5px] font-semibold uppercase tracking-[.04em] mb-2" style={{ color: c.textSecondary }}>
                Execuções de teste
              </div>
              <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
                {workflow.executions.map((ex) => {
                  const em = EXEC_STATUS_META[ex.status];
                  return (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between gap-[10px] px-[14px] py-[10px] text-[12.5px] border-b"
                      style={{ borderColor: c.border }}
                    >
                      <span style={{ color: c.textPrimary }}>{ex.startedAt}</span>
                      <Tag small backgroundColor={em.bg} textColor={em.fg}>{em.label}</Tag>
                      <span style={{ color: c.textMuted }}>{ex.duration}</span>
                      <span style={{ color: c.textMuted }}>{ex.owner}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color, big = true }: { label: string; value: string | number; color?: string; big?: boolean }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-2xl p-[14px_16px] box-border" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="text-[11.5px] mb-[6px]" style={{ color: c.textSecondary }}>
        {label}
      </div>
      <div className={big ? 'text-[22px] font-semibold' : 'text-[16px] font-semibold'} style={{ color: color ?? c.textPrimary }}>
        {value}
      </div>
    </div>
  );
}
