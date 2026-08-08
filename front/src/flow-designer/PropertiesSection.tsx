import { ChevronDown } from 'lucide-react';
import { useFlowTheme } from './theme';

// Card-style section (bordered container + accent-striped header) so the
// different property groups (Informações Gerais, Conector, Dados da jornada...)
// read as visually distinct blocks, not just a flat list of collapsibles.
export function Section({
  title,
  open,
  onToggle,
  children,
}: {
  title: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  const { c } = useFlowTheme();
  return (
    <div
      style={{
        marginBottom: 14,
        borderRadius: 10,
        border: `1px solid ${c.border}`,
        overflow: 'hidden',
        background: c.cardBg,
      }}
    >
      <button
        onClick={onToggle}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: c.chipBg,
          borderLeft: `3px solid ${c.accent}`,
          borderTop: 'none',
          borderRight: 'none',
          borderBottom: 'none',
          padding: '10px 12px',
          cursor: 'pointer',
          color: c.textPrimary,
          fontSize: 13.5,
          fontWeight: 700,
        }}
      >
        {title}
        <ChevronDown size={15} style={{ transform: open ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }} />
      </button>
      {open && <div style={{ padding: 14 }}>{children}</div>}
    </div>
  );
}
