import { useFlowTheme } from './theme';
import { gridInputStyle } from './PropertyGrid';
import { OPERATORS_BY_TYPE, VALUE_INPUT_TYPE, parseCondition, composeCondition } from '../shared/condition';
import { collectsValue } from '../api/forms';
import type { FormField, InputSubtype } from '../api/forms';
import type { VariableType } from './model';

// Mesma sintaxe {{campo}} OP valor da condição de saída do Gateway (US-03.11) — mesmo par
// parseCondition/composeCondition, extraído em `shared/condition.ts` de propósito pra ser
// reaproveitado aqui (ver comentário lá). Só a fonte da lista de variáveis muda: em vez de
// availableRules (variáveis de OUTROS nós do fluxo), aqui é local à própria tela — campos que
// aparecem ANTES do atual e coletam valor (mesma regra de Form.java:validateVisibleIf).
function inferVariableType(field: FormField): VariableType {
  if (field.type === 'SWITCH') return 'boolean';
  if (field.type === 'INPUT') {
    const numeric: (InputSubtype | null | undefined)[] = ['NUMBER', 'INTEGER'];
    if (numeric.includes(field.inputSubtype)) return 'number';
    if (field.inputSubtype === 'DATE') return 'date';
  }
  return 'string';
}

// Sub-aba "Lógica" do painel de Configuração — condição de exibição do campo SELECIONADO (não uma
// lista de todos os campos da tela, é escopado ao mesmo campo que a aba Campo está editando).
export function FieldLogicSection({
  fields,
  field,
  onUpdate,
}: {
  /** Tela inteira — só pra calcular quais campos anteriores são elegíveis como referência. */
  fields: FormField[];
  field: FormField;
  onUpdate: (patch: Partial<FormField>) => void;
}) {
  const { c } = useFlowTheme();
  const index = fields.findIndex((f) => f.name === field.name);
  const eligible = fields.slice(0, index === -1 ? fields.length : index).filter((f) => collectsValue(f.type));

  const isAlwaysVisible = !field.visibleIf;
  const parsed = parseCondition(field.visibleIf ?? undefined);
  const type: VariableType = inferVariableType(eligible.find((f) => f.name === parsed.variable) ?? eligible[0] ?? field);
  const operators = OPERATORS_BY_TYPE[type];

  function updateCondition(patch: Partial<typeof parsed>) {
    const next = { ...parsed, ...patch };
    const nextTarget = eligible.find((f) => f.name === next.variable);
    const nextType: VariableType = nextTarget ? inferVariableType(nextTarget) : 'string';
    if (!OPERATORS_BY_TYPE[nextType].some((op) => op.value === next.operator)) {
      next.operator = OPERATORS_BY_TYPE[nextType][0].value;
    }
    onUpdate({ visibleIf: composeCondition(next.variable, next.operator, next.value, nextType) });
  }

  return (
    <div className="p-2 flex flex-col gap-[6px]">
      <div className="text-[11.5px]" style={{ color: c.textSecondary }}>
        Exibição condicional — este componente pode ficar escondido até que outro campo (anterior a
        ele na tela) tenha um valor específico.
      </div>
      <label
        className="flex items-center gap-[4px] text-[11.5px]"
        style={{ color: c.textSecondary, cursor: eligible.length === 0 ? 'not-allowed' : 'pointer' }}
      >
        <input
          type="checkbox"
          checked={isAlwaysVisible}
          disabled={eligible.length === 0}
          onChange={(e) =>
            onUpdate({
              visibleIf: e.target.checked ? null : composeCondition(eligible[0]?.name ?? '', '==', '', inferVariableType(eligible[0] ?? field)),
            })
          }
        />
        Sempre visível (sem condição)
      </label>
      {eligible.length === 0 ? (
        isAlwaysVisible ? null : (
          <div className="text-[11px]" style={{ color: c.textSecondary }}>
            Nenhum campo anterior disponível pra condicionar a este.
          </div>
        )
      ) : (
        !isAlwaysVisible && (
          <div className="flex flex-col gap-1">
            <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={parsed.variable} onChange={(e) => updateCondition({ variable: e.target.value })}>
              <option value="">Campo...</option>
              {eligible.map((f) => (
                <option key={f.name} value={f.name}>
                  {f.label || f.name}
                </option>
              ))}
            </select>
            <div className="flex gap-1">
              <select style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }} value={parsed.operator} onChange={(e) => updateCondition({ operator: e.target.value })}>
                {operators.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </select>
              {type === 'boolean' ? (
                <select style={{ ...gridInputStyle(c), cursor: 'pointer', flex: 1 }} value={parsed.value || 'true'} onChange={(e) => updateCondition({ value: e.target.value })}>
                  <option value="true">Verdadeiro</option>
                  <option value="false">Falso</option>
                </select>
              ) : (
                <input
                  style={{ ...gridInputStyle(c), flex: 1 }}
                  type={VALUE_INPUT_TYPE[type] ?? 'text'}
                  placeholder="valor"
                  value={parsed.value}
                  onChange={(e) => updateCondition({ value: e.target.value })}
                />
              )}
            </div>
          </div>
        )
      )}
    </div>
  );
}
