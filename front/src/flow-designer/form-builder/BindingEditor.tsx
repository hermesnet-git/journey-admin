import { ChevronDown, Lock } from 'lucide-react';
import { useFlowTheme } from '../theme';
import { gridInputStyle } from '../PropertyGrid';
import type { VariableOrigin } from '../model';
import { collectFormVariableNames, type SduiBinding, type SduiNode } from '../../sdui/model';


/** Caminhos conhecidos pra sugerir/restringir um namespace. Cada variável pertence a um namespace
 * só — resposta de campo de tela é `form`; dado carregado por integração ou informado ao iniciar a
 * jornada é `data` (o canal da execução é só `channel`, fora dos namespaces) — por isso filtra por
 * `VariableOrigin.kind` antes de sugerir: oferecer a mesma lista nos dois namespaces (como já foi feito aqui) produz um caminho
 * que nunca resolve nada em execução (ex.: `data.nomeCliente`, quando `nomeCliente` só existe como
 * `form.nomeCliente`). `root`/`collectFormVariableNames` é uma segunda fonte pra `form`, redundante
 * com o que `variables` já devia trazer (ver `FormBuilder.variablesWithScreenFields`) — mantida por
 * segurança, caso algum chamador ainda passe uma lista sem os campos da própria tela. */
function knownPathsFor(namespace: BindingNamespace, variables: VariableOrigin[], root: SduiNode | null): string[] {
  if (namespace === 'form') {
    const formNames = root ? collectFormVariableNames(root) : [];
    return Array.from(new Set([...variables.filter((v) => v.kind === 'form').map((v) => v.name), ...formNames]));
  }
  if (namespace === 'data') return variables.filter((v) => v.kind === 'data').map((v) => v.name);
  return [];
}

// Seção 8 do catálogo: 2 namespaces permitidos pra um path de binding.
export const BINDING_NAMESPACES = ['form', 'data'] as const;
export type BindingNamespace = (typeof BINDING_NAMESPACES)[number];

const NAMESPACE_HELP: Record<BindingNamespace, string> = {
  form: 'Dado editável da jornada — o que o usuário está preenchendo.',
  data: 'Dado carregado e somente leitura, vindo de uma integração anterior.',
};

const MODE_LABEL: Record<SduiBinding['mode'], string> = {
  twoWay: 'Ler e gravar o valor',
  oneWay: 'Somente ler o valor',
};

const MODE_HELP: Record<SduiBinding['mode'], string> = {
  twoWay: 'O usuário edita este componente e a alteração volta para o caminho configurado.',
  oneWay: 'O valor vem do caminho configurado e é somente exibido, sem edição.',
};

export function splitPath(path: string | undefined): { namespace: BindingNamespace; suffix: string } {
  const dot = path?.indexOf('.') ?? -1;
  const ns = dot > 0 ? path!.slice(0, dot) : '';
  if ((BINDING_NAMESPACES as readonly string[]).includes(ns)) {
    return { namespace: ns as BindingNamespace, suffix: path!.slice(dot + 1) };
  }
  return { namespace: 'form', suffix: '' };
}

/** Namespace + sufixo do path — reaproveitado pelos editores de valor e de condição, pois ambos
 * utilizam o mesmo formato `namespace.path` definido pelo catálogo.
 *
 * `strict` (só o editor de Binding usa, `ConditionEditor` não passa): quando o binding é somente
 * leitura (`oneWay`), o autor está necessariamente REFERENCIANDO um valor que já existe em algum
 * lugar — nesse caso o sufixo vira um `<select>` fechado com os caminhos conhecidos daquele
 * namespace, sem digitação livre (não tem como "ler" um caminho inventado). Quando não há nenhum
 * caminho conhecido pra sugerir (lista vazia),
 * cai pro texto livre — um combo fechado sem opção nenhuma seria um beco sem saída pior que o texto
 * livre. Fora do modo estrito (bindings editáveis, que costumam estar DEFININDO um nome novo de
 * variável), continua texto livre com sugestão (`<datalist>`), igual sempre foi. */
