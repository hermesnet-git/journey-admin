// Componentes visuais da prévia do novo Dashboard, no visual da página de esboços (preview.css).
// Mantêm os nomes e as propriedades dos componentes da Mística que as visões já usavam, para trocar
// só a importação. As cores vêm das variáveis de .dpv (claro/escuro).
import { useEffect, useId } from 'react';
import './preview.css';

// Nomes iguais aos de skinVars.colors, apontando para os tokens da página de esboços.
export const colors = {
  brand: 'var(--accent)',
  brandLow: 'var(--accent-soft)',
  brandHigh: 'color-mix(in srgb, var(--accent) 60%, var(--grid))',
  textPrimary: 'var(--ink)',
  textSecondary: 'var(--muted)',
  textPrimaryInverse: 'var(--surface)',
  textLink: 'var(--accent)',
  textBrand: 'var(--accent)',
  border: 'var(--line)',
  borderSelected: 'var(--accent)',
  divider: 'var(--line)',
  background: 'var(--bg)',
  backgroundContainer: 'var(--surface)',
  backgroundContainerAlternative: 'var(--surface-2)',
  backgroundContainerHover: 'var(--accent-soft)',
  barTrack: 'var(--grid)',
  error: 'var(--bad)',
  errorLow: 'var(--bad-soft)',
  warning: 'var(--warn)',
  warningHigh: 'var(--warn)',
  warningLow: 'var(--warn-soft)',
  success: 'var(--good)',
  successHigh: 'var(--good)',
  successLow: 'var(--good-soft)',
  neutralMedium: 'var(--muted)',
  neutralHigh: 'var(--ink)',
  tagTextPromo: 'var(--biz)',
  tagTextInfo: 'var(--ops)',
  blue: 'var(--blue)',
  blueLow: 'var(--blue-soft)',
};

// Fontes da página de esboços, carregadas uma vez quando a prévia abre.
export function usePreviewFonts() {
  useEffect(() => {
    const id = 'dpv-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700&family=Hanken+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap';
    document.head.appendChild(link);
  }, []);
}

// ---------------------------------------------------------------- texto

interface TextProps {
  children?: React.ReactNode;
  regular?: boolean;
  medium?: boolean;
  color?: string;
  truncate?: boolean;
  textAlign?: 'left' | 'right' | 'center';
  transform?: 'uppercase' | 'none';
  mono?: boolean;
}

function textStyle({ medium, color, textAlign, transform, mono }: TextProps, base: React.CSSProperties = {}): React.CSSProperties {
  return {
    ...base,
    fontWeight: medium ? 600 : base.fontWeight,
    color,
    textAlign,
    textTransform: transform,
    letterSpacing: transform === 'uppercase' ? '0.1em' : undefined,
    fontFamily: mono ? 'var(--f-data)' : undefined,
    display: 'block',
    minWidth: 0,
  };
}

export const Text1 = (p: TextProps) => (
  <span className={`t1${p.truncate ? ' truncate' : ''}`} style={textStyle(p, p.transform === 'uppercase' ? { fontSize: 11 } : {})}>
    {p.children}
  </span>
);
export const Text2 = (p: TextProps) => (
  <span className={`t2${p.truncate ? ' truncate' : ''}`} style={textStyle(p)}>
    {p.children}
  </span>
);
export const Text3 = (p: TextProps) => (
  <span className={`t3${p.truncate ? ' truncate' : ''}`} style={textStyle(p, { fontWeight: 600 })}>
    {p.children}
  </span>
);
export const Text6 = (p: TextProps) => (
  <span className="big" style={textStyle(p)}>
    {p.children}
  </span>
);
export const Title2 = ({ children }: { children: React.ReactNode }) => <h1 style={{ fontSize: 34, lineHeight: 1.05 }}>{children}</h1>;

// ---------------------------------------------------------------- layout

export const Stack = ({ space, children }: { space: number; children: React.ReactNode }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: space, minWidth: 0 }}>{children}</div>
);
export const Inline = ({
  space,
  children,
  alignItems,
  wrap,
}: {
  space: number;
  children: React.ReactNode;
  alignItems?: React.CSSProperties['alignItems'];
  wrap?: boolean;
}) => <div style={{ display: 'flex', gap: space, alignItems: alignItems ?? 'stretch', flexWrap: wrap ? 'wrap' : 'nowrap', minWidth: 0 }}>{children}</div>;

export const Boxed = ({ children, variant }: { children: React.ReactNode; variant?: 'default' | 'alternative' }) => (
  <div className={`w${variant === 'alternative' ? ' alt' : ''}`} style={{ padding: 0, display: 'block' }}>
    {children}
  </div>
);
export const Box = ({ children, padding }: { children: React.ReactNode; padding?: number }) => <div style={{ padding }}>{children}</div>;

