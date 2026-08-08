import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, FileText } from 'lucide-react';
import { PrimaryButton, LinkButton } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import { listForms, getForm, deleteForm, type Form } from '../api/forms';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ToastProvider, useToast } from '../products/Toast';
import { FormBuilderPage } from './FormBuilderPage';

interface FormsPageProps {
  openFormId?: string | null;
  onOpenFormIdHandled?: () => void;
  openNew?: boolean;
  onOpenNewHandled?: () => void;
}

export function FormsPage(props: FormsPageProps) {
  return (
    <ToastProvider>
      <FormsPageContent {...props} />
    </ToastProvider>
  );
}

function FormsPageContent({ openFormId, onOpenFormIdHandled, openNew, onOpenNewHandled }: FormsPageProps) {
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
    if (!openFormId) return;
    getForm(openFormId)
      .then(setEditingForm)
      .catch((err) => showToast(err instanceof Error ? err.message : 'Erro ao abrir formulário', 'error'))
      .finally(() => onOpenFormIdHandled?.());
  }, [openFormId, onOpenFormIdHandled, showToast]);

  useEffect(() => {
    if (!openNew) return;
    setEditingForm('new');
    onOpenNewHandled?.();
  }, [openNew, onOpenNewHandled]);

  const filtered = useMemo(
    () => forms.filter((f) => !search || f.name.toLowerCase().includes(search.toLowerCase())),
    [forms, search],
  );

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
        onBack={() => setEditingForm(null)}
        onSaved={async () => {
          setEditingForm(null);
          await reload();
        }}
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
        <div className="relative w-[280px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar formulário"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
            style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
          />
        </div>
        <PrimaryButton onClick={() => setEditingForm('new')}>
          <Plus size={14} /> Novo formulário
        </PrimaryButton>
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
            className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
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

function FormRow({ form, onEdit, onDelete }: { form: Form; onEdit: () => void; onDelete: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b box-border last:border-b-0"
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
      <div className="flex items-center gap-4">
        <LinkButton onClick={onEdit}>Editar</LinkButton>
        <LinkButton onClick={onDelete}>Excluir</LinkButton>
      </div>
    </div>
  );
}
