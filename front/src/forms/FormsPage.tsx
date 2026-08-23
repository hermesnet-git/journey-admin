import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Search, Plus, FileText, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { PrimaryButton, SecondaryButton, ActionsMenu } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import { listForms, getForm, deleteForm, type Form } from '../api/forms';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ToastProvider, useToast } from '../products/Toast';
import { FormBuilderPage } from './FormBuilderPage';

interface FormsPageProps {
  // Presente quando essa aba foi aberta a partir do designer de jornada, pra ir direto pro modo de
  // edição de um formulário (formId) ou de um novo (openNew), em vez de mostrar a lista.
  formId?: string;
  openNew?: boolean;
  // Presente junto com formId/openNew: troca "voltar pra lista" por "fechar essa aba e voltar pro
  // designer de jornada", tanto no Cancelar quanto depois de salvar com sucesso.
  onExit?: () => void;
}

export function FormsPage(props: FormsPageProps) {
  return (
    <ToastProvider>
      <FormsPageContent {...props} />
    </ToastProvider>
  );
}

function FormsPageContent({ formId, openNew, onExit }: FormsPageProps) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [forms, setForms] = useState<Form[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editingForm, setEditingForm] = useState<Form | 'new' | null>(null);
  const [deletingForm, setDeletingForm] = useState<Form | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setForms(await listForms());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar formulários');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!formId) return;
    getForm(formId)
      .then(setEditingForm)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Erro ao abrir formulário', 'error'));
  }, [formId, showToast]);

  useEffect(() => {
    if (!openNew) return;
    setEditingForm('new');
  }, [openNew]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return forms;
    // Busca por nome OU descrição — uma pesquisa por "cancelamento" antes vinha vazia só porque a
    // palavra estava na descrição, não no nome.
    return forms.filter((f) => f.name.toLowerCase().includes(q) || (f.description ?? '').toLowerCase().includes(q));
  }, [forms, search]);

  async function confirmDelete() {
    if (!deletingForm) return;
    const form = deletingForm;
    setDeletingForm(null);
    try {
      await deleteForm(form.formId);
      await reload();
      showToast('Formulário excluído com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir formulário', 'error');
    }
  }

  if (editingForm) {
    return (
      <FormBuilderPage
        form={editingForm === 'new' ? null : editingForm}
        onBack={onExit ?? (() => setEditingForm(null))}
        onSaved={
          onExit
            ? async () => onExit()
            : async () => {
                setEditingForm(null);
                await reload();
              }
        }
      />
    );
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Formulários
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Gerencie os formulários usados pelas Tarefas de Usuário das jornadas
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <FormSearchBox search={search} onSearchChange={setSearch} matches={filtered} onPick={setEditingForm} />
        <div className="flex items-center gap-2">
          <SecondaryButton onClick={reload} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : undefined} /> Atualizar
          </SecondaryButton>
          <PrimaryButton onClick={() => setEditingForm('new')}>
            <Plus size={14} /> Novo formulário
          </PrimaryButton>
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasForms={forms.length > 0} onCreate={() => setEditingForm('new')} />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-2 text-[11.5px] font-semibold border-b"
            style={{ gridTemplateColumns: '2fr 3fr 1fr 1fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
          >
            <span>Formulário</span>
            <span>Descrição</span>
            <span>Campos</span>
            <span>Ações</span>
          </div>
          {filtered.map((f) => (
            <FormRow
              key={f.formId}
              form={f}
              onEdit={() => setEditingForm(f)}
              onDelete={() => setDeletingForm(f)}
            />
          ))}
        </div>
      )}

      {deletingForm && (
        <ConfirmDialog
          title="Excluir formulário"
          message={`Tem certeza que deseja excluir "${deletingForm.name}"? Tarefas de usuário que o referenciam ficarão sem formulário associado.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingForm(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasForms, onCreate }: { hasForms: boolean; onCreate: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 rounded-2xl border-dashed"
      style={{ background: c.surface, border: `1px dashed ${c.border}` }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
        <FileText size={20} color={c.accent} />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          {hasForms ? 'Nenhum formulário encontrado' : 'Nenhum formulário cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
          {hasForms
            ? 'Ajuste a busca para encontrar o que procura.'
            : 'Formulários são reutilizáveis entre Tarefas de Usuário de diferentes jornadas.'}
        </p>
      </div>
      {!hasForms && (
        <PrimaryButton onClick={onCreate}>
          <Plus size={14} /> Criar primeiro formulário
        </PrimaryButton>
      )}
    </div>
  );
}

// Busca-e-pula: digitar filtra a tabela abaixo (bate com nome ou descrição) igual antes, mas também
// solta um dropdown com os mesmos resultados logo abaixo do campo, então escolher um já abre pra
// edição direto — sem precisar rolar até achar o link "Editar" da linha depois de já ter digitado
// o nome que procurava.
function FormSearchBox({
  search,
  onSearchChange,
  matches,
  onPick,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  matches: Form[];
  onPick: (form: Form) => void;
}) {
  const { colors: c } = useAppTheme();
  const [focused, setFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focused) return;
    const onDocClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setFocused(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [focused]);

  const query = search.trim();
  const showDropdown = focused && query.length > 0;

  return (
    <div ref={containerRef} className="relative w-[320px]">
      <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
      <input
        aria-label="Buscar formulário"
        placeholder="Buscar por nome ou descrição..."
        value={search}
        onFocus={() => setFocused(true)}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full py-2 pl-[32px] pr-8 rounded-md text-[13px] outline-none box-border"
        style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
      />
      {search && (
        <button
          type="button"
          onClick={() => onSearchChange('')}
          title="Limpar busca"
          className="absolute right-[7px] top-1/2 -translate-y-1/2 rounded-full flex items-center justify-center cursor-pointer border-0"
          style={{ width: 18, height: 18, color: c.textMuted, background: 'transparent' }}
        >
          <X size={13} />
        </button>
      )}
      {showDropdown && (
        <div
          className="absolute left-0 right-0 top-[calc(100%+4px)] rounded-lg z-20"
          style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -10px ${c.shadow}`, maxHeight: 280, overflowY: 'auto' }}
        >
          <div className="px-3 pt-2 pb-1 text-[11px]" style={{ color: c.textMuted }}>
            {matches.length === 0 ? 'Nenhum resultado' : `${matches.length} encontrado${matches.length === 1 ? '' : 's'}`}
          </div>
          {matches.slice(0, 8).map((f) => (
            <button
              key={f.formId}
              type="button"
              onClick={() => {
                setFocused(false);
                onPick(f);
              }}
              className="w-full text-left px-3 py-[7px] border-0 bg-transparent cursor-pointer block"
              onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div className="text-[13px] font-semibold truncate" style={{ color: c.textPrimary }}>
                {f.name}
              </div>
              {f.description && (
                <div className="text-[11.5px] truncate mt-px" style={{ color: c.textMuted }}>
                  {f.description}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FormRow({ form, onEdit, onDelete }: { form: Form; onEdit: () => void; onDelete: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-4 py-2 text-[13px] border-b box-border last:border-b-0"
      style={{ gridTemplateColumns: '2fr 3fr 1fr 1fr', borderColor: c.border }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
        {form.name}
      </div>
      <div className="min-w-0 truncate" style={{ color: c.textMuted }}>
        {form.description || '—'}
      </div>
      <span style={{ color: c.textSecondary }}>{form.fields.length}</span>
      <ActionsMenu
        label="Ações do formulário"
        actions={[
          { icon: Pencil, label: 'Editar', onClick: onEdit },
          { icon: Trash2, label: 'Excluir', onClick: onDelete, variant: 'danger' },
        ]}
      />
    </div>
  );
}
