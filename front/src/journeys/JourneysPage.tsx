import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, Route, Trash2, Pencil, CloudOff, PowerOff, ChevronRight } from 'lucide-react';
import { PrimaryButton, SecondaryButton, FilterDropdown, type FilterOption } from '../products/ui';
import { useAppTheme, type AppColors } from '../shell/theme';
import { ToastProvider, useToast } from '../products/Toast';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ApiClientError } from '../api/client';
import {
  listJourneys,
  deactivateJourney,
  deleteJourney,
  unpublishJourney,
  type Journey,
  type JourneyStatus,
} from '../api/journeys';
import {
  listJourneyVersions,
  publishJourneyVersion,
  unpublishJourneyVersion,
  republishJourneyVersion,
  type JourneyVersion,
  type VersionStatus,
} from '../api/versions';
import { JourneyDesignerPage } from '../flow-designer/JourneyDesignerPage';
import { NewJourneyModal } from './NewJourneyModal';

type StatusFilter = 'all' | JourneyStatus;

const STATUS_FILTER_OPTIONS: FilterOption[] = [
  { value: 'all', label: 'Todas' },
  { value: 'DRAFT', label: 'Rascunho' },
  { value: 'PUBLISHED', label: 'Publicadas' },
  { value: 'UNPUBLISHED', label: 'Despublicadas' },
  { value: 'INACTIVE', label: 'Inativas' },
];

const GRID_COLS = 'minmax(0,2fr) 1.3fr 1fr 1fr 132px';

