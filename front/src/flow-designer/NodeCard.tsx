import { TriangleAlert } from 'lucide-react';
import { NODE_ICON, type NodeType } from './model';
import type { NodeChip } from './nodeMode';

// Cores já resolvidas pelo chamador — mesmo contrato do NodeShape, para servir ao editor (tema do
// canvas) e aos visualizadores de Execução/Diagnóstico (Mística).
export interface NodeCardColors {
  background: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  chipBg: string;
  warnBg: string;
  warnText: string;
  typeColor: string;
  error: string;
}

// Nível de detalhe conforme o zoom: de perto o cartão completo; no meio a pílula compacta (ícone e
// nome); de longe só um ponto na cor do tipo — o desenho do fluxo e os nomes das seções é que contam.
export type NodeDetail = 'full' | 'compact' | 'dot';

export function detailForZoom(zoom: number | undefined): NodeDetail {
  const z = zoom ?? 1;
  return z >= 0.75 ? 'full' : z >= 0.45 ? 'compact' : 'dot';
}

// Visão de longe: ponto na cor do tipo, no centro do espaço da etapa.
export function NodeDot({ color, selected, ringColor }: { color: string; selected?: boolean; ringColor?: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <span
        className="rounded-full"
        style={{
          width: 52,
          height: 52,
          background: color,
          boxShadow: selected && ringColor ? `0 0 0 6px ${ringColor}` : `0 0 0 6px color-mix(in srgb, ${color} 25%, transparent)`,
        }}
      />
    </div>
  );
}

interface CommonProps {
  nodeType: NodeType;
  detail?: NodeDetail;
  name: string;
  colors: NodeCardColors;
  boxShadow: string;
  showErrorBadge?: boolean;
  errorMessage?: string;
  // Contorno pulsante (Execução: etapa atual) — pulseColor em hex puro.
  pulse?: boolean;
  pulseColor?: string;
}

function pulseStyle(pulse?: boolean, pulseColor?: string): React.CSSProperties {
  return pulse
    ? {
        outline: `2.5px solid ${pulseColor}`,
        outlineOffset: 1.5,
        ['--sim-outline-full' as string]: pulseColor,
        ['--sim-outline-dim' as string]: `${pulseColor}30`,
        animation: 'blink-current-outline 2.2s ease-in-out infinite',
      }
    : {};
}

function ErrorBadge({ color, surface, message }: { color: string; surface: string; message?: string }) {
  return (
    <div
      title={message ?? 'Configuração incompleta'}
      className="absolute -top-[7px] -left-[7px] w-[20px] h-[20px] rounded-full flex items-center justify-center"
      style={{ background: color, border: `2px solid ${surface}` }}
    >
      <TriangleAlert size={11} color="#fff" strokeWidth={2.5} />
    </div>
  );
}

// Cartão detalhado: faixa da cor do tipo, ícone, tipo, nome e até 3 etiquetas da configuração.
export function NodeCard({ nodeType, name, colors: c, boxShadow, showErrorBadge, errorMessage, pulse, pulseColor, typeLabel, chips, detail = 'full' }: CommonProps & { typeLabel: string; chips: NodeChip[] }) {
  const Icon = NODE_ICON[nodeType];
  if (detail === 'dot') return <NodeDot color={c.typeColor} />;
  if (detail === 'compact') {
    return (
      <div className="w-full h-full flex items-center">
        <div className="w-full" style={{ height: 58 }}>
          <NodePill nodeType={nodeType} name={name} colors={c} boxShadow={boxShadow} showErrorBadge={showErrorBadge} errorMessage={errorMessage} pulse={pulse} pulseColor={pulseColor} detail="compact" />
        </div>
      </div>
    );
  }
  const full = detail === 'full';
  return (
    <div
      className={`relative w-full h-full rounded-[12px] flex ${full ? 'items-start' : 'items-center'} gap-[12px] pl-[18px] pr-[14px] py-[14px] overflow-hidden`}
      style={{ background: c.background, border: `1.5px solid ${c.border}`, boxShadow, ...pulseStyle(pulse, pulseColor) }}
    >
      <span className="absolute left-0 top-[14px] bottom-[14px] w-[4px] rounded-r" style={{ background: c.typeColor }} />
      <span
        className="shrink-0 w-[38px] h-[38px] rounded-[10px] flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${c.typeColor} 15%, ${c.background})` }}
      >
        <Icon size={20} color={c.typeColor} strokeWidth={1.9} />
      </span>
      <span className="flex-1 min-w-0 flex flex-col gap-[2px]">
        {full && (
          <span className="text-[11px] font-semibold uppercase tracking-[.1em] truncate" style={{ color: c.textSecondary }}>
            {typeLabel}
          </span>
        )}
        <span
          className={`${full ? 'text-[16.5px] truncate' : 'text-[19px] line-clamp-2'} font-semibold leading-[1.3]`}
          style={{ color: c.textPrimary }}
          title={name}
        >
          {name}
        </span>
        {full && chips.length > 0 && (
          <span className="flex gap-[6px] mt-[6px] min-w-0">
            {chips.map((chip) => (
              <span
                key={chip.label}
                className="text-[12px] font-medium leading-[18px] px-[9px] py-[1px] rounded-[6px] truncate min-w-0"
                style={{
                  background: chip.tone === 'warn' ? c.warnBg : c.chipBg,
                  color: chip.tone === 'warn' ? c.warnText : c.textSecondary,
                  flexShrink: chip.tone === 'warn' ? 0 : 1,
                }}
                title={chip.label}
              >
                {chip.label}
              </span>
            ))}
          </span>
        )}
      </span>
      {showErrorBadge && <ErrorBadge color={c.error} surface={c.background} message={errorMessage} />}
    </div>
  );
}

// Pílula compacta: ícone na cor do tipo e o nome.
export function NodePill({ nodeType, name, colors: c, boxShadow, showErrorBadge, errorMessage, pulse, pulseColor, detail = 'full' }: CommonProps) {
  const Icon = NODE_ICON[nodeType];
  return (
    <div
      className="relative w-full h-full rounded-full flex items-center gap-[8px] pl-[6px] pr-[14px]"
      style={{ background: c.background, border: `1.5px solid ${c.border}`, boxShadow, ...pulseStyle(pulse, pulseColor) }}
    >
      <span
        className="shrink-0 w-[34px] h-[34px] rounded-full flex items-center justify-center"
        style={{ background: `color-mix(in srgb, ${c.typeColor} 15%, ${c.background})` }}
      >
        <Icon size={15} color={c.typeColor} strokeWidth={1.9} />
      </span>
      <span
        className={`${detail === 'full' ? 'text-[14px]' : 'text-[17px]'} font-semibold truncate`}
        style={{ color: c.textPrimary }}
        title={name}
      >
        {name}
      </span>
      {showErrorBadge && <ErrorBadge color={c.error} surface={c.background} message={errorMessage} />}
    </div>
  );
}
