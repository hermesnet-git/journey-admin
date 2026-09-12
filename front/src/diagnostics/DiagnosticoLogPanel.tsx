import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronRight, ChevronUp, Search, X } from 'lucide-react';
import { prettifyJson } from '../execution/InspectorPanel';
import { CopyTextButton } from './CopyTextButton';
import { skinVars } from '@telefonica/mistica';

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  data?: Record<string, unknown>;
  isError?: boolean;
}

// Versão própria (mesmo padrão visual do editor de jornadas) do LogPanel compartilhado com a
// Execução ao vivo — mesma busca/expandir-tudo/navegação entre resultados, só recolorida; o
// LogPanel de execution/InspectorPanel.tsx segue intocado (usa skinVars, tema do resto do app).

const MATCH_BG = 'rgba(250, 204, 21, 0.14)';
const ACTIVE_MATCH_BG = 'rgba(249, 115, 22, 0.16)';
const MATCH_MARK_BG = 'rgba(250, 204, 21, 0.55)';
const ACTIVE_MATCH_MARK_BG = 'rgba(249, 115, 22, 0.6)';

function logRowId(id: string) {
  return `diag-log-row-${id}`;
}

function highlightText(text: string, query: string, strong: boolean): ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const lowerQ = q.toLowerCase();
  const parts: ReactNode[] = [];
  let i = 0;
  let idx = lower.indexOf(lowerQ);
  if (idx === -1) return text;
  while (idx !== -1) {
    if (idx > i) parts.push(text.slice(i, idx));
    parts.push(
      <mark key={idx} style={{ background: strong ? ACTIVE_MATCH_MARK_BG : MATCH_MARK_BG, color: 'inherit', borderRadius: 2, padding: '0 1px' }}>
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(lowerQ, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

export function DiagnosticoLogPanel({ log, endRef }: { log: LogEntry[]; endRef: React.RefObject<HTMLDivElement | null> }) {
  const [query, setQuery] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const entriesWithData = useMemo(() => log.filter((e) => e.data && Object.keys(e.data).length > 0), [log]);

  const matchingIds = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return log
      .filter((e) => e.message.toLowerCase().includes(q) || (e.data ? JSON.stringify(e.data).toLowerCase().includes(q) : false))
      .map((e) => e.id);
  }, [log, query]);

  function revealMatch(index: number) {
    if (matchingIds.length === 0) return;
    const wrapped = ((index % matchingIds.length) + matchingIds.length) % matchingIds.length;
    setActiveMatchIndex(wrapped);
    const id = matchingIds[wrapped];
    const entry = log.find((e) => e.id === id);
    if (entry?.data) setExpandedIds((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    requestAnimationFrame(() => {
      document.getElementById(logRowId(id))?.scrollIntoView({ block: 'center' });
    });
  }

  useEffect(() => {
    if (matchingIds.length === 0) {
      setActiveMatchIndex(0);
      return;
    }
    revealMatch(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const activeMatchId = matchingIds[activeMatchIndex];

  return (
    <div className="h-full flex flex-col min-h-0" style={{ background: skinVars.colors.background }}>
      <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: skinVars.colors.border }}>
        <div className="relative flex-1 min-w-0 max-w-[260px]">
          <Search size={12.5} color={skinVars.colors.textSecondary} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key !== 'Enter') return;
              e.preventDefault();
              if (e.shiftKey) revealMatch(activeMatchIndex - 1);
              else revealMatch(activeMatchIndex + 1);
            }}
            placeholder="Buscar no log..."
            autoComplete="off"
            className="w-full h-7 box-border rounded-md outline-none"
            style={{ padding: query ? '0 24px 0 26px' : '0 8px 0 26px', fontSize: 12.5, border: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.background, color: skinVars.colors.textPrimary }}
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              title="Limpar busca"
              className="cursor-pointer border-0 bg-transparent flex items-center justify-center"
              style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', color: skinVars.colors.textSecondary }}
            >
              <X size={13} />
            </button>
          )}
        </div>

        {query && (
          <>
            <span style={{ fontSize: 11.5, color: skinVars.colors.textSecondary }}>
              {matchingIds.length > 0 ? `${activeMatchIndex + 1}/${matchingIds.length}` : '0/0'}
            </span>
            <button
              type="button"
              onClick={() => revealMatch(activeMatchIndex - 1)}
              disabled={matchingIds.length === 0}
              title="Resultado anterior (Shift+Enter)"
              className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
              style={{ color: skinVars.colors.textSecondary, background: 'transparent' }}
            >
              <ChevronUp size={14} />
            </button>
            <button
              type="button"
              onClick={() => revealMatch(activeMatchIndex + 1)}
              disabled={matchingIds.length === 0}
              title="Próximo resultado (Enter)"
              className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
              style={{ color: skinVars.colors.textSecondary, background: 'transparent' }}
            >
              <ChevronDown size={14} />
            </button>
          </>
        )}

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setExpandedIds(new Set(entriesWithData.map((e) => e.id)))}
          disabled={entriesWithData.length === 0}
          className="h-7 px-2 rounded-md text-[11.5px] font-medium border-0 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          style={{ color: skinVars.colors.textSecondary, background: 'transparent' }}
        >
          Expandir tudo
        </button>
        <button
          type="button"
          onClick={() => setExpandedIds(new Set())}
          disabled={entriesWithData.length === 0}
          className="h-7 px-2 rounded-md text-[11.5px] font-medium border-0 cursor-pointer disabled:opacity-40 disabled:cursor-default"
          style={{ color: skinVars.colors.textSecondary, background: 'transparent' }}
        >
          Recolher tudo
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-auto p-4">
        {log.length === 0 ? (
          <span style={{ fontSize: 13, color: skinVars.colors.textSecondary }}>Nenhuma ação registrada ainda.</span>
        ) : (
          <div className="flex flex-col gap-4">
            {log.map((entry) => (
              <DiagnosticoLogRow
                key={entry.id}
                entry={entry}
                query={query}
                isActiveMatch={entry.id === activeMatchId}
                isMatch={matchingIds.includes(entry.id)}
                expanded={expandedIds.has(entry.id)}
                onToggle={() => toggleExpanded(entry.id)}
              />
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  );
}

function DiagnosticoLogRow({
  entry,
  query,
  isActiveMatch,
  isMatch,
  expanded,
  onToggle,
}: {
  entry: LogEntry;
  query: string;
  isActiveMatch: boolean;
  isMatch: boolean;
  expanded: boolean;
  onToggle: () => void;
}) {
  const hasData = !!entry.data && Object.keys(entry.data).length > 0;
  const prettyData = useMemo(() => (entry.data ? (prettifyJson(entry.data) as Record<string, unknown>) : undefined), [entry.data]);

  return (
    <div id={logRowId(entry.id)} className="rounded-md px-1 -mx-1 py-[2px]" style={{ background: isActiveMatch ? ACTIVE_MATCH_BG : isMatch ? MATCH_BG : 'transparent' }}>
      <div className="flex items-start gap-1" style={hasData ? { cursor: 'pointer' } : undefined} onClick={hasData ? onToggle : undefined}>
        <span className="shrink-0 mt-[3px] w-[12px] flex items-center justify-center" style={{ color: skinVars.colors.textSecondary }}>
          {hasData && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </span>
        <span style={{ fontSize: 12.5, color: entry.isError ? skinVars.colors.error : skinVars.colors.textPrimary }}>
          {entry.time} — {highlightText(entry.message, query, isActiveMatch)}
        </span>
      </div>
      {hasData && expanded && (
        <div className="relative mt-1 ml-4">
          <pre className="rounded-md px-2 py-1 pr-14 text-[11px] overflow-auto" style={{ background: skinVars.colors.backgroundAlternative, color: skinVars.colors.textSecondary, fontFamily: 'monospace', maxHeight: 220 }}>
            {JSON.stringify(prettyData, null, 2)}
          </pre>
          <div className="absolute top-1 right-1">
            <CopyTextButton text={JSON.stringify(prettyData, null, 2)} />
          </div>
        </div>
      )}
    </div>
  );
}
