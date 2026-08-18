import { useEffect, useRef, useState } from 'react';
import { Check, Pencil, Route, Sliders, ScrollText } from 'lucide-react';
import { Stack, Text, TextFieldBase, skinVars } from '@telefonica/mistica';
import { isInternalVariableName, type FlowConnectionInfo, type FlowNodeInfo, type VariableEntry } from './api';
import { FlowDiagramViewer } from './FlowDiagramViewer';

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  data?: Record<string, unknown>;
}

interface Props {
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
  erroredNodeId?: string | null;
  erroredNodeName?: string | null;
  erroredMessage?: string | null;
  variables: VariableEntry[];
  onEditVariable: (name: string, rawValue: string, type: string) => void;
  log: LogEntry[];
}

type TabKey = 'workflow' | 'variaveis' | 'log';

const TABS: { key: TabKey; label: string; icon: typeof Route }[] = [
  { key: 'workflow', label: 'Fluxo da Jornada', icon: Route },
  { key: 'variaveis', label: 'Variáveis', icon: Sliders },
  { key: 'log', label: 'Log', icon: ScrollText },
];

const MIN_HEIGHT = 220;
const DEFAULT_HEIGHT = 380;

export function InspectorPanel({
  flowNodes,
  flowConnections,
  currentNodeId,
  visitedNodeIds,
  erroredNodeId,
  erroredNodeName,
  erroredMessage,
  variables,
  onEditVariable,
  log,
}: Props) {
  const [tab, setTab] = useState<TabKey>('workflow');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const draggingRef = useRef(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (tab === 'log') {
      logEndRef.current?.scrollIntoView({ block: 'end' });
    }
  }, [tab, log.length]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      if (!draggingRef.current) return;
      const next = window.innerHeight - e.clientY;
      setHeight(Math.min(Math.max(next, MIN_HEIGHT), window.innerHeight - 180));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  function startDrag() {
    draggingRef.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div
      className="w-full shrink-0 flex flex-col min-h-0"
      style={{ height, background: skinVars.colors.backgroundContainer, borderTop: `1px solid ${skinVars.colors.border}` }}
    >
      <div
        onMouseDown={startDrag}
        className="w-full h-[7px] shrink-0 flex items-center justify-center cursor-ns-resize"
        style={{ background: skinVars.colors.backgroundAlternative }}
        title="Arraste para redimensionar"
      >
        <div className="w-10 h-[3px] rounded-full" style={{ background: skinVars.colors.border }} />
      </div>

      <div className="flex shrink-0" style={{ borderBottom: `1px solid ${skinVars.colors.border}` }}>
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="flex items-center gap-[6px] px-4 py-[10px] text-[13px] font-medium cursor-pointer border-0"
              style={{
                background: active ? skinVars.colors.background : 'transparent',
                color: active ? skinVars.colors.brand : skinVars.colors.textSecondary,
                borderBottom: active ? `2px solid ${skinVars.colors.brand}` : '2px solid transparent',
              }}
            >
              <Icon size={14} />
              {t.label}
              {t.key === 'log' && log.length > 0 && (
                <span
                  className="rounded-full text-[10.5px] px-[6px] leading-[16px]"
                  style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textSecondary }}
                >
                  {log.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="flex-1 min-h-0">
        {/* Sempre montado (só escondido via CSS) — desmontar e remontar a cada troca de aba
            destruía o estado interno do React Flow (zoom/posição do pan), repondo o fluxo sempre
            centralizado no passo atual mesmo quando o usuário tinha arrastado/dado zoom manual. */}
        <div className={tab === 'workflow' ? 'h-full' : 'hidden'}>
          <FlowDiagramViewer
            flowNodes={flowNodes}
            flowConnections={flowConnections}
            currentNodeId={currentNodeId}
            visitedNodeIds={visitedNodeIds}
            erroredNodeId={erroredNodeId}
            erroredNodeName={erroredNodeName}
            erroredMessage={erroredMessage}
          />
        </div>

        {tab === 'variaveis' && (
          <div className="h-full overflow-auto p-4">
            <VariablesTable variables={variables} onEdit={onEditVariable} />
          </div>
        )}

        {tab === 'log' && (
          <div className="h-full overflow-auto p-4">
            <LogView log={log} endRef={logEndRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function VariablesTable({ variables, onEdit }: { variables: VariableEntry[]; onEdit: (name: string, rawValue: string, type: string) => void }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // __httpUrl__/__httpResponse__ are technical, captured per node for the "Integrações" tab — not
  // meant to read as a regular process variable here.
  const visibleVariables = variables.filter((v) => !isInternalVariableName(v.name));

  if (visibleVariables.length === 0) {
    return (
      <Text size={13} color={skinVars.colors.textSecondary}>
        Nenhuma variável definida ainda neste processo.
      </Text>
    );
  }

  return (
    <table className="w-full text-left" style={{ borderCollapse: 'collapse' }}>
      <thead>
        <tr>
          {['Nome', 'Valor', 'Tipo', ''].map((h) => (
            <th key={h} className="text-[11.5px] font-semibold uppercase pb-2" style={{ color: skinVars.colors.textSecondary }}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {visibleVariables.map((v) => {
          const isEditing = editing === v.name;
          return (
            <tr key={v.name} style={{ borderTop: `1px solid ${skinVars.colors.border}` }}>
              <td className="py-2 pr-3 text-[13px] font-mono" style={{ color: skinVars.colors.textPrimary }}>
                {v.name}
              </td>
              <td className="py-2 pr-3 text-[13px]" style={{ color: skinVars.colors.textPrimary, minWidth: 160 }}>
                {isEditing ? (
                  <TextFieldBase value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                ) : (
                  String(v.value)
                )}
              </td>
              <td className="py-2 pr-3 text-[12px]" style={{ color: skinVars.colors.textSecondary }}>
                {v.type}
              </td>
              <td className="py-2 text-right">
                {isEditing ? (
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent"
                    style={{ color: skinVars.colors.brand }}
                    onClick={() => {
                      onEdit(v.name, draft, v.type);
                      setEditing(null);
                    }}
                  >
                    <Check size={15} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent"
                    style={{ color: skinVars.colors.textSecondary }}
                    onClick={() => {
                      setEditing(v.name);
                      setDraft(String(v.value));
                    }}
                  >
                    <Pencil size={14} />
                  </button>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function LogView({ log, endRef }: { log: LogEntry[]; endRef: React.RefObject<HTMLDivElement | null> }) {
  if (log.length === 0) {
    return (
      <Text size={13} color={skinVars.colors.textSecondary}>
        Nenhuma ação registrada ainda.
      </Text>
    );
  }

  return (
    <Stack space={4}>
      {log.map((entry) => (
        <div key={entry.id} className="flex items-start gap-2">
          <Text size={10.5} color={skinVars.colors.textSecondary}>
            {entry.time}
          </Text>
          <div className="min-w-0 flex-1">
            <Text size={12.5} color={skinVars.colors.textPrimary}>
              {entry.message}
            </Text>
            {entry.data && Object.keys(entry.data).length > 0 && (
              <pre
                className="mt-1 rounded-md px-2 py-1 text-[11px] overflow-auto"
                style={{
                  background: skinVars.colors.backgroundAlternative,
                  color: skinVars.colors.textSecondary,
                  fontFamily: 'monospace',
                  maxHeight: 160,
                }}
              >
                {JSON.stringify(entry.data, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
      <div ref={endRef} />
    </Stack>
  );
}
