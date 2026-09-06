import { useFlowTheme } from '../flow-designer/theme';
import { gridInputStyle } from '../flow-designer/PropertyGrid';
import type { VariableOrigin } from '../flow-designer/model';
import type { SduiBinding } from './model';

// Seção 8 do catálogo: 5 namespaces permitidos pra um path de binding.
export const BINDING_NAMESPACES = ['form', 'data', 'session', 'route', 'computed'] as const;
export type BindingNamespace = (typeof BINDING_NAMESPACES)[number];

export function splitPath(path: string | undefined): { namespace: BindingNamespace; suffix: string } {
  const dot = path?.indexOf('.') ?? -1;
  const ns = dot > 0 ? path!.slice(0, dot) : '';
  if ((BINDING_NAMESPACES as readonly string[]).includes(ns)) {
    return { namespace: ns as BindingNamespace, suffix: path!.slice(dot + 1) };
  }
  return { namespace: 'form', suffix: '' };
}

/** Namespace + sufixo do path — reaproveitado por BindingsEditor (binding `value`) e
 * VisibilityEditor (regra de visibilidade), mesmo shape `namespace.path` (seção 8 do catálogo). Pra
 * `form`/`data`, sugere os nomes já conhecidos do fluxo (mesma lista de VariableOrigin usada pelo
 * VariablePickerButton) via &lt;datalist&gt; — os outros 3 namespaces não têm fonte de sugestão
 * neste admin (sem um "data contract" formal, ver FlowValidator.java). */
export function NamespacePathInput({
  namespace,
  suffix,
  variables,
  onChange,
}: {
  namespace: BindingNamespace;
  suffix: string;
  variables: VariableOrigin[];
  onChange: (namespace: BindingNamespace, suffix: string) => void;
}) {
  const { c } = useFlowTheme();
  const listId = 'sdui-binding-suggestions';
  const suggestions = namespace === 'form' || namespace === 'data' ? variables.map((v) => v.name) : [];
  return (
    <div className="flex gap-1" style={{ width: '100%' }}>
      <select style={{ ...gridInputStyle(c), cursor: 'pointer', flex: '0 0 88px' }} value={namespace} onChange={(e) => onChange(e.target.value as BindingNamespace, suffix)}>
        {BINDING_NAMESPACES.map((ns) => (
          <option key={ns} value={ns}>
            {ns}
          </option>
        ))}
      </select>
      <input
        style={{ ...gridInputStyle(c), flex: 1 }}
        value={suffix}
        list={listId}
        placeholder="caminho"
        onChange={(e) => onChange(namespace, e.target.value)}
      />
      <datalist id={listId}>
        {suggestions.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

/** Edita o binding `value` do nó (seção 8: `bindings.value.path`+`mode`) — o único binding que o
 * Form Builder autora hoje (leitura de dados avulsa por outros nomes de binding fica pra quando
 * surgir um caso real, YAGNI). Só relevante pra componentes que coletam valor (categoria INPUT). */
export function BindingsEditor({
  binding,
  variables,
  onChange,
}: {
  binding: SduiBinding | null;
  variables: VariableOrigin[];
  onChange: (binding: SduiBinding | null) => void;
}) {
  const { c } = useFlowTheme();
  const { namespace, suffix } = splitPath(binding?.path);
  const mode = binding?.mode ?? 'twoWay';

  return (
    <div className="p-2 flex flex-col gap-[6px]">
      <div className="text-[11.5px]" style={{ color: c.textSecondary }}>
        Caminho no contexto de dados da jornada (form/data/session/route/computed) que este
        componente lê e/ou grava.
      </div>
      <label className="flex items-center gap-[4px] text-[11.5px]" style={{ color: c.textSecondary, cursor: 'pointer' }}>
        <input type="checkbox" checked={!binding} onChange={(e) => onChange(e.target.checked ? null : { path: 'form.', mode: 'twoWay' })} />
        Sem vínculo (valor não é lido nem gravado)
      </label>
      {binding && (
        <>
          <NamespacePathInput
            namespace={namespace}
            suffix={suffix}
            variables={variables}
            onChange={(ns, s) => onChange({ path: `${ns}.${s}`, mode })}
          />
          <select
            style={{ ...gridInputStyle(c), cursor: 'pointer' }}
            value={mode}
            onChange={(e) => onChange({ path: binding.path, mode: e.target.value as SduiBinding['mode'] })}
          >
            <option value="twoWay">Leitura e escrita (twoWay)</option>
            <option value="oneWay">Somente leitura (oneWay)</option>
          </select>
        </>
      )}
    </div>
  );
}
