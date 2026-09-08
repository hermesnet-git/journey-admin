import { Plus, X } from 'lucide-react';
import { useFlowTheme } from '../flow-designer/theme';
import { gridInputStyle } from '../flow-designer/PropertyGrid';
import type { SduiEvent } from './model';

// Seção 9 do catálogo — as 6 ações do Action Registry.
export const SDUI_ACTIONS = ['action.submit', 'action.navigate', 'action.openUrl', 'action.setValue', 'action.track', 'action.dismiss'] as const;

const ACTION_LABEL: Record<string, string> = {
  'action.submit': 'Enviar formulário',
  'action.navigate': 'Navegar',
  'action.openUrl': 'Abrir URL',
  'action.setValue': 'Definir valor',
  'action.track': 'Registrar telemetria',
  'action.dismiss': 'Dispensar',
};

// Parâmetros esperados por ação (seção 9) — só orienta os placeholders das linhas de parâmetro,
// não valida (o schema de params é livre, mesmo espírito do config de ConnectorConfig).
const ACTION_PARAM_HINT: Record<string, string> = {
  'action.submit': 'formId, successRoute',
  'action.navigate': 'route',
  'action.openUrl': 'url',
  'action.setValue': 'path, value',
  'action.track': 'event',
  'action.dismiss': '(sem parâmetros)',
};

function ParamsRows({ params, onChange }: { params: Record<string, unknown>; onChange: (params: Record<string, unknown>) => void }) {
  const { c } = useFlowTheme();
  const rows = Object.entries(params);

  function commit(next: [string, unknown][]) {
    onChange(Object.fromEntries(next));
  }

  return (
    <div className="flex flex-col gap-[4px] pl-2">
      {rows.map(([key, value], i) => (
        <div key={i} className="flex gap-1">
          <input
            style={{ ...gridInputStyle(c), flex: '0 0 40%' }}
            placeholder="chave"
            value={key}
            onChange={(e) => {
              const next = [...rows];
              next[i] = [e.target.value, value];
              commit(next);
            }}
          />
          <input
            style={{ ...gridInputStyle(c), flex: 1 }}
            placeholder="valor"
            value={typeof value === 'string' ? value : JSON.stringify(value ?? '')}
            onChange={(e) => {
              const next = [...rows];
              next[i] = [key, e.target.value];
              commit(next);
            }}
          />
          <button
            onClick={() => commit(rows.filter((_, ri) => ri !== i))}
            title="Remover parâmetro"
            className="w-[22px] h-[22px] rounded flex items-center justify-center border-0 cursor-pointer shrink-0"
            style={{ background: 'transparent', color: c.textSecondary }}
          >
            <X size={12} />
          </button>
        </div>
      ))}
      <button
        onClick={() => commit([...rows, ['', '']])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start"
        style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}
      >
        <Plus size={12} /> Parâmetro
      </button>
    </div>
  );
}

/** Edita `node.events` — evento (filtrado por ComponentDefinition.events, o que o Registry declara
 * que este tipo de componente dispara) → uma das 6 ações do catálogo → parâmetros chave/valor. */
export function EventsEditor({
  availableEvents,
  events,
  onChange,
}: {
  availableEvents: string[];
  events: Record<string, SduiEvent> | null;
  onChange: (events: Record<string, SduiEvent> | null) => void;
}) {
  const { c } = useFlowTheme();
  const current = events ?? {};

  function setEvent(eventName: string, event: SduiEvent | null) {
    const next = { ...current };
    if (event) next[eventName] = event;
    else delete next[eventName];
    onChange(Object.keys(next).length > 0 ? next : null);
  }

  if (availableEvents.length === 0) {
    return (
      <div className="p-2 text-[11.5px]" style={{ color: c.textSecondary }}>
        Este componente não possui ações configuráveis.
      </div>
    );
  }

  return (
    <div className="p-2 flex flex-col gap-[10px]">
      {availableEvents.map((eventName) => {
        const configured = current[eventName];
        return (
          <div key={eventName} className="flex flex-col gap-[4px]">
            <label className="flex items-center gap-[4px] text-[11.5px] font-medium" style={{ color: c.textPrimary, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={!!configured}
                onChange={(e) => setEvent(eventName, e.target.checked ? { action: SDUI_ACTIONS[0], params: {} } : null)}
              />
              {eventName}
            </label>
            {configured && (
              <div className="flex flex-col gap-[4px] pl-2">
                <select
                  style={{ ...gridInputStyle(c), cursor: 'pointer' }}
                  value={configured.action}
                  onChange={(e) => setEvent(eventName, { action: e.target.value, params: configured.params ?? {} })}
                >
                  {SDUI_ACTIONS.map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABEL[a]}
                    </option>
                  ))}
                </select>
                <div className="text-[10.5px]" style={{ color: c.textSecondary }}>
                  Parâmetros típicos: {ACTION_PARAM_HINT[configured.action]}
                </div>
                <ParamsRows params={configured.params ?? {}} onChange={(params) => setEvent(eventName, { action: configured.action, params })} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
