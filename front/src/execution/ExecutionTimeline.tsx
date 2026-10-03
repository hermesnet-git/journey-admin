import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Cpu, Hourglass, ListOrdered, PanelRightClose, User } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import type { FlowConnectionInfo, FlowNodeInfo, NodeIODetail, VariableEntry } from './api';
import {
  CollapsibleJsonSection,
  ConnectorConfigSection,
  CopyTextButton,
  GatewaySection,
  NODE_TYPE_LABEL_PT,
  StartVariablesSection,
  nodeDurationLabel,
} from './InspectorPanel';

export interface TimelineStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  // Hora em que a tela recebeu o passo (hh:mm:ss).
  time: string;
  // Feito pelo motor sozinho (integração, decisão…), sem esperar ninguém.
  auto: boolean;
  failure?: string | null;
}

export interface TimelineWait {
  title: string;
  detail: string;
  tone?: 'error' | 'done';
}

interface Props {
  steps: TimelineStep[];
  nodeIO: Record<string, NodeIODetail>;
  wait: TimelineWait | null;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  visitedNodeIds: string[];
  currentNodeId: string | null;
  variables: VariableEntry[];
  // Etapa escolhida no fluxo: abre o card dela (ou mostra que ainda não foi alcançada).
  selectedNodeId: string | null;
  onSelect: (nodeId: string | null) => void;
}

const WIDTH_KEY = 'execution:timeline-width';
const COLLAPSED_KEY = 'execution:timeline-collapsed';
const MIN_WIDTH = 300;
const MAX_WIDTH = 720;
const DEFAULT_WIDTH = 360;

export function readNumber(key: string, fallback: number): number {
  try {
    const value = Number(localStorage.getItem(key));
    return Number.isFinite(value) && value > 0 ? value : fallback;
  } catch {
    return fallback;
  }
}

export function remember(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // sem armazenamento: vale só nesta tela
  }
}

// Detalhes de uma etapa (os mesmos que o antigo painel de etapa mostrava): duração, conclusão e id
// da tarefa; condições da Decisão com o caminho tomado; configuração do conector; variáveis de
// entrada do Início; entrada e saída.
function StepDetails({
  nodeId,
  detail,
  flowNodes,
  flowConnections,
  visitedNodeIds,
  currentNodeId,
  variables,
}: {
  nodeId: string;
  detail: NodeIODetail | undefined;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  visitedNodeIds: string[];
  currentNodeId: string | null;
  variables: VariableEntry[];
}) {
  const flowNode = flowNodes.find((n) => n.id === nodeId);
  const nodeType = detail?.nodeType ?? flowNode?.type;
  const connectorConfig = flowNode?.connectorConfig ?? null;
  const isGateway = nodeType === 'GATEWAY';
  const startVariables = flowNode?.type === 'START' ? (flowNode.startVariables ?? []) : [];
  const stepId = detail?.taskDetail?.taskId ?? detail?.activityInstanceId;
  const meta = 'text-[11.5px]';

  return (
    <div className="mt-2 flex flex-col gap-3">
      <div className="flex flex-col gap-[2px]" style={{ color: skinVars.colors.textSecondary }}>
        <span className={meta}>{nodeId === currentNodeId ? 'em andamento' : nodeDurationLabel(detail)}</span>
        {detail?.endTime && <span className={meta}>concluída em {new Date(detail.endTime).toLocaleString('pt-BR')}</span>}
        {stepId && (
          <span className={`${meta} flex items-center gap-1`}>
            task id: <span style={{ fontFamily: 'monospace' }}>{stepId}</span>
            <CopyTextButton text={stepId} />
          </span>
        )}
      </div>
      {isGateway && (
        <GatewaySection gatewayId={nodeId} flowNodes={flowNodes} flowConnections={flowConnections} currentNodeId={currentNodeId} visitedNodeIds={visitedNodeIds} />
      )}
      {connectorConfig && <ConnectorConfigSection connectorConfig={connectorConfig} nodeType={flowNode?.type} />}
      {startVariables.length > 0 && <StartVariablesSection startVariables={startVariables} variables={variables} />}
      {/* Conector de mensageria: o que entra é a própria mensagem publicada/consumida. */}
      {detail?.input && (
        <CollapsibleJsonSection title={connectorConfig && connectorConfig.connectorType !== 'REST' ? 'Payload da mensagem' : 'Entrada'} data={detail.input} />
      )}
      {detail?.output && <CollapsibleJsonSection title="Saída" data={detail.output} />}
      {!isGateway && !connectorConfig && startVariables.length === 0 && !detail?.input && !detail?.output && (
        <span className="text-[12px]" style={{ color: skinVars.colors.textSecondary }}>
          Sem dados de entrada ou saída nesta etapa.
        </span>
      )}
    </div>
  );
}

