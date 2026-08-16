import { useId, useState } from 'react';
import { useAppTheme } from '../shell/theme';
import type { DailyCount, HourlyCount, TrendGranularity } from './api';

const CHART_HEIGHT = 220;
const CHART_PAD_X = 8;
const CHART_PAD_TOP = 16;
const CHART_PAD_BOTTOM = 30;

interface Point {
  x: number;
  y: number;
  value: number;
}

// Formato único de ponto pro gráfico — `key` é a data (dia/semana/mês) ou o instante ISO (hora),
// dependendo da granularidade escolhida pelo usuário.
export interface TrendPoint {
  key: string;
  started: number;
  completed: number;
}

export function dailyToPoints(data: DailyCount[]): TrendPoint[] {
  return data.map((d) => ({ key: d.date, started: d.started, completed: d.completed }));
}

export function hourlyToPoints(data: HourlyCount[]): TrendPoint[] {
  return data.map((d) => ({ key: d.hour, started: d.started, completed: d.completed }));
}

function formatPointLabel(key: string, granularity: TrendGranularity, full = false): string {
  if (granularity === 'day') {
    const d = new Date(key);
    return full
      ? d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }) + ', ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      : d.toLocaleTimeString('pt-BR', { hour: '2-digit' });
  }
  const d = new Date(`${key}T00:00:00`);
  return d.toLocaleDateString('pt-BR', full ? { day: '2-digit', month: 'long' } : { day: '2-digit', month: '2-digit' });
}

