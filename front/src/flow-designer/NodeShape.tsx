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
function ShapeLabel({ text, color, subtitle }: { text: string; color: string; subtitle?: string | null }) {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 text-center pointer-events-none" style={{ top: '100%', marginTop: 6, width: 110 }}>
      <span
        className="text-[11px] font-medium"
        style={{ color, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}
      >
        {text}
      </span>
      {/* Nome do tipo de conector (REST/KAFKA/...) — mesma informação do badge do canto, só que
          legível como texto sem precisar passar o mouse em cima do ícone pequeno. */}
      {subtitle && (
        <span className="block text-[9px] font-semibold uppercase mt-[1px]" style={{ color, opacity: 0.6, letterSpacing: '.03em' }}>
          {subtitle}
        </span>
      )}
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
  // Mesma espessura de borda pra todo mundo (evento, gateway, task) — a diferenciação BPMN
  // clássica de início/fim por espessura foi abandonada pra manter o contorno visualmente
  // consistente entre todos os formatos do canvas.
  const eventBorderWidth = 1.75;
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
        <Icon size={18} color={iconColor} strokeWidth={1.8} />
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

  // Sempre a cor do TIPO do nó (nunca a do conector) — o anel/preenchimento identifica "que tipo de
  // task é essa" (serviço vs. recebimento, por exemplo); o conector específico (REST/Kafka/...) já
  // tem seu próprio badge colorido no canto. Usar a cor do conector aqui fazia uma Tarefa de Serviço
  // com Kafka ficar com a mesma cor de uma Tarefa de Recebimento — confundia os dois tipos.
  const ringColor = iconColor;
  return (
    <div className="relative w-full h-full">
      {/* Mesmo contorno de evento/início por mensagem — fino, colado na borda, mesma cor neutra
          (borderColor: acompanha seleção, não o tipo/conector). O tipo continua identificável pelo
          ícone e pelo badge de conector no canto. */}
      <div
        className="absolute inset-0 rounded-full flex items-center justify-center"
        style={{ background, borderColor, borderWidth: 1.75, borderStyle: 'solid', boxShadow, ...pulseStyle }}
      >
        <Icon size={24} color={ringColor} strokeWidth={1.7} />
        {hasConnectorBadge && !showErrorBadge && (
          <div
            title={connectorBadgeTitle}
            className="absolute -bottom-[1px] -right-[1px] w-[20px] h-[20px] rounded-full flex items-center justify-center"
            style={{ background: connectorBadgeColor, border: `2px solid ${surfaceColor}` }}
          >
            <ConnectorBadgeIcon size={10} color="#fff" strokeWidth={2.5} />
          </div>
        )}
        {showErrorBadge && (
          <div
            title={errorMessage ?? 'Configuração incompleta'}
            className="absolute -bottom-[6px] -right-[6px] w-[21px] h-[21px] rounded-full flex items-center justify-center"
            style={{ background: errorColor, border: `2px solid ${surfaceColor}` }}
          >
            <TriangleAlert size={12} color="#fff" strokeWidth={2.5} />
          </div>
        )}
      </div>
      {showLabel && <ShapeLabel text={name} color={labelColor} subtitle={hasConnectorBadge ? connectorType : null} />}
    </div>
  );
}