// Linha do tempo da execução: cada passo numerado (o mesmo número da etapa no fluxo); abrir um card
// mostra todos os detalhes da etapa. No fim, o que a jornada está esperando agora. O painel pode ser
// redimensionado pela borda esquerda e recolhido.
export function ExecutionTimeline({
  steps,
  nodeIO,
  wait,
  flowNodes,
  flowConnections,
  visitedNodeIds,
  currentNodeId,
  variables,
  selectedNodeId,
  onSelect,
}: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLLIElement | null)[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [width, setWidth] = useState(() => Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, readNumber(WIDTH_KEY, DEFAULT_WIDTH))));
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
      return false;
    }
  });
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  useEffect(() => {
    if (open === null) endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps.length, wait?.title]);

  // Etapa escolhida no fluxo: abre o card mais recente dela e rola até ele.
  useEffect(() => {
    if (!selectedNodeId) return;
    let index = -1;
    steps.forEach((s, i) => s.nodeId === selectedNodeId && (index = i));
    if (index < 0) {
      setOpen(null);
      return;
    }
    setOpen(index);
    if (collapsed) setCollapsed(false);
    requestAnimationFrame(() => cardRefs.current[index]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNodeId]);

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) return;
      setWidth(Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, drag.startWidth + (drag.startX - e.clientX))));
    }
    function onUp() {
      if (!dragRef.current) return;
      dragRef.current = null;
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
  useEffect(() => remember(WIDTH_KEY, String(width)), [width]);
  useEffect(() => remember(COLLAPSED_KEY, collapsed ? '1' : '0'), [collapsed]);

  const border = `1px solid ${skinVars.colors.border}`;

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        title="Abrir a linha do tempo"
        className="shrink-0 h-full w-[40px] flex flex-col items-center gap-3 pt-4 border-0 cursor-pointer"
        style={{ borderLeft: border, background: skinVars.colors.background, color: skinVars.colors.textSecondary }}
      >
        <ListOrdered size={16} />
        <span className="text-[12px] font-semibold" style={{ writingMode: 'vertical-rl' }}>
          Linha do tempo ({steps.length})
        </span>
      </button>
    );
  }

  const unreached = selectedNodeId && !steps.some((s) => s.nodeId === selectedNodeId) ? flowNodes.find((n) => n.id === selectedNodeId) : undefined;

  return (
    <div className="shrink-0 h-full flex" style={{ width }}>
      <div
        onMouseDown={(e) => {
          dragRef.current = { startX: e.clientX, startWidth: width };
          document.body.style.cursor = 'col-resize';
          document.body.style.userSelect = 'none';
        }}
        className="w-[5px] shrink-0 h-full cursor-col-resize flex items-center justify-center"
        style={{ background: skinVars.colors.backgroundAlternative, borderLeft: border }}
        title="Arraste para redimensionar"
      >
        <div className="w-[3px] h-10 rounded-full" style={{ background: skinVars.colors.border }} />
      </div>
      <div className="flex-1 min-w-0 h-full flex flex-col min-h-0" style={{ background: skinVars.colors.background }}>
        <div className="shrink-0 px-4 py-3 flex items-center gap-2" style={{ borderBottom: border }}>
          <span className="flex-1 text-[13px] font-semibold" style={{ color: skinVars.colors.textPrimary }}>
            Linha do tempo
          </span>
          <button
            type="button"
            onClick={() => setCollapsed(true)}
            title="Recolher a linha do tempo"
            className="border-0 bg-transparent cursor-pointer p-[2px] flex"
            style={{ color: skinVars.colors.textSecondary }}
          >
            <PanelRightClose size={15} />
          </button>
        </div>
        <ol className="flex-1 min-h-0 overflow-auto m-0 px-3 py-3 list-none flex flex-col gap-[6px]">
          {unreached && (
            <li className="rounded-lg px-3 py-2" style={{ background: skinVars.colors.backgroundAlternative, border: `1px dashed ${skinVars.colors.border}` }}>
              <span className="block text-[10.5px]" style={{ color: skinVars.colors.textSecondary }}>
                {NODE_TYPE_LABEL_PT[unreached.type] ?? 'Etapa'} · ainda não alcançada
              </span>
              <span className="block text-[13px] font-medium" style={{ color: skinVars.colors.textPrimary }}>
                {unreached.name}
              </span>
              <StepDetails
                nodeId={unreached.id}
                detail={undefined}
                flowNodes={flowNodes}
                flowConnections={flowConnections}
                visitedNodeIds={visitedNodeIds}
                currentNodeId={currentNodeId}
                variables={variables}
              />
            </li>
          )}
          {steps.map((step, i) => {
            const expanded = open === i;
            const selected = selectedNodeId === step.nodeId;
            return (
              <li
                key={`${step.nodeId}-${i}`}
                ref={(el) => {
                  cardRefs.current[i] = el;
                }}
                className="rounded-lg px-3 py-2"
                style={{
                  background: selected ? skinVars.colors.brandLow : skinVars.colors.backgroundContainer,
                  border: `1px solid ${step.failure ? skinVars.colors.error : skinVars.colors.border}`,
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setOpen(expanded ? null : i);
                    onSelect(expanded ? null : step.nodeId);
                  }}
                  aria-expanded={expanded}
                  className="w-full flex items-start gap-[8px] border-0 bg-transparent p-0 text-left cursor-pointer"
                >
                  <span
                    className="shrink-0 mt-[1px] h-[20px] min-w-[20px] px-[5px] rounded-full flex items-center justify-center text-[10.5px] font-bold"
                    style={{ background: skinVars.colors.brand, color: '#fff' }}
                  >
                    {i + 1}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="flex items-center gap-[6px] text-[10.5px]" style={{ color: skinVars.colors.textSecondary }}>
                      {step.auto ? <Cpu size={11} /> : <User size={11} />}
                      {NODE_TYPE_LABEL_PT[step.nodeType] ?? 'Etapa'}
                      {step.auto && <span>· pelo motor</span>}
                      <span className="flex-1" />
                      <Clock size={10} />
                      {step.time.slice(0, 8)}
                    </span>
                    <span className="block text-[13px] font-medium truncate" style={{ color: skinVars.colors.textPrimary }}>
                      {step.nodeName}
                    </span>
                    {step.failure && (
                      <span className="flex items-start gap-[4px] text-[11.5px] mt-[2px]" style={{ color: skinVars.colors.error }}>
                        <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
                        Seguiu pelo caminho "Se falhar": {step.failure}
                      </span>
                    )}
                  </span>
                  {expanded ? <ChevronDown size={14} color={skinVars.colors.textSecondary} /> : <ChevronRight size={14} color={skinVars.colors.textSecondary} />}
                </button>
                {expanded && (
                  <StepDetails
                    nodeId={step.nodeId}
                    detail={nodeIO[step.nodeId]}
                    flowNodes={flowNodes}
                    flowConnections={flowConnections}
                    visitedNodeIds={visitedNodeIds}
                    currentNodeId={currentNodeId}
                    variables={variables}
                  />
                )}
              </li>
            );
          })}
          {wait && (
            <li
              className="rounded-lg px-3 py-2 flex items-start gap-[8px]"
              style={{
                background: wait.tone === 'error' ? skinVars.colors.errorLow : skinVars.colors.backgroundAlternative,
                border: `1px dashed ${wait.tone === 'error' ? skinVars.colors.error : skinVars.colors.border}`,
              }}
            >
              {wait.tone === 'error' ? (
                <AlertTriangle size={15} className="shrink-0 mt-[2px]" color={skinVars.colors.error} />
              ) : (
                <Hourglass size={15} className="shrink-0 mt-[2px]" color={skinVars.colors.textSecondary} />
              )}
              <span className="min-w-0">
                <span className="block text-[12.5px] font-semibold" style={{ color: wait.tone === 'error' ? skinVars.colors.error : skinVars.colors.textPrimary }}>
                  {wait.title}
                </span>
                <span className="block text-[12px] leading-[1.45]" style={{ color: skinVars.colors.textSecondary }}>
                  {wait.detail}
                </span>
              </span>
            </li>
          )}
          <div ref={endRef} />
        </ol>
      </div>
    </div>
  );
}
