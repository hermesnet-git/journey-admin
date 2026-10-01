import { EdgeLabelRenderer, useStore } from '@xyflow/react';

export interface EdgeLabelColors {
  background: string;
  border: string;
  text: string;
  dangerBackground: string;
  dangerBorder: string;
  dangerText: string;
}

// Rótulo de uma linha (condição, "senão", "Se falhar") como etiqueta com fundo e borda, por cima da
// linha. Com a expressão original, ela aparece ao passar o mouse.
export function EdgeLabel({
  x,
  y,
  text,
  colors,
  danger,
  title,
  dimmed,
  hideWhenFar = true,
  onDoubleClick,
}: {
  x: number;
  y: number;
  text: string;
  colors: EdgeLabelColors;
  danger?: boolean;
  title?: string;
  dimmed?: boolean;
  // Execução/Diagnóstico mantêm o rótulo mesmo de longe (lá as etapas não viram pontos).
  hideWhenFar?: boolean;
  // Editor: duplo clique na etiqueta abre a edição do rótulo da ligação.
  onDoubleClick?: () => void;
}) {
  // De longe (mesmo limite em que as etapas viram pontos) o rótulo seria ilegível: some.
  const far = useStore((state) => state.transform[2] < 0.45);
  if (far && hideWhenFar) return null;
  return (
    <EdgeLabelRenderer>
      <div
        className="nodrag nopan absolute whitespace-nowrap rounded-full px-[11px] py-[3px] text-[12px] font-semibold leading-[16px]"
        title={title}
        onDoubleClick={onDoubleClick}
        style={{
          transform: `translate(-50%, -50%) translate(${x}px, ${y}px)`,
          background: danger ? colors.dangerBackground : colors.background,
          border: `1px solid ${danger ? colors.dangerBorder : colors.border}`,
          color: danger ? colors.dangerText : colors.text,
          pointerEvents: title || onDoubleClick ? 'all' : 'none',
          cursor: title ? 'help' : onDoubleClick ? 'pointer' : undefined,
          opacity: dimmed ? 0.3 : 1,
          transition: 'opacity 150ms ease-out',
          // Acima das linhas (inclusive as que sobem de camada com a etapa selecionada).
          zIndex: 1001,
        }}
      >
        {text}
      </div>
    </EdgeLabelRenderer>
  );
}
