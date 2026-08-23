import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, Boxes, Pencil, Ban, Power } from 'lucide-react';
import { PrimaryButton, ActionsMenu, StatusTag, FilterDropdown } from './ui';
import { useAppTheme } from '../shell/theme';
import {
  listProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  activateProduct,
  type Product,
  type ProductInput,
} from '../api/products';
import { ProductFormModal } from './ProductFormModal';
import { ProductChannelsPage } from './ProductChannelsPage';
import { ConfirmDialog } from './ConfirmDialog';
import { ApiClientError } from '../api/client';
import { ToastProvider, useToast } from './Toast';

type StatusFilter = '' | 'ACTIVE' | 'INACTIVE';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

export function ProductsPage() {
  return (
    <ToastProvider>
      <ProductsPageContent />
    </ToastProvider>
  );
}

function ProductsPageContent() {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [editingProduct, setEditingProduct] = useState<Product | 'new' | null>(null);
  const [dualProductId, setDualProductId] = useState<string | null>(null);
  const [newChannelRequest, setNewChannelRequest] = useState<{ productId: string; token: number } | null>(null);
  const [deactivatingProduct, setDeactivatingProduct] = useState<Product | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await listProducts());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(
    () =>
      products
        .filter((p) => !statusFilter || p.status === statusFilter)
        .filter((p) => !search || p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search, statusFilter],
  );

  async function handleSubmit(input: ProductInput) {
    const isNew = editingProduct === 'new';
    if (isNew) {
      await createProduct(input);
    } else if (editingProduct) {
      await updateProduct(editingProduct.productId, input);
    }
    setEditingProduct(null);
    await reload();
    showToast(isNew ? 'Produto criado com sucesso.' : 'Produto atualizado com sucesso.');
  }

  async function confirmDeactivate() {
    if (!deactivatingProduct) return;
    const product = deactivatingProduct;
    setDeactivatingProduct(null);
    try {
      await deactivateProduct(product.productId);
      await reload();
      showToast('Produto desativado com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível desativar: existe jornada com publicação ativa neste produto.'
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar produto';
      showToast(message, 'error');
    }
  }

  async function handleActivate(product: Product) {
    try {
      await activateProduct(product.productId);
      await reload();
      showToast('Produto ativado com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ativar produto', 'error');
    }
  }

  function handleNewChannel(productId: string) {
    setDualProductId(productId);
    setNewChannelRequest((current) => ({ productId, token: (current?.token ?? 0) + 1 }));
  }

  const selectedProduct = filtered.find((p) => p.productId === dualProductId) ?? filtered[0] ?? null;

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Produtos
        </h1>
        <p className="m-0 text-[13.5px] max-w-[720px]" style={{ color: c.textSecondary }}>
          Produtos organizam suas jornadas por linha de negócio; canais definem por qual meio de
          atendimento (Web, Mobile, WhatsApp, URA, Contact Center) essas jornadas ficam disponíveis
          para o cliente. Crie um produto para agrupar essas jornadas e um canal para cada meio de
          atendimento em que elas devem rodar.
        </p>
      </div>

      <div className="mb-[18px]">
        <div className="relative w-[240px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar produto"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
            style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
          />
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      <div className="flex gap-5 items-start">
        <div className="flex-[3] min-w-0 rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div className="flex items-center justify-end gap-2 px-3 py-2 border-b flex-wrap" style={{ borderColor: c.border, background: c.bg }}>
            <FilterDropdown
              label="Status"
              options={STATUS_OPTIONS}
              value={statusFilter}
              onChange={(v) => setStatusFilter(v as StatusFilter)}
            />
            <PrimaryButton onClick={() => setEditingProduct('new')}>
              <Plus size={14} /> Novo produto
            </PrimaryButton>
          </div>
          <div className="p-4">
            {loading ? (
              <div className="flex flex-col gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <EmptyState hasProducts={products.length > 0} onCreate={() => setEditingProduct('new')} />
            ) : (
              <ProductsTable
                products={filtered}
                selectedId={selectedProduct?.productId ?? null}
                onSelect={(p) => setDualProductId(p.productId)}
                onEdit={setEditingProduct}
                onDeactivate={setDeactivatingProduct}
                onActivate={handleActivate}
              />
            )}
          </div>
        </div>

        {!loading && selectedProduct && (
          <div className="flex-[2] min-w-0 rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-end px-3 py-2 border-b" style={{ borderColor: c.border, background: c.bg }}>
              <PrimaryButton onClick={() => handleNewChannel(selectedProduct.productId)}>
                <Plus size={14} /> Novo canal
              </PrimaryButton>
            </div>
            <div className="p-4">
              <ProductChannelsPage
                key={selectedProduct.productId}
                product={selectedProduct}
                openNewSignal={newChannelRequest?.productId === selectedProduct.productId ? newChannelRequest.token : undefined}
                onOpenNewConsumed={() => setNewChannelRequest(null)}
              />
            </div>
          </div>
        )}
      </div>

      {editingProduct && (
        <ProductFormModal
          product={editingProduct === 'new' ? null : editingProduct}
          onClose={() => setEditingProduct(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deactivatingProduct && (
        <ConfirmDialog
          title="Desativar produto"
          message={`Tem certeza que deseja desativar "${deactivatingProduct.name}"? Os canais e o histórico associados não serão removidos.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingProduct(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasProducts, onCreate }: { hasProducts: boolean; onCreate: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 rounded-2xl border-dashed"
      style={{ background: c.surface, border: `1px dashed ${c.border}` }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
        <Boxes size={20} color={c.accent} />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          {hasProducts ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
          {hasProducts
            ? 'Ajuste a busca ou os filtros para encontrar o que procura.'
            : 'Produtos agrupam os canais pelos quais suas jornadas serão disponibilizadas.'}
        </p>
      </div>
      {!hasProducts && (
        <PrimaryButton onClick={onCreate}>
          <Plus size={14} /> Criar primeiro produto
        </PrimaryButton>
      )}
    </div>
  );
}

function ProductsTable({
  products,
  selectedId,
  onSelect,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  products: Product[];
  selectedId: string | null;
  onSelect: (p: Product) => void;
  onEdit: (p: Product) => void;
  onDeactivate: (p: Product) => void;
  onActivate: (p: Product) => void;
}) {
  const { colors: c } = useAppTheme();
  const thStyle: React.CSSProperties = { color: c.textSecondary, borderColor: c.border };
  const narrow = (minWidth: number): React.CSSProperties => ({ ...thStyle, width: '1%', minWidth });
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr style={{ background: c.bg }}>
            <th className="text-left px-4 py-2 text-[11.5px] font-semibold border-b" style={thStyle}>Produto</th>
            <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={narrow(90)}>Status</th>
            <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={narrow(64)}>Canais</th>
            <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={narrow(48)}>Ações</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, i) => {
            const selected = p.productId === selectedId;
            const borderBottom = i === products.length - 1 ? 'none' : `1px solid ${c.border}`;
            return (
              <tr
                key={p.productId}
                className="cursor-pointer"
                style={{ background: selected ? c.accentSoft : 'transparent' }}
                onClick={() => onSelect(p)}
                onMouseEnter={(e) => {
                  if (!selected) e.currentTarget.style.background = c.hoverBg;
                }}
                onMouseLeave={(e) => {
                  if (!selected) e.currentTarget.style.background = 'transparent';
                }}
              >
                <td className="align-middle px-4 py-2" style={{ borderBottom }}>
                  <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
                    {p.name}
                  </div>
                  {p.description && (
                    <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>
                      {p.description}
                    </div>
                  )}
                </td>
                <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom }}>
                  <StatusTag active={p.status === 'ACTIVE'} />
                </td>
                <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom }}>
                  <span className="inline-flex items-center gap-[4px]" style={{ color: c.textSecondary }}>
                    <Boxes size={12} />
                    {p.channelNames.length}
                  </span>
                </td>
                <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom }} onClick={(e) => e.stopPropagation()}>
                  <ActionsMenu
                    label="Ações do produto"
                    actions={[
                      { icon: Pencil, label: 'Editar', onClick: () => onEdit(p) },
                      ...(p.status === 'ACTIVE'
                        ? [{ icon: Ban, label: 'Desativar', onClick: () => onDeactivate(p), variant: 'danger' as const }]
                        : []),
                      ...(p.status === 'INACTIVE'
                        ? [{ icon: Power, label: 'Ativar', onClick: () => onActivate(p), variant: 'success' as const }]
                        : []),
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
