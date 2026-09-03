import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, ChevronRight, ChevronUp, Copy, GitBranch, Pencil, Plug, Route, Search, Sliders, ScrollText, X } from 'lucide-react';
import { Stack, Text, TextFieldBase, skinVars } from '@telefonica/mistica';
import {
  isInternalVariableName,
  type BackendConnectorType,
  type ConnectorConfigInfo,
  type FlowConnectionInfo,
  type FlowNodeInfo,
  type NodeIODetail,
  type VariableEntry,
} from './api';
import { FlowDiagramViewer } from './FlowDiagramViewer';

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  data?: Record<string, unknown>;
  isError?: boolean;
}

interface Props {
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
  erroredNodeId?: string | null;
  erroredNodeName?: string | null;
  erroredMessage?: string | null;
  // Input/output de cada nó já visitado, por nodeId — ao vivo (acumulado passo a passo) ou histórico
  // (tudo de uma vez) alimentam o mesmo mapa. Clicar num nó no Fluxo mostra a entrada dele aqui.
  nodeIO: Record<string, NodeIODetail>;
  variables: VariableEntry[];
  // Ausente em modo histórico (instância já terminada — editar variável não faz sentido nela): a
  // tabela simplesmente esconde o lápis de edição quando não há callback.
  onEditVariable?: (name: string, rawValue: string, type: string) => void;
  log: LogEntry[];
  // Quando true, ocupa 100% da altura do pai em vez do drawer redimensionável de altura fixa — usado
  // no Histórico, onde não há nada acima competindo por espaço (o modo Ao Vivo mantém o drawer, que
  // fica abaixo do preview do canal e por isso precisa de altura própria/arrastável).
  fillHeight?: boolean;
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
  nodeIO,
  variables,
  onEditVariable,
  log,
  fillHeight = false,
}: Props) {
  const [tab, setTab] = useState<TabKey>('workflow');
  const [height, setHeight] = useState(DEFAULT_HEIGHT);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
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
      className={fillHeight ? 'w-full flex-1 min-h-0 flex flex-col' : 'w-full shrink-0 flex flex-col min-h-0'}
      style={
        fillHeight
          ? { background: skinVars.colors.backgroundContainer }
          : { height, background: skinVars.colors.backgroundContainer, borderTop: `1px solid ${skinVars.colors.border}` }
      }
    >
      {!fillHeight && (
        <div
          onMouseDown={startDrag}
          className="w-full h-[7px] shrink-0 flex items-center justify-center cursor-ns-resize"
          style={{ background: skinVars.colors.backgroundAlternative }}
          title="Arraste para redimensionar"
        >
          <div className="w-10 h-[3px] rounded-full" style={{ background: skinVars.colors.border }} />
        </div>
      )}

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
        <div className={tab === 'workflow' ? 'h-full flex' : 'hidden'}>
          <div className="flex-1 min-w-0 h-full">
            <FlowDiagramViewer
              flowNodes={flowNodes}
              flowConnections={flowConnections}
              currentNodeId={currentNodeId}
              visitedNodeIds={visitedNodeIds}
              erroredNodeId={erroredNodeId}
              erroredNodeName={erroredNodeName}
              erroredMessage={erroredMessage}
              selectedNodeId={selectedNodeId}
              onNodeSelect={setSelectedNodeId}
            />
          </div>
          {selectedNodeId && (
            <NodeDetailDrawer
              detail={nodeIO[selectedNodeId]}
              flowNode={flowNodes.find((n) => n.id === selectedNodeId)}
              flowNodes={flowNodes}
              flowConnections={flowConnections}
              currentNodeId={currentNodeId}
              visitedNodeIds={visitedNodeIds}
              variables={variables}
              fallbackName={flowNodes.find((n) => n.id === selectedNodeId)?.name ?? selectedNodeId}
              onClose={() => setSelectedNodeId(null)}
            />
          )}
        </div>

        {tab === 'variaveis' && (
          <div className="h-full overflow-auto p-4">
            <VariablesTable variables={variables} onEdit={onEditVariable} />
          </div>
        )}

        {tab === 'log' && <LogPanel log={log} endRef={logEndRef} />}
      </div>
    </div>
  );
}

