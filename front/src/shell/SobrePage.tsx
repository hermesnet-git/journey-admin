import { useMemo, useState } from 'react';
import {
  Route,
  Layers,
  FileCheck2,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  CircleDashed,
  MinusCircle,
  Puzzle,
  FileText,
  Sparkles,
  Info,
  BookOpen,
  History,
  GitCommitHorizontal,
} from 'lucide-react';
import { useAppTheme } from './theme';
import {
  EPICS,
  OUT_OF_SCOPE,
  CHANGELOG,
  type ChangelogSource,
  TOTAL_EPICS,
  TOTAL_FEATURES,
  TOTAL_REQS,
  TOTAL_REQS_DONE,
  TOTAL_REQS_NA,
  OVERALL_PERCENT,
  epicCounts,
  featureCounts,
  type Epic,
  type Feature,
  type ReqStatus,
} from './sobreData';
import { APP_VERSION } from './appInfo';

type Colors = ReturnType<typeof useAppTheme>['colors'];

function statusMeta(status: ReqStatus, c: Colors) {
  if (status === 'done') return { fg: c.success, bg: c.successSoft, border: c.successBorder, Icon: CircleCheck, label: 'Concluído' };
  if (status === 'partial') return { fg: c.warning, bg: c.warningSoft, border: c.warningBorder, Icon: CircleDashed, label: 'Parcial' };
  if (status === 'na') return { fg: c.textMuted, bg: c.chipBg, border: c.border, Icon: MinusCircle, label: 'Não aplicável' };
  return { fg: c.textMuted, bg: c.chipBg, border: c.border, Icon: CircleDashed, label: 'Não iniciado' };
}

function ProgressBar({ percent, done }: { percent: number; done: boolean }) {
  const { colors: c } = useAppTheme();
  const barColor = done ? c.success : percent === 0 ? c.textMuted : c.warning;
  return (
    <div className="h-[5px] rounded-full overflow-hidden flex-1" style={{ background: c.chipBg }}>
      <div className="h-full rounded-full" style={{ width: `${percent}%`, background: barColor }} />
    </div>
  );
}

const GRID_COLS = 'minmax(0,1fr) 132px 150px 190px';

function StatusPill({ status }: { status: ReqStatus }) {
  const { colors: c } = useAppTheme();
  const sm = statusMeta(status, c);
  return (
    <span
      className="inline-flex items-center gap-[5px] text-[10.5px] font-semibold uppercase tracking-[0.02em] px-[8px] py-[3px] rounded-full w-fit"
      style={{ background: sm.bg, color: sm.fg, border: `1px solid ${sm.border}` }}
    >
      <sm.Icon size={11} />
      {sm.label}
    </span>
  );
}

function RequirementRow({ requirement }: { requirement: Feature['requirements'][number] }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-3 hover:bg-black/[0.015]"
      style={{ gridTemplateColumns: GRID_COLS, minHeight: 34, borderTop: `1px solid ${c.border}` }}
    >
      <div className="flex items-start gap-2 min-w-0 py-[6px] pl-[48px]">
        <FileText size={12} className="shrink-0 mt-[2px]" style={{ color: c.textMuted }} />
        <div className="min-w-0">
          <span className="text-[12px] leading-[16px]" style={{ color: c.textSecondary }}>
            {requirement.description}
          </span>
          {requirement.notes && (
            <div className="flex items-center gap-[4px] text-[11px] italic mt-[2px]" style={{ color: c.warning }}>
              <Info size={10} className="shrink-0" />
              {requirement.notes}
            </div>
          )}
        </div>
      </div>
      <span className="text-[11px] font-mono" style={{ color: c.textMuted }}>
        {requirement.code}
      </span>
      <StatusPill status={requirement.status} />
      <span className="text-[11px]" style={{ color: c.textMuted }}>
        —
      </span>
    </div>
  );
}

function FeatureRow({ feature }: { feature: Feature }) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const { total, done, naCount } = featureCounts(feature);
  const applicable = total - naCount || 1;
  const percent = Math.round((done / applicable) * 100);
  const isDone = done === applicable;

  return (
    <>
      <div
        className="grid items-center px-3 cursor-pointer hover:bg-black/[0.02]"
        style={{ gridTemplateColumns: GRID_COLS, minHeight: 38, borderTop: `1px solid ${c.border}` }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-2 min-w-0 py-[7px] pl-[16px]">
          <ChevronRight
            size={12}
            className="shrink-0 transition-transform"
            style={{ color: c.textMuted, transform: open ? 'rotate(90deg)' : 'none' }}
          />
          <Puzzle size={13} className="shrink-0" style={{ color: c.accent }} />
          <span className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
            {feature.name}
          </span>
        </div>
        <span className="text-[11px] font-mono" style={{ color: c.textMuted }}>
          {feature.code}
        </span>
        <StatusPill status={isDone ? 'done' : done === 0 ? 'todo' : 'partial'} />
        <div className="flex items-center gap-[8px] pr-2">
          <ProgressBar percent={percent} done={isDone} />
          <span className="text-[10.5px] tabular-nums shrink-0" style={{ color: c.textMuted }}>
            {done}/{total}
          </span>
        </div>
      </div>
      {open && feature.requirements.map((req) => <RequirementRow key={req.code} requirement={req} />)}
    </>
  );
}

