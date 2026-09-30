import { useEffect, useState } from 'react';
import { Database, Pencil, Play, Plus, Trash2 } from 'lucide-react';
import { Modal } from '../products/Modal';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ErrorBanner, Field, PrimaryButton, SecondaryButton, TextInput } from '../products/ui';
import { useToast } from '../products/Toast';
import { useAppTheme } from '../shell/theme';
import {
  createDataSource,
  deleteDataSource,
  listDataSources,
  testDataSource,
  updateDataSource,
  type DataSource,
  type DataSourceInput,
  type DataSourceTestResult,
} from '../api/dataSources';

/** Fontes de dados de referência (ADR-002): consultas REST GET que uma tela usa para montar listas
 * de apoio (horários, motivos). Cada tela publicada leva uma cópia da configuração, então alterar ou
 * excluir uma fonte só vale para as próximas publicações. */
export function DataSourcesSection({ canWrite }: { canWrite: boolean }) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [sources, setSources] = useState<DataSource[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<DataSource | 'new' | null>(null);
  const [deleting, setDeleting] = useState<DataSource | null>(null);
  const [testing, setTesting] = useState<DataSource | null>(null);

  function reload() {
    listDataSources().then(setSources).catch(() => setError('Não foi possível carregar as fontes de dados.'));
  }

  useEffect(reload, []);

  async function handleSubmit(input: DataSourceInput) {
    if (editing === 'new') await createDataSource(input);
    else if (editing) await updateDataSource(editing.dataSourceId, input);
    showToast(editing === 'new' ? 'Fonte de dados criada.' : 'Fonte de dados atualizada.');
    setEditing(null);
    reload();
  }

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteDataSource(deleting.dataSourceId);
      showToast('Fonte de dados excluída.');
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível excluir a fonte de dados.');
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div className="mt-8">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h2 className="m-0 text-[16px] font-semibold" style={{ color: c.textPrimary }}>Fontes de dados</h2>
          <p className="m-0 text-[12.5px]" style={{ color: c.textSecondary }}>
            Consultas que uma tela faz ao abrir para montar listas de apoio, como horários disponíveis ou motivos. Só os campos expostos chegam à tela.
          </p>
        </div>
        {canWrite && (
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={14} /> Nova fonte de dados
          </PrimaryButton>
        )}
      </div>
      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}
      {sources.length === 0 ? (
        <div className="rounded-xl p-6 text-center text-[13px]" style={{ border: `1px dashed ${c.border}`, color: c.textSecondary }}>
          Nenhuma fonte de dados cadastrada ainda.
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          {sources.map((source, i) => (
            <div key={source.dataSourceId} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i === 0 ? 'none' : `1px solid ${c.border}`, background: c.surface }}>
              <Database size={16} color={c.accent} className="shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="text-[13.5px] font-semibold" style={{ color: c.textPrimary }}>{source.name}</div>
                <div className="text-[12px] truncate font-mono" style={{ color: c.textSecondary }} title={source.url}>GET {source.url}</div>
                <div className="text-[11.5px]" style={{ color: c.textSecondary }}>
                  Lista em <span className="font-mono">{source.itemsPath}</span> · campos: <span className="font-mono">{source.exposedFields.join(', ')}</span> · timeout {source.timeoutMs} ms
                </div>
              </div>
              {canWrite && (
                <div className="flex items-center gap-1 shrink-0">
                  <IconAction title="Testar" onClick={() => setTesting(source)}><Play size={14} /></IconAction>
                  <IconAction title="Editar" onClick={() => setEditing(source)}><Pencil size={14} /></IconAction>
                  <IconAction title="Excluir" onClick={() => setDeleting(source)}><Trash2 size={14} /></IconAction>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && <DataSourceFormModal source={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSubmit={handleSubmit} />}
      {testing && <DataSourceTestModal source={testing} onClose={() => setTesting(null)} />}
      {deleting && (
        <ConfirmDialog
          title="Excluir fonte de dados"
          message={`Tem certeza que deseja excluir "${deleting.name}"? As telas já publicadas continuam funcionando com a configuração copiada na publicação; novas publicações que usem esta fonte deixam de ser aceitas.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}

function IconAction({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  const { colors: c } = useAppTheme();
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      className="w-8 h-8 rounded-md flex items-center justify-center border-0 cursor-pointer" style={{ background: 'transparent', color: c.textSecondary }}>
      {children}
    </button>
  );
}

function DataSourceFormModal({ source, onClose, onSubmit }: { source: DataSource | null; onClose: () => void; onSubmit: (input: DataSourceInput) => Promise<void> }) {
  const [name, setName] = useState(source?.name ?? '');
  const [description, setDescription] = useState(source?.description ?? '');
  const [url, setUrl] = useState(source?.url ?? '');
  const [itemsPath, setItemsPath] = useState(source?.itemsPath ?? '$');
  const [exposedFields, setExposedFields] = useState((source?.exposedFields ?? []).join(', '));
  const [timeoutMs, setTimeoutMs] = useState(String(source?.timeoutMs ?? 5000));
  const [credentialRef, setCredentialRef] = useState(source?.credentialRef ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        name,
        description: description || null,
        url,
        itemsPath,
        exposedFields: exposedFields.split(',').map((f) => f.trim()).filter(Boolean),
        timeoutMs: Number(timeoutMs),
        credentialRef: credentialRef || null,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar a fonte de dados');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={source ? 'Editar fonte de dados' : 'Nova fonte de dados'}
      subtitle="Consulta GET que uma tela faz ao abrir. Marque os parâmetros na URL entre chaves, por exemplo {bilhete}."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!name || !url || !itemsPath || !exposedFields.trim()}>
            {source ? 'Salvar alterações' : 'Criar fonte'}
          </PrimaryButton>
        </>
      }
    >
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="flex flex-col gap-4">
        <Field label="Nome" helperText="É por este nome que a tela escolhe a fonte.">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus placeholder="ex.: Agenda técnica" />
        </Field>
        <Field label="Descrição">
          <TextInput value={description} onChange={(e) => setDescription(e.target.value)} maxLength={500} placeholder="ex.: Horários livres para visita técnica" />
        </Field>
        <Field label="URL" helperText="Parâmetros entre chaves são preenchidos pela tela com dados da jornada.">
          <TextInput value={url} onChange={(e) => setUrl(e.target.value)} maxLength={500} placeholder="http://localhost:8084/v1/bilhetes/{bilhete}/horarios-disponiveis" />
        </Field>
        <Field label="Caminho da lista na resposta" helperText="$ quando a resposta já é a lista; $.campo quando a lista está dentro de um campo.">
          <TextInput value={itemsPath} onChange={(e) => setItemsPath(e.target.value)} maxLength={200} placeholder="$.horarios" />
        </Field>
        <Field label="Campos expostos" helperText="Separados por vírgula. Só estes campos de cada item saem do servidor.">
          <TextInput value={exposedFields} onChange={(e) => setExposedFields(e.target.value)} placeholder="value, label" />
        </Field>
        <Field label="Tempo limite (ms)">
          <TextInput type="number" value={timeoutMs} onChange={(e) => setTimeoutMs(e.target.value)} min={100} max={30000} />
        </Field>
        <Field label="Credencial (opcional)" helperText="Nome de referência da credencial usada para autenticar na fonte.">
          <TextInput value={credentialRef} onChange={(e) => setCredentialRef(e.target.value)} maxLength={150} />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}

function DataSourceTestModal({ source, onClose }: { source: DataSource; onClose: () => void }) {
  const { colors: c } = useAppTheme();
  const [params, setParams] = useState<Record<string, string>>({});
  const [result, setResult] = useState<DataSourceTestResult | null>(null);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    try {
      setResult(await testDataSource(source.dataSourceId, params));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Falha ao testar a fonte.');
    } finally {
      setRunning(false);
    }
  }

  return (
    <Modal
      title={`Testar "${source.name}"`}
      subtitle="Consulta a fonte agora com valores de exemplo e mostra os itens que chegariam à tela."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
          <PrimaryButton onClick={run} loading={running}>Testar</PrimaryButton>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {source.params.map((param) => (
          <Field key={param} label={`{${param}}`}>
            <TextInput value={params[param] ?? ''} onChange={(e) => setParams((p) => ({ ...p, [param]: e.target.value }))} />
          </Field>
        ))}
        {error && <ErrorBanner>{error}</ErrorBanner>}
        {result && (
          <div className="flex flex-col gap-2">
            <div className="text-[12.5px]" style={{ color: result.status >= 200 && result.status < 300 ? c.textSecondary : c.danger }}>
              Status {result.status} · {result.durationMs} ms · {result.items.length} item(ns){result.message ? ` — ${result.message}` : ''}
            </div>
            <pre className="rounded-md p-3 text-[11.5px] overflow-auto m-0" style={{ background: c.surface, border: `1px solid ${c.border}`, color: c.textPrimary, maxHeight: 280 }}>
              {JSON.stringify(result.items, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </Modal>
  );
}
