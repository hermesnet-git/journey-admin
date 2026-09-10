import { CheckCircle2, ChevronLeft, ChevronRight, Circle } from 'lucide-react';
import { useFlowTheme } from './theme';
import type { WFNode } from './model';

// Navegação contextual entre Tarefas de Usuário. A ordem já chega determinada pelo fluxo; este
// controle não sugere que desvios formem um caminho único e não faz retorno circular nas pontas.
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
  if (tasks.length === 0) return null;

  const index = tasks.findIndex((task) => task.id === currentId);
  const current = tasks[index] ?? tasks[0];
  const hasScreen = !!current.data.embeddedScreenRoot;

  function go(delta: number) {
    const next = tasks[index + delta];
    if (next) onNavigate(next.id);
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <button
        onClick={() => go(-1)}
        disabled={index <= 0}
        title="Tarefa anterior"
        className="shrink-0 w-[28px] h-[28px] rounded-md flex items-center justify-center cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
        style={{ background: 'transparent', color: c.textSecondary }}
      >
        <ChevronLeft size={14} />
      </button>
      <div className="flex-1 min-w-0 flex items-center gap-2 rounded-lg px-2 py-1" style={{ border: `1px solid ${c.border}`, background: c.cardBg }}>
        <span className="flex shrink-0" title={hasScreen ? 'Tela configurada' : 'Sem tela configurada'}>
          {hasScreen ? <CheckCircle2 size={14} color={c.success} /> : <Circle size={14} color={c.textSecondary} />}
        </span>
        <select
          value={current.id}
          onChange={(event) => onNavigate(event.target.value)}
          title="Selecionar Tarefa de Usuário"
          className="min-w-0 flex-1 border-0 outline-none cursor-pointer text-[11.5px] font-medium"
          style={{ color: c.textPrimary, background: 'transparent', colorScheme: 'light dark' }}
        >
          {tasks.map((task) => (
            <option key={task.id} value={task.id} style={{ color: c.textPrimary, background: c.cardBg }}>
              {task.data.name} — {task.data.embeddedScreenRoot ? 'Tela configurada' : 'Sem tela'}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-[9.5px]" style={{ color: c.textSecondary }}>{index + 1} de {tasks.length}</span>
      </div>
      <button
        onClick={() => go(1)}
        disabled={index < 0 || index >= tasks.length - 1}
        title="Próxima tarefa"
        className="shrink-0 w-[28px] h-[28px] rounded-md flex items-center justify-center cursor-pointer border-0 disabled:opacity-30 disabled:cursor-default"
        style={{ background: 'transparent', color: c.textSecondary }}
      >
        <ChevronRight size={14} />
      </button>
    </div>
  );
}