// Curva suave por bezier cúbica com pontos de controle no meio do caminho horizontal entre cada par
// de pontos — mais simples que Catmull-Rom completo e já dá o efeito de "linha de gráfico premium"
// em vez de segmentos retos.
function smoothPath(points: Point[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const cx = (p0.x + p1.x) / 2;
    d += ` C ${cx.toFixed(1)} ${p0.y.toFixed(1)}, ${cx.toFixed(1)} ${p1.y.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
  }
  return d;
}

// Área + linha construída à mão em SVG puro — sem dependência nova só pra dois gráficos; dá controle
// total sobre o visual (cores do tema, tema claro/escuro) que uma lib genérica não daria de graça.
export function TrendChart({ data, granularity }: { data: TrendPoint[]; granularity: TrendGranularity }) {
  const { colors: c } = useAppTheme();
  const gradientId = useId();
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const width = 900;
  const plotWidth = width - CHART_PAD_X * 2;
  const plotHeight = CHART_HEIGHT - CHART_PAD_TOP - CHART_PAD_BOTTOM;
  const max = Math.max(1, ...data.map((d) => Math.max(d.started, d.completed)));
  const stepX = plotWidth / Math.max(1, data.length - 1);

  const pointsFor = (key: 'started' | 'completed'): Point[] =>
    data.map((d, i) => ({
      x: CHART_PAD_X + i * stepX,
      y: CHART_PAD_TOP + plotHeight * (1 - d[key] / max),
      value: d[key],
    }));

  const startedPoints = pointsFor('started');
  const completedPoints = pointsFor('completed');

  const areaPath = (points: Point[]) => {
    const base = CHART_PAD_TOP + plotHeight;
    return `${smoothPath(points)} L ${points[points.length - 1].x.toFixed(1)} ${base} L ${points[0].x.toFixed(1)} ${base} Z`;
  };

  const labelEvery = Math.max(1, Math.ceil(data.length / 7));
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const hoverX = hoverIndex !== null ? startedPoints[hoverIndex].x : 0;
  // Vira o tooltip pro outro lado perto da borda direita, pra não sair do viewBox.
  const tooltipOnLeft = hoverX > width - 180;

  return (
    <div className="w-full" style={{ animation: 'dashboard-chart-in 420ms cubic-bezier(0.16,1,0.3,1)' }}>
      <div className="flex items-center gap-4 mb-2">
        <LegendDot color={c.accent} label="Iniciadas" c={c} />
        <LegendDot color={c.success} label="Concluídas" c={c} />
      </div>

      <svg viewBox={`0 0 ${width} ${CHART_HEIGHT}`} className="w-full" style={{ height: CHART_HEIGHT, overflow: 'visible' }}>
        <defs>
          <linearGradient id={`${gradientId}-started`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity={0.3} />
            <stop offset="100%" stopColor={c.accent} stopOpacity={0} />
          </linearGradient>
          <linearGradient id={`${gradientId}-completed`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.success} stopOpacity={0.2} />
            <stop offset="100%" stopColor={c.success} stopOpacity={0} />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line
              x1={CHART_PAD_X}
              x2={width - CHART_PAD_X}
              y1={CHART_PAD_TOP + plotHeight * (1 - f)}
              y2={CHART_PAD_TOP + plotHeight * (1 - f)}
              stroke={c.border}
              strokeWidth={1}
              strokeDasharray="3 4"
            />
            <text x={0} y={CHART_PAD_TOP + plotHeight * (1 - f) - 4} fontSize={10} fill={c.textMuted}>
              {Math.round(max * f)}
            </text>
          </g>
        ))}

        <path d={areaPath(completedPoints)} fill={`url(#${gradientId}-completed)`} />
        <path d={areaPath(startedPoints)} fill={`url(#${gradientId}-started)`} />
        <path d={smoothPath(completedPoints)} fill="none" stroke={c.success} strokeWidth={2} strokeLinecap="round" />
        <path d={smoothPath(startedPoints)} fill="none" stroke={c.accent} strokeWidth={2.5} strokeLinecap="round" />

        {hoverIndex !== null && (
          <line
            x1={hoverX}
            x2={hoverX}
            y1={CHART_PAD_TOP}
            y2={CHART_PAD_TOP + plotHeight}
            stroke={c.textMuted}
            strokeWidth={1}
            strokeDasharray="2 3"
          />
        )}

        {startedPoints.map((p, i) => (
          <g key={i}>
            <rect
              x={p.x - stepX / 2}
              y={0}
              width={stepX}
              height={CHART_HEIGHT}
              fill="transparent"
              onMouseEnter={() => setHoverIndex(i)}
              onMouseLeave={() => setHoverIndex(null)}
            />
            {hoverIndex === i && <circle cx={p.x} cy={p.y} r={7} fill={c.accent} opacity={0.18} />}
            <circle cx={p.x} cy={p.y} r={hoverIndex === i ? 4 : 2.5} fill={c.accent} stroke={c.surface} strokeWidth={1.5} />
            {hoverIndex === i && <circle cx={completedPoints[i].x} cy={completedPoints[i].y} r={7} fill={c.success} opacity={0.18} />}
            <circle
              cx={completedPoints[i].x}
              cy={completedPoints[i].y}
              r={hoverIndex === i ? 4 : 2.5}
              fill={c.success}
              stroke={c.surface}
              strokeWidth={1.5}
            />
            {i % labelEvery === 0 && (
              <text x={p.x} y={CHART_HEIGHT - 8} fontSize={10.5} fill={c.textMuted} textAnchor="middle">
                {formatPointLabel(data[i].key, granularity)}
              </text>
            )}
          </g>
        ))}

        {hovered && (
          <foreignObject
            x={tooltipOnLeft ? hoverX - 172 : hoverX + 12}
            y={CHART_PAD_TOP}
            width={160}
            height={64}
            style={{ pointerEvents: 'none', overflow: 'visible' }}
          >
            <div
              className="rounded-lg px-3 py-2"
              style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 8px 24px -6px ${c.shadow}` }}
            >
              <div className="text-[11.5px] font-semibold mb-1" style={{ color: c.textPrimary }}>
                {formatPointLabel(hovered.key, granularity, true)}
              </div>
              <div className="flex items-center justify-between gap-3 text-[11.5px]" style={{ color: c.textSecondary }}>
                <span className="flex items-center gap-[5px]">
                  <Dot color={c.accent} /> Iniciadas
                </span>
                <span className="font-semibold tabular-nums" style={{ color: c.textPrimary }}>
                  {hovered.started}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 text-[11.5px]" style={{ color: c.textSecondary }}>
                <span className="flex items-center gap-[5px]">
                  <Dot color={c.success} /> Concluídas
                </span>
                <span className="font-semibold tabular-nums" style={{ color: c.textPrimary }}>
                  {hovered.completed}
                </span>
              </div>
            </div>
          </foreignObject>
        )}
      </svg>
    </div>
  );
}

function Dot({ color }: { color: string }) {
  return <span className="inline-block w-[7px] h-[7px] rounded-full shrink-0" style={{ background: color }} />;
}

function LegendDot({ color, label, c }: { color: string; label: string; c: ReturnType<typeof useAppTheme>['colors'] }) {
  return (
    <span className="flex items-center gap-[6px] text-[12px]" style={{ color: c.textSecondary }}>
      <Dot color={color} /> {label}
    </span>
  );
}

export interface BarDatum {
  label: string;
  value: number;
  accent?: number;
  accentLabel?: string;
}

export function HorizontalBarChart({ data }: { data: BarDatum[] }) {
  const { colors: c } = useAppTheme();
  const max = Math.max(1, ...data.map((d) => d.value));
  return (
    <div className="flex flex-col gap-[14px]">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <div className="flex-1 min-w-0 text-[12.5px] truncate" style={{ color: c.textPrimary }} title={d.label}>
            {d.label}
          </div>
          <div className="w-[320px] shrink-0 h-[9px] rounded-full relative overflow-hidden" style={{ background: c.chipBg }}>
            <div
              className="h-full w-full rounded-full"
              style={{
                background: c.accent,
                transformOrigin: 'left',
                transform: `scaleX(${Math.max(d.value / max, d.value > 0 ? 0.02 : 0)})`,
                transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            />
          </div>
          <div className="w-[34px] shrink-0 text-right text-[12.5px] font-semibold tabular-nums" style={{ color: c.textPrimary }}>
            {d.value}
          </div>
          {!!d.accent && (
            <span
              className="shrink-0 rounded-full px-[7px] py-[1px] text-[10.5px] font-semibold"
              style={{ background: c.dangerSoft, color: c.danger }}
              title={d.accentLabel}
            >
              {d.accent}
            </span>
          )}
        </div>
      ))}
    </div>
  );
}
