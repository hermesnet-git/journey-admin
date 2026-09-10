import { useFlowTheme } from '../theme';
import { gridInputStyle } from '../PropertyGrid';
import type { VariableOrigin } from '../model';
import type { ChannelType } from '../../api/products';
import type { SduiVisibility } from '../../sdui/model';
import { NamespacePathInput, splitPath } from './BindingEditor';

// equals/notEquals: único shape que a seção 14.2 do catálogo exemplifica. in/notIn: extensão
// pontual pra "visível nestes canais" (lista de valores) — continua uma regra só, não lógica
// booleana composta.
const RULES = [
  { value: 'equals', label: 'Igual a' },
  { value: 'notEquals', label: 'Diferente de' },
  { value: 'in', label: 'Está entre' },
  { value: 'notIn', label: 'Não está entre' },
];

const CHANNEL_VISIBILITY_PATH = 'session.channel';

const CONDITION_COPY = {
  visibility: {
    description: 'Defina quando este componente deve aparecer na tela. Se houver condição, ele só será exibido quando a regra for atendida.',
    channelShortcut: 'Atalho: mostrar nestes canais',
    alwaysEnabled: 'Sempre mostrar (sem condição)',
    defaultPath: 'form.',
  },
  active: {
    description: 'Defina quando este componente deve ficar habilitado para interação. Se houver condição, ele aparece na tela, mas só fica ativo quando a regra for atendida.',
    channelShortcut: 'Atalho: habilitar nestes canais',
    alwaysEnabled: 'Sempre habilitado (sem condição)',
    defaultPath: 'form.',
  },
} as const;

function selectedChannelsFrom(visibility: SduiVisibility | null, channelTypes: ChannelType[]): ChannelType[] {
  if (visibility?.path !== CHANNEL_VISIBILITY_PATH || !Array.isArray(visibility.value)) {
    return channelTypes; // nenhuma restrição de canal configurada ainda — atalho começa com tudo marcado
  }
  const value = visibility.value as string[];
  return visibility.rule === 'notIn' ? channelTypes.filter((t) => !value.includes(t)) : channelTypes.filter((t) => value.includes(t));
}

/** Edita `node.visibility` (seção 6/14.2: `{rule,path,value}`) — condição declarativa de exibição,
 * substitui o antigo `visibleIf` em string ({{campo}} OP valor). */
export function ConditionEditor({
  visibility,
  variables,
  channelTypes,
  mode = 'visibility',
  onChange,
}: {
  visibility: SduiVisibility | null;
  variables: VariableOrigin[];
  channelTypes: ChannelType[];
  mode?: keyof typeof CONDITION_COPY;
  onChange: (visibility: SduiVisibility | null) => void;
}) {
  const { c } = useFlowTheme();
  const copy = CONDITION_COPY[mode];
  const { namespace, suffix } = splitPath(visibility?.path);
  const selectedChannels = selectedChannelsFrom(visibility, channelTypes);

  function toggleChannel(type: ChannelType) {
    const next = selectedChannels.includes(type) ? selectedChannels.filter((t) => t !== type) : [...selectedChannels, type];
    onChange(next.length === channelTypes.length ? null : { rule: 'in', path: CHANNEL_VISIBILITY_PATH, value: next });
  }

  return (
    <div className="p-2 flex flex-col gap-[6px]">
      <div className="text-[11.5px]" style={{ color: c.textSecondary }}>
        {copy.description}
      </div>

      {channelTypes.length > 1 && (
        <div className="flex flex-col gap-[4px] p-2 rounded-md" style={{ background: c.cardBg, border: `1px solid ${c.border}` }}>
          <div className="text-[11px] font-medium" style={{ color: c.textSecondary }}>
            {copy.channelShortcut}
          </div>
          {channelTypes.map((type) => (
            <label key={type} className="flex items-center gap-[6px] text-[12px]" style={{ color: c.textPrimary, cursor: 'pointer' }}>
              <input type="checkbox" checked={selectedChannels.includes(type)} onChange={() => toggleChannel(type)} />
              {type}
            </label>
          ))}
        </div>
      )}

      <label className="flex items-center gap-[4px] text-[11.5px]" style={{ color: c.textSecondary, cursor: 'pointer' }}>
        <input
          type="checkbox"
          checked={!visibility}
          onChange={(e) => onChange(e.target.checked ? null : { rule: 'equals', path: copy.defaultPath, value: '' })}
        />
        {copy.alwaysEnabled}
      </label>
      {visibility && (
        <>
          <NamespacePathInput
            namespace={namespace}
            suffix={suffix}
            variables={variables}
            onChange={(ns, s) => onChange({ ...visibility, path: `${ns}.${s}` })}
          />
          <div className="flex gap-1">
            <select
              style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }}
              value={visibility.rule}
              onChange={(e) => onChange({ ...visibility, rule: e.target.value })}
            >
              {RULES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            {visibility.rule === 'in' || visibility.rule === 'notIn' ? (
              <input
                style={{ ...gridInputStyle(c), flex: 1 }}
                placeholder="valores, separados por vírgula"
                value={Array.isArray(visibility.value) ? (visibility.value as string[]).join(', ') : ''}
                onChange={(e) =>
                  onChange({ ...visibility, value: e.target.value.split(',').map((v) => v.trim()).filter(Boolean) })
                }
              />
            ) : (
              <input
                style={{ ...gridInputStyle(c), flex: 1 }}
                placeholder="valor"
                value={typeof visibility.value === 'string' ? visibility.value : String(visibility.value ?? '')}
                onChange={(e) => onChange({ ...visibility, value: e.target.value })}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