const NODE_TYPE_LABEL_PT: Record<string, string> = {
  START: 'Início',
  USER_TASK: 'Tarefa de usuário',
  SERVICE_TASK: 'Tarefa de serviço',
  RECEIVE_TASK: 'Tarefa de recebimento',
  MESSAGE_START_EVENT: 'Início por mensagem',
  GATEWAY: 'Decisão',
  END: 'Fim',
};

const DEFAULT_DRAWER_WIDTH = 300;
const MIN_DRAWER_WIDTH = 260;
const MAX_DRAWER_WIDTH = 640;

const CONNECTOR_TYPE_LABEL: Record<BackendConnectorType, string> = {
  REST: 'API REST',
  KAFKA: 'Kafka',
  EVENT_HUBS: 'Event Hubs',
  SERVICE_BUS: 'Service Bus',
};

// Painel que abre ao clicar num nó do Fluxo (ao vivo ou histórico) — mostra o que aquele nó
// especificamente recebeu/produziu, sem competir com as abas Variáveis/Log (que continuam sendo a
// visão de tudo, sem filtro). `detail` vem ausente pra um nó sem input/output (START/END/GATEWAY) ou
// ainda não resolvido no mapa nodeIO — nos dois casos mostra só o nome/tipo que dá pra inferir do
// próprio fluxo, com um aviso no lugar dos blocos JSON. `flowNode` traz a configuração do conector
// (existe pro nó independente de ele já ter sido executado ou não), usada pela seção de conector.
function NodeDetailDrawer({
  detail,
  flowNode,
  flowNodes,
  flowConnections,
  currentNodeId,
  visitedNodeIds,
  variables,
  fallbackName,
  onClose,
}: {
  detail: NodeIODetail | undefined;
  flowNode: FlowNodeInfo | undefined;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
  variables: VariableEntry[];
  fallbackName: string;
  onClose: () => void;
}) {
  const [width, setWidth] = useState(DEFAULT_DRAWER_WIDTH);
  const draggingRef = useRef<{ startX: number; startWidth: number } | null>(null);
  const typeLabel = NODE_TYPE_LABEL_PT[detail?.nodeType ?? flowNode?.type ?? ''] ?? null;
  const connectorConfig = flowNode?.connectorConfig ?? null;
  const isGateway = (detail?.nodeType ?? flowNode?.type) === 'GATEWAY';
  // Só o nó START comum declara isso (REQ-03.12.001) — MESSAGE_START_EVENT não tem início manual,
  // a config dele é só o conector (mostrado por ConnectorConfigSection acima).
  const startVariables = flowNode?.type === 'START' ? (flowNode.startVariables ?? []) : [];

  useEffect(() => {
    function onMove(e: MouseEvent) {
      const drag = draggingRef.current;
      if (!drag) return;
      const next = drag.startWidth + (drag.startX - e.clientX);
      setWidth(Math.min(Math.max(next, MIN_DRAWER_WIDTH), MAX_DRAWER_WIDTH));
    }
    function onUp() {
      if (!draggingRef.current) return;
      draggingRef.current = null;
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

  function startDrag(e: React.MouseEvent) {
    draggingRef.current = { startX: e.clientX, startWidth: width };
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <div className="shrink-0 h-full flex" style={{ width }}>
      {/* Alça só horizontal (col-resize) — a altura acompanha sempre o pai, nunca redimensiona
          verticalmente, diferente do drawer de baixo (InspectorPanel) que só redimensiona vertical. */}
      <div
        onMouseDown={startDrag}
        className="w-[5px] shrink-0 h-full cursor-col-resize flex items-center justify-center"
        style={{ background: skinVars.colors.backgroundAlternative, borderLeft: `1px solid ${skinVars.colors.border}` }}
        title="Arraste para redimensionar"
      >
        <div className="w-[3px] h-10 rounded-full" style={{ background: skinVars.colors.border }} />
      </div>
      <div className="flex-1 min-w-0 h-full overflow-auto" style={{ background: skinVars.colors.background }}>
        <div className="flex items-start justify-between gap-2 p-3 border-b" style={{ borderColor: skinVars.colors.border }}>
          <div className="min-w-0">
            <Text size={13} weight="medium" color={skinVars.colors.textPrimary}>
              {detail?.nodeName ?? fallbackName}
            </Text>
            {typeLabel && (
              <div className="mt-[2px]">
                <Text size={11} color={skinVars.colors.textSecondary}>
                  {typeLabel} · {nodeDurationLabel(detail)}
                </Text>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            title="Fechar"
            className="shrink-0 cursor-pointer border-0 bg-transparent"
            style={{ color: skinVars.colors.textSecondary }}
          >
            <X size={15} />
          </button>
        </div>
        <div className="p-3 flex flex-col gap-3">
          {isGateway && flowNode && (
            <GatewaySection
              gatewayId={flowNode.id}
              flowNodes={flowNodes}
              flowConnections={flowConnections}
              currentNodeId={currentNodeId}
              visitedNodeIds={visitedNodeIds}
            />
          )}
          {connectorConfig && <ConnectorConfigSection connectorConfig={connectorConfig} nodeType={flowNode?.type} />}
          {startVariables.length > 0 && <StartVariablesSection startVariables={startVariables} variables={variables} />}
          {/* Conector de tópico (Kafka/Event Hubs/Service Bus) não tem "entrada" no sentido de
              request/response — o que entra é a própria mensagem publicada/consumida. */}
          {detail?.input && (
            <CollapsibleJsonSection title={connectorConfig && connectorConfig.connectorType !== 'REST' ? 'Payload da Mensagem' : 'Entrada'} data={detail.input} />
          )}
          {detail?.output && <CollapsibleJsonSection title="Saída" data={detail.output} />}
          {!isGateway && !connectorConfig && startVariables.length === 0 && !detail?.input && !detail?.output && (
            <Text size={12.5} color={skinVars.colors.textSecondary}>
              Sem dados de entrada/saída para esta etapa.
            </Text>
          )}
        </div>
      </div>
    </div>
  );
}

// Lista as saídas do gateway (condição/"padrão" de cada uma) — mesmo critério de "caminho
// percorrido" que já colore as arestas no diagrama (FlowDiagramViewer): a aresta cujo destino está
// em `visitedNodeIds` (ou é o `currentNodeId` atual) foi a escolhida por esta decisão. Sem instância
// (staticView) nada fica marcado como tomado — só a lista de condições configuradas.
function GatewaySection({
  gatewayId,
  flowNodes,
  flowConnections,
  currentNodeId,
  visitedNodeIds,
}: {
  gatewayId: string;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  currentNodeId: string | null;
  visitedNodeIds: string[];
}) {
  const visited = new Set(visitedNodeIds);
  const outgoing = flowConnections.filter((c) => c.sourceNodeId === gatewayId);

  return (
    <div>
      <div className="flex items-center gap-[6px] mb-2">
        <GitBranch size={12} color={skinVars.colors.textSecondary} />
        <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
          CONDIÇÕES DO GATEWAY
        </Text>
      </div>
      {outgoing.length === 0 ? (
        <Text size={12} color={skinVars.colors.textSecondary}>
          Nenhuma saída configurada.
        </Text>
      ) : (
        <div className="flex flex-col gap-[6px]">
          {outgoing.map((connection) => {
            const targetName = flowNodes.find((n) => n.id === connection.targetNodeId)?.name ?? connection.targetNodeId;
            const taken = visited.has(connection.targetNodeId) || connection.targetNodeId === currentNodeId;
            return (
              <div
                key={connection.id}
                className="rounded-md p-2 flex flex-col gap-[2px]"
                style={{
                  background: taken ? skinVars.colors.successLow : skinVars.colors.backgroundAlternative,
                  border: taken ? `1px solid ${skinVars.colors.success}` : undefined,
                }}
              >
                <div className="flex items-center gap-[6px]">
                  {taken && <Check size={12} color={skinVars.colors.success} />}
                  <Text size={12} weight="medium" color={taken ? skinVars.colors.success : skinVars.colors.textPrimary}>
                    → {targetName}
                  </Text>
                </div>
                <Text size={11} color={skinVars.colors.textSecondary}>
                  {connection.isDefault ? 'Caminho padrão' : (connection.condition ?? 'Sem condição')}
                </Text>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// REST mostra método+URL sempre à mão (é o que mais importa pra diagnosticar) e detalhes
// secundários (headers/body) resumidos em texto — a lista de headers de verdade fica junto,
// já que "qual API está configurada" (REQ do usuário) inclui saber o que está sendo mandado, não só
// pra onde. Kafka/Event Hubs/Service Bus mostram tópico + cluster, e "Produção"/"Consumo" conforme o
// tipo do nó (SERVICE_TASK publica, RECEIVE_TASK consome) — mesmo tratamento pros três, só troca o
// rótulo "Tópico"/"Event Hub".
function ConnectorConfigSection({ connectorConfig, nodeType }: { connectorConfig: ConnectorConfigInfo; nodeType?: string }) {
  const cfg = connectorConfig.config ?? {};
  const typeLabel = CONNECTOR_TYPE_LABEL[connectorConfig.connectorType] ?? connectorConfig.connectorType;

  return (
    <div>
      <div className="flex items-center gap-[6px] mb-2">
        <Plug size={12} color={skinVars.colors.textSecondary} />
        <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
          CONFIGURAÇÃO DO CONECTOR
        </Text>
      </div>
      <div
        className="rounded-md p-2 flex flex-col gap-[6px]"
        style={{ background: skinVars.colors.backgroundAlternative }}
      >
        <span
          className="inline-flex items-center gap-1 rounded-full px-[8px] py-[2px] text-[10.5px] font-semibold w-fit"
          style={{ background: skinVars.colors.background, color: skinVars.colors.brand }}
        >
          {typeLabel}
        </span>
        {connectorConfig.connectorType === 'REST' ? (
          <RestConnectorDetails cfg={cfg} />
        ) : (
          <TopicConnectorDetails cfg={cfg} connectorType={connectorConfig.connectorType} nodeType={nodeType} />
        )}
      </div>
    </div>
  );
}

// O que o nó START pede pra quem inicia a jornada (REQ-03.12.001) — mostra o valor que de fato
// chegou pra cada uma (lido do mesmo mapa de variáveis de processo da aba Variáveis, por nome),
// não a declaração de tipo: é isso que ajuda a diagnosticar "veio vazio"/"veio o valor errado".
// Sem valor ainda resolvido (nó nunca visitado/instância nunca chegou a iniciar) mostra "—".
function StartVariablesSection({
  startVariables,
  variables,
}: {
  startVariables: { name: string; type: string }[];
  variables: VariableEntry[];
}) {
  const valueByName = new Map(variables.map((v) => [v.name, v.value]));
  return (
    <div>
      <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
        VARIÁVEIS DE ENTRADA
      </Text>
      <div
        className="rounded-md p-2 mt-1 flex flex-col gap-[4px]"
        style={{ background: skinVars.colors.backgroundAlternative }}
      >
        {startVariables.map((v) => {
          const value = valueByName.get(v.name);
          return (
            <div key={v.name} className="flex items-center justify-between gap-2">
              <span className="text-[12px] shrink-0" style={{ color: skinVars.colors.textSecondary, fontFamily: 'monospace' }}>
                {v.name}
              </span>
              <span className="text-[12px] truncate" style={{ color: skinVars.colors.textPrimary }} title={value != null ? String(value) : undefined}>
                {value != null ? String(value) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RestConnectorDetails({ cfg }: { cfg: Record<string, unknown> }) {
  const method = (cfg.method as string) || null;
  const url = (cfg.url as string) || null;
  const headers = (cfg.headers as Record<string, string>) ?? {};
  const headerEntries = Object.entries(headers);
  const hasBody = !!cfg.body && Object.keys(cfg.body as object).length > 0;

  return (
    <>
      <div className="text-[12px]" style={{ color: skinVars.colors.textPrimary, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {method && url ? `${method} ${url}` : 'URL ainda não configurada'}
      </div>
      {headerEntries.length > 0 && (
        <div>
          <Text size={10.5} color={skinVars.colors.textSecondary}>
            HEADERS ({headerEntries.length})
          </Text>
          <div className="flex flex-col gap-[2px] mt-[2px]">
            {headerEntries.map(([key, value]) => (
              <div key={key} className="text-[11px]" style={{ color: skinVars.colors.textPrimary, fontFamily: 'monospace' }}>
                {key}: {value}
              </div>
            ))}
          </div>
        </div>
      )}
      {hasBody && (
        <Text size={11} color={skinVars.colors.textSecondary}>
          Body configurado
        </Text>
      )}
    </>
  );
}

// MESSAGE_START_EVENT também é consumer — a jornada só começa quando uma mensagem real chega
// nesse tópico, mesma direção de RECEIVE_TASK, só que inicia a instância em vez de retomá-la.
const CONSUMER_NODE_TYPES = new Set(['RECEIVE_TASK', 'MESSAGE_START_EVENT']);

function TopicConnectorDetails({
  cfg,
  connectorType,
  nodeType,
}: {
  cfg: Record<string, unknown>;
  connectorType: BackendConnectorType;
  nodeType?: string;
}) {
  const topicLabel = connectorType === 'EVENT_HUBS' ? 'Event Hub' : 'Tópico';
  const operationLabel = nodeType ? (CONSUMER_NODE_TYPES.has(nodeType) ? 'Consumer' : 'Producer') : null;
  const clusterId = (cfg.clusterId as string) || null;
  const topic = (cfg.topic as string) || null;

  return (
    <>
      {operationLabel && (
        <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
          {operationLabel}
        </Text>
      )}
      <div className="text-[12px]" style={{ color: skinVars.colors.textPrimary, fontFamily: 'monospace', wordBreak: 'break-all' }}>
        {topicLabel}: {topic || '—'}
      </div>
      {clusterId && (
        <div className="text-[11px]" style={{ color: skinVars.colors.textSecondary, fontFamily: 'monospace' }}>
          Cluster: {clusterId}
        </div>
      )}
    </>
  );
}

function nodeDurationLabel(detail?: NodeIODetail): string {
  if (!detail || detail.durationMillis == null) return detail?.endTime ? 'concluído' : 'em andamento';
  const seconds = detail.durationMillis / 1000;
  return seconds < 60 ? `${seconds.toFixed(1)} s` : `${(seconds / 60).toFixed(1)} min`;
}

// "response"/"payload" chegam do motor como STRING contendo JSON serializado (a variável nunca foi
// tipada como Json, só String — vale tanto pro corpo de resposta REST quanto pro envelope Kafka
// gravado em __kafkaPayload__) — sem isso, a tela mostrava aspas escapadas (\") em vez do JSON de
// verdade. Tenta reparsear qualquer string que pareça JSON, recursivamente, só pra exibição/cópia;
// nunca muda o dado guardado no motor, e uma string que não é JSON de verdade sai ilesa (catch).
function prettifyJson(value: unknown): unknown {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    const looksLikeJson = (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'));
    if (!looksLikeJson) return value;
    try {
      return prettifyJson(JSON.parse(trimmed));
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) return value.map(prettifyJson);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, prettifyJson(v)]));
  }
  return value;
}

function CollapsibleJsonSection({ title, data }: { title: string; data: Record<string, unknown> }) {
  const [open, setOpen] = useState(true);
  const pretty = useMemo(() => prettifyJson(data) as Record<string, unknown>, [data]);
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0"
        >
          {open ? (
            <ChevronDown size={12} color={skinVars.colors.textSecondary} />
          ) : (
            <ChevronRight size={12} color={skinVars.colors.textSecondary} />
          )}
          <Text size={11} weight="medium" color={skinVars.colors.textSecondary}>
            {title.toUpperCase()}
          </Text>
        </button>
        {open && <CopyJsonButton data={pretty} />}
      </div>
      {open && (
        <pre
          className="rounded-md px-2 py-1 text-[11px] overflow-auto m-0"
          style={{
            background: skinVars.colors.backgroundAlternative,
            color: skinVars.colors.textPrimary,
            fontFamily: 'monospace',
            maxHeight: 260,
          }}
        >
          {JSON.stringify(pretty, null, 2)}
        </pre>
      )}
    </div>
  );
}

const VARIABLES_COL_LABELS = ['Nome', 'Valor', 'Tipo'];
const DEFAULT_VARIABLES_COL_WIDTHS = [220, 560, 90];
const MIN_VARIABLES_COL_WIDTH = 40;
const VARIABLES_ACTION_COL_WIDTH = 28;

function VariablesTable({
  variables,
  onEdit,
}: {
  variables: VariableEntry[];
  // Ausente em modo histórico — a coluna de ação fica vazia, sem o lápis de edição.
  onEdit?: (name: string, rawValue: string, type: string) => void;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  // Larguras arrastáveis (pedido do usuário: "grid pra poder aumentar e diminuir as colunas") — só
  // Nome/Valor/Tipo, a coluna de ação é sempre um ícone só, não faz sentido redimensionar.
  const [colWidths, setColWidths] = useState<number[]>(DEFAULT_VARIABLES_COL_WIDTHS);
  // __kafkaTopic__/__kafkaPayload__ are technical, captured per node for the Log tab — not meant to
  // read as a regular process variable here.
  const visibleVariables = variables.filter((v) => !isInternalVariableName(v.name));

  if (visibleVariables.length === 0) {
    return (
      <Text size={13} color={skinVars.colors.textSecondary}>
        Nenhuma variável definida ainda neste processo.
      </Text>
    );
  }

  function resizeColumn(index: number, deltaX: number) {
    setColWidths((prev) => {
      const next = [...prev];
      next[index] = Math.max(MIN_VARIABLES_COL_WIDTH, next[index] + deltaX);
      return next;
    });
  }

  return (
    <table
      style={{
        borderCollapse: 'collapse',
        tableLayout: 'fixed',
        textAlign: 'left',
        width: colWidths.reduce((a, b) => a + b, 0) + VARIABLES_ACTION_COL_WIDTH,
      }}
    >
      <colgroup>
        {colWidths.map((w, i) => (
          <col key={i} style={{ width: w }} />
        ))}
        <col style={{ width: VARIABLES_ACTION_COL_WIDTH }} />
      </colgroup>
      <thead>
        <tr>
          {VARIABLES_COL_LABELS.map((h, i) => (
            <th
              key={h}
              className={`relative pb-1 ${i === 2 ? 'text-right' : ''}`}
              style={{ color: skinVars.colors.textSecondary }}
            >
              <span className="block truncate text-[10.5px] font-semibold uppercase">{h}</span>
              <ColumnResizeHandle onResize={(dx) => resizeColumn(i, dx)} />
            </th>
          ))}
          <th />
        </tr>
      </thead>
      <tbody>
        {visibleVariables.map((v) => {
          const isEditing = editing === v.name;
          return (
            <tr key={v.name} style={{ borderTop: `1px solid ${skinVars.colors.border}` }}>
              <td
                className="py-1 pr-2 text-[12px] font-mono overflow-hidden text-ellipsis whitespace-nowrap"
                title={v.name}
                style={{ color: skinVars.colors.textPrimary }}
              >
                {v.name}
              </td>
              <td
                className="py-1 pr-2 text-[12px] overflow-hidden text-ellipsis whitespace-nowrap"
                title={String(v.value)}
                style={{ color: skinVars.colors.textPrimary }}
              >
                {isEditing ? (
                  <TextFieldBase value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
                ) : (
                  String(v.value)
                )}
              </td>
              <td
                className="py-1 text-[11px] text-right overflow-hidden text-ellipsis whitespace-nowrap"
                title={v.type}
                style={{ color: skinVars.colors.textSecondary }}
              >
                {v.type}
              </td>
              <td className="py-1 pl-2 text-right whitespace-nowrap">
                {isEditing ? (
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent"
                    style={{ color: skinVars.colors.brand }}
                    onClick={() => {
                      onEdit?.(v.name, draft, v.type);
                      setEditing(null);
                    }}
                  >
                    <Check size={13} />
                  </button>
                ) : onEdit ? (
                  <button
                    type="button"
                    className="cursor-pointer border-0 bg-transparent"
                    style={{ color: skinVars.colors.textSecondary }}
                    onClick={() => {
                      setEditing(v.name);
                      setDraft(String(v.value));
                    }}
                  >
                    <Pencil size={12} />
                  </button>
                ) : null}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// Alça de redimensionar coluna: arrasta livremente (cada coluna redimensiona independente das
// vizinhas — a tabela como um todo só cresce/encolhe, sem "roubar" espaço de outra coluna), com
// feedback visual só no hover/drag pra não poluir o cabeçalho quando parado.
function ColumnResizeHandle({ onResize }: { onResize: (deltaX: number) => void }) {
  const [active, setActive] = useState(false);

  function handleMouseDown(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setActive(true);
    let lastX = e.clientX;
    function onMove(ev: MouseEvent) {
      onResize(ev.clientX - lastX);
      lastX = ev.clientX;
    }
    function onUp() {
      setActive(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }

  return (
    <span
      onMouseDown={handleMouseDown}
      onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.brand)}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
      className="absolute top-0 bottom-0 -right-[3px] w-[6px] cursor-col-resize z-10"
      style={{ background: active ? skinVars.colors.brand : 'transparent' }}
    />
  );
}

function logRowId(id: string) {
  return `log-row-${id}`;
}

const MATCH_BG = 'rgba(250, 204, 21, 0.14)';
const ACTIVE_MATCH_BG = 'rgba(249, 115, 22, 0.16)';
const MATCH_MARK_BG = 'rgba(250, 204, 21, 0.55)';
const ACTIVE_MATCH_MARK_BG = 'rgba(249, 115, 22, 0.6)';

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
      <mark
        key={idx}
        style={{ background: strong ? ACTIVE_MATCH_MARK_BG : MATCH_MARK_BG, color: 'inherit', borderRadius: 2, padding: '0 1px' }}
      >
        {text.slice(idx, idx + q.length)}
      </mark>,
    );
    i = idx + q.length;
    idx = lower.indexOf(lowerQ, i);
  }
  if (i < text.length) parts.push(text.slice(i));
  return parts;
}

function LogPanel({ log, endRef }: { log: LogEntry[]; endRef: React.RefObject<HTMLDivElement | null> }) {
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

  // Toda vez que a busca muda (inclusive a cada tecla digitada), pula pro primeiro resultado — é o
  // que uma busca de "encontrar no texto" (Ctrl+F do navegador) já faz, sem exigir Enter só pra ver
  // o primeiro achado.
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
    <div className="h-full flex flex-col min-h-0">
      <LogToolbar
        query={query}
        onQueryChange={setQuery}
        matchCount={matchingIds.length}
        activeMatchIndex={activeMatchIndex}
        onNext={() => revealMatch(activeMatchIndex + 1)}
        onPrev={() => revealMatch(activeMatchIndex - 1)}
        canExpandAll={entriesWithData.length > 0}
        onExpandAll={() => setExpandedIds(new Set(entriesWithData.map((e) => e.id)))}
        onCollapseAll={() => setExpandedIds(new Set())}
      />
      <div className="flex-1 min-h-0 overflow-auto p-4">
        {log.length === 0 ? (
          <Text size={13} color={skinVars.colors.textSecondary}>
            Nenhuma ação registrada ainda.
          </Text>
        ) : (
          <Stack space={4}>
            {log.map((entry) => (
              <LogRow
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
          </Stack>
        )}
      </div>
    </div>
  );
}

function LogToolbar({
  query,
  onQueryChange,
  matchCount,
  activeMatchIndex,
  onNext,
  onPrev,
  canExpandAll,
  onExpandAll,
  onCollapseAll,
}: {
  query: string;
  onQueryChange: (value: string) => void;
  matchCount: number;
  activeMatchIndex: number;
  onNext: () => void;
  onPrev: () => void;
  canExpandAll: boolean;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}) {
  const navBtnStyle: React.CSSProperties = {
    color: skinVars.colors.textSecondary,
    background: 'transparent',
  };
  const textBtnClass =
    'h-7 px-2 rounded-md text-[11.5px] font-medium border-0 cursor-pointer disabled:opacity-40 disabled:cursor-default';

  return (
    <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b" style={{ borderColor: skinVars.colors.border }}>
      <div className="relative flex-1 min-w-0 max-w-[260px]">
        <Search
          size={12.5}
          color={skinVars.colors.textSecondary}
          style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            e.preventDefault();
            if (e.shiftKey) onPrev();
            else onNext();
          }}
          placeholder="Buscar no log..."
          autoComplete="off"
          className="w-full h-7 box-border rounded-md outline-none"
          style={{
            padding: query ? '0 24px 0 26px' : '0 8px 0 26px',
            fontSize: 12.5,
            border: `1px solid ${skinVars.colors.border}`,
            background: skinVars.colors.background,
            color: skinVars.colors.textPrimary,
          }}
        />
        {query && (
          <button
            type="button"
            onClick={() => onQueryChange('')}
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
          <Text size={11.5} color={skinVars.colors.textSecondary}>
            {matchCount > 0 ? `${activeMatchIndex + 1}/${matchCount}` : '0/0'}
          </Text>
          <button
            type="button"
            onClick={onPrev}
            disabled={matchCount === 0}
            title="Resultado anterior (Shift+Enter)"
            className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
            style={navBtnStyle}
          >
            <ChevronUp size={14} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={matchCount === 0}
            title="Próximo resultado (Enter)"
            className="w-6 h-6 rounded-md border-0 flex items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-default"
            style={navBtnStyle}
          >
            <ChevronDown size={14} />
          </button>
        </>
      )}

      <div className="flex-1" />

      <button
        type="button"
        onClick={onExpandAll}
        disabled={!canExpandAll}
        className={textBtnClass}
        style={{ color: skinVars.colors.textSecondary }}
      >
        Expandir tudo
      </button>
      <button
        type="button"
        onClick={onCollapseAll}
        disabled={!canExpandAll}
        className={textBtnClass}
        style={{ color: skinVars.colors.textSecondary }}
      >
        Recolher tudo
      </button>
    </div>
  );
}

function LogRow({
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
    <div
      id={logRowId(entry.id)}
      className="rounded-md px-1 -mx-1 py-[2px]"
      style={{ background: isActiveMatch ? ACTIVE_MATCH_BG : isMatch ? MATCH_BG : 'transparent' }}
    >
      <div
        className="flex items-start gap-1"
        style={hasData ? { cursor: 'pointer' } : undefined}
        onClick={hasData ? onToggle : undefined}
      >
        <span className="shrink-0 mt-[3px] w-[12px] flex items-center justify-center" style={{ color: skinVars.colors.textSecondary }}>
          {hasData && (expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />)}
        </span>
        <Text size={12.5} color={entry.isError ? skinVars.colors.error : skinVars.colors.textPrimary}>
          {entry.time} — {highlightText(entry.message, query, isActiveMatch)}
        </Text>
      </div>
      {hasData && expanded && (
        <div className="relative mt-1 ml-4">
          <pre
            className="rounded-md px-2 py-1 pr-14 text-[11px] overflow-auto"
            style={{
              background: skinVars.colors.backgroundAlternative,
              color: skinVars.colors.textSecondary,
              fontFamily: 'monospace',
              maxHeight: 220,
            }}
          >
            {JSON.stringify(prettyData, null, 2)}
          </pre>
          <div className="absolute top-1 right-1">
            <CopyJsonButton data={prettyData!} />
          </div>
        </div>
      )}
    </div>
  );
}

function CopyJsonButton({ data }: { data: Record<string, unknown> }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(data, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard indisponível (ex.: contexto não seguro) — sem feedback, sem quebrar a tela
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copiar JSON"
      className="flex items-center gap-1 cursor-pointer rounded px-1.5 py-0.5 border-0"
      style={{ background: skinVars.colors.backgroundContainer, color: skinVars.colors.textSecondary, fontSize: 10.5 }}
    >
      {copied ? <Check size={11} /> : <Copy size={11} />}
      {copied ? 'Copiado' : 'Copiar'}
    </button>
  );
}
