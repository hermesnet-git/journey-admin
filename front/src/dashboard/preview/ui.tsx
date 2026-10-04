import { createContext, useCallback, useContext, useRef, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Stack, Table as KitTable, Text1, Text2, colors as v } from './kit';
import type { Grade, Kind, ViewMeta } from './mockData';

// Escala de saúde em 5 faixas, do pior ao melhor, com texto branco por cima (como na página de esboços).
export const HEAT = ['var(--h5)', 'var(--h4)', 'var(--h3)', 'var(--h2)', 'var(--h1)'];
export const ON_HEAT = 'var(--on-heat)';
export const HEAT_LABELS = ['< 60%', '60–74%', '75–79%', '80–89%', '90% ou mais'];
export function heatIndex(success: number) {
  if (success < 60) return 0;
  if (success < 75) return 1;
  if (success < 80) return 2;
  if (success < 90) return 3;
  return 4;
}
export const GRADE_HEAT: Record<Grade, number> = { A: 4, B: 3, C: 2, D: 1, E: 0 };

export const KIND_COLOR: Record<Kind, string> = { negocio: 'var(--biz)', sustentacao: 'var(--ops)' };
export const KIND_LABEL: Record<Kind, string> = { negocio: 'Negócio', sustentacao: 'Sustentação' };

export function KindTag({ kind }: { kind: Kind }) {
  return <span className={`kind ${kind === 'negocio' ? 'biz' : 'ops'}`}>{KIND_LABEL[kind]}</span>;
}

// ---------------------------------------------------------------- avisos

const ToastContext = createContext<(message: string) => void>(() => {});
export const useToast = () => useContext(ToastContext);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((m: string) => {
    setMessage(m);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setMessage(null), 4000);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {message && (
        <div role="status" className="toast">
          {message}
        </div>
      )}
    </ToastContext.Provider>
  );
}

// ---------------------------------------------------------------- blocos

// Moldura com barra de título, como os esboços: título (com complemento em cinza) e ações à direita.
export function Panel({
  title,
  subtitle,
  actions,
  children,
  flush,
}: {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  flush?: boolean;
}) {
  return (
    <div className="frame">
      {(title || actions) && (
        <div className="fbar">
          <div className="title">
            {title}
            {subtitle && <small>· {subtitle}</small>}
          </div>
          {actions && <div className="actions">{actions}</div>}
        </div>
      )}
      <div className={flush ? '' : 'fbody'}>{children}</div>
    </div>
  );
}

export function Kpi({ label, value, note, tag }: { label: string; value: string; note?: string; tag?: React.ReactNode }) {
  return (
    <div className="w">
      <h4>
        {label} {tag}
      </h4>
      <div className="big">{value}</div>
      {note && <span className="t1" style={{ color: v.textSecondary }}>{note}</span>}
    </div>
  );
}

export function Muted({ children }: { children: React.ReactNode }) {
  return (
    <Text1 regular color={v.textSecondary}>
      {children}
    </Text1>
  );
}

export function Bar({ value, max = 100, color = v.brand, height = 8 }: { value: number; max?: number; color?: string; height?: number }) {
  return (
    <div className="rounded-full overflow-hidden w-full" style={{ height, background: v.barTrack, borderRadius: 999 }}>
      <div style={{ height: '100%', borderRadius: 999, width: `${Math.max(0, Math.min(100, (value / max) * 100))}%`, background: color }} />
    </div>
  );
}

export function GradeBadge({ grade }: { grade: Grade }) {
  return (
    <span
      style={{
        width: 28,
        height: 28,
        borderRadius: 8,
        display: 'inline-grid',
        placeItems: 'center',
        background: HEAT[GRADE_HEAT[grade]],
        color: ON_HEAT,
        fontFamily: 'var(--f-display)',
        fontWeight: 700,
        fontSize: 15,
        flex: 'none',
      }}
    >
      {grade}
    </span>
  );
}

export function DataTable({ head, rows, align }: { head: string[]; rows: React.ReactNode[][]; align?: ('left' | 'right' | 'center')[] }) {
  return <KitTable heading={head} content={rows} columnTextAlign={align} />;
}