export function NamespacePathInput({
  namespace,
  suffix,
  variables,
  root = null,
  strict = false,
  onChange,
}: {
  namespace: BindingNamespace;
  suffix: string;
  variables: VariableOrigin[];
  root?: SduiNode | null;
  strict?: boolean;
  onChange: (namespace: BindingNamespace, suffix: string) => void;
}) {
  const { c } = useFlowTheme();
  const listId = 'sdui-binding-suggestions';
  const knownPaths = knownPathsFor(namespace, variables, root);
  const useClosedSelect = strict && knownPaths.length > 0;
  return (
    <div className="flex gap-1" style={{ width: '100%' }}>
      <div className="relative" style={{ flex: '0 0 96px' }} title={NAMESPACE_HELP[namespace]}>
        <select
          style={{ ...gridInputStyle(c), cursor: 'pointer', paddingRight: 18 }}
          value={namespace}
          onChange={(e) => onChange(e.target.value as BindingNamespace, suffix)}
        >
          {BINDING_NAMESPACES.map((ns) => (
            <option key={ns} value={ns}>
              {ns}
            </option>
          ))}
        </select>
        {/* appearance:none em gridInputStyle tira a seta nativa do select — repõe uma, já que sem
         * nenhuma pista visual o campo parece texto fixo em vez de escolha (achado real de usuário). */}
        <ChevronDown size={12} className="absolute pointer-events-none top-1/2 -translate-y-1/2" style={{ right: 4, color: c.textSecondary }} />
      </div>
      {useClosedSelect ? (
        <div className="relative" style={{ flex: 1 }}>
          <select
            style={{ ...gridInputStyle(c), cursor: 'pointer', paddingRight: 18 }}
            value={knownPaths.includes(suffix) ? suffix : ''}
            onChange={(e) => onChange(namespace, e.target.value)}
          >
            <option value="" disabled>Selecione...</option>
            {knownPaths.map((path) => (
              <option key={path} value={path}>{path}</option>
            ))}
          </select>
          <ChevronDown size={12} className="absolute pointer-events-none top-1/2 -translate-y-1/2" style={{ right: 4, color: c.textSecondary }} />
        </div>
      ) : (
        <>
          <input
            style={{ ...gridInputStyle(c), flex: 1 }}
            value={suffix}
            list={knownPaths.length > 0 ? listId : undefined}
            placeholder="caminho"
            onChange={(e) => onChange(namespace, e.target.value)}
          />
          {knownPaths.length > 0 && (
            <datalist id={listId}>
              {knownPaths.map((path) => (
                <option key={path} value={path} />
              ))}
            </datalist>
          )}
        </>
      )}
    </div>
  );
}

/** Edita somente os vínculos autorizados para o componente. Campos de entrada usam `value` em
 * leitura e escrita; componentes de conteúdo e feedback expõem os atributos de leitura previstos
 * no contrato funcional. */
export function BindingEditor({
  root,
  bindings,
  bindingNames,
  requiredBindingNames,
  fixedMode,
  variables,
  onChange,
}: {
  root: SduiNode | null;
  bindings: Record<string, SduiBinding> | null;
  bindingNames: string[];
  requiredBindingNames: string[];
  fixedMode: SduiBinding['mode'] | null;
  variables: VariableOrigin[];
  onChange: (bindings: Record<string, SduiBinding> | null) => void;
}) {
  const { c } = useFlowTheme();

  function setBinding(name: string, binding: SduiBinding | null) {
    const next = { ...(bindings ?? {}) };
    if (binding) next[name] = binding;
    else delete next[name];
    onChange(Object.keys(next).length > 0 ? next : null);
  }

  return (
    <div className="p-2 flex flex-col gap-[6px]">
      <div className="text-[11.5px]" style={{ color: c.textSecondary }}>
        Um binding conecta esta propriedade a um caminho do contexto de dados da jornada:{' '}
        <strong style={{ color: c.textPrimary }}>form</strong> ou{' '}
        <strong style={{ color: c.textPrimary }}>data</strong> (passe o mouse sobre o namespace
        escolhido pra ver o que cada um significa).
      </div>
      {bindingNames.map((name) => {
        const binding = bindings?.[name] ?? null;
        const { namespace, suffix } = splitPath(binding?.path);
        const mode = fixedMode ?? binding?.mode ?? 'oneWay';
        const required = requiredBindingNames.includes(name);
        return (
          <div key={name} className="flex flex-col gap-[4px]">
            <label className="flex items-center gap-[5px] text-[11.5px] font-medium" style={{ color: c.textPrimary }}>
              {required ? (
                <span
                  title="Obrigatório: este componente não funciona sem um valor vinculado, por isso não pode ser desmarcado."
                  className="inline-flex items-center justify-center shrink-0"
                  style={{ width: 13, height: 13 }}
                >
                  <Lock size={12} color={c.textSecondary} />
                </span>
              ) : (
                <input
                  type="checkbox"
                  checked={!!binding}
                  onChange={(e) => setBinding(name, e.target.checked ? { path: 'form.', mode } : null)}
                />
              )}
              {name}{required ? ' *' : ''}
            </label>
            {binding && <>
          <NamespacePathInput
            namespace={namespace}
            suffix={suffix}
            variables={variables}
            root={root}
            strict={mode === 'oneWay'}
            onChange={(ns, s) => setBinding(name, { path: `${ns}.${s}`, mode })}
          />
          {fixedMode ? (
            <div className="flex items-center gap-1 text-[10.5px]" style={{ color: c.textSecondary }} title={MODE_HELP[mode]}>
              {MODE_LABEL[mode]} <span style={{ opacity: 0.7 }}>(fixo para este componente)</span>
            </div>
          ) : (
            <select
              style={{ ...gridInputStyle(c), cursor: 'pointer' }}
              value={mode}
              title={MODE_HELP[mode]}
              onChange={(e) => setBinding(name, { path: binding.path, mode: e.target.value as SduiBinding['mode'] })}
            >
              <option value="twoWay">{MODE_LABEL.twoWay}</option>
              <option value="oneWay">{MODE_LABEL.oneWay}</option>
            </select>
          )}
            </>}
          </div>
        );
      })}
    </div>
  );
}
