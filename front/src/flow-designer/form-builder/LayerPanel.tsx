import { useState } from 'react';
import { ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { useFlowTheme } from '../theme';
import type { SduiNode } from '../../sdui/model';
import { iconFor, labelFor } from '../../sdui/componentMeta';

function LayerRow({
  node,
  depth,
  isRoot,
  selectedId,
  onSelect,
  onMove,
}: {
  node: SduiNode;
  depth: number;
  isRoot?: boolean;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);
  const Icon = iconFor(node.type);
  const children = node.children ?? [];
  const hasChildren = children.length > 0;
  const selected = selectedId === node.id;

  return (
    <div>
      <div
        onClick={() => onSelect(node.id)}
        className="flex items-center gap-1 px-1 rounded cursor-pointer"
        style={{ height: 24, marginLeft: depth * 12, background: selected ? c.hoverBg : 'transparent' }}
      >
        {hasChildren ? (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setCollapsed((v) => !v);
            }}
            className="w-[14px] h-[14px] flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
            style={{ color: c.textSecondary }}
          >
            {collapsed ? <ChevronRight size={11} /> : <ChevronDown size={11} />}
          </button>
        ) : (
          <span style={{ width: 14 }} />
        )}
        <Icon size={11} color={c.accent} strokeWidth={1.8} />
        <span className="text-[11px] flex-1 truncate" style={{ color: c.textPrimary }}>
          {labelFor(node.type)}
        </span>
        {!isRoot && (
          <div className="flex gap-[2px] shrink-0">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove(node.id, 'up');
              }}
              title="Mover pra cima"
              className="w-[16px] h-[16px] flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ color: c.textSecondary }}
            >
              <ArrowUp size={10} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMove(node.id, 'down');
              }}
              title="Mover pra baixo"
              className="w-[16px] h-[16px] flex items-center justify-center border-0 bg-transparent cursor-pointer"
              style={{ color: c.textSecondary }}
            >
              <ArrowDown size={10} />
            </button>
          </div>
        )}
      </div>
      {hasChildren && !collapsed && (
        <div>
          {children.map((child) => (
            <LayerRow key={child.id} node={child} depth={depth + 1} selectedId={selectedId} onSelect={onSelect} onMove={onMove} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Árvore de camadas — sucessora de FormScreenLayersPanel.tsx (que era lista linear, sem
 * aninhamento). Subir/descer reordena o nó dentro dos filhos do MESMO pai (não muda de pai) —
 * cobre reordenar dentro de um nível sem precisar do drag-and-drop do canvas fazer isso também. */
export function LayerPanel({
  root,
  selectedId,
  onSelect,
  onMove,
}: {
  root: SduiNode;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onMove: (id: string, direction: 'up' | 'down') => void;
}) {
  const { c } = useFlowTheme();
  return (
    <div className="flex flex-col h-full overflow-y-auto p-2" style={{ width: 180, borderLeft: `1px solid ${c.border}`, background: c.cardBg }}>
      <div className="px-1 py-1 text-[10.5px] font-bold uppercase tracking-wide" style={{ color: c.textSecondary }}>
        Camadas
      </div>
      <LayerRow node={root} depth={0} isRoot selectedId={selectedId} onSelect={onSelect} onMove={onMove} />
    </div>
  );
}
