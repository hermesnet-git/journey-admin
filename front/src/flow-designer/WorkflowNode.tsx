import { memo, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Handle, NodeToolbar, Position, useUpdateNodeInternals, type NodeProps } from '@xyflow/react';
import { Check, Link2Off, Pencil, Plus, Trash2, X } from 'lucide-react';
import { useWorkflowActions } from './actions-context';
import { useFlowTheme } from './theme';
import { ERROR_HANDLE, NODE_META, NODE_ICON, TYPE_COLOR, connectorMissingFields, type NodeNote, type NodeType, type WFNode } from './model';
import { NodeShape } from './NodeShape';
import { NodeCard, NodeDot, NodePill, detailForZoom, type NodeCardColors } from './NodeCard';
import { isTaskType, nodeChips, nodeSize, nodeTypeLabel } from './nodeMode';

// Nota ligada a esta etapa: marcador numerado no canto; clicar abre o balão com o texto (editável).
const NOTE_COLORS = {
  light: { bg: '#fef3b8', border: '#eab308', text: '#713f12', soft: '#a16207' },
  dark: { bg: '#4a3a10', border: '#ca8a04', text: '#fef3c7', soft: '#d1a53d' },
};

// Título do balão: o trecho antes de ":" no começo da anotação ("Resiliência da integração: …");
// sem esse formato, "Anotação N" e o texto inteiro no corpo.
function splitNote(text: string, number: number): { title: string; body: string } {
  const match = /^([^:\n]{3,48}):\s*([\s\S]*)$/.exec(text.trim());
  const capitalized = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);
  return match ? { title: match[1].trim(), body: capitalized(match[2].trim()) } : { title: `Anotação ${number}`, body: text.trim() };
}

const MARKER_RING = '#38a3f1';

