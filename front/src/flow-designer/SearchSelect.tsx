import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useFlowTheme } from './theme';
import { gridInputStyle } from './PropertyGrid';

export interface DropdownRect {
  left: number;
  width: number;
  maxHeight: number;
  top?: number;
  bottom?: number;
}

// Mesma lógica de posicionamento de FormSearchSelect (PropertiesPanel.tsx) — lê a posição atual do
// input na tela e escolhe o lado (abaixo/acima) com mais espaço, sem piso mínimo de altura, pra não
// estourar a borda de uma janela curta.
export function computeDropdownRect(input: HTMLElement): DropdownRect {
  const r = input.getBoundingClientRect();
  const margin = 8;
  const gap = 4;
  const spaceBelow = window.innerHeight - r.bottom - margin;
  const spaceAbove = r.top - margin;
  const width = Math.max(r.width, 220);
  const placeBelow = spaceBelow >= spaceAbove;
  const maxHeight = Math.min(240, Math.max(0, placeBelow ? spaceBelow : spaceAbove));
  return placeBelow
    ? { left: r.left, width, top: r.bottom + gap, maxHeight }
    : { left: r.left, width, bottom: window.innerHeight - r.top + gap, maxHeight };
}

interface Props<T> {
  items: T[];
  getId: (item: T) => string;
  getLabel: (item: T) => string;
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  noneLabel?: string;
  emptyLabel?: string;
  extraActions?: React.ReactNode;
  // Quando true, aceita um valor que não está em `items` (digitado e confirmado com Enter ou ao
  // clicar fora) em vez de só permitir escolher um item da lista — usado pelo seletor de tópico
  // Kafka (US-03.09), que sugere tópicos reais do broker mas não pode bloquear um nome que ainda
  // não existe ou que veio de uma jornada já salva antes dessa lista existir.
  allowCustomValue?: boolean;
  // Sobrescreve o estilo compacto de grade (gridInputStyle) padrão — usado onde este seletor aparece
  // fora de uma linha de PropertyGrid (ex.: ConnectorWizard), pra bater com a fonte/padding dos
  // outros campos daquela tela em vez de destoar com o visual apertado de tabela.
  inputStyle?: React.CSSProperties;
}

// Seletor pesquisável genérico: portal pro document.body (o mesmo motivo de sempre nesse painel —
// o container do PropertiesDock recorta qualquer popover mais alto que a fresta lateral), reabre
// posição no scroll/resize em vez de fechar, abre por foco ou mousedown. Generalização de
// FormSearchSelect (PropertiesPanel.tsx) parametrizada por {id, label} em vez de acoplada a Form —
// usada pelos seletores de cluster/credencial do catálogo (FT-14).
export function SearchSelect<T>({
  items,
  getId,
  getLabel,
  value,
  onChange,
  placeholder,
  noneLabel = 'Nenhum',
  emptyLabel = 'Nenhum resultado encontrado',
  extraActions,
  allowCustomValue = false,
  inputStyle,
}: Props<T>) {
  const { c } = useFlowTheme();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [rect, setRect] = useState<DropdownRect | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = items.find((item) => getId(item) === value) ?? null;
  // Sem correspondência em `items` não é necessariamente vazio quando aceita valor customizado — é
  // o caso normal de um tópico digitado antes de existir no broker, ou salvo antes dessa listagem.
  const displayValue = selected ? getLabel(selected) : allowCustomValue ? (value ?? '') : '';

  function openDropdown() {
    if (inputRef.current) setRect(computeDropdownRect(inputRef.current));
    setOpen(true);
    setQuery('');
  }

  function closeDropdown(commitTyped: boolean) {
    if (commitTyped && allowCustomValue) {
      const trimmed = query.trim();
      if (trimmed && trimmed !== displayValue) onChange(trimmed);
    }
    setOpen(false);
    setQuery('');
  }

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (containerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      closeDropdown(true);
    }
    function reposition() {
      if (inputRef.current) setRect(computeDropdownRect(inputRef.current));
    }
    window.addEventListener('mousedown', handleClick, true);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      window.removeEventListener('mousedown', handleClick, true);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query]);

  const filtered = query.trim()
    ? items.filter((item) => getLabel(item).toLowerCase().includes(query.trim().toLowerCase()))
    : items;

  const itemStyle: React.CSSProperties = {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '6px 8px',
    border: 'none',
    background: 'transparent',
    fontSize: 12.5,
    cursor: 'pointer',
    borderRadius: 5,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  return (
    <div ref={containerRef} style={{ display: 'flex', gap: 4, width: '100%' }}>
      <input
        ref={inputRef}
        style={{ ...(inputStyle ?? gridInputStyle(c)), cursor: 'text', flex: 1 }}
        value={open ? query : displayValue}
        placeholder={displayValue ? undefined : (placeholder ?? 'Nenhum')}
        onFocus={openDropdown}
        onMouseDown={openDropdown}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') closeDropdown(true);
        }}
      />
      {extraActions}
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            style={{
              position: 'fixed',
              left: rect.left,
              ...(rect.top !== undefined ? { top: rect.top } : { bottom: rect.bottom }),
              width: rect.width,
              zIndex: 2000,
              maxHeight: rect.maxHeight,
              overflowY: 'auto',
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              borderRadius: 8,
              boxShadow: '0 12px 32px -10px rgba(0,0,0,.35)',
              padding: 4,
            }}
          >
            <button
              type="button"
              onClick={() => {
                onChange(null);
                setOpen(false);
                setQuery('');
              }}
              style={{ ...itemStyle, color: c.textSecondary, borderBottom: `1px solid ${c.border}`, marginBottom: 2, borderRadius: 0 }}
              onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {noneLabel}
            </button>
            {filtered.length === 0 && (
              <div style={{ padding: '6px 8px', fontSize: 12, color: c.textSecondary }}>{emptyLabel}</div>
            )}
            {filtered.map((item) => {
              const id = getId(item);
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => {
                    onChange(id);
                    setOpen(false);
                    setQuery('');
                  }}
                  title={getLabel(item)}
                  style={{ ...itemStyle, color: c.textPrimary, fontWeight: id === value ? 600 : 400 }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  {getLabel(item)}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}
