import { Plug } from 'lucide-react';
import { NODE_DIMENSIONS, NODE_ICON, NODE_SHAPE, type NodeType } from './model';

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
}: NodeShapeProps) {
  const shape = NODE_SHAPE[nodeType];
  const dim = NODE_DIMENSIONS[nodeType];
  const Icon = NODE_ICON[nodeType];
  const hasConnectorBadge = !!connectorType;
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
        {hasConnectorBadge && (
          <div
            title={`Conector ${connectorType} associado`}
            className="absolute -bottom-[2px] -right-[2px] w-[13px] h-[13px] rounded-full flex items-center justify-center"
            style={{ background: badgeColor, border: `1.5px solid ${surfaceColor}` }}
          >
            <Plug size={7.5} color="#fff" strokeWidth={2.5} />
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
        {showLabel && <ShapeLabel text={name} color={labelColor} />}
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-[12px] border" style={{ background, borderColor, boxShadow, ...pulseStyle }}>
      <div className="absolute top-[7px] left-[7px] w-[22px] h-[22px] rounded-[7px] flex items-center justify-center" style={{ background: surfaceColor }}>
        <Icon size={13} color={iconColor} strokeWidth={1.8} />
        {hasConnectorBadge && (
          <div
            title={`Conector ${connectorType} associado`}
            className="absolute -bottom-1 -right-1 w-[12px] h-[12px] rounded-full flex items-center justify-center"
            style={{ background: badgeColor, border: `1.5px solid ${surfaceColor}` }}
          >
            <Plug size={7} color="#fff" strokeWidth={2.5} />
          </div>
        )}
      </div>
      {showLabel && (
        <div
          className="absolute inset-0 flex items-center justify-center text-center pointer-events-none"
          style={{ padding: '26px 10px 8px 10px' }}
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
