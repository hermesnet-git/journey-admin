import { skinVars, Text } from '@telefonica/mistica';
import type { VariableSnapshot, VariableTimelineEntry } from './api';

interface Props {
  // null pro nó onde a instância está parada agora (ainda sem endTime) — nesse caso mostra o valor
  // mais recente de cada variável até este exato momento, não até um instante fixo no passado.
  endTime: string | null;
  variables: VariableSnapshot[];
  timeline: VariableTimelineEntry[];
}

// Generaliza pra QUALQUER nó o que antes só existia pro Início (valor declarado ali) — aqui é a
// "foto" de toda variável de processo como estava no fim deste nó específico, resolvida cruzando a
// timeline completa (VariableTimeline) por tempo. Complementar a Entrada/Saída (NodeDetailSection
// mostra os dois), não substitui.
export function NodeSnapshotSection({ endTime, variables, timeline }: Props) {
  if (variables.length === 0) return null;

  const cutoff = endTime ? new Date(endTime).getTime() : Infinity;
  const valueByName = new Map<string, VariableTimelineEntry>();
  for (const entry of timeline) {
    if (new Date(entry.time).getTime() <= cutoff) {
      // timeline já chega ordenada por tempo (asc) — a última que passa no corte é o valor vigente.
      valueByName.set(entry.name, entry);
    }
  }

  return (
    <div>
      <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
        ESTADO DAS VARIÁVEIS NESTE PONTO
      </Text>
      <div
        className="rounded-md p-2 mt-1 flex flex-col gap-[4px]"
        style={{ background: skinVars.colors.backgroundAlternative }}
      >
        {variables.map((v) => {
          const entry = valueByName.get(v.name);
          const display = entry ? String(entry.value) : null;
          return (
            <div key={v.name} className="flex items-center justify-between gap-2">
              <span
                className="text-[12px] shrink-0"
                style={{ color: skinVars.colors.textSecondary, fontFamily: 'monospace' }}
              >
                {v.name}
              </span>
              <span
                className="text-[12px] truncate"
                style={{ color: display ? skinVars.colors.textPrimary : skinVars.colors.textSecondary }}
                title={display ?? undefined}
              >
                {display ?? '— (ainda não definida)'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
