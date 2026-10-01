import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronRight, Clock, Cpu, Hourglass, User } from 'lucide-react';
import { skinVars } from '@telefonica/mistica';
import type { NodeIODetail } from './api';
import { CollapsibleJsonSection, NODE_TYPE_LABEL_PT } from './InspectorPanel';

export interface TimelineStep {
  nodeId: string;
  nodeName: string;
  nodeType: string;
  // Hora em que a tela recebeu o passo (hh:mm:ss).
  time: string;
  // Feito pelo motor sozinho (integração, decisão…), sem esperar ninguém.
  auto: boolean;
  failure?: string | null;
}

export interface TimelineWait {
  title: string;
  detail: string;
  tone?: 'error' | 'done';
}

interface Props {
  steps: TimelineStep[];
  nodeIO: Record<string, NodeIODetail>;
  wait: TimelineWait | null;
  selectedNodeId: string | null;
  onSelect: (nodeId: string) => void;
}

// Linha do tempo da execução: cada passo numerado (o mesmo número que aparece na etapa do fluxo),
// com a entrada e a saída quando houver, e no fim o que a jornada está esperando agora.
export function ExecutionTimeline({ steps, nodeIO, wait, selectedNodeId, onSelect }: Props) {
  const endRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [steps.length, wait?.title]);

  return (
    <div className="h-full flex flex-col min-h-0">
      <div className="shrink-0 px-4 py-3 text-[13px] font-semibold" style={{ color: skinVars.colors.textPrimary, borderBottom: `1px solid ${skinVars.colors.border}` }}>
        Linha do tempo
      </div>
      <ol className="flex-1 min-h-0 overflow-auto m-0 px-3 py-3 list-none flex flex-col gap-[6px]">
        {steps.map((step, i) => {
          const io = nodeIO[step.nodeId];
          const hasIO = !!io && (!!io.input || !!io.output);
          const expanded = open === i;
          const selected = selectedNodeId === step.nodeId;
          return (
            <li
              key={`${step.nodeId}-${i}`}
              className="rounded-lg px-3 py-2"
              style={{
                background: selected ? skinVars.colors.brandLow : skinVars.colors.backgroundContainer,
                border: `1px solid ${step.failure ? skinVars.colors.error : skinVars.colors.border}`,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  onSelect(step.nodeId);
                  if (hasIO) setOpen(expanded ? null : i);
                }}
                className="w-full flex items-start gap-[8px] border-0 bg-transparent p-0 text-left cursor-pointer"
              >
                <span
                  className="shrink-0 mt-[1px] h-[20px] min-w-[20px] px-[5px] rounded-full flex items-center justify-center text-[10.5px] font-bold"
                  style={{ background: skinVars.colors.brand, color: '#fff' }}
                >
                  {i + 1}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="flex items-center gap-[6px] text-[10.5px]" style={{ color: skinVars.colors.textSecondary }}>
                    {step.auto ? <Cpu size={11} /> : <User size={11} />}
                    {NODE_TYPE_LABEL_PT[step.nodeType] ?? 'Etapa'}
                    {step.auto && <span>· pelo motor</span>}
                    <span className="flex-1" />
                    <Clock size={10} />
                    {step.time.slice(0, 8)}
                  </span>
                  <span className="block text-[13px] font-medium truncate" style={{ color: skinVars.colors.textPrimary }}>
                    {step.nodeName}
                  </span>
                  {step.failure && (
                    <span className="flex items-start gap-[4px] text-[11.5px] mt-[2px]" style={{ color: skinVars.colors.error }}>
                      <AlertTriangle size={12} className="shrink-0 mt-[1px]" />
                      Seguiu pelo caminho "Se falhar": {step.failure}
                    </span>
                  )}
                </span>
                {hasIO && (expanded ? <ChevronDown size={14} color={skinVars.colors.textSecondary} /> : <ChevronRight size={14} color={skinVars.colors.textSecondary} />)}
              </button>
              {expanded && io && (
                <div className="mt-2 flex flex-col gap-2">
                  {io.input && <CollapsibleJsonSection title="Entrada" data={io.input} />}
                  {io.output && <CollapsibleJsonSection title="Saída" data={io.output} />}
                </div>
              )}
            </li>
          );
        })}
        {wait && (
          <li
            className="rounded-lg px-3 py-2 flex items-start gap-[8px]"
            style={{
              background: wait.tone === 'error' ? skinVars.colors.errorLow : skinVars.colors.backgroundAlternative,
              border: `1px dashed ${wait.tone === 'error' ? skinVars.colors.error : skinVars.colors.border}`,
            }}
          >
            {wait.tone === 'error' ? (
              <AlertTriangle size={15} className="shrink-0 mt-[2px]" color={skinVars.colors.error} />
            ) : (
              <Hourglass size={15} className="shrink-0 mt-[2px]" color={skinVars.colors.textSecondary} />
            )}
            <span className="min-w-0">
              <span className="block text-[12.5px] font-semibold" style={{ color: wait.tone === 'error' ? skinVars.colors.error : skinVars.colors.textPrimary }}>
                {wait.title}
              </span>
              <span className="block text-[12px] leading-[1.45]" style={{ color: skinVars.colors.textSecondary }}>
                {wait.detail}
              </span>
            </span>
          </li>
        )}
        <div ref={endRef} />
      </ol>
    </div>
  );
}
