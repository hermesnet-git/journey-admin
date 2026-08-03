import { ChevronDown, Filter, Check } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ButtonPrimary, ButtonSecondary, ButtonLink, Tag } from '@telefonica/mistica';
import { useAppTheme, type AppColors } from '../shell/theme';

interface FieldProps {
  label: string;
  helperText?: string;
  optional?: boolean;
  children: ReactNode;
}

// Matches the flow-designer PropertiesPanel field style (label above, plain input).
const fieldLabelStyle = (c: AppColors): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: c.textSecondary,
  marginBottom: 6,
});

export function Field({ label, helperText, optional, children }: FieldProps) {
  const { colors: c } = useAppTheme();
  return (
    <label className="flex flex-col">
      <span style={fieldLabelStyle(c)}>
        {label}
        {!optional && <span className="ml-[2px]" style={{ color: c.danger }}>*</span>}
        {optional && <span className="ml-1 font-normal" style={{ color: c.textMuted }}>(opcional)</span>}
      </span>
      {children}
      {helperText && <span className="text-[11.5px] mt-[6px]" style={{ color: c.textMuted }}>{helperText}</span>}
    </label>
  );
}

const fieldInputStyle = (c: AppColors): React.CSSProperties => ({
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: `1px solid ${c.border}`,
  background: c.surface,
  color: c.textPrimary,
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
  fontFamily: 'inherit',
});

export function ErrorBanner({ children }: { children: ReactNode }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="rounded-lg px-3 py-2 text-[12.5px]"
      style={{ background: c.dangerSoft, border: `1px solid ${c.dangerBorder}`, color: c.danger }}
    >
      {children}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { colors: c } = useAppTheme();
  return <input {...props} style={fieldInputStyle(c)} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { colors: c } = useAppTheme();
  return <textarea {...props} style={{ ...fieldInputStyle(c), minHeight: 70, resize: 'vertical' }} />;
}

export function SelectInput(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { colors: c } = useAppTheme();
  return (
    <select {...props} style={{ ...fieldInputStyle(c), cursor: 'pointer' }}>
      {props.children}
    </select>
  );
}

interface AppButtonProps {
  children: ReactNode;
  onClick?: (e: React.MouseEvent) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function PrimaryButton({ onClick, disabled, loading, children }: AppButtonProps) {
  return (
    <ButtonPrimary small onPress={onClick ?? (() => {})} disabled={disabled} showSpinner={loading}>
      {children}
    </ButtonPrimary>
  );
}

export function SecondaryButton({ onClick, disabled, children }: AppButtonProps) {
  return (
    <ButtonSecondary small onPress={onClick ?? (() => {})} disabled={disabled}>
      {children}
    </ButtonSecondary>
  );
}

export function LinkButton({ onClick, disabled, children }: AppButtonProps) {
  return (
    <ButtonLink small onPress={onClick ?? (() => {})} disabled={disabled}>
      {children}
    </ButtonLink>
  );
}

export interface FilterOption {
  value: string;
  label: string;
}

interface FilterDropdownProps {
  label: string;
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

// No direct Mística equivalent for this filter-chip-with-checkmark combo, so
// it stays a custom control (styled to match the app, same as before).
export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = options.find((o) => o.value === value);
  const isDefault = !value;

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('mousedown', handleClick);
      window.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-[6px] rounded-md border px-3 py-2 text-[13px] font-medium cursor-pointer transition-colors"
        style={{
          borderColor: isDefault ? c.border : c.accent,
          background: isDefault ? c.surface : c.accentSoft,
          color: isDefault ? c.textPrimary : c.accent,
        }}
      >
        <Filter size={14} />
        {isDefault ? label : current?.label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div
          className="absolute right-0 top-[calc(100%+6px)] z-20 w-[180px] rounded-lg py-1 animate-[modal-panel-in_140ms_cubic-bezier(0.16,1,0.3,1)]"
          style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -10px ${c.shadow}` }}
        >
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-[8px] text-[13px] text-left bg-transparent border-0 cursor-pointer"
              style={{ color: o.value === value ? c.accent : c.textPrimary }}
              onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {o.label}
              {o.value === value && <Check size={14} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function StatusTag({ active }: { active: boolean }) {
  return (
    <Tag type={active ? 'active' : 'inactive'} small>
      {active ? 'Ativo' : 'Inativo'}
    </Tag>
  );
}
