import { ChevronDown, Filter, Check, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

// Plain Tailwind form/button primitives for the Products feature.
// ponytail: Mistica's TextField/Select/Button* need @vanilla-extract/vite-plugin
// wired into vite.config.ts to render styled; without it they ship unstyled.
// Adding that plugin app-wide is out of scope for this fix, so this feature
// uses plain styled controls that match the rest of the app's look instead.

const inputClass =
  'w-full rounded-md border border-[#e4e4e7] bg-white px-3 py-2 text-[13px] text-[#1a1a1a] outline-none box-border transition-colors focus:border-[#019DF4] focus:ring-2 focus:ring-[#019DF4]/15 placeholder:text-[#a1a1aa]';

interface FieldProps {
  label: string;
  helperText?: string;
  optional?: boolean;
  children: ReactNode;
}

export function Field({ label, helperText, optional, children }: FieldProps) {
  return (
    <label className="flex flex-col gap-[6px]">
      <span className="text-[12.5px] font-medium text-[#3f3f46]">
        {label}
        {!optional && <span className="ml-[2px] text-[#dc2626]">*</span>}
        {optional && <span className="ml-1 font-normal text-[#a1a1aa]">(opcional)</span>}
      </span>
      {children}
      {helperText && <span className="text-[11.5px] text-[#a1a1aa]">{helperText}</span>}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={inputClass} />;
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={`${inputClass} resize-none`} />;
}

export function SelectInput({ children, className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...rest} className={`${inputClass} appearance-none pr-8 ${className ?? ''}`}>
        {children}
      </select>
      <ChevronDown size={14} className="absolute right-[10px] top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
    </div>
  );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
}

export function PrimaryButton({ loading, disabled, children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled || loading}
      className={`inline-flex items-center gap-[6px] rounded-md bg-[#019DF4] px-4 py-2 text-[13px] font-medium text-white border-0 cursor-pointer transition-colors hover:bg-[#0284d1] disabled:opacity-50 disabled:cursor-not-allowed ${className ?? ''}`}
    >
      {loading && <Loader2 size={14} className="animate-spin" />}
      {children}
    </button>
  );
}

export function SecondaryButton({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`inline-flex items-center gap-[6px] rounded-md bg-white border border-[#e4e4e7] px-4 py-2 text-[13px] font-medium text-[#3f3f46] cursor-pointer transition-colors hover:bg-[#f4f4f5] ${className ?? ''}`}
    >
      {children}
    </button>
  );
}

export function LinkButton({ children, className, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      className={`text-[12.5px] font-medium text-[#019DF4] bg-transparent border-0 p-0 cursor-pointer hover:text-[#0284d1] hover:underline ${className ?? ''}`}
    >
      {children}
    </button>
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

export function FilterDropdown({ label, options, value, onChange }: FilterDropdownProps) {
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
          borderColor: isDefault ? '#e4e4e7' : '#019DF4',
          background: isDefault ? '#fff' : '#eff8ff',
          color: isDefault ? '#3f3f46' : '#019DF4',
        }}
      >
        <Filter size={14} />
        {isDefault ? label : current?.label}
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-20 w-[180px] rounded-lg border border-[#e4e4e7] bg-white shadow-[0_12px_32px_-10px_rgba(0,0,0,.2)] py-1 animate-[modal-panel-in_140ms_cubic-bezier(0.16,1,0.3,1)]">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-[8px] text-[13px] text-left bg-transparent border-0 cursor-pointer hover:bg-[#f4f4f5]"
              style={{ color: o.value === value ? '#019DF4' : '#3f3f46' }}
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
    <span
      className="shrink-0 inline-flex items-center rounded-full px-[10px] py-[3px] text-[11.5px] font-medium"
      style={{
        background: active ? '#f0fdf4' : '#f4f4f5',
        color: active ? '#15803d' : '#71717a',
      }}
    >
      {active ? 'Ativo' : 'Inativo'}
    </span>
  );
}
