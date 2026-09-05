import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Plus, X } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import { NODE_META, NODE_DIMENSIONS, NODE_ICON, TYPE_COLOR, connectorMissingFields, type NodeType, type WFNode } from './model';
import { NodeShape } from './NodeShape';

const QUICK_ADD_TYPES: NodeType[] = ['userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];

// A lista de opções virou portal pro document.body (position: fixed, coordenadas a partir do
// getBoundingClientRect do próprio botão gatilho) — mesma técnica do dropdown de SearchSelect.tsx,
// pelo mesmo motivo: esse botão fica dentro do canvas do próprio React Flow, que recorta qualquer
// coisa que tente ultrapassar seus limites, então um nó perto da borda do canvas tinha seu popup
// renderizado parcialmente atrás do painel de propriedades (sempre aberto) em vez de por cima dele.
function QuickAdd({ nodeId }: { nodeId: string }) {
  const { c } = useFlowTheme();
  const actions = useWorkflowActions();
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<{ left: number; top: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target) || popoverRef.current?.contains(target)) return;
      setOpen(false);
    };
    // Fase de captura: o próprio canvas do React Flow trata o mousedown pro pan/drag e interrompe a
    // propagação, então um listener na fase de bolha aqui nunca via um clique no canvas — o menu
    // abria mas nada fora do próprio botão/popup conseguia fechá-lo de novo. A captura roda antes
    // disso, de cima pra baixo, então sempre vê o clique independente do que os handlers do alvo
    // fazem com ele depois.
    document.addEventListener('mousedown', onDocClick, true);
    return () => document.removeEventListener('mousedown', onDocClick, true);
  }, [open]);

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    if (!open) {
      const r = buttonRef.current?.getBoundingClientRect();
      if (r) setRect({ left: r.right + 5, top: r.top });
    }
    setOpen((o) => !o);
  }

  return (
    <div
      ref={triggerRef}
      className="absolute top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
      style={{ left: 'calc(100% + 8px)', zIndex: open ? 20 : 1 }}
    >
      <button
        ref={buttonRef}
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
        title="Adicionar próxima etapa"
        className="nodrag w-[17px] h-[17px] rounded-full flex items-center justify-center cursor-pointer"
        style={{ border: `1.5px solid ${c.handleColor}`, background: c.cardBg, color: c.handleColor }}
      >
        <Plus size={11} />
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={popoverRef}
            onPointerDown={(e) => e.stopPropagation()}
            className="fixed w-[180px] rounded-[8px] p-[5px]"
            style={{
              left: rect.left,
              top: rect.top,
              zIndex: 2000,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              boxShadow: '0 10px 30px -8px rgba(0,0,0,.25)',
            }}
          >
            {QUICK_ADD_TYPES.map((t) => {
              const Icon = NODE_ICON[t];
              return (
                <button
                  key={t}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpen(false);
                    actions.onQuickAdd(nodeId, t);
                  }}
                  className="w-full flex items-center gap-[7px] text-left px-[8px] py-[6px] rounded-[6px] border-0 bg-transparent cursor-pointer text-[12px] hover:bg-[var(--flow-hover)]"
                  style={{ color: c.textPrimary, ['--flow-hover' as string]: c.hoverBg }}
                >
                  <Icon size={14} color={TYPE_COLOR[t]} strokeWidth={1.8} />
                  {NODE_META[t].title}
                </button>
              );
            })}
          </div>,
          document.body,
        )}
    </div>
  );
}