// "Como funciona" de cada visão: o passo a passo e de onde viriam os dados de verdade.
export function HowItWorks({ view }: { view: ViewMeta }) {
  const [open, setOpen] = useState(true);
  return (
    <div className="w alt" style={{ padding: 16 }}>
      <div className="flex items-center justify-between gap-3">
        <span style={{ fontSize: 15, fontWeight: 700 }}>Como funciona</span>
        <button type="button" className="btn link" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Ocultar' : 'Mostrar'} {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>
      {open && (
        <div className="how">
          <ol>
            {view.steps.map((s) => (
              <li key={s}>
                <span>{s}</span>
              </li>
            ))}
          </ol>
          <div className="data">
            <span className="lbl">De onde viriam os dados de verdade</span>
            <span>
              <span className="have">Já existe:</span> {view.have}
            </span>
            <span>
              <span className="need">Falta:</span> {view.need}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- gráfico de linhas

export interface LineSeries {
  values: (number | null)[];
  color: string;
  label?: string;
  area?: boolean;
}

export function LineChart({
  series,
  xLabels,
  xTicks,
  yMin,
  yMax,
  yTicks,
  formatY = (n) => String(n),
  band,
  markers = [],
  height = 170,
  threshold,
}: {
  series: LineSeries[];
  xLabels: string[];
  xTicks?: number[];
  yMin: number;
  yMax: number;
  yTicks: number[];
  formatY?: (n: number) => string;
  band?: { low: number[]; high: number[] };
  markers?: { index: number; label: string; color: string }[];
  height?: number;
  threshold?: { value: number; label: string };
}) {
  const W = 540;
  const H = height;
  const X0 = 46;
  const X1 = W - 12;
  const Y0 = H - 22;
  const Y1 = markers.length ? 28 : 10;
  const n = Math.max(xLabels.length, band?.low.length ?? 0);
  const x = (i: number) => X0 + (i / Math.max(1, n - 1)) * (X1 - X0);
  const y = (val: number) => Y0 - ((val - yMin) / (yMax - yMin)) * (Y0 - Y1);
  const ticks = xTicks ?? xLabels.map((_, i) => i);
  const font = { fontSize: 10, fill: v.textSecondary };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Gráfico" style={{ display: 'block' }}>
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={X0} x2={X1} y1={y(t)} y2={y(t)} stroke="var(--grid)" />
          <text x={X0 - 6} y={y(t) + 3} textAnchor="end" {...font}>
            {formatY(t)}
          </text>
        </g>
      ))}
      {ticks.map((i) => (
        <text key={i} x={x(i)} y={H - 6} textAnchor="middle" {...font}>
          {xLabels[i]}
        </text>
      ))}
      {band && (
        <path
          d={
            band.high.map((val, i) => `${i ? 'L' : 'M'}${x(i)} ${y(val)}`).join(' ') +
            ' ' +
            band.low
              .map((_, k) => band.low.length - 1 - k)
              .map((i) => `L${x(i)} ${y(band.low[i])}`)
              .join(' ') +
            ' Z'
          }
          fill="var(--blue)"
          fillOpacity={0.16}
        />
      )}
      {threshold && (
        <g>
          <line x1={X0} x2={X1} y1={y(threshold.value)} y2={y(threshold.value)} stroke={v.error} strokeDasharray="4 4" />
          <text x={X1} y={y(threshold.value) - 5} textAnchor="end" fontSize={10} fill={v.error}>
            {threshold.label}
          </text>
        </g>
      )}
      {markers.map((m) => {
        const w = m.label.length * 6 + 14;
        return (
          <g key={m.label}>
            <line x1={x(m.index)} x2={x(m.index)} y1={Y1 - 4} y2={Y0} stroke={m.color} strokeDasharray="3 3" />
            <rect x={x(m.index) - w / 2} y={Y1 - 24} width={w} height={16} rx={8} fill={m.color} />
            <text x={x(m.index)} y={Y1 - 12.5} textAnchor="middle" fontSize={9.5} fontWeight={600} fill="var(--surface)">
              {m.label}
            </text>
          </g>
        );
      })}
      {series.map((s, si) => {
        const pts = s.values.map((val, i) => (val == null ? null : ([x(i), y(val)] as const))).filter((pt): pt is readonly [number, number] => pt != null);
        if (pts.length === 0) return null;
        const d = pts.map((pt, i) => `${i ? 'L' : 'M'}${pt[0]} ${pt[1]}`).join(' ');
        const last = pts[pts.length - 1];
        return (
          <g key={si}>
            {s.area && <path d={`${d} L${last[0]} ${Y0} L${pts[0][0]} ${Y0} Z`} fill={s.color} fillOpacity={0.1} />}
            <path d={d} fill="none" stroke={s.color} strokeWidth={2} />
            <circle cx={last[0]} cy={last[1]} r={4} fill={s.color} />
            {s.label && (
              <text x={last[0] - 8} y={last[1] - 8} textAnchor="end" fontSize={10} fontWeight={600} fill={s.color}>
                {s.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function HBarList({ rows, color = v.brand, unit = '' }: { rows: { label: string; value: number }[]; color?: string; unit?: string }) {
  const top = Math.max(...rows.map((r) => r.value), 1);
  return (
    <Stack space={8}>
      {rows.map((r) => (
        <div key={r.label} className="grid items-center gap-2" style={{ gridTemplateColumns: 'minmax(110px, 1fr) 2fr 80px' }}>
          <Text2 regular truncate>
            {r.label}
          </Text2>
          <div style={{ height: 12, borderRadius: 3, background: color, width: `${(r.value / top) * 100}%` }} />
          <span className="num t1" style={{ textAlign: 'right', color: v.textSecondary }}>
            {r.value.toLocaleString('pt-BR')}
            {unit && ` ${unit}`}
          </span>
        </div>
      ))}
    </Stack>
  );
}

export { v as colors };
