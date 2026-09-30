import { useState } from 'react';
import { Plus, Play, X } from 'lucide-react';
import { useFlowTheme } from '../theme';
import { gridInputStyle } from '../PropertyGrid';
import { VariablePickerButton, insertTokenAtCursor } from '../PropertiesPanel';
import { bareDataName, engineVariableToken, type VariableOrigin } from '../model';
import type { ScreenDataSource } from '../../api/flows';
import { testDataSource, type DataSource } from '../../api/dataSources';

/** Fontes de dados de referência da tela (ADR-002): o resultado de cada uma vira data.<apelido>, uma
 * lista disponível só nesta tela — pra lista de seleção ou as opções de um select. A busca acontece
 * no servidor, a cada vez que a tela é montada. "Testar" chama a fonte com valores de exemplo e o
 * resultado alimenta o preview. */
export function DataSourcesPanel({
  dataSources,
  onChange,
  variables,
  onSampleItems,
  catalog,
  catalogError,
}: {
  dataSources: ScreenDataSource[];
  onChange: (next: ScreenDataSource[]) => void;
  variables: VariableOrigin[];
  onSampleItems: (alias: string, items: Record<string, unknown>[]) => void;
  catalog: DataSource[];
  catalogError: boolean;
}) {
  const { c } = useFlowTheme();
  const [examples, setExamples] = useState<Record<string, Record<string, string>>>({});
  const [testStatus, setTestStatus] = useState<Record<string, { text: string; error: boolean }>>({});

  function update(index: number, patch: Partial<ScreenDataSource>) {
    onChange(dataSources.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  }

  async function runTest(declaration: ScreenDataSource) {
    const source = catalog.find((s) => s.name === declaration.source);
    if (!source) return;
    setTestStatus((s) => ({ ...s, [declaration.alias]: { text: 'Consultando…', error: false } }));
    try {
      const result = await testDataSource(source.dataSourceId, examples[declaration.alias] ?? {});
      onSampleItems(declaration.alias, result.items);
      setTestStatus((s) => ({
        ...s,
        [declaration.alias]: result.message
          ? { text: result.message, error: result.status < 200 || result.status >= 300 }
          : { text: `${result.items.length} item(ns) em ${result.durationMs} ms — o preview já usa estes itens.`, error: false },
      }));
    } catch (e) {
      setTestStatus((s) => ({ ...s, [declaration.alias]: { text: e instanceof Error ? e.message : 'Falha ao testar a fonte.', error: true } }));
    }
  }

  const label = { color: c.textSecondary, fontSize: 10.5, fontWeight: 600 } as const;

  return (
    <div className="shrink-0 px-3 py-2 flex flex-col gap-2" style={{ borderBottom: `1px solid ${c.border}`, background: c.canvasBg, maxHeight: 320, overflowY: 'auto' }}>
      <div className="text-[11px]" style={{ color: c.textSecondary }}>
        Cada fonte busca uma lista de apoio quando a tela é aberta (por exemplo, horários disponíveis). O resultado fica em{' '}
        <strong style={{ color: c.textPrimary }}>data.&lt;apelido&gt;</strong> só nesta tela e não é gravado na jornada.
      </div>
      {catalogError && <div className="text-[11px]" style={{ color: c.danger }}>Não foi possível carregar o catálogo de fontes de dados.</div>}
      {dataSources.map((declaration, index) => {
        const source = catalog.find((s) => s.name === declaration.source);
        const status = testStatus[declaration.alias];
        return (
          <div key={index} className="rounded-md p-2 flex flex-col gap-1.5" style={{ border: `1px solid ${c.border}`, background: c.cardBg }}>
            <div className="flex gap-2 items-end">
              <label className="flex flex-col gap-0.5" style={{ flex: '0 0 150px' }}>
                <span style={label}>Apelido</span>
                <input style={{ ...gridInputStyle(c), fontFamily: 'monospace' }} value={declaration.alias} placeholder="horarios"
                  onChange={(e) => update(index, { alias: e.target.value })} />
              </label>
              <label className="flex flex-col gap-0.5" style={{ flex: 1 }}>
                <span style={label}>Fonte do catálogo</span>
                <select style={{ ...gridInputStyle(c), cursor: 'pointer' }} value={declaration.source}
                  onChange={(e) => update(index, { source: e.target.value, params: {} })}>
                  <option value="">Selecione…</option>
                  {catalog.map((s) => <option key={s.dataSourceId} value={s.name}>{s.name}</option>)}
                </select>
              </label>
              <label className="flex items-center gap-1 text-[11px]" style={{ color: c.textPrimary, paddingBottom: 6 }}
                title="Obrigatória: se a fonte falhar, a tela mostra o erro com &quot;Tentar novamente&quot; e não deixa avançar. Opcional: a tela abre com a lista vazia e a mensagem.">
                <input type="checkbox" checked={declaration.required} onChange={(e) => update(index, { required: e.target.checked })} />
                Obrigatória
              </label>
              <button type="button" onClick={() => onChange(dataSources.filter((_, i) => i !== index))} title="Remover fonte"
                className="w-[24px] h-[24px] rounded flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: c.textSecondary, marginBottom: 3 }}>
                <X size={13} />
              </button>
            </div>
            {source && source.params.map((param) => (
              <ParamRow key={param} param={param} value={declaration.params[param] ?? ''} variables={variables}
                example={examples[declaration.alias]?.[param] ?? ''}
                onChange={(value) => update(index, { params: { ...declaration.params, [param]: value } })}
                onExampleChange={(value) => setExamples((ex) => ({ ...ex, [declaration.alias]: { ...(ex[declaration.alias] ?? {}), [param]: value } }))} />
            ))}
            <label className="flex flex-col gap-0.5">
              <span style={label}>Mensagem se a fonte falhar</span>
              <input style={gridInputStyle(c)} value={declaration.errorMessage} placeholder="Não foi possível carregar as informações agora."
                onChange={(e) => update(index, { errorMessage: e.target.value })} />
            </label>
            {source && (
              <div className="flex items-center gap-2 text-[10.5px]" style={{ color: c.textSecondary }}>
                <span>Campos de cada item: <span style={{ fontFamily: 'monospace' }}>{source.exposedFields.join(', ')}</span></span>
                <span className="flex-1" />
                <button type="button" onClick={() => runTest(declaration)} disabled={!declaration.alias}
                  className="flex items-center gap-1 rounded px-2 py-1 border-0 cursor-pointer text-[11px] font-medium"
                  style={{ background: c.accentSoft, color: c.accent }}>
                  <Play size={11} /> Testar
                </button>
              </div>
            )}
            {status && <div className="text-[10.5px]" style={{ color: status.error ? c.danger : c.textSecondary }}>{status.text}</div>}
          </div>
        );
      })}
      <button type="button" onClick={() => onChange([...dataSources, { alias: '', source: '', params: {}, required: true, errorMessage: '' }])}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer self-start" style={{ color: c.accent, fontSize: 11.5, padding: '2px 0' }}>
        <Plus size={12} /> Fonte de dados
      </button>
    </div>
  );
}

function ParamRow({ param, value, variables, example, onChange, onExampleChange }: {
  param: string;
  value: string;
  variables: VariableOrigin[];
  example: string;
  onChange: (value: string) => void;
  onExampleChange: (value: string) => void;
}) {
  const { c } = useFlowTheme();
  const [input, setInput] = useState<HTMLInputElement | null>(null);
  return (
    <div className="flex gap-2 items-center">
      <span className="text-[11px] font-mono" style={{ flex: '0 0 150px', color: c.textPrimary }}>{`{${param}}`}</span>
      <span className="flex gap-1 items-center" style={{ flex: 1 }}>
        <input ref={setInput} style={{ ...gridInputStyle(c), flex: 1, fontFamily: 'monospace' }} value={value} placeholder="{{form_bilheteSelecionado}}"
          onChange={(e) => onChange(e.target.value)} title="Valor usado em execução — uma variável da jornada ou texto fixo" />
        <VariablePickerButton variables={variables.filter((v) => v.type !== 'list')}
          tokenFor={(v) => engineVariableToken(v.kind, v.kind === 'data' ? bareDataName(v.name) : v.name)}
          onInsert={(token) => insertTokenAtCursor(input, value, token, onChange)} />
      </span>
      <input style={{ ...gridInputStyle(c), flex: '0 0 140px' }} value={example} placeholder="exemplo p/ testar"
        onChange={(e) => onExampleChange(e.target.value)} title="Valor usado só no botão Testar — não é salvo" />
    </div>
  );
}