// ---------------------------------------------------------------- etiquetas, chips e botões

const TAG_CLASS = { success: 'good', error: 'bad', warning: 'warn', active: 'acc', inactive: 'mute', info: 'blue', promo: 'acc' } as const;
export function Tag({ type = 'inactive', children }: { type?: keyof typeof TAG_CLASS; children: string; small?: boolean }) {
  return <span className={`pill ${TAG_CLASS[type]}`}>{children}</span>;
}

export function Chip({ children, active, onPress }: { children: React.ReactNode; active?: boolean; onPress?: () => void; small?: boolean }) {
  return (
    <button type="button" className={`chip${active ? ' on' : ''}`} onClick={onPress} aria-pressed={active}>
      {children}
    </button>
  );
}

// Grupo de opções exclusivas (o "Cor por: Sucesso | Incidentes | Variação" da página de esboços).
export function Seg<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" className={o.value === value ? 'on' : ''} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

interface BtnProps {
  children: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
  small?: boolean;
}
const button = (cls: string) =>
  function Button({ children, onPress, disabled, small }: BtnProps) {
    return (
      <button type="button" className={`btn ${cls}${small ? '' : ' big-btn'}`} onClick={onPress} disabled={disabled}>
        {children}
      </button>
    );
  };
export const ButtonPrimary = button('primary');
export const ButtonSecondary = button('');
export const ButtonDanger = button('danger');
export const ButtonLink = button('link');

export function Avatar({ initials }: { initials?: string; size?: number }) {
  return <span className="avatar">{initials}</span>;
}

// ---------------------------------------------------------------- campos

interface FieldProps {
  name: string;
  label: string;
  value?: string;
  onChangeValue?: (value: string) => void;
  fullWidth?: boolean;
}

export function TextField({ name, label, value, onChangeValue }: FieldProps) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <input id={id} name={name} value={value} onChange={(e) => onChangeValue?.(e.target.value)} />
    </label>
  );
}
export function IntegerField(p: FieldProps) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{p.label}</span>
      <input id={id} name={p.name} inputMode="numeric" value={p.value} onChange={(e) => p.onChangeValue?.(e.target.value.replace(/\D/g, ''))} />
    </label>
  );
}
export const DecimalField = TextField;

export function Select({ name, label, value, onChangeValue, options }: FieldProps & { options: ReadonlyArray<{ value: string; text: string }> }) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <select id={id} name={name} value={value} onChange={(e) => onChangeValue?.(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.text}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Slider({
  name,
  min,
  max,
  step,
  value,
  disabled,
  onChangeValue,
  'aria-label': ariaLabel,
}: {
  name: string;
  min: number;
  max: number;
  step: number;
  value: number;
  disabled?: boolean;
  onChangeValue: (n: number) => void;
  'aria-label'?: string;
  tooltip?: boolean;
}) {
  return (
    <input type="range" name={name} min={min} max={max} step={step} value={value} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onChangeValue(Number(e.target.value))} />
  );
}

export function Switch({ name, checked, onChange, children }: { name: string; checked: boolean; onChange: (checked: boolean) => void; children?: React.ReactNode }) {
  return (
    <label className="switch">
      <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <i />
      <span>{children}</span>
    </label>
  );
}

// ---------------------------------------------------------------- abas

export function Tabs({
  selectedIndex,
  onChange,
  tabs,
}: {
  selectedIndex: number;
  onChange: (i: number) => void;
  tabs: ReadonlyArray<{ text: string; dot?: string }>;
}) {
  return (
    <div className="vtabs" role="tablist">
      {tabs.map((t, i) => (
        <button key={t.text + i} type="button" role="tab" aria-selected={i === selectedIndex} className={i === selectedIndex ? 'on' : ''} onClick={() => onChange(i)}>
          {t.dot && <i style={{ background: t.dot }} />}
          {t.text}
        </button>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- tabela

export function Table({
  heading,
  content,
  columnTextAlign,
}: {
  heading: React.ReactNode[];
  content: React.ReactNode[][];
  columnTextAlign?: ('left' | 'right' | 'center')[];
  responsive?: string;
  fullWidth?: boolean;
}) {
  const align = (i: number) => columnTextAlign?.[i] ?? 'left';
  return (
    <div className="tbl">
      <table>
        <thead>
          <tr>
            {heading.map((h, i) => (
              <th key={i} style={{ textAlign: align(i) }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {content.map((row, r) => (
            <tr key={r}>
              {row.map((cell, i) => (
                <td key={i} style={{ textAlign: align(i) }} className={typeof cell === 'string' && /^[\d.,\s%−+—-]+(ms|s|h|%| mil)?$/.test(cell) ? 'num' : undefined}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
