import { BaseEdge, EdgeLabelRenderer, useInternalNode, useStore, getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { useFlowTheme } from './theme';
import type { WFEdge } from './model';
import { fitRoute, labelPoint, roundedPath } from './edgeRouter';
import { EdgeLabel } from './EdgeLabel';
import { useWorkflowActions } from './actions-context';
import { DEFAULT_PATH_LABEL } from './conditionLabel';

type PathParams = {
  sourceX: number;
  sourceY: number;
  sourcePosition: EdgeProps['sourcePosition'];
  targetX: number;
  targetY: number;
  targetPosition: EdgeProps['targetPosition'];
};

// 'step' é o mesmo getSmoothStepPath do @xyflow/react com borderRadius 0 — é assim que o próprio
// StepEdge embutido da lib é implementado por cima do SmoothStepEdge.
const PATH_FN: Record<
  'default' | 'smoothstep' | 'step' | 'straight',
  (p: PathParams) => [path: string, labelX: number, labelY: number, ...rest: number[]]
> = {
  default: (p) => getBezierPath(p),
  smoothstep: (p) => getSmoothStepPath(p),
  step: (p) => getSmoothStepPath({ ...p, borderRadius: 0 }),
  straight: (p) => getStraightPath(p),
};

// Rótulo (condição/"senão"/"Se falhar") como etiqueta por cima da linha: na rota automática, no
// trecho mais perto do destino que tenha espaço; nas outras formas, no meio do caminho.
function createFlowEdge(shape: keyof typeof PATH_FN | 'routed') {
  function FlowEdge({ id, source, target, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, style, markerEnd, data }: EdgeProps<WFEdge>) {
    const { c } = useFlowTheme();
    const far = useStore((state) => state.transform[2] < 0.45);
    const sourceNode = useInternalNode(source);
    const targetNode = useInternalNode(target);
    // A rota calculada só vale se ainda encosta nos pontos de conexão atuais — enquanto uma etapa é
    // arrastada ela fica velha, e a linha simples segue a etapa até a nova rota ficar pronta.
    const routed = shape === 'routed' ? fitRoute(data?.route, { x: sourceX, y: sourceY }, { x: targetX, y: targetY }) : null;
    const [simplePath, midX, midY] = PATH_FN[shape === 'routed' ? 'smoothstep' : shape]({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const basePath = routed ? roundedPath(routed) : simplePath;
    // De longe as etapas viram pontos no centro do espaço delas: a linha vai de centro a centro, sem seta.
    const centerOf = (n: typeof sourceNode) =>
      n ? { x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2, y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2 } : null;
    const sc = far ? centerOf(sourceNode) : null;
    const tc = far ? centerOf(targetNode) : null;
    // O caminho começa onde a rota sai da etapa (direita, topo ou base): liga o centro a esse ponto.
    const start = /^M\s*(-?[\d.]+)[ ,]+(-?[\d.]+)/.exec(basePath);
    const path = sc && tc && start ? 'M' + sc.x + ' ' + sc.y + 'L' + start[1] + ' ' + start[2] + basePath.replace(/^M[^LQ]*/, '') + 'L' + tc.x + ' ' + tc.y : basePath;
    const at = routed ? labelPoint(routed, data?.route?.loop) : { x: midX, y: midY };
    const actions = useWorkflowActions();
    // Rótulo escrito pelo autor vence; senão "Se falhar", "senão" ou a condição legível.
    const labelText = data?.label || (data?.onError ? 'Se falhar' : data?.isDefault ? DEFAULT_PATH_LABEL : (data?.conditionText ?? data?.condition));
    const rawCondition = !data?.onError && !data?.isDefault && data?.condition ? data.condition : undefined;

    return (
      <>
        {/* Dica ao passar o mouse na linha: é assim que se escreve o rótulo dela. */}
        <g>
          <title>Clique duas vezes para escrever um rótulo na ligação</title>
          <BaseEdge path={path} markerEnd={far ? undefined : markerEnd} style={style} />
        </g>
        {data?.editingLabel && (
          <EdgeLabelRenderer>
            <input
              autoFocus
              defaultValue={data.label ?? ''}
              maxLength={40}
              placeholder="Rótulo da ligação"
              aria-label="Rótulo da ligação"
              onKeyDown={(e) => {
                // Enter grava e Esc descarta; a marca evita que a perda de foco logo depois grave de novo.
                if (e.key === 'Enter') {
                  e.currentTarget.dataset.done = '1';
                  actions.onSetEdgeLabel(id, e.currentTarget.value);
                }
                if (e.key === 'Escape') {
                  e.currentTarget.dataset.done = '1';
                  actions.onCancelEdgeLabel();
                }
              }}
              onBlur={(e) => !e.currentTarget.dataset.done && actions.onSetEdgeLabel(id, e.currentTarget.value)}
              className="nodrag nopan absolute rounded-full px-[11px] py-[3px] text-[12px] font-semibold outline-none w-[180px]"
              style={{
                transform: `translate(-50%, -50%) translate(${at.x}px, ${at.y}px)`,
                background: c.cardBg,
                border: `1.5px solid ${c.accent}`,
                color: c.textPrimary,
                pointerEvents: 'all',
                zIndex: 1002,
              }}
            />
          </EdgeLabelRenderer>
        )}
        {labelText && !data?.editingLabel && (
          <EdgeLabel
            x={at.x}
            y={at.y}
            text={labelText}
            title={rawCondition}
            onDoubleClick={() => actions.onEditEdgeLabel(id)}
            danger={!!data?.onError}
            dimmed={typeof style?.opacity === 'number' && style.opacity < 1}
            colors={{
              background: c.cardBg,
              border: c.border,
              text: c.textPrimary,
              // Opaco: a linha tracejada não aparece através da etiqueta.
              dangerBackground: `color-mix(in srgb, ${c.danger} 16%, ${c.cardBg})`,
              dangerBorder: c.danger,
              dangerText: c.danger,
            }}
          />
        )}
      </>
    );
  }
  return FlowEdge;
}

export const flowEdgeTypes = {
  routed: createFlowEdge('routed'),
  default: createFlowEdge('default'),
  smoothstep: createFlowEdge('smoothstep'),
  step: createFlowEdge('step'),
  straight: createFlowEdge('straight'),
};
