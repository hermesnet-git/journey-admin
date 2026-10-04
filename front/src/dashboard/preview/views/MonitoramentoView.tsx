import { useState } from 'react';
import { ButtonLink, ButtonPrimary, ButtonSecondary, Inline, Select, Stack, Tag, Text1, Text2 } from '../kit';
import {
  HOURLY_EXPECTED_HIGH,
  HOURLY_EXPECTED_LOW,
  HOURLY_TODAY,
  INTEGRATIONS,
  JOURNEY_BY_ID,
  RULE_OPTIONS,
  VIEW_BY_ID,
  fmtInt,
  type AlertRule,
  type IntegrationStat,
} from '../mockData';
import { usePreviewStore } from '../store';
import { DataTable, HowItWorks, LineChart, Panel, colors as v, useToast } from '../ui';

function healthOf(i: IntegrationStat, agendaDown: boolean): IntegrationStat['health'] {
  return i.id === 'agenda' && !agendaDown ? 'ok' : i.health;
}

const HEALTH_TAG = { ok: ['success', 'no ar'], degradada: ['warning', 'degradada'], fora: ['error', 'fora do ar'] } as const;

export function IntegrationsTable({ onSelect, selectedId }: { onSelect?: (i: IntegrationStat) => void; selectedId?: string }) {
  const { agendaDown } = usePreviewStore();
  return (
    <DataTable
      head={['Integração', 'Situação', 'Jornadas', 'p95', 'Falha']}
      align={['left', 'left', 'right', 'right', 'right']}
      rows={INTEGRATIONS.map((i) => {
        const h = healthOf(i, agendaDown);
        const [type, label] = HEALTH_TAG[h];
        const name = (
          <button
            type="button"
            onClick={() => onSelect?.(i)}
            className="border-0 bg-transparent p-0 cursor-pointer text-left"
            style={{ textDecoration: onSelect ? 'underline' : 'none', textUnderlineOffset: 3 }}
          >
            <Text2 medium color={selectedId === i.id ? v.textLink : v.textPrimary}>
              {i.name}
            </Text2>
          </button>
        );
        return [
          name,
          <Tag key="t" type={type} small>
            {label}
          </Tag>,
          String(i.journeyIds.length),
          h === 'fora' ? '—' : i.p95Ms! >= 1000 ? `${(i.p95Ms! / 1000).toLocaleString('pt-BR')} s` : `${i.p95Ms} ms`,
          <Text2 key="f" regular color={h === 'ok' ? v.textPrimary : h === 'fora' ? v.error : v.warningHigh}>
            {h === 'ok' && i.id === 'agenda' ? '0,4%' : `${i.failurePct.toLocaleString('pt-BR')}%`}
          </Text2>,
        ];
      })}
    />
  );
}

export function HourlyAnomalyChart() {
  const { agendaDown } = usePreviewStore();
  const today = agendaDown ? HOURLY_TODAY : HOURLY_TODAY.map((n, i) => (i >= 15 ? Math.round(HOURLY_EXPECTED_LOW[i] * 1.08) : n));
  const hours = Array.from({ length: 24 }, (_, h) => `${String(h).padStart(2, '0')}h`);
  return (
    <Stack space={8}>
      <LineChart
        series={[{ values: today, color: agendaDown ? v.error : v.brand, label: agendaDown ? '−38% do esperado' : 'dentro do esperado' }]}
        xLabels={hours}
        xTicks={[0, 6, 12, 18, 23]}
        yMin={0}
        yMax={1300}
        yTicks={[0, 600, 1200]}
        formatY={(n) => fmtInt(n)}
        band={{ low: HOURLY_EXPECTED_LOW, high: HOURLY_EXPECTED_HIGH }}
      />
      <Text1 regular color={v.textSecondary}>
        Faixa: mesma hora nas últimas 4 semanas. Linha: execuções de hoje.
      </Text1>
    </Stack>
  );
}