function NoteMarkers({ nodeId, notes }: { nodeId: string; notes: NodeNote[] }) {
  const { dark, c } = useFlowTheme();
  const actions = useWorkflowActions();
  const p = dark ? NOTE_COLORS.dark : NOTE_COLORS.light;
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const open = notes.find((n) => n.id === openId) ?? null;
  const parts = open ? splitNote(open.text, open.number) : null;
  const iconBtn = 'border-0 bg-transparent cursor-pointer p-[3px] rounded flex opacity-70 hover:opacity-100';
  return (
    <>
      <div className="absolute -top-[9px] -left-[9px] flex gap-[3px]" style={{ zIndex: 6 }}>
        {notes.map((note) => {
          const active = note.id === openId;
          return (
            <button
              key={note.id}
              onClick={(e) => {
                e.stopPropagation();
                setEditing(false);
                setOpenId(active ? null : note.id);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              onDoubleClick={(e) => e.stopPropagation()}
              title="Anotação desta etapa"
              className="nodrag w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold cursor-pointer"
              style={{
                background: p.bg,
                color: p.text,
                border: `1.5px solid ${p.border}`,
                boxShadow: active ? `0 0 0 2px ${c.cardBg}, 0 0 0 4px ${MARKER_RING}` : '0 1px 3px rgba(0,0,0,.18)',
              }}
            >
              {note.number}
            </button>
          );
        })}
      </div>
      <NodeToolbar isVisible={!!open} position={Position.Top} align="start" offset={18}>
        {open && parts && (
          <div
            className="nodrag nowheel group/note relative rounded-[12px] px-[16px] py-[12px] w-[300px]"
            style={{
              marginLeft: -26,
              background: c.cardBg,
              border: `1px solid ${c.border}`,
              boxShadow: dark ? '0 10px 28px rgba(0,0,0,.55)' : '0 10px 28px rgba(15,15,20,.16)',
            }}
          >
            <div className="flex items-start gap-[6px] mb-[4px]">
              <span className="flex-1 min-w-0 text-[14.5px] font-semibold leading-[1.3]" style={{ color: c.textPrimary }}>
                {parts.title}
              </span>
              <span className="flex gap-[1px] opacity-0 group-hover/note:opacity-100 transition-opacity" style={{ color: c.textSecondary }}>
                <button title={editing ? 'Concluir edição' : 'Editar anotação'} onClick={() => setEditing((v) => !v)} className={iconBtn} style={{ color: 'inherit' }}>
                  {editing ? <Check size={13} /> : <Pencil size={13} />}
                </button>
                <button
                  title="Soltar da etapa (volta a ficar solta no canvas)"
                  onClick={() => {
                    setOpenId(null);
                    actions.onUnlinkAnnotation(open.id, nodeId);
                  }}
                  className={iconBtn}
                  style={{ color: 'inherit' }}
                >
                  <Link2Off size={13} />
                </button>
                <button
                  title="Excluir anotação"
                  onClick={() => {
                    setOpenId(null);
                    actions.onDeleteAnnotation(open.id);
                  }}
                  className={iconBtn}
                  style={{ color: 'inherit' }}
                >
                  <Trash2 size={13} />
                </button>
                <button title="Fechar" onClick={() => setOpenId(null)} className={iconBtn} style={{ color: 'inherit' }}>
                  <X size={13} />
                </button>
              </span>
            </div>
            {editing ? (
              <textarea
                autoFocus
                value={open.text}
                onChange={(e) => actions.onUpdateAnnotationText(open.id, e.target.value)}
                placeholder="Título: texto da anotação"
                rows={Math.min(8, Math.max(3, Math.ceil(open.text.length / 38)))}
                className="w-full text-[13px] leading-[1.5] rounded-md px-[8px] py-[6px] outline-none resize-none"
                style={{ color: c.textPrimary, background: 'transparent', border: `1px solid ${c.border}`, fontFamily: 'inherit' }}
              />
            ) : (
              <div className="text-[13px] leading-[1.5] whitespace-pre-wrap break-words" style={{ color: c.textSecondary }}>
                {parts.body || 'Sem texto ainda — use o lápis para escrever.'}
              </div>
            )}
            {/* Seta apontando para o marcador da etapa. */}
            <span
              className="absolute w-[12px] h-[12px] rotate-45"
              style={{ left: 20, bottom: -7, background: c.cardBg, borderRight: `1px solid ${c.border}`, borderBottom: `1px solid ${c.border}` }}
            />
          </div>
        )}
      </NodeToolbar>
    </>
  );
}

const sameNotes = (a: NodeNote[] | undefined, b: NodeNote[] | undefined) =>
  (a?.length ?? 0) === (b?.length ?? 0) && (a ?? []).every((n, i) => n.id === b![i].id && n.number === b![i].number && n.text === b![i].text);

const QUICK_ADD_TYPES: NodeType[] = ['userTask', 'serviceTask', 'receiveTask', 'gateway', 'end'];

// A lista de opções virou portal pro document.body (position: fixed, coordenadas a partir do
// getBoundingClientRect do próprio botão gatilho) — mesma técnica do dropdown de SearchSelect.tsx,
// pelo mesmo motivo: esse botão fica dentro do canvas do próprio React Flow, que recorta qualquer
// coisa que tente ultrapassar seus limites, então um nó perto da borda do canvas tinha seu popup
// renderizado parcialmente atrás do painel de propriedades (sempre aberto) em vez de por cima dele.
function QuickAdd({ nodeId, avoid }: { nodeId: string; avoid?: 'up' | 'down' }) {
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
      className="absolute opacity-0 group-hover:opacity-100 transition-opacity"
      // Sem linha de saída ainda: botão centralizado (padrão). Já existe uma (ex.: o ramo "padrão"
      // do Gateway): nasce do lado OPOSTO em vez de centralizado, senão a linha existente passa bem
      // por cima do botão do próximo ramo, dificultando notar/clicar nele.
      style={{
        left: 'calc(100% + 8px)',
        top: avoid === 'up' ? 'calc(50% + 20px)' : avoid === 'down' ? 'calc(50% - 20px)' : '50%',
        transform: 'translateY(-50%)',
        zIndex: open ? 20 : 1,
      }}
    >
      <button
        ref={buttonRef}
        onClick={toggle}
        onPointerDown={(e) => e.stopPropagation()}
        title="Adicionar próxima etapa"
        className="nodrag w-[20px] h-[20px] rounded-full flex items-center justify-center cursor-pointer"
        style={{ border: `1.5px solid ${c.handleColor}`, background: c.cardBg, color: c.handleColor }}
      >
        <Plus size={12} />
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

// Memoizado com comparação por valor (não por referência) dos campos usados no render: o
// JourneyDesignerPage reconstrói `data` de TODOS os nós a cada render (displayNodes usa
// `nodes.map(...)`), inclusive durante o próprio arraste de um nó — sem isso, arrastar um nó
// redesenhava o card de cada nó do canvas a cada frame, travando o drag em fluxos maiores.
export const WorkflowNode = memo(function WorkflowNode({ id, data, selected, type }: NodeProps<WFNode>) {
  const nodeType = type as NodeType;
  const actions = useWorkflowActions();
  const { c, dark, nodeFill, nodeMode } = useFlowTheme();
  const dim = nodeSize(nodeType, nodeMode);
  const asCard = nodeMode !== 'circle' && isTaskType(nodeType);
  const hasInput = nodeType !== 'start' && nodeType !== 'messageStartEvent';
  const hasOutput = nodeType !== 'end';
  const outgoingLimitReached = !!data.outgoingLimitReached;
  // Saída "Se falhar" (ponto vermelho embaixo): só na Tarefa de Serviço com integração REST.
  const hasErrorOutput = nodeType === 'serviceTask' && data.connectorConfig?.connectorType === 'REST';
  const errorPathTaken = !!data.errorPathTaken;
  // O React Flow só registra os pontos de ligação ao medir o nó; esse ponto nasce/some depois (ao
  // trocar o tipo do conector) sem mudar o tamanho do nó, então sem este aviso ele aparecia na tela
  // mas não deixava puxar a linha até o nó ser medido de novo (recarregar, trocar o modo do canvas).
  const updateNodeInternals = useUpdateNodeInternals();
  useEffect(() => updateNodeInternals(id), [hasErrorOutput, id, updateNodeInternals]);
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
  const invalid = !!data.invalid || missingConnectorFields.length > 0;
  const invalidReason = missingConnectorFields.length > 0
    ? `Conector incompleto — falta: ${missingConnectorFields.join(', ')}`
    : (data.invalidReason ?? 'Configuração incompleta');

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
          className="wf-handle transition-transform duration-150 hover:scale-[1.8] [&.valid]:scale-[1.8] [&.valid]:!shadow-[0_0_0_4px_var(--handle-ring)]"
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

      {detailForZoom(data.zoom) === 'dot' ? (
        <NodeDot color={TYPE_COLOR[nodeType]} selected={selected} ringColor={c.accent} />
      ) : asCard ? (
        (() => {
          const colors: NodeCardColors = {
            background: cardFill,
            border: borderColor,
            textPrimary: c.textPrimary,
            textSecondary: c.textSecondary,
            chipBg: c.chipBg,
            warnBg: c.dangerSoft,
            warnText: c.danger,
            typeColor: TYPE_COLOR[nodeType],
            error: c.danger,
          };
          return nodeMode === 'detailed' ? (
            <NodeCard
              nodeType={nodeType}
              name={data.name}
              colors={colors}
              boxShadow={ring}
              showErrorBadge={invalid}
              errorMessage={invalidReason}
              detail={detailForZoom(data.zoom)}
              typeLabel={nodeTypeLabel(nodeType, data.connectorConfig?.connectorType)}
              chips={nodeChips(nodeType, data.connectorConfig, data.embeddedScreenRoot, (data.screenDataSources?.length ?? 0) > 0)}
            />
          ) : (
            <NodePill detail={detailForZoom(data.zoom)} nodeType={nodeType} name={data.name} colors={colors} boxShadow={ring} showErrorBadge={invalid} errorMessage={invalidReason} />
          );
        })()
      ) : (
      <NodeShape
        size={dim}
        nodeType={nodeType}
        name={data.name}
        // Eventos e Decisão ganham o fundo e a borda da cor do tipo (como no desenho de referência);
        // o nome embaixo fica no tamanho da letra dos cartões, em todos os modos.
        background={isTaskType(nodeType) ? cardFill : `color-mix(in srgb, ${TYPE_COLOR[nodeType]} 20%, ${c.cardBg})`}
        borderColor={isTaskType(nodeType) || selected ? borderColor : TYPE_COLOR[nodeType]}
        iconColor={TYPE_COLOR[nodeType]}
        largeLabel
        labelColor={c.textPrimary}
        boxShadow={ring}
        surfaceColor={c.cardBg}
        badgeColor={c.accent}
        showLabel={showLabel}
        connectorType={hasConnectorBadge ? data.connectorConfig!.connectorType : null}
        showErrorBadge={invalid}
        errorColor={c.danger}
        errorMessage={invalidReason}
      />
      )}

      {hasOutput && (
        <>
          <Handle
            type="source"
            position={Position.Right}
            isConnectable={!outgoingLimitReached}
            className="wf-handle transition-transform duration-150 hover:scale-[1.8] [&.connectingfrom]:scale-[1.8] [&.connectingfrom]:!shadow-[0_0_0_4px_var(--handle-ring)]"
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
          {!outgoingLimitReached && <QuickAdd nodeId={id} avoid={data.quickAddAvoid} />}
        </>
      )}
      {data.notes && data.notes.length > 0 && <NoteMarkers nodeId={id} notes={data.notes} />}
      {hasErrorOutput && (
        <Handle
          id={ERROR_HANDLE}
          type="source"
          position={Position.Bottom}
          isConnectable={!errorPathTaken}
          title={errorPathTaken ? 'Caminho "Se falhar" já ligado' : 'Arraste daqui o caminho "Se falhar"'}
          className="wf-handle wf-handle-always transition-transform duration-150 hover:scale-[1.8] [&.connectingfrom]:scale-[1.8] [&.connectingfrom]:!shadow-[0_0_0_4px_var(--handle-ring)]"
          style={{
            width: 7.5,
            height: 7.5,
            background: errorPathTaken ? c.danger : c.cardBg,
            border: `1.75px solid ${c.danger}`,
            zIndex: 5,
            ['--handle-ring' as string]: c.dangerSoft,
          }}
        />
      )}
      {/* Tarefa de Serviço sem REST: o mesmo ponto, cinza e sem ligar, só pra explicar (ao passar o
          mouse) por que ali não sai o caminho "Se falhar" — em vez de o ponto simplesmente não existir. */}
      {nodeType === 'serviceTask' && !hasErrorOutput && (
        <div
          title={
            data.connectorConfig
              ? 'O caminho "Se falhar" existe só para integração REST.'
              : 'Escolha um conector REST para habilitar o caminho "Se falhar".'
          }
          className="wf-handle nodrag absolute left-1/2 top-full -translate-x-1/2 -translate-y-1/2 rounded-full cursor-not-allowed"
          style={{ width: 7.5, height: 7.5, background: c.cardBg, border: `1.75px solid ${c.textSecondary}`, zIndex: 5 }}
        />
      )}
    </div>
  );
},
(prev, next) =>
  prev.id === next.id &&
  prev.selected === next.selected &&
  prev.type === next.type &&
  prev.data.name === next.data.name &&
  prev.data.zoom === next.data.zoom &&
  prev.data.invalid === next.data.invalid &&
  prev.data.invalidReason === next.data.invalidReason &&
  prev.data.outgoingLimitReached === next.data.outgoingLimitReached &&
  prev.data.errorPathTaken === next.data.errorPathTaken &&
  prev.data.quickAddAvoid === next.data.quickAddAvoid &&
  prev.data.connectorConfig === next.data.connectorConfig &&
  prev.data.embeddedScreenRoot === next.data.embeddedScreenRoot &&
  prev.data.screenDataSources === next.data.screenDataSources &&
  sameNotes(prev.data.notes, next.data.notes),
);