function EpicRows({ epic }: { epic: Epic }) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const { total, done, naCount } = epicCounts(epic);
  const applicable = total - naCount || 1;
  const percent = Math.round((done / applicable) * 100);
  const isDone = done === applicable;

  return (
    <>
      <div
        className="grid items-center px-3 cursor-pointer"
        style={{ gridTemplateColumns: GRID_COLS, minHeight: 44, background: c.chipBg, borderTop: `1px solid ${c.border}` }}
        onClick={() => setOpen((o) => !o)}
      >
        <div className="flex items-center gap-[10px] min-w-0 py-2">
          <ChevronDown
            size={13}
            className="shrink-0 transition-transform"
            style={{ color: c.textMuted, transform: open ? 'none' : 'rotate(-90deg)' }}
          />
          <Layers size={14} className="shrink-0" style={{ color: c.textPrimary }} />
          <span className="text-[13px] font-semibold truncate" style={{ color: c.textPrimary }}>
            {epic.name}
          </span>
          <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
            · {epic.features.length} features
          </span>
        </div>
        <span className="text-[11.5px] font-mono font-semibold" style={{ color: c.accent }}>
          {epic.code}
        </span>
        <StatusPill status={isDone ? 'done' : done === 0 ? 'todo' : 'partial'} />
        <div className="flex items-center gap-[8px] pr-2">
          <ProgressBar percent={percent} done={isDone} />
          <span className="text-[11px] font-semibold tabular-nums shrink-0" style={{ color: isDone ? c.success : c.textPrimary }}>
            {percent}%
          </span>
        </div>
      </div>
      {open && epic.features.map((f) => <FeatureRow key={f.code} feature={f} />)}
    </>
  );
}

const HIGHLIGHTS = [
  { strong: 'Modelagem visual', rest: ' completa de fluxos, com eventos de início/fim, User Tasks e elementos de integração (REST/Kafka).' },
  { strong: 'Formulários dinâmicos', rest: ' (SDUI) reutilizáveis, associáveis a qualquer etapa da jornada.' },
  { strong: 'Versionamento completo', rest: ': rascunho, publicação, arquivamento e histórico auditável por jornada.' },
  { strong: 'Autenticação', rest: ', papéis (ADMIN/EDITOR/VIEWER) e autorização aplicados de ponta a ponta.' },
  { strong: 'Trilha de auditoria', rest: ' de eventos de negócio, segurança e acesso, com proteção contra alteração.' },
  { strong: 'Observabilidade', rest: ' de requisições, transações e correlação de logs, pronta para integração futura com ELK.' },
];

const DONUT_COLORS = ['#2563eb', '#16a34a', '#7c3aed'];

