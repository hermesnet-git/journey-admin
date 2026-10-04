import { useMemo, useState } from 'react';
import { CHANNELS, JOURNEYS, JOURNEY_BY_ID, PRODUCTS, STAGE_LABEL, SUCCESS_BY_CHANNEL, VIEW_BY_ID, fmtInt, type JourneyStat } from '../mockData';
import { Seg } from '../kit';
import { usePreviewStore } from '../store';
import { HEAT, HEAT_LABELS, HowItWorks, ON_HEAT, Panel, heatIndex, useToast } from '../ui';

type GroupBy = 'produto' | 'time';
type ColorBy = 'sucesso' | 'variacao';

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

// Treemap por divisão binária: separa a lista em duas metades de volume parecido e corta o
// retângulo no lado mais comprido.
function splitLayout<T>(items: { value: number; item: T }[], r: Rect): { item: T; r: Rect }[] {
  if (items.length === 0) return [];
  if (items.length === 1) return [{ item: items[0].item, r }];
  const total = items.reduce((s, i) => s + i.value, 0);
  let acc = 0;
  let k = 0;
  while (k < items.length - 1 && (k === 0 || acc + items[k].value <= total / 2)) {
    acc += items[k].value;
    k++;
  }
  const frac = acc / total;
  const a = items.slice(0, k);
  const b = items.slice(k);
  if (r.w >= r.h) {
    const wa = r.w * frac;
    return [...splitLayout(a, { ...r, w: wa }), ...splitLayout(b, { x: r.x + wa, y: r.y, w: r.w - wa, h: r.h })];
  }
  const ha = r.h * frac;
  return [...splitLayout(a, { ...r, h: ha }), ...splitLayout(b, { x: r.x, y: r.y + ha, w: r.w, h: r.h - ha })];
}

function deltaIndex(delta: number) {
  if (delta <= -5) return 0;
  if (delta < 0) return 1;
  if (delta === 0) return 2;
  if (delta < 3) return 3;
  return 4;
}

export function useVisibleJourneys() {
  const { stage } = usePreviewStore();
  return stage ? JOURNEYS.filter((j) => j.stage === stage) : JOURNEYS;
}

