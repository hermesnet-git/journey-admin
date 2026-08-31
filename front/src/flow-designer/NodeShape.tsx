import { Plug, Radio, TriangleAlert } from 'lucide-react';
import { NODE_DIMENSIONS, NODE_ICON, NODE_SHAPE, type NodeType } from './model';

// Cor própria por tipo de conector (badge do canto do nó) — REST fica com a cor de "chamada"
// (recebida do chamador via badgeColor, não fixa aqui) e cada broker de mensageria ganha uma cor
// distinta entre si, já que o ícone sozinho (Radio) não diferencia Kafka de Event Hubs/Service Bus.
const CONNECTOR_BADGE_COLOR: Record<string, string> = {
  KAFKA: '#ea580c',
  EVENT_HUBS: '#0891b2',
  SERVICE_BUS: '#db2777',
};

// Rótulo abaixo da forma (evento/decisão) — quebra em até 2 linhas em vez de truncar, mesma
// convenção de ferramentas BPMN de mercado (bpmn.io/Camunda Modeler), onde o nome não cabe dentro
// da forma pequena e por isso flutua logo abaixo dela, centralizado.
function ShapeLabel({ text, color }: { text: string; color: string }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none" style={{ top: '100%', marginTop: 6, width: 100 }}>
      <span
        className="text-[11px] font-semibold"
        style={{ color, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
      >
        {text}
      </span>
    </div>
  );
}

export interface NodeShapeProps {
  nodeType: NodeType;
  name: string;
  background: string;
  borderColor: string;
  iconColor: string;
  labelColor: string;
  boxShadow: string;
  // Cor de fundo do marcador de ícone (tarefa) e do anel do badge — normalmente a mesma cor do
  // "papel" atrás do nó (designer: c.cardBg; execução: skinVars.colors.backgroundContainer).
  surfaceColor: string;
  // Cor de preenchimento dos badges de formulário/conector (designer: c.accent).
  badgeColor: string;
  showLabel?: boolean;
  connectorType?: string | null;
  // Contorno pulsante (execução: "etapa atual", aguardando ação) — precisa ir no elemento que
  // corresponde à forma visual de verdade (a própria forma no evento/tarefa, o quadrado ANTES de
  // rotacionar no gateway, já que outline acompanha o transform do próprio elemento) pra não virar
  // um contorno quadrado em cima de um círculo/losango. pulseColor precisa ser hex puro (a cor
  // "dim" do piscar é montada concatenando alfa nela) — nunca um token/var() do tema.
  pulse?: boolean;
  pulseColor?: string;
  // Sinaliza "algo está faltando/errado" (ex.: conector incompleto) — mesmo canto inferior-direito
  // do badge de conector (tem prioridade sobre ele quando os dois se aplicariam, ver shape 'event').
  // errorColor não passa por tema (NodeShape não tem contexto de tema, só recebe cores já resolvidas
  // do chamador), mas deve ser sempre o token de erro/danger — nunca outra cor.
  showErrorBadge?: boolean;
  errorColor?: string;
  // Texto do hover no badge de erro — o motivo específico (ex.: campos faltando), não um rótulo
  // genérico, já que é exatamente onde o usuário vai passar o mouse pra entender o problema.
  errorMessage?: string;
}

// Desenho puro da forma (círculo/losango/caixa) + ícone + badges + rótulo — única implementação,
// reaproveitada pelo editor (WorkflowNode, interativo) e pelos dois visualizadores somente-leitura
// (execution/FlowDiagramViewer: aba "Fluxo da Jornada" e "Ver fluxo" da lista de Jornadas). Ajustar
// a forma aqui já reflete nos três lugares — não recebe tema nenhum, só cores já resolvidas, pra
// funcionar tanto dentro do FlowThemeContext (designer) quanto fora dele (execução usa Mística).
export function NodeShape({
  nodeType,
  name,
  background,
  borderColor,
  iconColor,
  labelColor,
  boxShadow,
  surfaceColor,
  badgeColor,
  showLabel = true,
  connectorType,
  pulse,
  pulseColor,
  showErrorBadge,
  errorColor,
  errorMessage,
}: NodeShapeProps) {
  const shape = NODE_SHAPE[nodeType];
  const dim = NODE_DIMENSIONS[nodeType];
  const Icon = NODE_ICON[nodeType];
  const hasConnectorBadge = !!connectorType;
  // Mesmo badge de sempre, mas o ícone distingue de cara "chama uma API" (REST, tomada) de "manda/
  // recebe mensagem" (Kafka/Event Hubs/Service Bus — qualquer conector de mensageria, mesmo ícone
  // pros três, já que pro usuário o que importa aqui é "não é uma chamada síncrona").
  const isMessagingConnector = hasConnectorBadge && connectorType !== 'REST';
  const ConnectorBadgeIcon = isMessagingConnector ? Radio : Plug;
  const connectorBadgeTitle = isMessagingConnector
    ? `Envia/recebe mensagem (${connectorType})`
    : 'Chama uma API (REST)';
  // Cor própria por tipo de conector — cada broker de mensageria também precisa ser diferenciável
  // entre si, não só de REST (a forma do ícone já distingue REST de mensageria; a cor distingue
  // dentro da mensageria qual broker é). connectorType pode vir null (sem badge) ou algum tipo
  // futuro ainda não mapeado — badgeColor (recebido do chamador) é o fallback nesses dois casos.
  const connectorBadgeColor = (connectorType && CONNECTOR_BADGE_COLOR[connectorType]) || badgeColor;
  // BPMN de mercado distingue início de fim pela espessura da borda do círculo (fino = início,
  // grosso = fim), sem depender de cor pra reconhecer o papel do evento.
  const eventBorderWidth = nodeType === 'end' ? 3 : 1.75;
  const pulseStyle: React.CSSProperties = pulse
    ? {
        outline: `2.5px solid ${pulseColor}`,
        outlineOffset: 1.5,
        ['--sim-outline-full' as string]: pulseColor,
        ['--sim-outline-dim' as string]: `${pulseColor}30`,
        animation: 'blink-current-outline 2.2s ease-in-out infinite',
      }
    : {};

  if (shape === 'event') {
    return (
      <div
        className="relative w-full h-full rounded-full flex items-center justify-center"
        style={{ background, borderColor, borderWidth: eventBorderWidth, borderStyle: 'solid', boxShadow, ...pulseStyle }}
      >
        <Icon size={16} color={iconColor} strokeWidth={1.8} />
        {/* Um círculo pequeno só cabe um badge no canto inferior-direito — erro tem prioridade
            sobre o badge de conector (o problema é justamente o conector, mais relevante ver isso). */}
        {hasConnectorBadge && !showErrorBadge && (
          <div
            title={connectorBadgeTitle}
            className="absolute -bottom-[2px] -right-[2px] w-[13px] h-[13px] rounded-full flex items-center justify-center"
            style={{ background: connectorBadgeColor, border: `1.5px solid ${surfaceColor}` }}
          >
            <ConnectorBadgeIcon size={7.5} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {showErrorBadge && (
          <div
            title={errorMessage ?? 'Configuração incompleta'}
            className="absolute -bottom-[6px] -right-[6px] w-[19px] h-[19px] rounded-full flex items-center justify-center"
            style={{ background: errorColor, border: `2px solid ${surfaceColor}` }}
          >
            <TriangleAlert size={11} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {showLabel && <ShapeLabel text={name} color={labelColor} />}
      </div>
    );
  }

  if (shape === 'gateway') {
    return (
      <div className="relative w-full h-full">
        <div
          className="absolute"
          style={{
            // Quadrado rotacionado 45° centralizado na caixa — lado = width/√2, pra que, depois de
            // girado, as pontas do losango toquem exatamente as bordas da caixa (onde os handles
            // ficam). Preferido a clip-path: clip-path cortaria a própria sombra de seleção.
            inset: (dim.width - dim.width / Math.SQRT2) / 2,
            background,
            borderColor,
            borderWidth: 1.75,
            borderStyle: 'solid',
            boxShadow,
            transform: 'rotate(45deg)',
            ...pulseStyle,
          }}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <Icon size={15} color={iconColor} strokeWidth={2.5} />
        </div>
        {showErrorBadge && (
          <div
            title={errorMessage ?? 'Configuração incompleta'}
            className="absolute -bottom-1 -right-1 w-[19px] h-[19px] rounded-full flex items-center justify-center"
            style={{ background: errorColor, border: `2px solid ${surfaceColor}` }}
          >
            <TriangleAlert size={11} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {showLabel && <ShapeLabel text={name} color={labelColor} />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-[12px] border" style={{ background, borderColor, boxShadow, ...pulseStyle }}>
      {showErrorBadge && (
        <div
          title={errorMessage ?? 'Configuração incompleta'}
          className="absolute -bottom-2 -right-2 w-[22px] h-[22px] rounded-full flex items-center justify-center"
          style={{ background: errorColor, border: `2px solid ${surfaceColor}` }}
        >
          <TriangleAlert size={12} color="#fff" strokeWidth={2.5} />
        </div>
      )}
      <div className="absolute top-[7px] left-[7px] w-[30px] h-[30px] rounded-[9px] flex items-center justify-center" style={{ background: surfaceColor }}>
        <Icon size={18} color={iconColor} strokeWidth={1.8} />
        {hasConnectorBadge && (
          <div
            title={connectorBadgeTitle}
            className="absolute -bottom-1 -right-1 w-[15px] h-[15px] rounded-full flex items-center justify-center"
            style={{ background: connectorBadgeColor, border: `1.5px solid ${surfaceColor}` }}
          >
            <ConnectorBadgeIcon size={8.5} color="#fff" strokeWidth={2.5} />
          </div>
        )}
      </div>
      {showLabel && (
        <div
          className="absolute inset-0 flex items-center justify-center text-center pointer-events-none"
          style={{ padding: '32px 10px 8px 10px' }}
        >
          <span
            className="text-[12px] font-semibold"
            style={{
              color: labelColor,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
              wordBreak: 'break-word',
            }}
          >
            {name}
          </span>
        </div>
      )}
    </div>
  );
}
