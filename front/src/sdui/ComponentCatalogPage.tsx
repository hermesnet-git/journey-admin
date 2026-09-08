import { useCallback, useEffect, useMemo, useState } from 'react';
import { Search, Plus, Pencil, Trash2, Globe2, Smartphone, MessageCircle, Layers3, ShieldCheck, UserRound } from 'lucide-react';
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
  RENDER_TARGETS,
  type RenderTarget,
} from '../api/componentDefinitions';
import { ComponentDefinitionFormModal } from './ComponentDefinitionFormModal';
import { CATEGORY_LABEL } from './componentMeta';
import { iconFor, labelFor } from './componentMeta';

const GRID_COLS = 'minmax(230px,1.5fr) 115px 90px minmax(140px,1fr) 120px minmax(270px,1.5fr) 48px';

const STATUS_COLOR: Record<ComponentDefinition['status'], string> = {
  STABLE: '#16a34a',
  EXPERIMENTAL: '#d97706',
  DEPRECATED: '#dc2626',
  REMOVED: '#6b7280',
};
const STATUS_LABEL: Record<ComponentDefinition['status'], string> = {
  STABLE: 'Estável',
  EXPERIMENTAL: 'Experimental',
  DEPRECATED: 'Descontinuando',
  REMOVED: 'Removido',
};
const TARGET_PRESENTATION: Record<RenderTarget, { label: string; icon: typeof Globe2 }> = {
  'react.web': { label: 'React Web', icon: Globe2 },
  'react.mobile': { label: 'React Mobile', icon: Smartphone },
  'flutter.web': { label: 'Flutter Web', icon: Globe2 },
  'flutter.mobile': { label: 'Flutter Mobile', icon: Smartphone },
  whatsapp: { label: 'WhatsApp', icon: MessageCircle },
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
    () => definitions.filter((d) => {
      const term = search.trim().toLowerCase();
      return !term || d.type.toLowerCase().includes(term) || labelFor(d.type).toLowerCase().includes(term)
        || CATEGORY_LABEL[d.category].toLowerCase().includes(term);
    }),
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
          Gerencie os componentes disponíveis para criar experiências Web, Mobile e WhatsApp.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[320px] max-w-full">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar componente"
            placeholder="Buscar por nome ou tipo técnico..."
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
        <div className="rounded-xl overflow-x-auto" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
          <div style={{ minWidth: 1080 }}>
          <div
            className="grid px-5 py-3 text-[11px] font-bold uppercase tracking-wide"
            style={{ gridTemplateColumns: GRID_COLS, background: c.surface, color: c.textSecondary, borderBottom: `1px solid ${c.border}` }}
          >
            <div>Componente</div>
            <div>Origem</div>
            <div>Versão</div>
            <div>Categoria</div>
            <div>Status</div>
            <div>Alvos de renderização</div>
            <div />
          </div>
          {filtered.map((d) => {
            const Icon = iconFor(d.type);
            return (
              <div
                key={d.id}
                className="grid items-center px-5 py-3 text-[13px] transition-colors"
                style={{ gridTemplateColumns: GRID_COLS, borderBottom: `1px solid ${c.border}`, color: c.textPrimary }}
                onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: c.accentSoft, color: c.accent }}>
                    <Icon size={17} />
                  </span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{labelFor(d.type)}</div>
                    <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>{d.type}</div>
                  </div>
                </div>
                <div>
                  <span
                    className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[11px] font-medium"
                    style={{ color: d.origin === 'SYSTEM' ? c.accent : c.textSecondary, background: d.origin === 'SYSTEM' ? c.accentSoft : c.bg }}
                  >
                    {d.origin === 'SYSTEM' ? <ShieldCheck size={12} /> : <UserRound size={12} />}
                    {d.origin === 'SYSTEM' ? 'Sistêmico' : 'Customizado'}
                  </span>
                </div>
                <div><span className="px-2 py-1 rounded-md text-[11.5px] font-medium" style={{ color: c.textSecondary, background: c.bg }}>v{d.version}</span></div>
                <div className="flex items-center gap-2" style={{ color: c.textSecondary }}><Layers3 size={14} /> {CATEGORY_LABEL[d.category]}</div>
                <div>
                  <span
                    className="inline-flex items-center px-2 py-[2px] rounded-full text-[11px] font-semibold"
                    style={{ background: `${STATUS_COLOR[d.status]}1a`, color: STATUS_COLOR[d.status] }}
                  >
                    {STATUS_LABEL[d.status]}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {RENDER_TARGETS.map((target) => {
                    const { label, icon: TargetIcon } = TARGET_PRESENTATION[target];
                    const state = d.supportedTargets[target]?.status ?? 'UNSUPPORTED';
                    const enabled = state === 'SUPPORTED';
                    return (
                      <span
                        key={target}
                        title={`${label}: ${enabled ? 'compatível' : state === 'PLANNED' ? 'planejado' : 'incompatível'}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium"
                        style={{
                          color: enabled ? c.success : state === 'PLANNED' ? c.warning : c.textMuted,
                          background: enabled ? c.successSoft : state === 'PLANNED' ? c.warningSoft : c.bg,
                          opacity: state === 'UNSUPPORTED' ? 0.55 : 1,
                        }}
                      >
                        <TargetIcon size={12} /> {label}
                      </span>
                    );
                  })}
                </div>
                <div className="flex justify-end">
                  {canWrite && (
                    <ActionsMenu
                      actions={[
                        { icon: Pencil, label: 'Editar', onClick: () => setEditing(d) },
                        ...(d.origin === 'CUSTOM' ? [{ icon: Trash2, label: 'Remover', variant: 'danger' as const, onClick: () => setDeleting(d), disabled: d.status === 'REMOVED' }] : []),
                      ]}
                    />
                  )}
                </div>
              </div>
            );
          })}
          </div>
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
