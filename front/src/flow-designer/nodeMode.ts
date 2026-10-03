import { useCallback, useEffect, useState } from 'react';
import { collectFormVariableNames, walk, type SduiNode } from '../sdui/model';
import { NODE_DIMENSIONS, NODE_META, connectorMissingFields, type ConnectorConfig, type NodeType } from './model';

// Como as etapas aparecem no canvas: o círculo de sempre, a pílula compacta (ícone + nome) ou o
// cartão detalhado (tipo, nome e etiquetas). Uma preferência por usuário e por funcionalidade: o
// editor, a Execução, o Diagnóstico e o "Ver fluxo" lembram cada um a sua escolha. Cada modo tem
// tamanho próprio, então trocar de modo reorganiza o fluxo.
export type NodeDisplayMode = 'circle' | 'compact' | 'detailed';
export type NodeModeScope = 'editor' | 'execution' | 'diagnostic' | 'preview';

export const NODE_DISPLAY_MODES: { value: NodeDisplayMode; label: string }[] = [
  { value: 'circle', label: 'Círculo' },
  { value: 'compact', label: 'Compacto' },
  { value: 'detailed', label: 'Detalhado' },
];

const STORAGE_PREFIX = 'flow:node-display-mode:';
const CHANGE_EVENT = 'flow:node-display-mode-change';

function isMode(value: unknown): value is NodeDisplayMode {
  return value === 'circle' || value === 'compact' || value === 'detailed';
}

export function readNodeDisplayMode(scope: NodeModeScope | null): NodeDisplayMode {
  if (!scope) return 'detailed';
  try {
    const stored = localStorage.getItem(STORAGE_PREFIX + scope);
    return isMode(stored) ? stored : 'detailed';
  } catch {
    return 'detailed';
  }
}

// `scope` null = sem preferência (miniaturas): sempre detalhado, sem ler nem gravar. Duas telas da
// mesma funcionalidade abertas ao mesmo tempo acompanham a troca uma da outra.
export function useNodeDisplayMode(scope: NodeModeScope | null): [NodeDisplayMode, (mode: NodeDisplayMode) => void] {
  const [mode, setMode] = useState<NodeDisplayMode>(() => readNodeDisplayMode(scope));
  useEffect(() => {
    const sync = () => setMode(readNodeDisplayMode(scope));
    sync();
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener('storage', sync);
    };
  }, [scope]);
  const change = useCallback(
    (next: NodeDisplayMode) => {
      if (scope) {
        try {
          localStorage.setItem(STORAGE_PREFIX + scope, next);
        } catch {
          // sem armazenamento: vale só nesta tela
        }
      }
      setMode(next);
      window.dispatchEvent(new Event(CHANGE_EVENT));
    },
    [scope],
  );
  return [mode, change];
}

export function isTaskType(type: NodeType): boolean {
  return type === 'userTask' || type === 'serviceTask' || type === 'receiveTask';
}

const COMPACT_TASK = { width: 220, height: 48 };
const DETAILED_TASK = { width: 300, height: 100 };

// Tamanho da forma (sem o rótulo de baixo) — width/height do nó no React Flow.
export function nodeSize(type: NodeType, mode: NodeDisplayMode): { width: number; height: number } {
  if (mode === 'circle') return NODE_DIMENSIONS[type];
  if (isTaskType(type)) return mode === 'compact' ? COMPACT_TASK : DETAILED_TASK;
  if (type === 'gateway') return mode === 'compact' ? { width: 52, height: 52 } : { width: 64, height: 64 };
  return mode === 'compact' ? { width: 44, height: 44 } : { width: 50, height: 50 };
}

// Altura do nome que flutua embaixo da forma (eventos, decisão e, no modo círculo, tarefas) — o
// layout e o roteamento das linhas reservam esse espaço para nada passar por cima do texto.
export function labelReserve(type: NodeType, mode: NodeDisplayMode): number {
  if (mode === 'circle') return 40;
  return isTaskType(type) ? 0 : 40;
}

// Rótulo de tipo do cartão detalhado: curto, pelo que a etapa é para quem lê o fluxo ("Tela",
// "Integração REST"); as demais usam o nome do editor, com o conector quando há.
export function nodeTypeLabel(type: NodeType, connectorType?: string | null): string {
  if (type === 'userTask') return 'Tela';
  if (type === 'serviceTask' && connectorType === 'REST') return 'Integração REST';
  const title = NODE_META[type].title;
  return connectorType ? `${title} · ${connectorType.replace('_', ' ')}` : title;
}

export interface NodeChip {
  label: string;
  tone?: 'warn';
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

// O que a tela tem, em uma etiqueta: campos (ou as opções, quando o único campo é uma escolha); sem
// campos, o que ela mostra (avisos ou textos).
function screenSummary(root: SduiNode | null | undefined): string {
  if (!root) return 'Sem tela';
  const fields = collectFormVariableNames(root).length;
  let options = 0;
  let alerts = 0;
  let texts = 0;
  walk(root, (node) => {
    if (Array.isArray(node.props.options)) options = Math.max(options, node.props.options.length);
    if (node.type === 'ui.alert') alerts++;
    if (node.type === 'ui.text') texts++;
  });
  if (fields === 1 && options > 0) return plural(options, 'opção', 'opções');
  if (fields > 0) return plural(fields, 'campo', 'campos');
  if (alerts > 0) return plural(alerts, 'aviso', 'avisos');
  if (texts > 0) return plural(texts, 'texto', 'textos');
  return 'Informativa';
}

// Etiquetas do cartão detalhado, tiradas da própria configuração da etapa — nunca declaradas à parte.
export function nodeChips(
  type: NodeType,
  connectorConfig: ConnectorConfig | null | undefined,
  screenRoot?: SduiNode | null,
  hasDataSources?: boolean,
  // Os visualizadores recebem a configuração sem a credencial: lá não faz sentido acusar falta.
  checkMissing = true,
): NodeChip[] {
  const chips: NodeChip[] = [];
  if (type === 'userTask') {
    chips.push({ label: screenSummary(screenRoot) });
    if (hasDataSources) chips.push({ label: 'Fonte de dados' });
  }
  if (connectorConfig) {
    const missing = checkMissing ? connectorMissingFields(connectorConfig) : [];
    if (missing.length > 0) chips.push({ label: `Falta ${missing[0].toLowerCase()}`, tone: 'warn' });
    const cfg = connectorConfig.config ?? {};
    if (connectorConfig.connectorType === 'REST') {
      if (cfg.method) chips.push({ label: String(cfg.method) });
      if (typeof cfg.retries === 'number' && cfg.retries > 0) chips.push({ label: `${cfg.retries} ${cfg.retries > 1 ? 'tentativas' : 'tentativa'}` });
      if (cfg.background === true) chips.push({ label: 'Segundo plano' });
    } else if (typeof cfg.topic === 'string' && cfg.topic.trim()) {
      chips.push({ label: cfg.topic });
    }
  }
  return chips.slice(0, 3);
}
