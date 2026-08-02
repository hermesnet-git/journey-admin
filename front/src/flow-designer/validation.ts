import type { WFNode, WFEdge } from './model';

export function validateFlow(nodes: WFNode[], edges: WFEdge[]): string[] {
  const errors: string[] = [];
  const starts = nodes.filter((n) => n.type === 'start');
  const ends = nodes.filter((n) => n.type === 'end');
  if (starts.length !== 1) errors.push('O fluxo deve ter exatamente um nó de Início.');
  if (ends.length !== 1) errors.push('O fluxo deve ter exatamente um nó de Fim.');

  const indeg = new Map<string, number>();
  const outdeg = new Map<string, number>();
  nodes.forEach((n) => {
    indeg.set(n.id, 0);
    outdeg.set(n.id, 0);
  });
  edges.forEach((e) => {
    outdeg.set(e.source, (outdeg.get(e.source) ?? 0) + 1);
    indeg.set(e.target, (indeg.get(e.target) ?? 0) + 1);
  });

  nodes.forEach((n) => {
    const inCount = indeg.get(n.id) ?? 0;
    const outCount = outdeg.get(n.id) ?? 0;
    if (n.type === 'start' && (inCount !== 0 || outCount !== 1)) {
      errors.push(`O nó de Início "${n.data.name}" deve ter nenhuma entrada e exatamente uma saída.`);
    }
    if (n.type === 'userTask' && (inCount < 1 || outCount !== 1)) {
      errors.push(`A tarefa "${n.data.name}" deve ter ao menos uma entrada e exatamente uma saída.`);
    }
    if (n.type === 'end' && (inCount < 1 || outCount !== 0)) {
      errors.push(`O nó de Fim "${n.data.name}" deve ter ao menos uma entrada e nenhuma saída.`);
    }
  });

  if (starts.length === 1 && ends.length === 1) {
    const forward = new Map<string, string[]>();
    const backward = new Map<string, string[]>();
    nodes.forEach((n) => {
      forward.set(n.id, []);
      backward.set(n.id, []);
    });
    edges.forEach((e) => {
      forward.get(e.source)?.push(e.target);
      backward.get(e.target)?.push(e.source);
    });

    const reachableFrom = (startId: string, graph: Map<string, string[]>) => {
      const seen = new Set<string>([startId]);
      const queue = [startId];
      while (queue.length) {
        const id = queue.shift()!;
        for (const next of graph.get(id) ?? []) {
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      return seen;
    };

    const fromStart = reachableFrom(starts[0].id, forward);
    const toEnd = reachableFrom(ends[0].id, backward);
    nodes.forEach((n) => {
      if (!fromStart.has(n.id) || !toEnd.has(n.id)) {
        errors.push(`O nó "${n.data.name}" não está em um caminho contínuo entre Início e Fim.`);
      }
    });
  }

  return errors;
}
