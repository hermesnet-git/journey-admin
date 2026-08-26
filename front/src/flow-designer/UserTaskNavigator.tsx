import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useFlowTheme } from './theme';
import { NODE_ICON, TYPE_COLOR, type WFNode } from './model';

// Faixa de navegação entre User Tasks do fluxo (só esse tipo) — a atual em destaque total, as
// demais apagadas; clicar em qualquer uma ou usar as setas troca a seleção do nó no canvas
// principal (onNavigate recebe o mesmo selectOnlyNode que um clique no nó já usa), então
// Propriedades/minimapa/este dock ficam sincronizados de graça. Sem key/remount aqui — a transição
// suave (cor/opacidade/escala) depende do componente continuar montado enquanto currentId muda.
export function UserTaskNavigator({
  tasks,
  currentId,
  onNavigate,
}: {
  tasks: WFNode[];
  currentId: string;
  onNavigate: (nodeId: string) => void;
}) {
  const { c } = useFlowTheme();
  // A pílula ativa pode ficar fora da faixa visível (parcialmente atrás da setinha, ou cortada)
  // conforme navega — sem isto, nada rolava a faixa horizontal pra acompanhar, só a cor/destaque
  // mudavam, dando a impressão de que o navegador "se perdia".
  const activeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
  }, [currentId]);

  if (tasks.length === 0) return null;

  const index = tasks.findIndex((t) => t.id === currentId);
  const Icon = NODE_ICON.userTask;
  const color = TYPE_COLOR.userTask;

  function go(delta: number) {
    const next = tasks[(index + delta + tasks.length) % tasks.length];
    if (next) onNavigate(next.id);
  }

  return (
    <div className="flex items-center gap-2 min-w-0">
      <button
        onClick={() => go(-1)}
        disabled={tasks.length < 2}
        title="Tarefa anterior"
        className="shrink-0 w-[22px] h-[22px] rounded-md flex items-center justify-center cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
        style={{ background: 'transparent', color: c.textSecondary }}
      >
        <ChevronLeft size={14} />
      </button>
      <div className="no-scrollbar flex-1 min-w-0 flex items-center gap-[6px] overflow-x-auto py-1">
        {tasks.map((t, i) => {
          const active = t.id === currentId;
          return (
            <div key={t.id} className="flex items-center gap-[6px] shrink-0">
              {i > 0 && (
                <div
                  className="w-[14px] h-px shrink-0 transition-colors duration-300"
                  style={{ background: active || tasks[i - 1].id === currentId ? color : c.border }}
                />
              )}
              <button
                ref={active ? activeRef : undefined}
                onClick={() => onNavigate(t.id)}
                title={t.data.name}
                className="shrink-0 flex items-center gap-[6px] rounded-full pl-[6px] pr-[10px] py-[4px] border-0 cursor-pointer transition-all duration-300"
                style={{
                  background: active ? color : c.chipBg,
                  color: active ? '#fff' : c.textSecondary,
                  opacity: active ? 1 : 0.55,
                  transform: active ? 'scale(1.06)' : 'scale(1)',
                }}
              >
                <span
                  className="w-[16px] h-[16px] rounded-full flex items-center justify-center shrink-0"
                  style={{ background: active ? 'rgba(255,255,255,.25)' : c.cardBg }}
                >
                  <Icon size={9} strokeWidth={2} color={active ? '#fff' : c.textSecondary} />
                </span>
                <span className="text-[11px] font-medium max-w-[110px] truncate">{t.data.name}</span>
              </button>
            </div>
          );
        })}
      </div>
      <button
        onClick={() => go(1)}
        disabled={tasks.length < 2}
        title="Próxima tarefa"
        className="shrink-0 w-[22px] h-[22px] rounded-md flex items-center justify-center cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
        style={{ background: 'transparent', color: c.textSecondary }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
