import { Fragment, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { ColumnResizeHandle } from '../execution/InspectorPanel';
import type { VariableSnapshot, VariableTimelineEntry } from './api';
import { skinVars } from '@telefonica/mistica';

interface Props {
  variables: VariableSnapshot[];
  timeline: VariableTimelineEntry[];
  // endTime do nó selecionado no Fluxo da Jornada — entradas até este instante ficam em destaque
  // (já tinham acontecido), as posteriores ficam esmaecidas. Sem nó selecionado, nada é destacado.
  highlightUpToTime?: string | null;
}

const COL_LABELS = ['Nome', 'Valor', 'Tipo', 'Histórico'];
const DEFAULT_COL_WIDTHS = [200, 480, 90, 100];
const MIN_COL_WIDTH = 40;
const EXPAND_COL_WIDTH = 20;

// Aba Histórico de Variáveis do Diagnóstico: cada variável revela TODOS os valores que já teve,
// em ordem — não só o valor atual (isso resolve o pedido de "mapear os valores até o final da
// jornada"), com destaque de cor cruzado com o nó selecionado no Fluxo. Nascem colapsadas.
export function VariableTimeline({ variables, timeline, highlightUpToTime }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_COL_WIDTHS);

  if (variables.length === 0) {
    return <span style={{ fontSize: 13, color: skinVars.colors.textSecondary }}>Nenhuma variável definida ainda neste processo.</span>;
  }

  const historyByName = new Map<string, VariableTimelineEntry[]>();
  for (const entry of timeline) {
    const list = historyByName.get(entry.name);
    if (list) list.push(entry);
    else historyByName.set(entry.name, [entry]);
  }

  const cutoff = highlightUpToTime ? new Date(highlightUpToTime).getTime() : null;

  function toggle(name: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  function resizeColumn(index: number, deltaX: number) {
    setColWidths((prev) => {
      const next = [...prev];
      next[index] = Math.max(MIN_COL_WIDTH, next[index] + deltaX);
      return next;
    });
  }

  return (
    <div>
      <table
        style={{
          borderCollapse: 'collapse',
          tableLayout: 'fixed',
          textAlign: 'left',
          width: colWidths.reduce((a, b) => a + b, 0) + EXPAND_COL_WIDTH,
        }}
      >
        <colgroup>
          <col style={{ width: EXPAND_COL_WIDTH }} />
          {colWidths.map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            <th />
            {COL_LABELS.map((h, i) => (
              <th key={h} className="relative pb-1 text-left" style={{ color: skinVars.colors.textSecondary }}>
                <span className="block truncate text-[10.5px] font-semibold uppercase">{h}</span>
                <ColumnResizeHandle onResize={(dx) => resizeColumn(i, dx)} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {variables.map((v) => {
            const history = historyByName.get(v.name) ?? [];
            const canExpand = history.length > 0;
            const isOpen = canExpand && expanded.has(v.name);
            return (
              <Fragment key={v.name}>
                <tr onClick={() => canExpand && toggle(v.name)} style={{ borderTop: `1px solid ${skinVars.colors.border}`, cursor: canExpand ? 'pointer' : 'default' }}>
                  <td className="py-[9px]" style={{ color: skinVars.colors.textSecondary }}>
                    {canExpand && (isOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
                  </td>
                  <td className="py-[9px] pr-2 text-[12px] font-mono overflow-hidden text-ellipsis whitespace-nowrap" title={v.name} style={{ color: skinVars.colors.textPrimary }}>
                    {v.name}
                  </td>
                  <td className="py-[9px] pr-2 text-[12px] overflow-hidden text-ellipsis whitespace-nowrap" title={String(v.value)} style={{ color: skinVars.colors.textPrimary }}>
                    {String(v.value)}
                  </td>
                  <td className="py-[9px] pr-2 text-[11px] overflow-hidden text-ellipsis whitespace-nowrap text-left" title={v.type} style={{ color: skinVars.colors.textSecondary }}>
                    {v.type}
                  </td>
                  <td className="py-[9px] text-[11px] overflow-hidden text-ellipsis whitespace-nowrap text-left" style={{ color: skinVars.colors.textSecondary }}>
                    {history.length > 1 ? `${history.length} valores` : '—'}
                  </td>
                </tr>
                {isOpen && (
                  <tr>
                    <td />
                    <td colSpan={4} className="pb-2">
                      <div className="flex flex-col gap-[3px] pl-[10px]">
                        {history.map((entry, i) => {
                          const happened = cutoff == null || new Date(entry.time).getTime() <= cutoff;
                          return (
                            <div key={i} className="flex items-center gap-2" style={{ opacity: happened ? 1 : 0.4 }}>
                              <span className="text-[10.5px] font-mono shrink-0 w-[70px]" style={{ color: skinVars.colors.textSecondary }}>
                                {formatTime(entry.time)}
                              </span>
                              <span className="text-[11.5px] flex-1 min-w-0 truncate" style={{ color: happened ? skinVars.colors.success : skinVars.colors.textSecondary }} title={String(entry.value)}>
                                {String(entry.value)}
                              </span>
                              <span className="text-[10.5px] shrink-0 truncate max-w-[140px]" style={{ color: skinVars.colors.textSecondary }}>
                                {entry.nodeName ?? entry.nodeId ?? '—'}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR');
}