export function WorkflowNode({ id, data, selected, type }: NodeProps<WFNode>) {
  const nodeType = type as NodeType;
  const actions = useWorkflowActions();
  const { c, dark, nodeFill } = useFlowTheme();
  const dim = NODE_DIMENSIONS[nodeType];
  const hasInput = nodeType !== 'start' && nodeType !== 'messageStartEvent';
  const hasOutput = nodeType !== 'end';
  const outgoingLimitReached = !!data.outgoingLimitReached;
  // Semantic zoom: em zoom baixo o rótulo quebrado é a primeira coisa a virar ruído ilegível — a
  // própria forma continua reconhecível sem ele, então só o texto some abaixo do limiar.
  const showLabel = (data.zoom ?? 1) >= 0.65;
  const hasConnectorBadge =
    (nodeType === 'serviceTask' || nodeType === 'receiveTask' || nodeType === 'messageStartEvent') && !!data.connectorConfig;
  // Detecção automática, sem botão opt-in: conector sem método/URL (ou cluster/tópico/credencial)
  // não roda de verdade, então o nó já nasce sinalizado — só pelo ícone de erro (badge). Borda/anel
  // vermelhos foram tentados e descartados: competiam com a borda de "selecionado" (mesma cor de
  // anel, só o matiz mudava), confundindo os dois estados quando o nó inválido também era o atual.
  const missingConnectorFields = hasConnectorBadge ? connectorMissingFields(data.connectorConfig) : [];
  const missingGatewayDefault = !!data.missingGatewayDefault;
  const invalid = !!data.invalid || missingConnectorFields.length > 0 || missingGatewayDefault;
  const invalidReason = missingConnectorFields.length > 0
    ? `Conector incompleto — falta: ${missingConnectorFields.join(', ')}`
    : missingGatewayDefault
      ? 'Nenhum caminho marcado como padrão'
      : 'Configuração incompleta';

  const borderColor = selected ? c.accent : c.cardBorder;
  // Resting elevation so shapes read as raised, tappable surfaces against the dotted canvas
  // instead of flat cutouts. Foco de seleção (anel sólido + brilho) somado por cima — precisa ir no
  // boxShadow que o NodeShape aplica na FORMA de verdade (o quadrado antes de rotacionar no
  // gateway), não num wrapper de fora: um boxShadow no wrapper não rotacionado só desenha um
  // quadrado ao redor do losango, nunca um contorno de losango.
  const elevation = dark ? '0 3px 10px rgba(0,0,0,.45), 0 1px 3px rgba(0,0,0,.3)' : '0 3px 8px rgba(15,15,20,.12), 0 1px 2px rgba(15,15,20,.06)';
  // 2.5px = mesma espessura da linha da aresta quando selecionada/focada (JourneyDesignerPage:
  // strokeWidth 2.5 nesse estado), pra ler como o mesmo "peso" de destaque em nó e linha.
  const ring = selected ? `0 0 0 2.5px ${c.accent}, 0 0 14px 3px ${c.accent}55, ${elevation}` : elevation;
  // Both start-type elements are deletable so a MESSAGE_START_EVENT can replace the
  // default START (REQ-03.07.005 allows exactly one, of either type).
  const deletable = true;
  // Leve tom de categoria em vez de um card neutro chapado — mistura a cor do tipo do nó no fundo do
  // card do tema, então continua legível/opaco nos dois temas. Opcional (toggle "Preencher" na
  // toolbar, padrão desligado): card neutro por padrão, sem tingir o fundo. 18% pra ficar
  // perceptível em evento/gateway (fundo quase branco/preto) — 10% sumia de tão sutil.
  const cardFill = nodeFill ? `color-mix(in srgb, ${TYPE_COLOR[nodeType]} 18%, ${c.cardBg})` : c.cardBg;

  return (
    <div
      onDoubleClick={() => actions.onEdit(id)}
      title={missingConnectorFields.length > 0 ? `Conector incompleto — falta: ${missingConnectorFields.join(', ')}` : undefined}
      style={{ width: dim.width, height: dim.height }}
      className="group relative cursor-grab select-none"
    >
      {deletable && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.onDelete(id);
          }}
          onPointerDown={(e) => e.stopPropagation()}
          title="Remover nó"
          className="nodrag absolute -top-[7px] -right-[7px] w-[18px] h-[18px] rounded-full flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ background: c.danger, color: '#fff', zIndex: 10 }}
        >
          <X size={11} strokeWidth={2.5} />
        </button>
      )}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Left}
          className="transition-transform duration-150 hover:scale-[1.8] [&.valid]:scale-[1.8] [&.valid]:!shadow-[0_0_0_4px_var(--handle-ring)]"
          style={{
            width: 7.5,
            height: 7.5,
            background: c.cardBg,
            border: `1.75px solid ${c.handleColor}`,
            zIndex: 5,
            ['--handle-ring' as string]: c.accentSoft,
          }}
        />
      )}

      <NodeShape
        nodeType={nodeType}
        name={data.name}
        background={cardFill}
        borderColor={borderColor}
        iconColor={TYPE_COLOR[nodeType]}
        labelColor={c.textSecondary}
        boxShadow={ring}
        surfaceColor={c.cardBg}
        badgeColor={c.accent}
        showLabel={showLabel}
        connectorType={hasConnectorBadge ? data.connectorConfig!.connectorType : null}
        showErrorBadge={invalid}
        errorColor={c.danger}
        errorMessage={invalidReason}
      />

      {hasOutput && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={!outgoingLimitReached}
            className="transition-transform duration-150 hover:scale-[1.8] [&.connectingfrom]:scale-[1.8] [&.connectingfrom]:!shadow-[0_0_0_4px_var(--handle-ring)]"
            style={{
              width: 7.5,
              height: 7.5,
              background: c.cardBg,
              border: `1.75px solid ${c.handleColor}`,
              zIndex: 5,
              opacity: outgoingLimitReached ? 0.4 : 1,
              ['--handle-ring' as string]: c.accentSoft,
            }}
          />
          {!outgoingLimitReached && <QuickAdd nodeId={id} />}
        </>
      )}
    </div>
  );
}