// Mapa do portfólio como na página de esboços: um contorno por grupo com o nome em cima, blocos com
// cor cheia e texto branco, número de execuções e sucesso em fonte mono.
export function PortfolioTreemap({
  groupBy = 'produto',
  colorBy = 'sucesso',
  selectedId,
  onSelect,
  height = 400,
}: {
  groupBy?: GroupBy;
  colorBy?: ColorBy;
  selectedId?: string | null;
  onSelect?: (j: JourneyStat) => void;
  height?: number;
}) {
  const journeys = useVisibleJourneys();
  const W = 1000;
  const H = 1000 * (height / 1000);
  const groups = useMemo(() => {
    const keyOf = (j: JourneyStat) => (groupBy === 'produto' ? j.product : j.team);
    const list = [...new Set(journeys.map(keyOf))]
      .map((g) => {
        const items = journeys.filter((j) => keyOf(j) === g).sort((a, b) => b.executions - a.executions);
        return { g, items, value: items.reduce((s, j) => s + j.executions, 0) };
      })
      .sort((a, b) => b.value - a.value);
    return splitLayout(
      list.map((x) => ({ value: x.value, item: x })),
      { x: 0, y: 0, w: W, h: H }
    );
  }, [journeys, groupBy, H]);
  if (journeys.length === 0) {
    return (
      <p className="t2" style={{ color: 'var(--muted)' }}>
        Nenhuma jornada nesta etapa do ciclo de vida.
      </p>
    );
  }
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      {groups.map(({ item: g, r }) => {
        // Folga entre grupos e espaço para o nome do grupo em cima.
        const gx = r.x + 4;
        const gy = r.y + 12;
        const gw = r.w - 8;
        const gh = r.h - 16;
        const tiles = splitLayout(
          g.items.map((j) => ({ value: j.executions, item: j })),
          { x: 0, y: 0, w: gw - 8, h: gh - 8 }
        );
        return (
          <div
            key={g.g}
            style={{
              position: 'absolute',
              left: `${(gx / W) * 100}%`,
              top: gy,
              width: `${(gw / W) * 100}%`,
              height: gh,
              borderRadius: 10,
              border: '1px solid var(--line)',
              background: 'var(--surface-2)',
            }}
          >
            <span
              style={{
                position: 'absolute',
                top: -9,
                left: 10,
                zIndex: 1,
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--muted)',
                background: 'var(--surface)',
                padding: '0 6px',
              }}
            >
              {g.g}
            </span>
            <div style={{ position: 'absolute', inset: 2 }}>
              {tiles.map(({ item: j, r: t }) => {
                const idx = colorBy === 'sucesso' ? heatIndex(j.success) : deltaIndex(j.deltaPp);
                return (
                  <div
                    key={j.id}
                    style={{
                      position: 'absolute',
                      left: `${(t.x / (gw - 8)) * 100}%`,
                      top: `${(t.y / (gh - 8)) * 100}%`,
                      width: `${(t.w / (gw - 8)) * 100}%`,
                      height: `${(t.h / (gh - 8)) * 100}%`,
                      padding: 2,
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => onSelect?.(j)}
                      title={`${j.name}: ${fmtInt(j.executions)} execuções · ${j.success}% de sucesso`}
                      className={j.deltaPp <= -5 ? 'pulse' : undefined}
                      style={{
                        width: '100%',
                        height: '100%',
                        background: HEAT[idx],
                        color: ON_HEAT,
                        borderRadius: 6,
                        border: 0,
                        padding: '6px 8px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        textAlign: 'left',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        outline: selectedId === j.id ? '3px solid var(--ink)' : 'none',
                        outlineOffset: 1,
                        font: 'inherit',
                        lineHeight: 1.25,
                      }}
                    >
                      <b
                        style={{
                          fontWeight: 600,
                          fontSize: 12.5,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          maxWidth: '100%',
                        }}
                      >
                        {j.name}
                      </b>
                      <span
                        style={{
                          fontFamily: 'var(--f-data)',
                          fontSize: 11,
                          opacity: 0.92,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '100%',
                        }}
                      >
                        {t.w > 140
                          ? `${fmtInt(j.executions)} · ${j.success}%`
                          : `${(j.executions / 1000).toLocaleString('pt-BR', {
                              maximumFractionDigits: 1,
                            })} mil`}
                        {j.deltaPp <= -5 ? ' ▼' : ''}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function HeatLegend({ colorBy = 'sucesso' }: { colorBy?: ColorBy }) {
  const labels = colorBy === 'sucesso' ? HEAT_LABELS : ['caiu 5 p.p. ou mais', 'caiu', 'estável', 'subiu', 'subiu 3 p.p. ou mais'];
  return (
    <div
      style={{
        display: 'flex',
        gap: '6px 12px',
        alignItems: 'center',
        flexWrap: 'wrap',
        fontSize: 12,
        color: 'var(--muted)',
      }}
    >
      {colorBy === 'sucesso' ? 'Taxa de sucesso' : 'Variação contra a semana anterior'}
      {labels.map((l, i) => (
        <span key={l} style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
          <i
            style={{
              width: 18,
              height: 10,
              borderRadius: 3,
              display: 'inline-block',
              background: HEAT[i],
            }}
          />
          {l}
        </span>
      ))}
    </div>
  );
}

export function ChannelMatrix() {
  const cell = {
    borderRadius: 5,
    color: ON_HEAT,
    textAlign: 'center' as const,
    padding: '6px 0',
    fontFamily: 'var(--f-data)',
    fontSize: 11.5,
  };
  const head = {
    color: 'var(--muted)',
    fontWeight: 600,
    textAlign: 'center' as const,
    fontSize: 11.5,
  };
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '70px repeat(3, 1fr)',
        gap: 3,
        fontSize: 11.5,
      }}
    >
      <span />
      {CHANNELS.map((ch) => (
        <span key={ch} style={head}>
          {ch}
        </span>
      ))}
      {PRODUCTS.map((p) => (
        <span key={p} style={{ display: 'contents' }}>
          <span
            style={{
              color: 'var(--muted)',
              fontWeight: 600,
              alignSelf: 'center',
            }}
          >
            {p === 'Atendimento' ? 'Atendim.' : p}
          </span>
          {SUCCESS_BY_CHANNEL[p].map((s, i) => (
            <span key={i} style={{ ...cell, background: HEAT[heatIndex(s)] }}>
              {s}
            </span>
          ))}
        </span>
      ))}
    </div>
  );
}

function JourneyDetail({ journey }: { journey: JourneyStat }) {
  const toast = useToast();
  const worse = journey.deltaPp < 0;
  return (
    <div className="w">
      <h4>
        {journey.name}
        {journey.deltaPp <= -5 && <span className="pill bad">piorou</span>}
      </h4>
      <div style={{ display: 'flex', gap: 10, alignItems: 'baseline' }}>
        <span className="big">{journey.success}%</span>
        <span
          style={{
            fontFamily: 'var(--f-data)',
            fontSize: 12,
            color: worse ? 'var(--bad)' : 'var(--good)',
            whiteSpace: 'nowrap',
          }}
        >
          {journey.deltaPp === 0 ? 'estável' : `${journey.deltaPp > 0 ? '▲' : '▼'} ${Math.abs(journey.deltaPp)} p.p.`}
        </span>
      </div>
      <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>
        {journey.product} · time {journey.team} · v{journey.version} · {STAGE_LABEL[journey.stage]}
      </span>
      <button type="button" className="btn primary" onClick={() => toast(`Na versão real, abriria o Diagnóstico com as instâncias de "${journey.name}".`)}>
        Abrir no Diagnóstico
      </button>
    </div>
  );
}

export function MapaView() {
  const { stage } = usePreviewStore();
  const journeys = useVisibleJourneys();
  const [groupBy, setGroupBy] = useState<GroupBy>('produto');
  const [colorBy, setColorBy] = useState<ColorBy>('sucesso');
  const [selectedId, setSelectedId] = useState('portab');
  const selected = journeys.find((j) => j.id === selectedId) ?? journeys[0] ?? JOURNEY_BY_ID.portab;
  return (
    <div style={{ display: 'grid', gap: 22, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <HowItWorks view={VIEW_BY_ID.mapa} />
      <Panel
        title="Portfólio de jornadas"
        subtitle={`${journeys.length} publicadas${stage ? ` em ${STAGE_LABEL[stage]}` : ''} · últimos 7 dias`}
        flush
        actions={
          <>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Cor por</span>
            <Seg
              value={colorBy}
              onChange={setColorBy}
              options={[
                { value: 'sucesso', label: 'Sucesso' },
                { value: 'variacao', label: 'Variação' },
              ]}
            />
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Agrupar por</span>
            <Seg
              value={groupBy}
              onChange={setGroupBy}
              options={[
                { value: 'produto', label: 'Produto' },
                { value: 'time', label: 'Time' },
              ]}
            />
          </>
        }
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1fr) 290px',
          }}
        >
          <div
            style={{
              padding: '20px 16px 16px',
              display: 'grid',
              gap: 14,
              minWidth: 0,
              borderRight: '1px solid var(--line)',
            }}
          >
            <PortfolioTreemap groupBy={groupBy} colorBy={colorBy} selectedId={selected.id} onSelect={(j) => setSelectedId(j.id)} />
            <HeatLegend colorBy={colorBy} />
          </div>
          <div
            style={{
              padding: 16,
              display: 'grid',
              gap: 16,
              alignContent: 'start',
            }}
          >
            <JourneyDetail journey={selected} />
            <div className="w" style={{ border: 0, padding: 0, background: 'transparent' }}>
              <h4>Sucesso (%) por produto × canal</h4>
              <ChannelMatrix />
            </div>
          </div>
        </div>
      </Panel>
    </div>
  );
}
