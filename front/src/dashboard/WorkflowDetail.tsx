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
  const [expandedExecId, setExpandedExecId] = useState<string | null>(null);
  const workflow = useMemo(() => INITIAL_WORKFLOWS.find((w) => w.id === workflowId), [workflowId]);

  if (!workflow) {
    return (
      <div className="flex-1 overflow-auto p-[28px_40px] box-border">
        <p className="text-[#71717a] text-[13px]">Workflow não encontrado.</p>
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
        <span className="inline-flex items-center gap-[6px] text-[12.5px] text-[#71717a]">
          <ArrowLeft size={14} /> Voltar
        </span>
      </ButtonLink>

      <div className="flex items-start justify-between gap-4 flex-wrap mb-[18px] mt-2">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em]">{workflow.name}</h1>
          <Tag type={tagTypeFor(workflow.status)}>{meta.label}</Tag>
        </div>
      </div>

      {hasFailure && (
        <div className="mb-5">
          <Callout
            variant="default"
            description="Há execuções com falha — veja o histórico abaixo."
            asset={<AlertTriangle size={20} color="#b91c1c" />}
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
          <h2 className="text-[14.5px] font-semibold m-0 mb-3">Execuções</h2>
          <div className="grid grid-cols-4 gap-[14px] mb-[14px]">
            {(['processing', 'completed', 'errors', 'paused'] as const).map((k) => (
              <StatCard key={k} label={AGG_META[k].label} value={stats[k].toLocaleString('pt-BR')} color={AGG_META[k].fg} />
            ))}
          </div>
          <div className="flex h-[10px] rounded-full overflow-hidden mb-7 bg-[#f4f4f5]">
            {(['processing', 'completed', 'errors', 'paused'] as const).map((k) => (
              <div
                key={k}
                title={AGG_META[k].label}
                style={{ width: `${aggTotal ? (stats[k] / aggTotal) * 100 : 0}%`, background: AGG_META[k].fg }}
              />
            ))}
          </div>

          <h2 className="text-[14.5px] font-semibold m-0 mb-3">Atividade recente</h2>
          <div className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden">
            <div
              className="grid px-4 py-[10px] text-[11.5px] font-semibold text-[#71717a] border-b border-[#f4f4f5] bg-[#fafafa]"
              style={{ gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 32px' }}
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
                    className="grid items-center px-4 py-3 text-[13px] cursor-pointer border-b border-[#f4f4f5] hover:bg-[#fafafa]"
                    style={{ gridTemplateColumns: '1.3fr 1fr 0.9fr 1fr 32px' }}
                  >
                    <span>{ex.startedAt}</span>
                    <span className="w-fit">
                      <Tag small backgroundColor={em.bg} textColor={em.fg}>{em.label}</Tag>
                    </span>
                    <span className="text-[#52525b]">{ex.duration}</span>
                    <span className="text-[#52525b]">{ex.owner}</span>
                    <span className="flex justify-end">
                      <ChevronDown size={14} color="#a1a1aa" style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
                    </span>
                  </div>
                  {expanded && (
                    <div className="p-[14px_16px_16px_16px] bg-[#fafafa] border-b border-[#f4f4f5] flex flex-col gap-2">
                      {ex.steps.map((st, i) => (
                        <div key={i} className="flex items-start gap-[10px] text-[12.5px]">
                          {st.status === 'completed' && <CheckCircle2 size={14} color="#15803d" className="mt-[1px] shrink-0" />}
                          {st.status === 'failed' && <XCircle size={14} color="#b91c1c" className="mt-[1px] shrink-0" />}
                          {st.status === 'running' && <Clock size={14} color="#1d4ed8" className="mt-[1px] shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#3f3f46]">{st.name}</span>
                              <span className="text-[#a1a1aa]">{st.duration}</span>
                            </div>
                            {st.status === 'failed' && st.error && (
                              <div className="mt-[3px] text-[#b91c1c] text-[12px] font-mono bg-[#fef2f2] border border-[#fecaca] rounded-[5px] px-2 py-[6px]">
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
        <div className="bg-white border border-[#e4e4e7] rounded-2xl p-10 text-center">
          <Clock size={30} color="#c4c4c8" className="mx-auto mb-3" />
          {workflow.status === 'draft' && (
            <>
              <div className="text-[13.5px] font-semibold text-[#3f3f46] mb-1">Ainda em rascunho</div>
              <div className="text-[12.5px] text-[#a1a1aa]">
                Este workflow ainda não foi publicado. Publique para começar a monitorar execuções em produção.
              </div>
            </>
          )}
          {workflow.status === 'review' && (
            <>
              <div className="text-[13.5px] font-semibold text-[#3f3f46] mb-1">Aguardando aprovação</div>
              <div className="text-[12.5px] text-[#a1a1aa]">
                Este workflow está em aprovação. O histórico completo de execuções ficará disponível após a publicação.
              </div>
            </>
          )}
          {workflow.executions.length > 0 && (
            <div className="mt-[22px] text-left">
              <div className="text-[11.5px] font-semibold text-[#71717a] uppercase tracking-[.04em] mb-2">Execuções de teste</div>
              <div className="border border-[#e4e4e7] rounded-xl overflow-hidden">
                {workflow.executions.map((ex) => {
                  const em = EXEC_STATUS_META[ex.status];
                  return (
                    <div key={ex.id} className="flex items-center justify-between gap-[10px] px-[14px] py-[10px] text-[12.5px] border-b border-[#f4f4f5]">
                      <span className="text-[#3f3f46]">{ex.startedAt}</span>
                      <Tag small backgroundColor={em.bg} textColor={em.fg}>{em.label}</Tag>
                      <span className="text-[#a1a1aa]">{ex.duration}</span>
                      <span className="text-[#a1a1aa]">{ex.owner}</span>
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
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-2xl p-[14px_16px] box-border">
      <div className="text-[11.5px] text-[#71717a] mb-[6px]">{label}</div>
      <div className={big ? 'text-[22px] font-semibold' : 'text-[16px] font-semibold'} style={{ color: color ?? '#1a1a1a' }}>
        {value}
      </div>
    </div>
  );
}
