import type { WFNode, WFEdge } from './model';
import { SINGLE_OUTPUT_TYPES } from './model';

export interface FlowValidationResult {
  errors: string[];
  invalidNodeIds: Set<string>;
}

export function validateFlow(nodes: WFNode[], edges: WFEdge[]): FlowValidationResult {
  const errors: string[] = [];
  const invalidNodeIds = new Set<string>();
  const starts = nodes.filter((n) => n.type === 'start' || n.type === 'messageStartEvent');
  const ends = nodes.filter((n) => n.type === 'end');
  if (starts.length !== 1) errors.push('O fluxo deve ter exatamente um elemento inicial (Início ou Início por Mensagem).');
  // A GATEWAY's two branches may each run to their own Fim instead of reconverging first, so —
  // unlike o elemento inicial — o fluxo pode ter mais de um nó de Fim; só precisa de pelo menos um.
  if (ends.length === 0) errors.push('O fluxo deve ter ao menos um nó de Fim.');

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
    if ((n.type === 'start' || n.type === 'messageStartEvent') && (inCount !== 0 || outCount !== 1)) {
      errors.push(`O nó "${n.data.name}" deve ter nenhuma entrada e exatamente uma saída.`);
      invalidNodeIds.add(n.id);
    }
    if (n.type && SINGLE_OUTPUT_TYPES.includes(n.type) && (inCount < 1 || outCount !== 1)) {
      errors.push(`A tarefa "${n.data.name}" deve ter ao menos uma entrada e exatamente uma saída.`);
      invalidNodeIds.add(n.id);
    }
    if (n.type === 'end' && (inCount < 1 || outCount !== 0)) {
      errors.push(`O nó de Fim "${n.data.name}" deve ter ao menos uma entrada e nenhuma saída.`);
      invalidNodeIds.add(n.id);
    }
    if (n.type === 'gateway') {
      if (inCount < 1 || outCount !== 2) {
        errors.push(`O gateway "${n.data.name}" deve ter ao menos uma entrada e exatamente duas saídas.`);
        invalidNodeIds.add(n.id);
      } else {
        const outgoing = edges.filter((e) => e.source === n.id);
        const defaultCount = outgoing.filter((e) => e.data?.isDefault).length;
        if (defaultCount !== 1) {
          errors.push(`O gateway "${n.data.name}" deve ter exatamente uma saída padrão.`);
          invalidNodeIds.add(n.id);
        }
        if (outgoing.some((e) => !e.data?.isDefault && !e.data?.condition?.trim())) {
          errors.push(`O gateway "${n.data.name}" tem uma saída não padrão sem condição.`);
          invalidNodeIds.add(n.id);
        }
      }
    }
  });

  if (starts.length === 1 && ends.length > 0) {
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
    // A node only needs to reach *some* Fim, not a specific one — each GATEWAY branch may lead to
    // its own.
    const toEnd = new Set<string>();
    ends.forEach((end) => reachableFrom(end.id, backward).forEach((id) => toEnd.add(id)));
    nodes.forEach((n) => {
      if (!fromStart.has(n.id) || !toEnd.has(n.id)) {
        errors.push(`O nó "${n.data.name}" não está em um caminho contínuo entre Início e Fim.`);
        invalidNodeIds.add(n.id);
      }
    });
  }

  return { errors, invalidNodeIds };
}
