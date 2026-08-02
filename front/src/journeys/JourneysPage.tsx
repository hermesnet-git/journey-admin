import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, LayoutGrid, List as ListIcon, Route, Trash2 } from 'lucide-react';
import {
  PrimaryButton,
  LinkButton,
  FilterDropdown,
  type FilterOption,
} from '../products/ui';
import { ToastProvider, useToast } from '../products/Toast';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ApiClientError } from '../api/client';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';
import {
  listJourneys,
  deactivateJourney,
  activateJourney,
  deleteJourney,
  type Journey,
  type JourneyStatus,
  type JourneySort,
} from '../api/journeys';
import { JourneyDesignerPage } from '../flow-designer/JourneyDesignerPage';

type StatusFilter = 'all' | JourneyStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all', label: 'Todas' },
  { key: 'DRAFT', label: 'Rascunho' },
  { key: 'INACTIVE', label: 'Inativas' },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: 'UPDATED_AT', label: 'Alteradas recentemente' },
  { value: 'CREATED_AT', label: 'Criadas recentemente' },
];

const JOURNEY_STATUS_META: Record<JourneyStatus, { label: string; bg: string; color: string }> = {
  DRAFT: { label: 'Rascunho', bg: '#f4f4f5', color: '#71717a' },
  PUBLISHED: { label: 'Publicada', bg: '#f0fdf4', color: '#15803d' },
  UNPUBLISHED: { label: 'Despublicada', bg: '#fffbeb', color: '#b45309' },
  INACTIVE: { label: 'Inativa', bg: '#f4f4f5', color: '#a1a1aa' },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function JourneysPage() {
  return (
    <ToastProvider>
      <JourneysPageContent />
    </ToastProvider>
  );
}

function JourneysPageContent() {
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
  const [editingJourney, setEditingJourney] = useState<Journey | 'new' | null>(null);
  const [deactivatingJourney, setDeactivatingJourney] = useState<Journey | null>(null);
  const [deletingJourney, setDeletingJourney] = useState<Journey | null>(null);

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
      inactive: journeys.filter((j) => j.status === 'INACTIVE').length,
    }),
    [journeys],
  );

  if (editingJourney) {
    const wasNew = editingJourney === 'new';
    return (
      <JourneyDesignerPage
        journey={wasNew ? null : editingJourney}
        onClose={() => setEditingJourney(null)}
        onSaved={async () => {
          setEditingJourney(null);
          await reload();
          showToast(wasNew ? 'Jornada criada com sucesso.' : 'Jornada atualizada com sucesso.');
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
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]">Jornadas</h1>
          <p className="m-0 text-[13.5px] text-[#71717a]">Jornadas específicas por canal, dentro de cada produto</p>
        </div>
        <div className="relative w-[220px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          <input
            aria-label="Buscar jornada"
            placeholder="Buscar jornada..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md border border-[#e4e4e7] text-[13px] bg-white outline-none box-border"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-[14px] mb-[22px]">
        <StatCard label="Jornadas cadastradas" value={kpis.total} />
        <StatCard label="Em rascunho" value={kpis.draft} />
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
                  borderColor: isActive ? '#019DF4' : '#e4e4e7',
                  background: isActive ? '#019DF4' : '#fff',
                  color: isActive ? '#fff' : '#3f3f46',
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
          <div className="flex gap-1 p-[3px] bg-[#f4f4f5] rounded-lg">
            <button
              onClick={() => setViewMode('cards')}
              title="Cards"
              className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
              style={{ background: viewMode === 'cards' ? '#fff' : 'transparent' }}
            >
              <LayoutGrid size={14} color={viewMode === 'cards' ? '#019DF4' : '#a1a1aa'} />
            </button>
            <button
              onClick={() => setViewMode('list')}
              title="Lista"
              className="flex items-center justify-center w-[30px] h-[26px] border-0 rounded-md cursor-pointer"
              style={{ background: viewMode === 'list' ? '#fff' : 'transparent' }}
            >
              <ListIcon size={14} color={viewMode === 'list' ? '#019DF4' : '#a1a1aa'} />
            </button>
          </div>
          <PrimaryButton onClick={() => setEditingJourney('new')}>
            <Plus size={14} /> Nova jornada
          </PrimaryButton>
        </div>
      </div>

      {error && <p className="text-[13px] text-[#b91c1c]">{error}</p>}

      {loading ? (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))' }}>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-[132px] rounded-2xl bg-[#f4f4f5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasJourneys={journeys.length > 0} onCreate={() => setEditingJourney('new')} />
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
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden">
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold text-[#71717a] border-b border-[#f4f4f5] bg-[#fafafa]"
            style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1.2fr' }}
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
            />
          ))}
        </div>
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
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-2xl p-[14px_16px] box-border">
      <div className="text-[11.5px] text-[#71717a] mb-[6px]">{label}</div>
      <div className="text-[22px] font-semibold text-[#1a1a1a]">{value}</div>
    </div>
  );
}