function DonutSummary() {
  const { colors: c } = useAppTheme();

  const rows = [
    { label: 'Épicos', value: TOTAL_EPICS, color: DONUT_COLORS[0] },
    { label: 'Features', value: TOTAL_FEATURES, color: DONUT_COLORS[1] },
    { label: 'Requisitos', value: TOTAL_REQS, color: DONUT_COLORS[2] },
  ];
  const sum = rows.reduce((s, r) => s + r.value, 0);
  let acc = 0;
  const stops = rows
    .map((r) => {
      const from = (acc / sum) * 100;
      acc += r.value;
      const to = (acc / sum) * 100;
      return `${r.color} ${from}% ${to}%`;
    })
    .join(', ');

  const reqsRemaining = TOTAL_REQS - TOTAL_REQS_NA - TOTAL_REQS_DONE;
  const epicsOpen = EPICS.filter((e) => {
    const { total, done, naCount } = epicCounts(e);
    return done < total - naCount;
  }).length;

  return (
    <div className="flex-1 min-w-[280px] rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
      <div className="flex items-center justify-center gap-[8px] mb-5">
        <Sparkles size={15} style={{ color: c.accent }} />
        <h3 className="m-0 text-[14px] font-bold" style={{ color: c.accent }}>
          Resumo geral do MVP
        </h3>
      </div>
      <div className="flex items-center justify-center gap-6">
        <div
          className="shrink-0 w-[140px] h-[140px] rounded-full flex items-center justify-center"
          style={{ background: `conic-gradient(${stops})` }}
        >
          <div className="w-[80px] h-[80px] rounded-full" style={{ background: c.surface }} />
        </div>
        <div className="flex flex-col gap-[12px] min-w-0">
          {rows.map((row) => (
            <div key={row.label} className="flex items-center gap-[9px]">
              <span className="shrink-0 w-[12px] h-[12px] rounded-[3px]" style={{ background: row.color }} />
              <span className="text-[15px] font-bold tabular-nums" style={{ color: c.textPrimary }}>
                {row.value}
              </span>
              <span className="text-[13px]" style={{ color: c.textSecondary }}>
                {row.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-5 pt-4 flex flex-col gap-[8px] text-[13px]" style={{ borderTop: `1px solid ${c.border}` }}>
        <div className="flex items-center justify-center gap-[7px]">
          <CircleCheck size={16} className="shrink-0" style={{ color: c.success }} />
          <span style={{ color: c.textSecondary }}>
            <strong style={{ color: c.success }}>{OVERALL_PERCENT}%</strong> do escopo funcional coberto para o MVP
          </span>
        </div>
        {reqsRemaining > 0 && (
          <div className="flex items-center justify-center gap-[7px]">
            <CircleDashed size={14} className="shrink-0" style={{ color: c.warning }} />
            <span style={{ color: c.textSecondary }}>
              Faltam <strong style={{ color: c.warning }}>{reqsRemaining}</strong> requisito{reqsRemaining === 1 ? '' : 's'} em{' '}
              <strong style={{ color: c.warning }}>{epicsOpen}</strong> épico{epicsOpen === 1 ? '' : 's'} para o MVP fechar
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function sourceMeta(source: ChangelogSource, c: Colors) {
  if (source === 'git') return { label: 'Git', Icon: GitCommitHorizontal, fg: c.textSecondary, bg: c.chipBg };
  return { label: 'progresso.md', Icon: FileCheck2, fg: c.accent, bg: c.accentSoft };
}

function ChangelogPanel() {
  const { colors: c } = useAppTheme();
  return (
    <div>
      <h2 className="m-0 mb-1 flex items-center gap-[7px] text-[14px] font-semibold" style={{ color: c.textPrimary }}>
        <History size={15} style={{ color: c.textMuted }} />
        Changelog de progresso
      </h2>
      <p className="m-0 mb-4 text-[13px]" style={{ color: c.textSecondary }}>
        Histórico de commits (branch main) mesclado com as entradas de "Changelog deste arquivo" em
        requisitos/admin/progresso.md, em ordem cronológica.
      </p>
      <div className="rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
        <div className="flex flex-col">
          {CHANGELOG.map((entry, i) => {
            const sm = sourceMeta(entry.source, c);
            return (
              <div key={i} className="flex gap-3 pb-4 last:pb-0">
                <div className="flex flex-col items-center shrink-0 w-[14px]">
                  <span className="w-[9px] h-[9px] rounded-full mt-[3px]" style={{ background: sm.fg }} />
                  {i < CHANGELOG.length - 1 && <span className="flex-1 w-px mt-[3px]" style={{ background: c.border }} />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-[8px] flex-wrap">
                    <span className="text-[11px] font-mono tabular-nums" style={{ color: c.textMuted }}>
                      {entry.date}
                    </span>
                    <span
                      className="inline-flex items-center gap-[4px] text-[10px] font-semibold px-[7px] py-[1px] rounded-full"
                      style={{ background: sm.bg, color: sm.fg }}
                    >
                      <sm.Icon size={10} />
                      {sm.label}
                    </span>
                    {entry.epics?.map((epic) => (
                      <span
                        key={epic}
                        className="text-[10px] font-semibold px-[7px] py-[1px] rounded-full"
                        style={{ background: c.chipBg, color: c.textMuted }}
                      >
                        {epic}
                      </span>
                    ))}
                  </div>
                  <p className="m-0 mt-[2px] text-[12.5px] leading-[18px]" style={{ color: c.textPrimary }}>
                    {entry.summary}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export function SobrePage() {
  const { colors: c } = useAppTheme();
  const [filter, setFilter] = useState<'all' | 'done' | 'partial'>('all');

  const visibleEpics = useMemo(() => {
    if (filter === 'all') return EPICS;
    return EPICS.filter((e) => {
      const { total, done, naCount } = epicCounts(e);
      const isDone = done === total - naCount;
      return filter === 'done' ? isDone : !isDone;
    });
  }, [filter]);

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6 flex items-start gap-4 flex-wrap">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: c.accent }}>
          <Route size={24} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <div className="flex items-center gap-[10px] mb-1">
            <h1 className="m-0 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
              Sobre <span style={{ color: c.textMuted, fontWeight: 500 }}>{APP_VERSION}</span>
            </h1>
            <span
              className="text-[10.5px] font-semibold uppercase tracking-[0.04em] px-[8px] py-[3px] rounded-full"
              style={{ background: c.chipBg, color: c.textMuted, border: `1px solid ${c.border}` }}
            >
              Painel temporário
            </span>
          </div>
          <p className="m-0 text-[13.5px] max-w-[640px]" style={{ color: c.textSecondary }}>
            Visão executiva e estática do que está contemplado nesta versão do MVP do Elastic Journey Admin Portal.
          </p>
        </div>
      </div>

      <div className="flex gap-3 flex-wrap mb-8 items-stretch">
        <div className="flex-1 min-w-[280px] rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
          <div className="flex items-center justify-center gap-[8px] mb-3">
            <CircleCheck size={15} style={{ color: c.success }} />
            <h3 className="m-0 text-[13px] font-semibold" style={{ color: c.textPrimary }}>
              Capacidades entregues no MVP
            </h3>
          </div>
          <ul className="m-0 p-0 flex flex-col gap-[8px]" style={{ listStyle: 'none' }}>
            {HIGHLIGHTS.map((item) => (
              <li key={item.strong} className="text-[12.5px] leading-[18px] flex items-start gap-[7px]" style={{ color: c.textSecondary }}>
                <CircleCheck size={13} className="shrink-0 mt-[2px]" style={{ color: c.success }} />
                <span>
                  <strong style={{ color: c.textPrimary }}>{item.strong}</strong>
                  {item.rest}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <DonutSummary />

        <div className="flex-1 min-w-[240px] rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
          <div className="flex items-center justify-center gap-[8px] mb-3">
            <Info size={15} style={{ color: c.accent }} />
            <h3 className="m-0 text-[13px] font-semibold" style={{ color: c.textPrimary }}>
              Sobre este painel
            </h3>
          </div>
          <p className="m-0 mb-3 text-[12.5px] leading-[18px]" style={{ color: c.textSecondary }}>
            Os números consideram exclusivamente os requisitos funcionais definidos para o MVP. O conteúdo é estático e não
            reflete o progresso ao vivo do projeto.
          </p>
          <div className="flex flex-col gap-[8px] text-[12px]" style={{ color: c.textSecondary }}>
            <div className="flex items-center gap-[7px]">
              <BookOpen size={13} style={{ color: c.textMuted }} />
              requisitos/admin/ej-admin-requisitos.md
            </div>
            <div className="flex items-center gap-[7px]">
              <FileCheck2 size={13} style={{ color: c.textMuted }} />
              requisitos/admin/progresso.md
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between mb-3">
        <h2 className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          Épicos, features e requisitos
        </h2>
        <div className="flex gap-[6px]">
          {(
            [
              ['all', 'Todos'],
              ['done', 'Concluídos'],
              ['partial', 'Em aberto'],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-[10px] py-[6px] rounded-md text-[12px] font-medium cursor-pointer border-0"
              style={{
                background: filter === key ? c.accentSoft : c.chipBg,
                color: filter === key ? c.accent : c.textSecondary,
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-xl overflow-hidden mb-8" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
        <div
          className="grid items-center px-3"
          style={{ gridTemplateColumns: GRID_COLS, minHeight: 34, background: c.surface }}
        >
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] py-2" style={{ color: c.textMuted }}>
            Item
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
            Tipo-Código
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
            Status
          </span>
          <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] pr-2" style={{ color: c.textMuted }}>
            Progresso
          </span>
        </div>
        {visibleEpics.map((epic) => (
          <EpicRows key={epic.code} epic={epic} />
        ))}
      </div>

      <div>
        <h2 className="m-0 mb-1 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          Fora do escopo do MVP
        </h2>
        <p className="m-0 mb-4 text-[13px]" style={{ color: c.textSecondary }}>
          Capacidades planejadas para evoluções futuras da plataforma, não contempladas nesta versão.
        </p>
        <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {OUT_OF_SCOPE.map((group) => (
            <div key={group.title} className="rounded-xl p-4" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
              <div className="text-[12.5px] font-semibold mb-[10px]" style={{ color: c.textPrimary }}>
                {group.title}
              </div>
              <ul className="m-0 p-0 flex flex-col gap-[6px]" style={{ listStyle: 'none' }}>
                {group.items.map((item) => (
                  <li key={item} className="text-[12.5px] flex items-start gap-[6px]" style={{ color: c.textSecondary }}>
                    <MinusCircle size={13} className="shrink-0 mt-[2px]" style={{ color: c.textMuted }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8">
        <ChangelogPanel />
      </div>

      <div className="flex items-center gap-[6px] mt-8 pt-4 text-[11.5px]" style={{ borderTop: `1px solid ${c.border}`, color: c.textMuted }}>
        <Info size={12} />
        Fonte: requisitos/admin/progresso.md — Elastic Journey Admin Portal, MVP v1.0
      </div>
    </div>
  );
}
