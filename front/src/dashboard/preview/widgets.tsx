import { Tag } from './kit';
import { INTEGRATIONS, JOURNEYS, TOTAL_EXECUTIONS, WEIGHTED_SUCCESS, fmtInt, fmtThousands, type Kind, type ViewId } from './mockData';
import { usePreviewStore, type WidgetSize } from './store';
import { DataTable, Kpi, colors as v, Bar } from './ui';
import { ChannelMatrix, HeatLegend, PortfolioTreemap, useVisibleJourneys } from './views/MapaView';
import { STAGES } from './mockData';
import { HourlyAnomalyChart, ImpactMap, IntegrationsTable, RulesList } from './views/MonitoramentoView';
import { AuditFeed, HealthGrades, PipelineStages } from './views/GovernancaView';

export interface WidgetDef {
  key: string;
  title: string;
  source: 'geral' | ViewId;
  kind: Kind | null; // null = indicador geral
  size: WidgetSize;
  render: (ctx: { onNavigate: (tab: string) => void }) => React.ReactNode;
}

function KpiRow() {
  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
      <Kpi label="Jornadas publicadas" value={String(JOURNEYS.length)} note="em 4 produtos · 3 canais" tag={<Tag type="success" small>+3 na semana</Tag>} />
      <Kpi label="Execuções na semana" value={fmtThousands(TOTAL_EXECUTIONS)} note="todas as jornadas" tag={<Tag type="success" small>▲ 9%</Tag>} />
      <Kpi label="Sucesso médio" value={`${WEIGHTED_SUCCESS}%`} note="ponderado por volume" tag={<Tag type="warning" small>▼ 2 p.p.</Tag>} />
    </div>
  );
}

function Ranking() {
  const list = [...useVisibleJourneys()].sort((a, b) => b.executions - a.executions).slice(0, 6);
  return (
    <DataTable
      head={['Jornada', 'Produto', 'Execuções', 'Sucesso', '7 dias']}
      align={['left', 'left', 'right', 'left', 'right']}
      rows={list.map((j) => [
        j.name,
        j.product,
        fmtInt(j.executions),
        <div key="s" className="min-w-[80px]">
          <Bar value={j.success} color={j.success < 70 ? v.error : j.success < 80 ? v.warning : v.success} />
        </div>,
        <span key="d" style={{ color: j.deltaPp < 0 ? v.error : v.success, whiteSpace: 'nowrap' }}>{j.deltaPp === 0 ? '—' : `${j.deltaPp > 0 ? '▲' : '▼'} ${Math.abs(j.deltaPp)} p.p.`}</span>,
      ])}
    />
  );
}

// Execuções e sucesso por etapa do ciclo de vida; clicar numa etapa aplica o recorte ao painel todo.
function LifecycleWidget() {
  const { stage, setStage } = usePreviewStore();
  const rows = STAGES.map((st) => {
    const list = JOURNEYS.filter((j) => j.stage === st.id);
    const exec = list.reduce((acc, j) => acc + j.executions, 0);
    const success = Math.round(list.reduce((acc, j) => acc + j.success * j.executions, 0) / Math.max(1, exec));
    return { ...st, exec, success, count: list.length };
  });
  const top = Math.max(...rows.map((x) => x.exec));
  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {rows.map((x) => (
        <button
          key={x.id}
          type="button"
          onClick={() => setStage(stage === x.id ? null : x.id)}
          aria-pressed={stage === x.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr 64px 44px',
            gap: 8,
            alignItems: 'center',
            fontSize: 12.5,
            border: `1px solid ${stage === x.id ? 'var(--accent)' : 'transparent'}`,
            background: stage === x.id ? 'var(--accent-soft)' : 'transparent',
            borderRadius: 8,
            padding: '4px 6px',
            cursor: 'pointer',
            font: 'inherit',
            color: 'var(--ink)',
            textAlign: 'left',
          }}
        >
          <span>{x.label}</span>
          <span style={{ height: 12, borderRadius: 3, background: 'var(--blue)', width: `${(x.exec / top) * 100}%` }} />
          <span className="num" style={{ textAlign: 'right', color: 'var(--muted)', fontSize: 11.5 }}>
            {fmtThousands(x.exec)}
          </span>
          <span className="num" style={{ textAlign: 'right', fontSize: 11.5, color: x.success < 75 ? 'var(--bad)' : 'var(--good)' }}>
            {x.success}%
          </span>
        </button>
      ))}
      <span style={{ fontSize: 12, color: 'var(--muted)' }}>Clique numa etapa para recortar o painel por ela.</span>
    </div>
  );
}

export const WIDGETS: WidgetDef[] = [
  { key: 'geral.ciclo', title: 'Jornadas por etapa do ciclo de vida', source: 'geral', kind: null, size: 2, render: () => <LifecycleWidget /> },
  { key: 'geral.kpis', title: 'Indicadores do portfólio', source: 'geral', kind: null, size: 4, render: () => <KpiRow /> },
  { key: 'geral.ranking', title: 'Ranking de jornadas por volume', source: 'geral', kind: null, size: 2, render: () => <Ranking /> },
  {
    key: 'mapa.treemap',
    title: 'Mapa do portfólio',
    source: 'mapa',
    kind: 'negocio',
    size: 4,
    render: ({ onNavigate }) => (
      <div className="flex flex-col gap-3">
        <PortfolioTreemap height={300} onSelect={() => onNavigate('mapa')} />
        <HeatLegend />
      </div>
    ),
  },
  { key: 'mapa.matriz', title: 'Sucesso por produto × canal', source: 'mapa', kind: 'negocio', size: 2, render: () => <ChannelMatrix /> },
  { key: 'monitoramento.integracoes', title: 'Saúde das integrações', source: 'monitoramento', kind: 'sustentacao', size: 2, render: () => <IntegrationsTable /> },
  { key: 'monitoramento.impacto', title: 'Mapa de impacto · Agenda de campo', source: 'monitoramento', kind: 'sustentacao', size: 2, render: () => <ImpactMap integration={INTEGRATIONS[0]} /> },
  { key: 'monitoramento.anomalia', title: 'Execuções por hora contra o esperado', source: 'monitoramento', kind: 'sustentacao', size: 2, render: () => <HourlyAnomalyChart /> },
  { key: 'monitoramento.regras', title: 'Regras de alerta', source: 'monitoramento', kind: 'sustentacao', size: 2, render: () => <RulesList /> },
  { key: 'governanca.esteira', title: 'Esteira de publicação', source: 'governanca', kind: 'sustentacao', size: 4, render: () => <PipelineStages /> },
  { key: 'governanca.notas', title: 'Piores notas de saúde', source: 'governanca', kind: 'sustentacao', size: 2, render: () => <HealthGrades limit={5} /> },
  { key: 'governanca.auditoria', title: 'Últimas mudanças', source: 'governanca', kind: 'sustentacao', size: 2, render: () => <AuditFeed /> },
];

export function widgetByKey(key: string): WidgetDef | null {
  return WIDGETS.find((w) => w.key === key) ?? null;
}
