import { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useFlowTheme } from './theme';
import { PropertiesPanel } from './PropertiesPanel';
import { JourneyPropertiesPanel } from './JourneyPropertiesPanel';
import type { WFNode, WFEdge, WFNodeData, WFEdgeData } from './model';
import type { Form } from '../api/forms';
import type { MessagingCluster, CredentialReference } from '../api/messaging';

const MIN_WIDTH = 280;
const MAX_WIDTH = 560;
const DEFAULT_WIDTH = 340;

interface JourneyPanelProps {
  productName: string;
  channelName: string;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
}

// Always-mounted right dock: shows the selected node's properties, or the
// journey's own data when nothing is selected. Collapsible (rail with just an
// expand button) and resizable by dragging its left edge — width only.
export function PropertiesDock({
  node,
  forms,
  clusters,
  credentials,
  allNodes,
  allEdges,
  journeyId,
  onUpdateNode,
  onUpdateEdge,
  onDeleteNode,
  onOpenNewForm,
  onRefreshForms,
  journey,
}: {
  node: WFNode | null;
  forms: Form[];
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
  allNodes: WFNode[];
  allEdges: WFEdge[];
  journeyId: string;
  onUpdateNode: (patch: Partial<WFNodeData>) => void;
  onUpdateEdge: (edgeId: string, patch: Partial<WFEdgeData>) => void;
  onDeleteNode: () => void;
  onOpenNewForm: () => void;
  onRefreshForms: () => void;
  journey: JourneyPanelProps;
}) {
  const { c } = useFlowTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const dragState = useRef<{ startX: number; startWidth: number } | null>(null);

  function onResizeStart(e: React.PointerEvent) {
    e.preventDefault();
    dragState.current = { startX: e.clientX, startWidth: width };
    window.addEventListener('pointermove', onResizeMove);
    window.addEventListener('pointerup', onResizeEnd);
  }

  function onResizeMove(e: PointerEvent) {
    if (!dragState.current) return;
    // Panel sits on the right edge, so dragging the left border left grows it.
    const next = dragState.current.startWidth - (e.clientX - dragState.current.startX);
    setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, next)));
  }

  function onResizeEnd() {
    dragState.current = null;
    window.removeEventListener('pointermove', onResizeMove);
    window.removeEventListener('pointerup', onResizeEnd);
  }

  if (collapsed) {
    return (
      <div
        className="w-[40px] shrink-0 border-l flex flex-col items-center gap-2 pt-3"
        style={{ background: c.sidebarBg, borderColor: c.border }}
      >
        <button
          onClick={() => setCollapsed(false)}
          title="Expandir propriedades"
          className="w-[26px] h-[26px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
          style={{ color: c.textSecondary }}
        >
          <ChevronLeft size={16} />
        </button>
        <Settings2 size={15} style={{ color: c.textSecondary }} />
      </div>
    );
  }

  return (
    <div className="relative shrink-0 flex" style={{ width }}>
      <div
        onPointerDown={onResizeStart}
        title="Arrastar para redimensionar"
        className="absolute -left-[3px] top-0 bottom-0 w-[6px] cursor-col-resize z-10"
      />
      <div
        style={{
          width: '100%',
          borderLeft: `1px solid ${c.border}`,
          background: c.sidebarBg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            padding: '16px 18px',
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 700, color: c.textPrimary }}>Propriedades</div>
          <button
            onClick={() => setCollapsed(true)}
            title="Recolher painel"
            className="w-[26px] h-[26px] rounded-md border-0 bg-transparent flex items-center justify-center cursor-pointer"
            style={{ color: c.textSecondary }}
          >
            <ChevronRight size={16} />
          </button>
        </div>

        <div style={{ flex: '1 1 auto', overflowY: 'auto', overflowX: 'hidden', padding: '0 18px 18px 18px' }}>
          {node ? (
            <PropertiesPanel
              node={node}
              forms={forms}
              clusters={clusters}
              credentials={credentials}
              allNodes={allNodes}
              allEdges={allEdges}
              journeyId={journeyId}
              onUpdate={onUpdateNode}
              onUpdateEdge={onUpdateEdge}
              onDelete={onDeleteNode}
              onOpenNewForm={onOpenNewForm}
              onRefreshForms={onRefreshForms}
            />
          ) : (
            <JourneyPropertiesPanel {...journey} />
          )}
        </div>
      </div>
    </div>
  );
}
