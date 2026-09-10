import { useFlowTheme } from '../theme';
import { gridInputStyle } from '../PropertyGrid';
import type { SduiEvent } from '../../sdui/model';

export const AVAILABLE_ACTIONS = ['action.submit', 'action.navigate', 'action.openUrl', 'action.setValue', 'action.track', 'action.dismiss'] as const;

const ACTION_LABEL: Record<string, string> = {
  'action.submit': 'Enviar formulário',
  'action.navigate': 'Navegar',
  'action.openUrl': 'Abrir endereço',
  'action.setValue': 'Definir valor',
  'action.track': 'Registrar telemetria',
  'action.dismiss': 'Dispensar',
};

const EVENT_LABEL: Record<string, string> = {
  onPress: 'Ao acionar o componente',
  onChange: 'Ao alterar o valor',
  onBlur: 'Ao sair do campo',
  onDismiss: 'Ao dispensar',
};

interface ActionParameter {
  name: string;
  label: string;
  placeholder: string;
  required: boolean;
}

// O formulário segue o registro normativo de ações. Enviar e dispensar não recebem destino:
// a continuidade pertence à jornada, e não ao componente da tela.
const ACTION_PARAMETERS: Record<string, ActionParameter[]> = {
  'action.submit': [],
  'action.navigate': [{ name: 'route', label: 'Destino interno', placeholder: 'Ex.: /inicio', required: true }],
  'action.openUrl': [{ name: 'url', label: 'Endereço', placeholder: 'https://', required: true }],
  'action.setValue': [
    { name: 'path', label: 'Valor da jornada', placeholder: 'Ex.: form.aceite', required: true },
    { name: 'value', label: 'Novo valor', placeholder: 'Valor', required: true },
  ],
  'action.track': [{ name: 'event', label: 'Nome do evento', placeholder: 'Ex.: cadastro_continuado', required: true }],
  'action.dismiss': [],
};

function initialParams(action: string): Record<string, unknown> {
  return Object.fromEntries((ACTION_PARAMETERS[action] ?? []).map((parameter) => [parameter.name, '']));
}

function defaultActionForEvent(eventName: string): string {
  if (eventName === 'onDismiss') return 'action.dismiss';
  if (eventName === 'onChange') return 'action.setValue';
  return 'action.submit';
}

function ActionParameters({ event, onChange }: { event: SduiEvent; onChange: (event: SduiEvent) => void }) {
  const { c } = useFlowTheme();
  const parameters = ACTION_PARAMETERS[event.action] ?? [];
  if (parameters.length === 0) {
    return <div className="text-[10.5px]" style={{ color: c.textSecondary }}>Esta ação não precisa de informações adicionais.</div>;
  }
  return (
    <div className="flex flex-col gap-2">
      {parameters.map((parameter) => {
        const value = event.params?.[parameter.name];
        const missing = parameter.required && (value === undefined || value === null || String(value).trim() === '');
        return (
          <label key={parameter.name} className="flex flex-col gap-1">
            <span className="text-[10.5px] font-medium" style={{ color: c.textSecondary }}>{parameter.label}{parameter.required && ' *'}</span>
            <input
              style={gridInputStyle(c)}
              placeholder={parameter.placeholder}
              value={typeof value === 'string' ? value : String(value ?? '')}
              onChange={(input) => onChange({ ...event, params: { ...(event.params ?? {}), [parameter.name]: input.target.value } })}
            />
            {missing && <span className="text-[10px]" style={{ color: c.danger }}>Preenchimento obrigatório.</span>}
          </label>
        );
      })}
    </div>
  );
}

/** Relaciona cada evento permitido pelo componente a uma ação normativa, sem expor estruturas
 * técnicas ou pares livres de chave e valor ao autor da jornada. */
export function ActionEditor({ availableEvents, events, onChange }: {
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
    return <div className="p-2 text-[11.5px]" style={{ color: c.textSecondary }}>Este componente não possui ações configuráveis.</div>;
  }

  return (
    <div className="flex flex-col gap-3 p-2">
      {availableEvents.map((eventName) => {
        const configured = current[eventName];
        return (
          <section key={eventName} className="flex flex-col gap-2 rounded-md p-2" style={{ border: `1px solid ${c.border}`, background: c.canvasBg }}>
            <label className="flex items-center gap-1.5 text-[11.5px] font-medium" style={{ color: c.textPrimary, cursor: 'pointer' }}>
              <input type="checkbox" checked={!!configured} onChange={(event) => {
                const action = defaultActionForEvent(eventName);
                setEvent(eventName, event.target.checked ? { action, params: initialParams(action) } : null);
              }} />
              {EVENT_LABEL[eventName] ?? 'Ao ocorrer a interação'}
            </label>
            {configured && (
              <>
                <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={configured.action} onChange={(event) => setEvent(eventName, { action: event.target.value, params: initialParams(event.target.value) })}>
                  {AVAILABLE_ACTIONS.map((action) => <option key={action} value={action}>{ACTION_LABEL[action]}</option>)}
                </select>
                <ActionParameters event={configured} onChange={(event) => setEvent(eventName, event)} />
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