function JourneyStatusTag({ status }: { status: JourneyStatus }) {
  const meta = JOURNEY_STATUS_META[status];
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
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 bg-white border border-dashed border-[#e4e4e7] rounded-2xl">
      <div className="w-11 h-11 rounded-full bg-[#f0f9ff] flex items-center justify-center">
        <Route size={20} color="#019DF4" />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold text-[#1a1a1a]">
          {hasJourneys ? 'Nenhuma jornada encontrada' : 'Nenhuma jornada cadastrada ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] text-[#71717a] max-w-[320px]">
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
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-4">
      <LinkButton onClick={onEdit}>Editar</LinkButton>
      {journey.status === 'DRAFT' && <LinkButton onClick={onDeactivate}>Desativar</LinkButton>}
      {journey.status === 'INACTIVE' && <LinkButton onClick={onActivate}>Ativar</LinkButton>}
      <button
        type="button"
        onClick={onDelete}
        title="Excluir"
        className="inline-flex items-center text-[#a1a1aa] bg-transparent border-0 p-0 cursor-pointer hover:text-[#dc2626]"
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
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="bg-white border border-[#e4e4e7] rounded-2xl p-[18px] flex flex-col gap-3 box-border transition-shadow hover:shadow-[0_2px_8px_rgba(0,0,0,.06)] hover:border-[#d4d4d8]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 text-[14.5px] font-semibold text-[#1a1a1a] truncate">{journey.name}</div>
        <JourneyStatusTag status={journey.status} />
      </div>
      <div className="text-[12px] text-[#71717a] truncate">
        {journey.productName} <span className="text-[#d4d4d8]">›</span> {journey.channelName}
      </div>
      {journey.description && (
        <p className="m-0 text-[12.5px] text-[#71717a] line-clamp-2">{journey.description}</p>
      )}
      <div className="flex items-center justify-between pt-[10px] border-t border-[#f4f4f5] text-[12px] text-[#a1a1aa]">
        <span>Atualizada em {formatDate(journey.updatedAt)}</span>
      </div>
      <JourneyActions journey={journey} onEdit={onEdit} onDeactivate={onDeactivate} onActivate={onActivate} onDelete={onDelete} />
    </div>
  );
}

function JourneyRow({
  journey,
  onEdit,
  onDeactivate,
  onActivate,
  onDelete,
}: {
  journey: Journey;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b border-[#f4f4f5] box-border last:border-b-0 hover:bg-[#fafafa]"
      style={{ gridTemplateColumns: '2fr 1.4fr 1fr 1fr 1.2fr' }}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-[#1a1a1a] truncate">{journey.name}</div>
        {journey.description && (
          <div className="text-[11.5px] text-[#a1a1aa] truncate">{journey.description}</div>
        )}
      </div>
      <span className="text-[#52525b] truncate">
        {journey.productName} <span className="text-[#d4d4d8]">›</span> {journey.channelName}
      </span>
      <span className="w-fit">
        <JourneyStatusTag status={journey.status} />
      </span>
      <span className="text-[#52525b]">{formatDate(journey.updatedAt)}</span>
      <JourneyActions journey={journey} onEdit={onEdit} onDeactivate={onDeactivate} onActivate={onActivate} onDelete={onDelete} />
    </div>
  );
}