export function ImpactMap({ integration }: { integration: IntegrationStat }) {
  const { agendaDown } = usePreviewStore();
  const down = healthOf(integration, agendaDown) !== 'ok';
  const journeys = integration.journeyIds.slice(0, 7).map((id) => JOURNEY_BY_ID[id]);
  const H = Math.max(120, journeys.length * 40 + 10);
  const yOf = (i: number) => 22 + i * 40;
  const srcY = H / 2;
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 560 ${H}`} width="100%" style={{ minWidth: 460, display: 'block' }} role="img" aria-label={`Jornadas que usam ${integration.name}`}>
        {journeys.map((j, i) => (
          <path
            key={j.id}
            d={`M170 ${srcY} C 250 ${srcY}, 260 ${yOf(i)}, 340 ${yOf(i)}`}
            fill="none"
            stroke={down ? v.error : v.border}
            strokeWidth={down ? 2.4 : 1.5}
            strokeDasharray={down ? '5 4' : undefined}
          />
        ))}
        <rect x={4} y={srcY - 18} width={166} height={36} rx={8} fill={down ? v.errorLow : v.backgroundContainerAlternative} stroke={down ? v.error : v.border} />
        <circle cx={20} cy={srcY} r={4.5} fill={down ? v.error : v.success} />
        <text x={32} y={srcY + 4} fontSize={12} fill={v.textPrimary}>
          {integration.name}
        </text>
        {journeys.map((j, i) => (
          <g key={j.id}>
            <rect x={340} y={yOf(i) - 15} width={214} height={30} rx={8} fill={v.backgroundContainer} stroke={down ? v.error : v.border} />
            <text x={350} y={yOf(i) + 4} fontSize={11.5} fill={v.textPrimary}>
              {j.name}
            </text>
            {down && integration.stuck[j.id] && (
              <text x={546} y={yOf(i) + 4} fontSize={11} fontWeight={600} textAnchor="end" fill={v.error}>
                {fmtInt(integration.stuck[j.id])}
              </text>
            )}
          </g>
        ))}
      </svg>
      {integration.journeyIds.length > 7 && (
        <Text1 regular color={v.textSecondary}>
          e mais {integration.journeyIds.length - 7} jornadas
        </Text1>
      )}
    </div>
  );
}

export function RulesList() {
  const { rules, removeRule } = usePreviewStore();
  return (
    <Stack space={8}>
      {rules.map((r) => (
        <div key={r.id} className="flex items-center justify-between gap-3 flex-wrap rounded-lg px-3 py-2" style={{ border: `1px solid ${r.firing ? v.error : v.border}` }}>
          <Text2 regular>
            Se o <b>{r.metric}</b> de <b>{r.scope}</b> ficar {r.comparator} <b>{r.threshold}</b> por {r.window}, avisar {r.notify} por {r.via}.
          </Text2>
          <Inline space={8} alignItems="center">
            {r.firing ? (
              <Tag type="error" small>
                disparada
              </Tag>
            ) : (
              <Tag type="inactive" small>
                quieta
              </Tag>
            )}
            <ButtonLink small onPress={() => removeRule(r.id)}>
              Excluir
            </ButtonLink>
          </Inline>
        </div>
      ))}
    </Stack>
  );
}

function RuleBuilder() {
  const { addRule } = usePreviewStore();
  const toast = useToast();
  const [rule, setRule] = useState<Omit<AlertRule, 'id' | 'firing'>>({
    metric: 'sucesso',
    scope: 'qualquer jornada',
    comparator: 'abaixo de',
    threshold: '75%',
    window: '30 minutos',
    notify: 'o time dono',
    via: 'Teams',
  });
  const field = (key: keyof typeof rule, label: string, options: readonly string[]) => (
    <div className="min-w-[150px] flex-1">
      <Select
        name={`rule-${key}`}
        label={label}
        value={rule[key]}
        onChangeValue={(val) => setRule((r) => ({ ...r, [key]: val }))}
        options={options.map((o) => ({ value: o, text: o }))}
        fullWidth
      />
    </div>
  );
  return (
    <Stack space={12}>
      <div className="flex flex-wrap gap-3">
        {field('metric', 'Indicador', RULE_OPTIONS.metric)}
        {field('scope', 'De quem', RULE_OPTIONS.scope)}
        {field('comparator', 'Condição', RULE_OPTIONS.comparator)}
        {field('threshold', 'Limite', RULE_OPTIONS.threshold)}
        {field('window', 'Por quanto tempo', RULE_OPTIONS.window)}
        {field('notify', 'Avisar', RULE_OPTIONS.notify)}
        {field('via', 'Por', RULE_OPTIONS.via)}
      </div>
      <Text2 regular color={v.textSecondary}>
        Se o <b>{rule.metric}</b> de <b>{rule.scope}</b> ficar {rule.comparator} <b>{rule.threshold}</b> por {rule.window}, avisar {rule.notify} por {rule.via}.
      </Text2>
      <Inline space={8}>
        <ButtonPrimary
          small
          onPress={() => {
            addRule(rule);
            toast('Regra criada. Na versão real, ela passaria a ser verificada a cada minuto.');
          }}
        >
          Criar regra
        </ButtonPrimary>
      </Inline>
    </Stack>
  );
}

export function MonitoramentoView() {
  const { agendaDown, recoverAgenda } = usePreviewStore();
  const toast = useToast();
  const [selected, setSelected] = useState<IntegrationStat>(INTEGRATIONS[0]);
  const down = healthOf(selected, agendaDown) !== 'ok';
  const stuckTotal = Object.values(selected.stuck).reduce((s, n) => s + n, 0);
  return (
    <Stack space={16}>
      <HowItWorks view={VIEW_BY_ID.monitoramento} />
      <Panel title="Nova regra de alerta" subtitle="Complete a frase; a regra vale para um grupo de jornadas ou de integrações">
        <RuleBuilder />
      </Panel>
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))' }}>
        <Panel
          title={`Mapa de impacto · ${selected.name}`}
          subtitle="Clique numa integração da tabela ao lado para trocar"
          actions={
            selected.id === 'agenda' && agendaDown ? (
              <ButtonSecondary
                small
                onPress={() => {
                  recoverAgenda();
                  toast('A integração voltou: o alerta parou.');
                }}
              >
                Simular: integração voltou
              </ButtonSecondary>
            ) : undefined
          }
        >
          <Stack space={12}>
            <ImpactMap integration={selected} />
            {down ? (
              <div className="rounded-lg p-3" style={{ background: v.errorLow }}>
                <Text2 regular>
                  <b>{selected.journeyIds.length} jornadas</b> usam "{selected.name}". <b>{fmtInt(stuckTotal)} instâncias</b> estão paradas esperando por ela. As jornadas com "Se falhar"
                  configurado estão mandando o cliente para "Tentar mais tarde".
                </Text2>
              </div>
            ) : (
              <Text2 regular color={v.textSecondary}>
                Integração no ar. Se cair, este quadro mostra na hora as jornadas e as instâncias afetadas.
              </Text2>
            )}
          </Stack>
        </Panel>
        <Stack space={16}>
          <Panel title="Saúde das integrações">
            <IntegrationsTable onSelect={setSelected} selectedId={selected.id} />
          </Panel>
          <Panel title="Execuções do portfólio por hora · hoje contra o esperado">
            <HourlyAnomalyChart />
          </Panel>
        </Stack>
      </div>
      <Panel title="Regras ativas">
        <RulesList />
      </Panel>
    </Stack>
  );
}
