import type { VariableSnapshot, VariableTimelineEntry } from './api';

export interface ResolvedVariable {
  name: string;
  type: string;
  value: unknown;
  defined: boolean;
}

// Cruza a timeline completa de cada variável pelo tempo, achando o valor vigente até `cutoffTime`
// (ou o valor final de cada uma, se `cutoffTime` for null — nó em andamento, sem endTime ainda).
// Mesma lógica usada pelas 3 propostas de layout do drawer do nó (Inspector/Narrativa/Abas) —
// nunca duplicar o cálculo, só a apresentação varia entre elas.
export function resolveVariablesAtCutoff(
  cutoffTime: string | null,
  variables: VariableSnapshot[],
  timeline: VariableTimelineEntry[],
): ResolvedVariable[] {
  const cutoff = cutoffTime ? new Date(cutoffTime).getTime() : Infinity;
  const valueByName = new Map<string, VariableTimelineEntry>();
  for (const entry of timeline) {
    if (new Date(entry.time).getTime() <= cutoff) {
      // timeline já chega ordenada por tempo (asc) — a última que passa no corte é o valor vigente.
      valueByName.set(entry.name, entry);
    }
  }
  return variables.map((v) => {
    const entry = valueByName.get(v.name);
    return { name: v.name, type: v.type, value: entry ? entry.value : null, defined: !!entry };
  });
}
