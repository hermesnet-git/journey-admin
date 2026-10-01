import { useEffect, useMemo, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_ICON, NODE_META, TYPE_COLOR, type NodeType } from './model';

interface Props {
  nodes: { id: string; type: NodeType; name: string }[];
  onPick: (nodeId: string) => void;
  onClose: () => void;
}

const normalize = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

// Busca de etapa (Ctrl+F), no próprio campo "Buscar etapa" da barra de navegação: digita e a lista
// abre logo abaixo; Enter ou clique leva até a etapa.
export function NodeSearch({ nodes, onPick, onClose }: Props) {
  const { c } = useFlowTheme();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => inputRef.current?.focus(), []);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const list = q ? nodes.filter((n) => normalize(`${n.name} ${NODE_META[n.type].title}`).includes(q)) : nodes;
    return list.slice(0, 8);
  }, [nodes, query]);

  const pick = (id: string) => {
    onPick(id);
    onClose();
  };

  return (
    <div className="relative">
      <div
        className="h-[32px] px-[10px] rounded-lg flex items-center gap-[8px] min-w-[260px]"
        style={{ background: c.cardBg, border: `1px solid ${c.accent}` }}
      >
        <Search size={13} style={{ color: c.textSecondary }} />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Escape') onClose();
            else if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((i) => Math.min(i + 1, results.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((i) => Math.max(i - 1, 0));
            } else if (e.key === 'Enter' && results[active]) pick(results[active].id);
          }}
          onBlur={() => setTimeout(onClose, 150)}
          placeholder="Nome ou tipo da etapa"
          aria-label="Buscar etapa"
          className="flex-1 min-w-0 text-[12.5px] bg-transparent border-0 outline-none"
          style={{ color: c.textPrimary }}
        />
        <kbd
          className="text-[10.5px] font-medium px-[5px] rounded-[4px] leading-[16px]"
          style={{ color: c.textSecondary, background: c.hoverBg, border: `1px solid ${c.border}`, fontFamily: 'inherit' }}
        >
          Esc
        </kbd>
      </div>
      {(results.length > 0 || query.trim()) && (
        <div
          className="absolute left-0 top-[38px] w-[320px] rounded-lg overflow-hidden py-[4px]"
          style={{ background: c.cardBg, border: `1px solid ${c.border}`, boxShadow: '0 8px 24px rgba(0,0,0,.2)' }}
        >
          {results.map((n, i) => {
            const Icon = NODE_ICON[n.type];
            return (
              <button
                key={n.id}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(n.id)}
                onMouseEnter={() => setActive(i)}
                className="w-full flex items-center gap-[8px] px-[12px] py-[7px] text-left border-0 cursor-pointer"
                style={{ background: i === active ? c.hoverBg : 'transparent' }}
              >
                <Icon size={14} color={TYPE_COLOR[n.type]} />
                <span className="flex-1 truncate text-[12.5px]" style={{ color: c.textPrimary }}>
                  {n.name || NODE_META[n.type].title}
                </span>
                <span className="text-[10.5px]" style={{ color: c.textSecondary }}>
                  {NODE_META[n.type].title}
                </span>
              </button>
            );
          })}
          {query.trim() && results.length === 0 && (
            <div className="px-[12px] py-[8px] text-[12px]" style={{ color: c.textSecondary }}>
              Nenhuma etapa encontrada
            </div>
          )}
        </div>
      )}
    </div>
  );
}
