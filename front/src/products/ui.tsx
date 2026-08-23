import { ChevronDown, Filter, Check, Loader2, MoreVertical } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ComponentType, ReactNode } from 'react';
import { createPortal } from 'react-dom';
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

export function TextInput({ style, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  const { colors: c } = useAppTheme();
  return <input {...props} style={{ ...fieldInputStyle(c), ...style }} />;
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
        {label}: {current?.label ?? label}
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

export interface MenuAction {
  icon: ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
  loading?: boolean;
}

function menuActionColor(c: AppColors, variant: MenuAction['variant']): string {
  switch (variant) {
    case 'danger':
      return c.danger;
    case 'warning':
      return c.warning;
    case 'success':
      return c.success;
    default:
      return c.textPrimary;
  }
}

// Reaproveita o mesmo problema de clipping do SearchSelect (flow-designer): a tabela que hospeda
// isso tem overflow-hidden nos ancestrais, então o menu precisa escapar via portal + position:fixed
// (regra do impeccable) em vez de position:absolute normal. Sempre alinhado à direita do gatilho —
// suficiente aqui porque o botão vive sempre na última coluna (borda direita da tabela).
interface MenuRect {
  right: number;
  width: number;
  top?: number;
  bottom?: number;
}

function computeMenuRect(trigger: HTMLElement, width: number): MenuRect {
  const r = trigger.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - margin;
  const spaceAbove = r.top - margin;
  const placeBelow = spaceBelow >= spaceAbove;
  return {
    right: window.innerWidth - r.right,
    width,
    ...(placeBelow ? { top: r.bottom + gap } : { bottom: window.innerHeight - r.top + gap }),
  };
}

// Substitui uma fileira de botões de ícone soltos por um único gatilho "⋮" com menu — mesmo padrão
// de Linear/Notion pra ações de linha de tabela, menos ruído visual que N ícones lado a lado.
export function ActionsMenu({ actions, label = 'Mais ações' }: { actions: MenuAction[]; label?: string }) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<ReturnType<typeof computeMenuRect> | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const width = 208;

  function openMenu() {
    if (triggerRef.current) setRect(computeMenuRect(triggerRef.current, width));
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    function reposition() {
      if (triggerRef.current) setRect(computeMenuRect(triggerRef.current, width));
    }
    window.addEventListener('mousedown', handleClick, true);
    window.addEventListener('keydown', handleKey);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('mousedown', handleClick, true);
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openMenu())}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer"
        style={{ color: open ? c.textPrimary : c.textSecondary, background: open ? c.hoverBg : 'transparent' }}
        onMouseEnter={(e) => {
          if (!open) e.currentTarget.style.background = c.hoverBg;
        }}
        onMouseLeave={(e) => {
          if (!open) e.currentTarget.style.background = 'transparent';
        }}
      >
        <MoreVertical size={16} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            className="fixed z-[2000] py-1 rounded-lg animate-[modal-panel-in_140ms_cubic-bezier(0.16,1,0.3,1)]"
            style={{
              right: rect.right,
              width: rect.width,
              ...(rect.top !== undefined ? { top: rect.top } : { bottom: rect.bottom }),
              background: c.surface,
              border: `1px solid ${c.border}`,
              boxShadow: `0 12px 32px -10px ${c.shadow}`,
            }}
          >
            {actions.map((action, i) => {
              const prevVariant = actions[i - 1]?.variant;
              const showDivider = action.variant === 'danger' && prevVariant !== 'danger' && i > 0;
              const color = menuActionColor(c, action.variant);
              const Icon = action.icon;
              return (
                <div key={action.label}>
                  {showDivider && <div className="my-1 h-px" style={{ background: c.border }} />}
                  <button
                    type="button"
                    role="menuitem"
                    disabled={action.disabled || action.loading}
                    title={action.disabled ? action.label : undefined}
                    onClick={() => {
                      setOpen(false);
                      action.onClick();
                    }}
                    className="w-full flex items-center gap-[10px] px-3 py-[8px] text-[13px] text-left border-0 bg-transparent cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                    style={{ color }}
                    onMouseEnter={(e) => {
                      if (!action.disabled && !action.loading) e.currentTarget.style.background = c.hoverBg;
                    }}
                    onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                  >
                    {action.loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
                    {action.label}
                  </button>
                </div>
              );
            })}
          </div>,
          document.body,
        )}
    </>
  );
}

export function StatusTag({ active }: { active: boolean }) {
  return (
    <Tag type={active ? 'active' : 'inactive'} small>
      {active ? 'Ativo' : 'Inativo'}
    </Tag>
  );
}
