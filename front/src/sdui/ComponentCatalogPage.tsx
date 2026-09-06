import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2 } from 'lucide-react';
import { PrimaryButton, ActionsMenu } from '../products/ui';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ToastProvider, useToast } from '../products/Toast';
import { useAppTheme } from '../shell/theme';
import { useAuth } from '../auth/AuthContext';
import {
  listComponentDefinitions,
  createComponentDefinition,
  updateComponentDefinition,
  deleteComponentDefinition,
  type ComponentDefinition,
  type ComponentDefinitionInput,
} from '../api/componentDefinitions';
import { ComponentDefinitionFormModal } from './ComponentDefinitionFormModal';
import { CATEGORY_LABEL } from './componentMeta';

const GRID_COLS = 'minmax(0,1.6fr) 90px 90px minmax(0,1.2fr) 110px minmax(0,1.6fr) 56px';

const STATUS_COLOR: Record<ComponentDefinition['status'], string> = {
  STABLE: '#16a34a',
  EXPERIMENTAL: '#d97706',
  DEPRECATED: '#dc2626',
  REMOVED: '#6b7280',
};

/** Component Registry (seção 12 do catálogo SDUI corporativo v1) — repositório de componentes que
 * o Form Builder pode usar na árvore de tela das User Tasks. Leitura liberada a qualquer role
 * autenticada; criar/editar/remover restrito a ADMIN (mesma regra dos outros catálogos). */
export function ComponentCatalogPage() {
  return (
    <ToastProvider>
      <ComponentCatalogPageContent />
    </ToastProvider>
  );
}

function ComponentCatalogPageContent() {
  const { colors: c } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canWrite = user?.role === 'ADMIN';

  const [definitions, setDefinitions] = useState<ComponentDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<ComponentDefinition | 'new' | null>(null);
  const [deleting, setDeleting] = useState<ComponentDefinition | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setDefinitions(await listComponentDefinitions());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o catálogo de componentes');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(
    () => definitions.filter((d) => !search || d.type.toLowerCase().includes(search.toLowerCase())),
    [definitions, search],
  );

  async function handleSubmit(input: ComponentDefinitionInput) {
    const isNew = editing === 'new';
    if (isNew) {
      await createComponentDefinition(input);
    } else if (editing) {
      await updateComponentDefinition(editing.id, input);
    }
    setEditing(null);
    await reload();
    showToast(isNew ? 'Componente criado com sucesso.' : 'Componente atualizado com sucesso.');
  }

  async function confirmDelete() {
    if (!deleting) return;
    const target = deleting;
    setDeleting(null);
    try {
      await deleteComponentDefinition(target.id);
      await reload();
      showToast('Componente marcado como removido.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover componente', 'error');
    }
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Catálogo de Componentes
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Componentes disponíveis para montar as telas das Jornadas
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[240px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar componente"
            placeholder="Buscar por tipo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
            style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
          />
        </div>
        {canWrite && (
          <PrimaryButton onClick={() => setEditing('new')}>
            <Plus size={14} /> Novo componente
          </PrimaryButton>
        )}
      </div>

      {error && (
        <p className="text-[13px]" style={{ color: c.danger }}>
          {error}
        </p>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[44px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-[13px]" style={{ color: c.textSecondary }}>
          Nenhum componente encontrado.
        </p>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-2 text-[11px] font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: GRID_COLS, background: c.surface, color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}
          >
            <div>Tipo</div>
            <div>Versão</div>
            <div>Nível</div>
            <div>Categoria</div>
            <div>Status</div>
            <div>Alvos suportados</div>
            <div />
          </div>
          {filtered.map((d) => {
            const supportedCount = Object.values(d.supportedTargets).filter((t) => t?.status === 'SUPPORTED').length;
            return (
              <div
                key={d.id}
                className="grid items-center px-4 py-[10px] text-[13px]"
                style={{ gridTemplateColumns: GRID_COLS, borderBottom: `1px solid ${c.border}`, color: c.textPrimary }}
              >
                <div className="font-medium truncate">{d.type}</div>
                <div style={{ color: c.textSecondary }}>{d.version}</div>
                <div style={{ color: c.textSecondary }}>{d.level}</div>
                <div style={{ color: c.textSecondary }}>{CATEGORY_LABEL[d.category]}</div>
                <div>
                  <span
                    className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-semibold"
                    style={{ background: `${STATUS_COLOR[d.status]}1a`, color: STATUS_COLOR[d.status] }}
                  >
                    {d.status}
                  </span>
                </div>
                <div style={{ color: c.textSecondary }}>{supportedCount}/4 alvos</div>
                <div className="flex justify-end">
                  {canWrite && (
                    <ActionsMenu
                      actions={[
                        { icon: Pencil, label: 'Editar', onClick: () => setEditing(d) },
                        { icon: Trash2, label: 'Remover', variant: 'danger', onClick: () => setDeleting(d), disabled: d.status === 'REMOVED' },
                      ]}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <ComponentDefinitionFormModal definition={editing === 'new' ? null : editing} onClose={() => setEditing(null)} onSubmit={handleSubmit} />
      )}
      {deleting && (
        <ConfirmDialog
          title="Remover componente"
          message={`Remover "${deleting.type}" do catálogo? Telas já publicadas com esse componente continuam funcionando (status vira REMOVED, a linha não é apagada), mas ele deixa de aparecer na paleta do editor.`}
          confirmLabel="Remover"
          onConfirm={confirmDelete}
          onCancel={() => setDeleting(null)}
        />
      )}
    </div>
  );
}
