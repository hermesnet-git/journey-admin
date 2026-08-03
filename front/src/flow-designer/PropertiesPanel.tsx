import { useState } from 'react';
import { ChevronDown, X } from 'lucide-react';
import { useFlowTheme, type FlowColors } from './theme';
import { NODE_META, type WFNode, type WFNodeData } from './model';

// Ported from wf-designer's PropertiesPanel.tsx, kept visually faithful
// (inline styles, same tokens/spacing) and trimmed to admin's node data
// shape (name/description only — no fields/headers/branches yet).
const inputStyle = (c: FlowColors): React.CSSProperties => ({
  width: '100%',
  padding: '9px 10px',
  borderRadius: 8,
  border: `1px solid ${c.border}`,
  background: c.cardBg,
  color: c.textPrimary,
  fontSize: 13.5,
  outline: 'none',
  boxSizing: 'border-box',
});
const labelStyle = (c: FlowColors): React.CSSProperties => ({
  fontSize: 12,
  fontWeight: 600,
  color: c.textSecondary,
  marginBottom: 6,
});

export function PropertiesPanel({
  node,
  onClose,
  onUpdate,
  onDelete,
}: {
  node: WFNode;
  onClose: () => void;
  onUpdate: (patch: Partial<WFNodeData>) => void;
  onDelete: () => void;
}) {
  const { c } = useFlowTheme();
  const [tab, setTab] = useState<'properties' | 'widgets'>('properties');
  const [generalOpen, setGeneralOpen] = useState(true);
  const data = node.data;

  const iconBtn: React.CSSProperties = {
    width: 30,
    height: 30,
    borderRadius: 8,
    border: 'none',
    background: 'none',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    flex: '0 0 auto',
    color: c.textSecondary,
  };

  return (
    <div
      style={{
        width: 340,
        flex: '0 0 auto',
        borderLeft: `1px solid ${c.border}`,
        background: c.sidebarBg,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div style={{ padding: '16px 18px 0 18px', flex: '0 0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 700, color: c.textPrimary }}>Propriedades</div>
            <div style={{ fontSize: 12.5, color: c.textSecondary }}>{NODE_META[node.type as keyof typeof NODE_META].title}</div>
          </div>
          <button onClick={onClose} style={iconBtn} title="Fechar painel">
            <X size={18} />
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, marginTop: 14, background: c.chipBg, padding: 4, borderRadius: 10 }}>
          <button
            onClick={() => setTab('properties')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: tab === 'properties' ? c.cardBg : 'transparent',
              color: tab === 'properties' ? c.textPrimary : c.textSecondary,
            }}
          >
            Propriedades
          </button>
          <button
            onClick={() => setTab('widgets')}
            style={{
              flex: 1,
              padding: '8px 0',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 600,
              border: 'none',
              cursor: 'pointer',
              background: tab === 'widgets' ? c.cardBg : 'transparent',
              color: tab === 'widgets' ? c.textPrimary : c.textSecondary,
            }}
          >
            Widgets
          </button>
        </div>
      </div>

      <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', padding: 18 }}>
        {tab === 'widgets' && (
          <div style={{ textAlign: 'center', padding: '48px 12px', color: c.textSecondary, fontSize: 13 }}>
            Nenhum widget configurado para este nó.
          </div>
        )}

        {tab === 'properties' && (
          <div style={{ marginBottom: 10 }}>
            <button
              onClick={() => setGeneralOpen((o) => !o)}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                padding: '8px 0',
                cursor: 'pointer',
                color: c.textPrimary,
                fontSize: 14,
                fontWeight: 700,
              }}
            >
              Informações Gerais
              <ChevronDown
                size={16}
                style={{ transform: generalOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
              />
            </button>
            {generalOpen && (
              <div style={{ paddingTop: 8 }}>
                <div style={{ marginBottom: 14 }}>
                  <div style={labelStyle(c)}>Nome</div>
                  <input style={inputStyle(c)} value={data.name} onChange={(e) => onUpdate({ name: e.target.value })} />
                </div>
                <div style={{ marginBottom: 6 }}>
                  <div style={labelStyle(c)}>Descrição</div>
                  <textarea
                    style={{ ...inputStyle(c), minHeight: 70, resize: 'vertical' }}
                    value={data.description}
                    onChange={(e) => onUpdate({ description: e.target.value })}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ flex: '0 0 auto', padding: '16px 18px', borderTop: `1px solid ${c.border}` }}>
        <button
          onClick={onDelete}
          style={{
            width: '100%',
            padding: 11,
            borderRadius: 9,
            border: 'none',
            background: 'rgba(229,72,77,0.14)',
            color: '#e5484d',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Excluir nó
        </button>
      </div>
    </div>
  );
}
