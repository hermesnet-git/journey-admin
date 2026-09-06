import { useLayoutEffect, useRef, useState } from 'react';
import { BaseEdge, getBezierPath, getSmoothStepPath, getStraightPath, type EdgeProps } from '@xyflow/react';
import { useFlowTheme } from './theme';
import type { WFEdge } from './model';

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

// Fração do comprimento da linha (perto do DESTINO) onde o rótulo (condição/"padrão") é ancorado —
// o meio do caminho (padrão do @xyflow/react) fica perto demais da origem quando as duas pontas do
// Gateway divergem logo na saída, sobrepondo o próprio nome do nó de origem (ex.: "Decisão"). Perto
// do destino, alinhado à direita (encostando na seta), essa zona de conflito quase nunca se repete.
const LABEL_T = 0.88;
const LABEL_GAP = 8;

// Rótulo (condição/"padrão") de uma conexão — sem interação (não é arrastável, ver histórico da
// tentativa anterior), só reposicionado perto do destino em vez do meio do caminho padrão do
// @xyflow/react. Continua dentro do próprio SVG da camada de linhas (não EdgeLabelRenderer), então
// renderiza atrás dos nós — nunca por cima de um componente do canvas.
function createFlowEdge(shape: keyof typeof PATH_FN) {
  function FlowEdge({ id, sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition, style, markerEnd, data }: EdgeProps<WFEdge>) {
    const { c } = useFlowTheme();
    const pathRef = useRef<SVGPathElement>(null);
    const [labelPos, setLabelPos] = useState<{ x: number; y: number } | null>(null);

    const [path] = PATH_FN[shape]({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
    const labelText = data?.isDefault ? 'padrão' : data?.condition;

    useLayoutEffect(() => {
      if (!labelText) return;
      const el = pathRef.current;
      const total = el?.getTotalLength();
      if (!el || !total) return;
      const pt = el.getPointAtLength(total * LABEL_T);
      setLabelPos({ x: pt.x, y: pt.y });
    }, [labelText, path]);

    return (
      <>
        <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} />
        {labelText && <path ref={pathRef} d={path} fill="none" style={{ opacity: 0, pointerEvents: 'none' }} />}
        {labelText && labelPos && (
          <text
            x={labelPos.x - LABEL_GAP}
            y={labelPos.y}
            textAnchor="end"
            dominantBaseline="middle"
            style={{
              fontSize: 9,
              fontWeight: 600,
              letterSpacing: '0.03em',
              fill: c.textPrimary,
              fillOpacity: 0.6,
              pointerEvents: 'none',
            }}
          >
            {labelText}
          </text>
        )}
      </>
    );
  }
  return FlowEdge;
}

export const flowEdgeTypes = {
  default: createFlowEdge('default'),
  smoothstep: createFlowEdge('smoothstep'),
  step: createFlowEdge('step'),
  straight: createFlowEdge('straight'),
};
