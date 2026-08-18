import { useState } from 'react';
import { useFlowTheme, type FlowColors } from './theme';

// Backdrop click-to-close, robust against drag-select: dragging to select text that starts inside
// the panel and releasing (mouseup) over the backdrop produces a click event whose target
// normalizes to the backdrop — same as a genuine backdrop click — so checking only the click's own
// target can't tell the two apart. Recording where the *mousedown* happened (before any drag can
// muddy things) can. Spread the returned handlers onto the fixed/inset-0 backdrop div.
export function useBackdropClose(onClose: () => void) {
  const [mouseDownOnBackdrop, setMouseDownOnBackdrop] = useState(false);
  return {
    onMouseDown: (e: React.MouseEvent) => setMouseDownOnBackdrop(e.target === e.currentTarget),
    onClick: () => {
      if (mouseDownOnBackdrop) onClose();
      setMouseDownOnBackdrop(false);
    },
  };
}

// Shared object-inspector-style property grid: label cell on the left, typed value on the
// right, thin uniform rows. Used across every "properties" panel in the journey editor
// (node properties, journey data) so they read as one consistent grid instead of stacked forms.

// Tighter input used inside PropertyRow cells — the grid reads as a real property table (thin,
// uniform rows) instead of stacked form fields, so it drops the roomier padding/radius of a
// regular form input.
export const gridInputStyle = (c: FlowColors): React.CSSProperties => ({
  width: '100%',
  padding: '3px 6px',
  borderRadius: 4,
  border: `1px solid ${c.border}`,
  background: c.cardBg,
  color: c.textPrimary,
  fontSize: 12,
  outline: 'none',
  boxSizing: 'border-box',
  height: 24,
});

const ROW_HEIGHT = 26;

export function PropertyGrid({ children }: { children: React.ReactNode }) {
  const { c } = useFlowTheme();
  return (
    <div style={{ border: `1px solid ${c.border}`, borderRadius: 6, overflow: 'hidden', marginBottom: 10, fontSize: 12 }}>
      {children}
    </div>
  );
}

export function PropertyRow({ label, first, children }: { label: string; first?: boolean; children: React.ReactNode }) {
  const { c } = useFlowTheme();
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '88px 1fr', minHeight: ROW_HEIGHT, borderTop: first ? 'none' : `1px solid ${c.border}` }}>
      <div
        style={{
          padding: '0 8px',
          fontSize: 11,
          fontWeight: 600,
          color: c.textSecondary,
          background: c.canvasBg,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        {label}
      </div>
      <div style={{ padding: '2px 6px', display: 'flex', alignItems: 'center', minWidth: 0 }}>{children}</div>
    </div>
  );
}

// Bold category divider (Data/Layout-style object-inspector grouping) spanning the full row width.
export function PropertyGroupHeader({ label, first }: { label: string; first?: boolean }) {
  const { c } = useFlowTheme();
  return (
    <div
      style={{
        padding: '3px 8px',
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.4,
        textTransform: 'uppercase',
        color: c.textSecondary,
        background: c.hoverBg,
        borderTop: first ? 'none' : `1px solid ${c.border}`,
      }}
    >
      {label}
    </div>
  );
}

// Generic centered dialog, shared by every "..." row editor and the connector test panel.
export function Modal({ title, onClose, width = 420, children }: { title: string; onClose: () => void; width?: number; children: React.ReactNode }) {
  const { c } = useFlowTheme();
  const backdrop = useBackdropClose(onClose);
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      {...backdrop}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width, maxHeight: '80vh', overflowY: 'auto', background: c.cardBg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 18 }}
      >
        <div style={{ fontSize: 15, fontWeight: 700, color: c.textPrimary, marginBottom: 12 }}>{title}</div>
        {children}
        <button
          onClick={onClose}
          style={{ width: '100%', marginTop: 12, padding: 9, borderRadius: 8, border: `1px solid ${c.border}`, background: 'none', color: c.textSecondary, cursor: 'pointer' }}
        >
          Fechar
        </button>
      </div>
    </div>
  );
}
