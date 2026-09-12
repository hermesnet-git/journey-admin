import type { ConnectorConfigInfo, FlowConnectionInfo, FlowNodeInfo, NodeIODetail } from '../execution/api';
import type { IncidentEntry, VariableSnapshot, VariableTimelineEntry } from './api';

// Props comuns às 3 propostas de layout do drawer do nó (Inspector/Narrativa/Abas) — tudo já
// resolvido pelo DiagnosticoNodeDrawer (dono do estado de qual layout está selecionado, largura,
// fechar), pra nenhuma das 3 duplicar a mesma derivação.
export interface NodeLayoutProps {
  nodeId: string;
  detail: NodeIODetail | undefined;
  flowNode: FlowNodeInfo | undefined;
  flowNodes: FlowNodeInfo[];
  flowConnections: FlowConnectionInfo[];
  visitedNodeIds: string[];
  currentNodeId: string | null;
  variables: VariableSnapshot[];
  variableTimeline: VariableTimelineEntry[];
  // Já filtrado pro nodeId deste drawer — null quando não há incidente associado a este nó.
  incident: IncidentEntry | null;
  isCurrent: boolean;
  isGateway: boolean;
  // Falso só quando a instância nunca alcançou este nó (nem está parada nele agora) — não faz
  // sentido "fotografar" variáveis pra um ponto que nunca aconteceu.
  reached: boolean;
  connectorConfig: ConnectorConfigInfo | null;
  typeLabel: string | null;
  fallbackName: string;
  timing: string;
}
