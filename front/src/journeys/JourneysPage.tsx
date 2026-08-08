import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, LayoutGrid, List as ListIcon, Route, Trash2 } from 'lucide-react';
import {
  PrimaryButton,
  LinkButton,
  FilterDropdown,
  type FilterOption,
} from '../products/ui';
import { useAppTheme, type AppColors } from '../shell/theme';
import { ToastProvider, useToast } from '../products/Toast';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ApiClientError } from '../api/client';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';
import {
  listJourneys,
  deactivateJourney,
  activateJourney,
  deleteJourney,
  publishJourney,
  unpublishJourney,
  type Journey,
  type JourneyStatus,
  type JourneySort,
} from '../api/journeys';
import { JourneyDesignerPage } from '../flow-designer/JourneyDesignerPage';
import { NewJourneyModal } from './NewJourneyModal';

type StatusFilter = 'all' | JourneyStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'DRAFT', label: 'Rascunho' },
  { key: 'PUBLISHED', label: 'Publicadas' },
  { key: 'UNPUBLISHED', label: 'Despublicadas' },
  { key: 'INACTIVE', label: 'Inativas' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'UPDATED_AT', label: 'Alteradas recentemente' },
  { value: 'CREATED_AT', label: 'Criadas recentemente' },
];

function journeyStatusMeta(c: AppColors): Record<JourneyStatus, { label: string; bg: string; color: string }> {
  return {
    DRAFT: { label: 'Rascunho', bg: c.chipBg, color: c.textSecondary },
    PUBLISHED: { label: 'Publicada', bg: c.successSoft, color: c.success },
    UNPUBLISHED: { label: 'Despublicada', bg: c.warningSoft, color: c.warning },
    INACTIVE: { label: 'Inativa', bg: c.chipBg, color: c.textMuted },
  };
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

interface JourneysPageProps {
  onOpenForm: (formId: string) => void;
}

export function JourneysPage({ onOpenForm }: JourneysPageProps) {
  return (
    <ToastProvider>
      <JourneysPageContent onOpenForm={onOpenForm} />
    </ToastProvider>
  );
}

function JourneysPageContent({ onOpenForm }: JourneysPageProps) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [productFilter, setProductFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  const [sort, setSort] = useState<JourneySort>('UPDATED_AT');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [editingJourney, setEditingJourney] = useState<Journey | null>(null);
  const [creatingJourney, setCreatingJourney] = useState(false);
  const [deactivatingJourney, setDeactivatingJourney] = useState<Journey | null>(null);
  const [deletingJourney, setDeletingJourney] = useState<Journey | null>(null);
  const [publishingJourney, setPublishingJourney] = useState<Journey | null>(null);
  const [unpublishingJourney, setUnpublishingJourney] = useState<Journey | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [journeyList, productList] = await Promise.all([
        listJourneys({
          productId: productFilter || undefined,
          channelId: channelFilter || undefined,
          sort,
        }),
        listProducts(),
      ]);
      setJourneys(journeyList);
      setProducts(productList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar jornadas');
    } finally {
      setLoading(false);
    }
  }, [productFilter, channelFilter, sort]);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    if (!productFilter) {
      setChannels([]);
      setChannelFilter('');
      return;
    }
    listChannels(productFilter).then(setChannels);
  }, [productFilter]);

  const filtered = useMemo(
    () =>
      journeys
        .filter((j) => statusFilter === 'all' || j.status === statusFilter)
        .filter((j) => !search || j.name.toLowerCase().includes(search.toLowerCase())),
    [journeys, search, statusFilter],
  );

  const kpis = useMemo(
    () => ({
      total: journeys.length,
      draft: journeys.filter((j) => j.status === 'DRAFT').length,
      published: journeys.filter((j) => j.status === 'PUBLISHED').length,
      inactive: journeys.filter((j) => j.status === 'INACTIVE').length,
    }),
    [journeys],
  );

  if (editingJourney) {
    return (
      <JourneyDesignerPage
        journey={editingJourney}
        onOpenForm={onOpenForm}
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

  async function confirmPublish() {
    if (!publishingJourney) return;
    const journey = publishingJourney;
    setPublishingJourney(null);
    try {
      await publishJourney(journey.journeyId);
      await reload();
      showToast('Jornada publicada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 422
          ? 'Não é possível publicar: o produto ou o canal da jornada está inativo.'
          : err instanceof Error
            ? err.message
            : 'Erro ao publicar jornada';
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

  async function handleActivate(journey: Journey) {
    try {
      await activateJourney(journey.journeyId);
      await reload();
      showToast('Jornada ativada com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ativar jornada', 'error');
    }
  }

  async function confirmDelete() {
    if (!deletingJourney) return;
    const journey = deletingJourney;
    setDeletingJourney(null);
    try {
      await deleteJourney(journey.journeyId);
      await reload();
      showToast('Jornada excluída com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível excluir: a jornada já foi publicada em algum momento.'
          : err instanceof Error
            ? err.message
            : 'Erro ao excluir jornada';
      showToast(message, 'error');
    }
  }

  const productOptions: FilterOption[] = [
    { value: '', label: 'Todos os produtos' },
    ...products.map((p) => ({ value: p.productId, label: p.name })),
  ];
  const channelOptions: FilterOption[] = [
    { value: '', label: 'Todos os canais' },
    ...channels.map((c) => ({ value: c.channelId, label: c.name })),
  ];

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
            Jornadas
          </h1>
          <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
            Jornadas específicas por canal, dentro de cada produto
          </p>
        </div>
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
      </div>

      <div className="grid grid-cols-4 gap-[14px] mb-[22px]">
        <StatCard label="Jornadas cadastradas" value={kpis.total} />
        <StatCard label="Em rascunho" value={kpis.draft} />
        <StatCard label="Publicadas" value={kpis.published} />
        <StatCard label="Inativas" value={kpis.inactive} />
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="flex gap-2 flex-wrap items-center">
          {STATUS_FILTERS.map((f) => {
            const isActive = statusFilter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setStatusFilter(f.key)}
                className="px-[14px] py-[7px] rounded-full text-[12.5px] font-medium cursor-pointer border"
                style={{
                  borderColor: isActive ? c.accent : c.border,
                  background: isActive ? c.accent : c.surface,
                  color: isActive ? '#fff' : c.textPrimary,
                }}
              >
                {f.label}
              </button>
            );
          })}
          <FilterDropdown label="Produto" options={productOptions} value={productFilter} onChange={setProductFilter} />
          <FilterDropdown
            label="Canal"
            options={channelOptions}
            value={channelFilter}
            onChange={setChannelFilter}
          />
          <FilterDropdown
            label="Ordenar"
            options={SORT_OPTIONS}
            value={sort}
            onChange={(v) => setSort(v as JourneySort)}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex gap-1 p-[3px] rounded-lg" style={{ background: c.chipBg }}>
            <button
              onClick={() => setViewMode('cards')}
              title="Cards"
              className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
              style={{ background: viewMode === 'cards' ? c.surface : 'transparent' }}
            >
              <LayoutGrid size={14} color={viewMode === 'cards' ? c.accent : c.textMuted} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Lista"
              className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
              style={{ background: viewMode === 'list' ? c.surface : 'transparent' }}
            >
              <ListIcon size={14} color={viewMode === 'list' ? c.accent : c.textMuted} />
            </button>
          </div>
          <PrimaryButton onClick={() => setCreatingJourney(true)}>
            <Plus size={14} /> Nova jornada
          </PrimaryButton>
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[132px] rounded-2xl animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasJourneys={journeys.length > 0} onCreate={() => setCreatingJourney(true)} />
      ) : viewMode === 'cards' ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {filtered.map((j) => (
            <JourneyCard
              key={j.journeyId}
              journey={j}
              onEdit={() => setEditingJourney(j)}
              onDeactivate={() => setDeactivatingJourney(j)}
              onActivate={() => handleActivate(j)}
              onDelete={() => setDeletingJourney(j)}
              onPublish={() => setPublishingJourney(j)}
              onUnpublish={() => setUnpublishingJourney(j)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
            style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1.2fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
          >
            <span>Jornada</span>
            <span>Produto / Canal</span>
            <span>Status</span>
            <span>Atualizada em</span>
            <span>Ações</span>
          </div>
          {filtered.map((j) => (
            <JourneyRow
              key={j.journeyId}
              journey={j}
              onEdit={() => setEditingJourney(j)}
              onDeactivate={() => setDeactivatingJourney(j)}
              onActivate={() => handleActivate(j)}
              onDelete={() => setDeletingJourney(j)}
              onPublish={() => setPublishingJourney(j)}
              onUnpublish={() => setUnpublishingJourney(j)}
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
          message={`Tem certeza que deseja excluir permanentemente "${deletingJourney.name}"? Essa ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          onConfirm={confirmDelete}
          onCancel={() => setDeletingJourney(null)}
        />
      )}

      {publishingJourney && (
        <ConfirmDialog
          title={publishingJourney.status === 'PUBLISHED' ? 'Republicar jornada' : 'Publicar jornada'}
          message={
            publishingJourney.status === 'PUBLISHED'
              ? `Isso substitui integralmente a publicação atual de "${publishingJourney.name}" pela versão mais recente do fluxo e dos formulários.`
              : `Isso publica "${publishingJourney.name}" com o fluxo e os formulários configurados atualmente.`
          }
          confirmLabel={publishingJourney.status === 'PUBLISHED' ? 'Republicar' : 'Publicar'}
          onConfirm={confirmPublish}
          onCancel={() => setPublishingJourney(null)}
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

function StatCard({ label, value }: { label: string; value: string | number }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-2xl p-[14px_16px] box-border" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div className="text-[11.5px] mb-[6px]" style={{ color: c.textSecondary }}>
        {label}
      </div>
      <div className="text-[22px] font-semibold" style={{ color: c.textPrimary }}>
        {value}
      </div>
    </div>
  );
}

function JourneyStatusTag({ status }: { status: JourneyStatus }) {
  const { colors: c } = useAppTheme();
  const meta = journeyStatusMeta(c)[status];
  return (
    <span
      className="shrink-0 inline-flex items-center rounded-full px-[10px] py-[3px] text-[11.5px] font-medium"
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

function JourneyActions({
  journey,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onPublish,
  onUnpublish,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div className="flex items-center gap-4">
      <LinkButton onClick={onEdit}>Editar</LinkButton>
      {journey.status !== 'INACTIVE' && (
        <LinkButton onClick={onPublish}>{journey.status === 'PUBLISHED' ? 'Republicar' : 'Publicar'}</LinkButton>
      )}
      {journey.status === 'PUBLISHED' && <LinkButton onClick={onUnpublish}>Despublicar</LinkButton>}
      {journey.status === 'DRAFT' && <LinkButton onClick={onDeactivate}>Desativar</LinkButton>}
      {journey.status === 'INACTIVE' && <LinkButton onClick={onActivate}>Ativar</LinkButton>}
      <button
        type="button"
        onClick={onDelete}
        title="Excluir"
        className="inline-flex items-center bg-transparent border-0 p-0 cursor-pointer"
        style={{ color: c.textMuted }}
        onMouseEnter={(e) => (e.currentTarget.style.color = c.danger)}
        onMouseLeave={(e) => (e.currentTarget.style.color = c.textMuted)}
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

function JourneyCard({
  journey,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onPublish,
  onUnpublish,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="rounded-2xl p-[18px] flex flex-col gap-3 box-border transition-shadow"
      style={{ background: c.surface, border: `1px solid ${c.border}` }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[14.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {journey.name}
        </div>
        <JourneyStatusTag status={journey.status} />
      </div>
      <div className="text-[12px] truncate" style={{ color: c.textSecondary }}>
        {journey.productName} <span style={{ color: c.border }}>›</span> {journey.channelName}
      </div>
      {journey.description && (
        <p className="m-0 text-[12.5px] line-clamp-2" style={{ color: c.textSecondary }}>
          {journey.description}
        </p>
      )}
      <div className="flex flex-col gap-[2px] pt-[10px] border-t text-[12px]" style={{ borderColor: c.border, color: c.textMuted }}>
        <span>Atualizada em {formatDate(journey.updatedAt)}</span>
        {journey.publishedAt && <span>Publicada em {formatDate(journey.publishedAt)}</span>}
      </div>
      <JourneyActions
        journey={journey}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
        onDelete={onDelete}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />
    </div>
  );
}

function JourneyRow({
  journey,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
  onPublish,
  onUnpublish,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onPublish: () => void;
  onUnpublish: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b box-border last:border-b-0"
      style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1.2fr', borderColor: c.border }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {journey.name}
        </div>
        {journey.description && (
          <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>
            {journey.description}
          </div>
        )}
      </div>
      <span className="truncate" style={{ color: c.textSecondary }}>
        {journey.productName} <span style={{ color: c.border }}>›</span> {journey.channelName}
      </span>
      <span className="w-fit">
        <JourneyStatusTag status={journey.status} />
      </span>
      <span className="flex flex-col gap-[2px]" style={{ color: c.textSecondary }}>
        <span>{formatDate(journey.updatedAt)}</span>
        {journey.publishedAt && (
          <span className="text-[11px]" style={{ color: c.textMuted }}>
            Publicada em {formatDate(journey.publishedAt)}
          </span>
        )}
      </span>
      <JourneyActions
        journey={journey}
        onEdit={onEdit}
        onDeactivate={onDeactivate}
        onActivate={onActivate}
        onDelete={onDelete}
        onPublish={onPublish}
        onUnpublish={onUnpublish}
      />
    </div>
  );
}