function journeyStatusMeta(c: AppColors): Record<JourneyStatus, { label: string; bg: string; color: string }> {
  return {
    DRAFT: { label: 'Rascunho', bg: c.chipBg, color: c.textSecondary },
    PUBLISHED: { label: 'Publicada', bg: c.successSoft, color: c.success },
    UNPUBLISHED: { label: 'Despublicada', bg: c.warningSoft, color: c.warning },
    INACTIVE: { label: 'Inativa', bg: c.chipBg, color: c.textMuted },
  };
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface JourneysPageProps {
  onOpenForm: (formId: string) => void;
  onOpenNewForm: () => void;
}

export function JourneysPage({ onOpenForm, onOpenNewForm }: JourneysPageProps) {
  return (
    <ToastProvider>
      <JourneysPageContent onOpenForm={onOpenForm} onOpenNewForm={onOpenNewForm} />
    </ToastProvider>
  );
}

function JourneysPageContent({ onOpenForm, onOpenNewForm }: JourneysPageProps) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [creatingJourney, setCreatingJourney] = useState(false);
  const [deactivatingJourney, setDeactivatingJourney] = useState<Journey | null>(null);
  const [deletingJourney, setDeletingJourney] = useState<Journey | null>(null);
  const [unpublishingJourney, setUnpublishingJourney] = useState<Journey | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const journeyList = await listJourneys({});
      setJourneys(journeyList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jornadas');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(
    () =>
      journeys
        .filter((j) => statusFilter === 'all' || j.status === statusFilter)
        .filter((j) => !search || j.name.toLowerCase().includes(search.toLowerCase())),
    [journeys, search, statusFilter],
  );

  if (editingJourney) {
    return (
      <JourneyDesignerPage
        journey={editingJourney}
        onOpenForm={onOpenForm}
        onOpenNewForm={onOpenNewForm}
        onClose={async () => {
          setEditingJourney(null);
          await reload();
        }}
        onSaved={async () => {
          setEditingJourney(null);
          await reload();
          const time = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
          showToast(`Jornada salva às ${time}.`);
        }}
      />
    );
  }

  async function confirmDeactivate() {
    if (!deactivatingJourney) return;
    const journey = deactivatingJourney;
    setDeactivatingJourney(null);
    try {
      await deactivateJourney(journey.journeyId);
      await reload();
      showToast('Jornada desativada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível desativar: a jornada possui publicação ativa.'
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar jornada';
      showToast(message, 'error');
    }
  }

  async function confirmUnpublish() {
    if (!unpublishingJourney) return;
    const journey = unpublishingJourney;
    setUnpublishingJourney(null);
    try {
      await unpublishJourney(journey.journeyId);
      await reload();
      showToast('Jornada despublicada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'A jornada não está publicada.'
          : err instanceof Error
            ? err.message
            : 'Erro ao despublicar jornada';
      showToast(message, 'error');
    }
  }

  async function confirmDelete() {
    if (!deletingJourney) return;
    const journey = deletingJourney;
    setDeletingJourney(null);
    try {
      await deleteJourney(journey.journeyId);
      await reload();
      showToast(journey.publishedAt ? 'Jornada inativada com sucesso.' : 'Jornada excluída com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível excluir: uma versão da jornada está publicada.'
          : err instanceof Error
            ? err.message
            : 'Erro ao excluir jornada';
      showToast(message, 'error');
    }
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Jornadas
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Jornadas específicas por canal, dentro de cada produto
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="flex gap-2 items-center">
          <div className="relative w-[220px]">
            <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
            <input
              aria-label="Buscar jornada"
              placeholder="Buscar jornada..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
              style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
            />
          </div>
          <FilterDropdown
            label="Status"
            options={STATUS_FILTER_OPTIONS}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as StatusFilter)}
          />
        </div>
        <PrimaryButton onClick={() => setCreatingJourney(true)}>
          <Plus size={14} /> Nova jornada
        </PrimaryButton>
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-[6px]">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-xl animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasJourneys={journeys.length > 0} onCreate={() => setCreatingJourney(true)} />
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
          <div
            className="grid items-center px-4"
            style={{ gridTemplateColumns: GRID_COLS, minHeight: 34, background: c.surface }}
          >
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] py-2" style={{ color: c.textMuted }}>
              Jornada
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
              Produto / Canal
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
              Status
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
              Atualizada em
            </span>
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] text-right" style={{ color: c.textMuted }}>
              Ações
            </span>
          </div>
          {filtered.map((j) => (
            <JourneyDetailRow
              key={j.journeyId}
              journey={j}
              onEdit={() => setEditingJourney(j)}
              onDeactivate={() => setDeactivatingJourney(j)}
              onDelete={() => setDeletingJourney(j)}
              onUnpublish={() => setUnpublishingJourney(j)}
              onVersionsChanged={reload}
            />
          ))}
        </div>
      )}

      {creatingJourney && (
        <NewJourneyModal
          onClose={() => setCreatingJourney(false)}
          onCreated={(journey) => {
            setCreatingJourney(false);
            setEditingJourney(journey);
            showToast('Jornada criada com sucesso.');
          }}
        />
      )}

      {deactivatingJourney && (
        <ConfirmDialog
          title="Desativar jornada"
          message={`Tem certeza que deseja desativar "${deactivatingJourney.name}"? O histórico da jornada será preservado.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingJourney(null)}
        />
      )}

      {deletingJourney && (
        <ConfirmDialog
          title="Excluir jornada"
          message={
            deletingJourney.publishedAt
              ? `Tem certeza que deseja excluir "${deletingJourney.name}"? Como ela já foi publicada, não será removida permanentemente — a jornada e suas versões serão apenas inativadas.`
              : `Tem certeza que deseja excluir permanentemente "${deletingJourney.name}"? Essa ação não pode ser desfeita.`
          }
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingJourney(null)}
        />
      )}

      {unpublishingJourney && (
        <ConfirmDialog
          title="Despublicar jornada"
          message={`Tem certeza que deseja despublicar "${unpublishingJourney.name}"? O registro da publicação é preservado, mas ela deixa de estar disponível.`}
          confirmLabel="Despublicar"
          onConfirm={confirmUnpublish}
          onCancel={() => setUnpublishingJourney(null)}
        />
      )}
    </div>
  );
}

function JourneyStatusTag({ status }: { status: JourneyStatus }) {
  const { colors: c } = useAppTheme();
  const meta = journeyStatusMeta(c)[status];
  return (
    <span
      className="shrink-0 inline-flex items-center rounded-full px-[10px] py-[3px] text-[11.5px] font-medium w-fit"
      style={{ background: meta.bg, color: meta.color }}
    >
      {meta.label}
    </span>
  );
}

function EmptyState({ hasJourneys, onCreate }: { hasJourneys: boolean; onCreate: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 rounded-2xl border-dashed"
      style={{ background: c.surface, border: `1px dashed ${c.border}` }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
        <Route size={20} color={c.accent} />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          {hasJourneys ? 'Nenhuma jornada encontrada' : 'Nenhuma jornada cadastrada ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
          {hasJourneys
            ? 'Ajuste a busca ou os filtros para encontrar o que procura.'
            : 'Jornadas definem o fluxo específico de um canal dentro de um produto.'}
        </p>
      </div>
      {!hasJourneys && (
        <PrimaryButton onClick={onCreate}>
          <Plus size={14} /> Criar primeira jornada
        </PrimaryButton>
      )}
    </div>
  );
}

function IconAction({
  icon: Icon,
  label,
  onClick,
  hoverColor,
  disabled,
}: {
  icon: typeof Pencil;
  label: string;
  onClick: () => void;
  hoverColor?: string;
  disabled?: boolean;
}) {
  const { colors: c } = useAppTheme();
  if (disabled) {
    return (
      <span
        title={label}
        aria-label={label}
        aria-disabled="true"
        className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md cursor-not-allowed"
        style={{ color: c.textMuted, opacity: 0.4 }}
      >
        <Icon size={14} />
      </span>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className="inline-flex items-center justify-center w-[26px] h-[26px] rounded-md bg-transparent border-0 cursor-pointer"
      style={{ color: c.textMuted }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = hoverColor ?? c.accent;
        e.currentTarget.style.background = c.chipBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = c.textMuted;
        e.currentTarget.style.background = 'transparent';
      }}
    >
      <Icon size={14} />
    </button>
  );
}

function JourneyActions({
  journey,
  onEdit,
  onDeactivate,
  onDelete,
  onUnpublish,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onUnpublish: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div className="flex items-center justify-end gap-[2px]" onClick={(e) => e.stopPropagation()}>
      <IconAction
        icon={Pencil}
        label={journey.status === 'INACTIVE' ? 'Jornada inativa não pode ser editada' : 'Editar jornada'}
        onClick={onEdit}
        disabled={journey.status === 'INACTIVE'}
      />
      {journey.status === 'PUBLISHED' && (
        <IconAction icon={CloudOff} label="Despublicar jornada" onClick={onUnpublish} hoverColor={c.warning} />
      )}
      {journey.status === 'DRAFT' && (
        <IconAction icon={PowerOff} label="Desativar jornada" onClick={onDeactivate} hoverColor={c.warning} />
      )}
      <IconAction
        icon={Trash2}
        label={journey.status === 'INACTIVE' ? 'Jornada já está inativa' : 'Excluir jornada'}
        onClick={onDelete}
        hoverColor={c.danger}
        disabled={journey.status === 'INACTIVE'}
      />
    </div>
  );
}

function JourneyDetailRow({
  journey,
  onEdit,
  onDeactivate,
  onDelete,
  onUnpublish,
  onVersionsChanged,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onDelete: () => void;
  onUnpublish: () => void;
  onVersionsChanged: () => void;
}) {
  const { colors: c } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        className="grid items-center px-4 py-[10px] cursor-pointer border-t"
        style={{ gridTemplateColumns: GRID_COLS, borderColor: c.border }}
        onClick={() => setOpen((o) => !o)}
        onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
      >
        <div className="flex items-center gap-[8px] min-w-0">
          <ChevronRight
            size={13}
            className="shrink-0 transition-transform"
            style={{ color: c.textMuted, transform: open ? 'rotate(90deg)' : 'none' }}
          />
          <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
            {journey.name}
          </div>
        </div>
        <span className="truncate text-[12.5px]" style={{ color: c.textSecondary }}>
          {journey.productName} <span style={{ color: c.border }}>›</span> {journey.channelName}
        </span>
        <div className="flex items-center gap-[6px]">
          <JourneyStatusTag status={journey.status} />
          {journey.publishedVersionNumber !== null && (
            <span className="text-[11px] font-medium" style={{ color: c.textMuted }}>
              v{journey.publishedVersionNumber} publicada
            </span>
          )}
        </div>
        <span className="text-[12px]" style={{ color: c.textSecondary }}>
          {formatDate(journey.updatedAt)}
        </span>
        <JourneyActions
          journey={journey}
          onEdit={onEdit}
          onDeactivate={onDeactivate}
          onDelete={onDelete}
          onUnpublish={onUnpublish}
        />
      </div>
      {open && <JourneyVersionsRows journeyId={journey.journeyId} onJourneyChanged={onVersionsChanged} />}
    </>
  );
}

function versionStatusMeta(c: AppColors, status: VersionStatus) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Rascunho', bg: c.chipBg, color: c.textSecondary };
    case 'PUBLISHED':
      return { label: 'Publicada', bg: c.successSoft, color: c.success };
    case 'UNPUBLISHED':
      return { label: 'Despublicada', bg: c.chipBg, color: c.textMuted };
    case 'INACTIVE':
      return { label: 'Inativa', bg: c.chipBg, color: c.textMuted };
  }
}

function JourneyVersionsRows({ journeyId, onJourneyChanged }: { journeyId: string; onJourneyChanged: () => void }) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [versions, setVersions] = useState<JourneyVersion[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [publishingVersion, setPublishingVersion] = useState<JourneyVersion | null>(null);
  const [unpublishingVersion, setUnpublishingVersion] = useState<JourneyVersion | null>(null);
  const [republishingVersion, setRepublishingVersion] = useState<JourneyVersion | null>(null);

  const reload = useCallback(() => {
    listJourneyVersions(journeyId)
      .then(setVersions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar versões.'));
  }, [journeyId]);

  useEffect(reload, [reload]);

  async function confirmPublish() {
    if (!publishingVersion) return;
    const versionId = publishingVersion.versionId;
    setPublishingVersion(null);
    setBusyVersionId(versionId);
    setError(null);
    try {
      await publishJourneyVersion(journeyId, versionId);
      reload();
      onJourneyChanged();
      showToast('Versão publicada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 422
          ? 'Não é possível publicar: o produto ou o canal está inativo.'
          : err instanceof Error
            ? err.message
            : 'Erro ao publicar versão.';
      setError(message);
    } finally {
      setBusyVersionId(null);
    }
  }

  async function confirmUnpublish() {
    if (!unpublishingVersion) return;
    const versionId = unpublishingVersion.versionId;
    setUnpublishingVersion(null);
    setBusyVersionId(versionId);
    setError(null);
    try {
      await unpublishJourneyVersion(journeyId, versionId);
      reload();
      onJourneyChanged();
      showToast('Versão despublicada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Essa versão não está publicada.'
          : err instanceof Error
            ? err.message
            : 'Erro ao despublicar versão.';
      setError(message);
    } finally {
      setBusyVersionId(null);
    }
  }

  async function confirmRepublish() {
    if (!republishingVersion) return;
    const versionId = republishingVersion.versionId;
    setRepublishingVersion(null);
    setBusyVersionId(versionId);
    setError(null);
    try {
      await republishJourneyVersion(journeyId, versionId);
      reload();
      onJourneyChanged();
      showToast('Versão republicada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 422
          ? 'Não é possível republicar: o produto ou o canal está inativo.'
          : err instanceof Error
            ? err.message
            : 'Erro ao republicar versão.';
      setError(message);
    } finally {
      setBusyVersionId(null);
    }
  }

  const hasPublishedVersion = versions?.some((v) => v.status === 'PUBLISHED') ?? false;

  return (
    <div className="border-t" style={{ borderColor: c.border, background: c.bg }}>
      {error && (
        <p className="m-0 px-4 py-2 text-[12px]" style={{ color: c.danger }}>
          {error}
        </p>
      )}
      {versions === null ? (
        <p className="m-0 px-4 py-3 text-[12.5px]" style={{ color: c.textSecondary }}>
          Carregando versões...
        </p>
      ) : versions.length === 0 ? (
        <p className="m-0 px-4 py-3 text-[12.5px]" style={{ color: c.textSecondary }}>
          Nenhuma versão criada ainda.
        </p>
      ) : (
        versions.map((v) => {
          const meta = versionStatusMeta(c, v.status);
          return (
            <div
              key={v.versionId}
              className="grid items-center pl-10 pr-4 py-[8px] border-t"
              style={{ gridTemplateColumns: GRID_COLS, borderColor: c.border }}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[12.5px] font-semibold" style={{ color: c.textPrimary }}>
                  v{v.versionNumber}
                </span>
                {v.description && (
                  <span className="truncate text-[12px]" style={{ color: c.textSecondary }}>
                    {v.description}
                  </span>
                )}
              </div>
              <span className="text-[12px] truncate" style={{ color: c.textMuted }} title={v.createdBy}>
                Por {v.createdBy.slice(0, 8)}
              </span>
              <span
                className="inline-flex items-center rounded-full px-[9px] py-[2px] text-[11px] font-medium w-fit"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
              <span className="text-[12px]" style={{ color: c.textSecondary }}>
                {formatDate(v.publishedAt ?? v.createdAt)}
              </span>
              <div className="flex items-center justify-end gap-2">
                {v.status === 'DRAFT' && (
                  <span title={v.snapshot.flowNodes.length === 0 ? 'Esta versão ainda não tem um fluxo definido.' : undefined}>
                    <PrimaryButton
                      onClick={() => setPublishingVersion(v)}
                      loading={busyVersionId === v.versionId}
                      disabled={v.snapshot.flowNodes.length === 0}
                    >
                      Publicar
                    </PrimaryButton>
                  </span>
                )}
                {v.status === 'PUBLISHED' && (
                  <SecondaryButton onClick={() => setUnpublishingVersion(v)} disabled={busyVersionId === v.versionId}>
                    Despublicar
                  </SecondaryButton>
                )}
                {v.status === 'UNPUBLISHED' && (
                  <PrimaryButton onClick={() => setRepublishingVersion(v)} loading={busyVersionId === v.versionId}>
                    Republicar
                  </PrimaryButton>
                )}
              </div>
            </div>
          );
        })
      )}

      {publishingVersion && (
        <ConfirmDialog
          title="Publicar versão?"
          message={`Deseja publicar a v${publishingVersion.versionNumber}? Depois de publicada, essa versão não poderá mais ser editada.`}
          confirmLabel="Publicar"
          onConfirm={confirmPublish}
          onCancel={() => setPublishingVersion(null)}
        />
      )}

      {unpublishingVersion && (
        <ConfirmDialog
          title="Despublicar versão?"
          message={`Deseja despublicar a v${unpublishingVersion.versionNumber}? A jornada deixa de estar publicada e a versão passa a despublicada; o snapshot é preservado.`}
          confirmLabel="Despublicar"
          onConfirm={confirmUnpublish}
          onCancel={() => setUnpublishingVersion(null)}
        />
      )}

      {republishingVersion && (
        <ConfirmDialog
          title="Republicar versão?"
          message={
            hasPublishedVersion
              ? `Deseja republicar a v${republishingVersion.versionNumber}? A versão publicada atual será despublicada e substituída por esta.`
              : `Deseja republicar a v${republishingVersion.versionNumber}? Ela volta a ficar publicada com o mesmo conteúdo de antes.`
          }
          confirmLabel="Republicar"
          onConfirm={confirmRepublish}
          onCancel={() => setRepublishingVersion(null)}
        />
      )}
    </div>
  );
}
