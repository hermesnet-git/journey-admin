import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, Boxes, ChevronRight } from 'lucide-react';
import { PrimaryButton, LinkButton, StatusTag, FilterDropdown } from './ui';
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
  const [openProduct, setOpenProduct] = useState<Product | null>(null);
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

  if (openProduct) {
    return <ProductChannelsPage product={openProduct} onBack={() => setOpenProduct(null)} />;
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Produtos
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Gerencie produtos e seus canais de atendimento
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[280px]">
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
        <div className="flex items-center gap-2">
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
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasProducts={products.length > 0} onCreate={() => setEditingProduct('new')} />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
            style={{ gridTemplateColumns: '2fr 1fr 2fr 1.2fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
          >
            <span>Produto</span>
            <span>Status</span>
            <span>Canais</span>
            <span>Ações</span>
          </div>
          {filtered.map((p) => (
            <ProductRow
              key={p.productId}
              product={p}
              onOpen={() => setOpenProduct(p)}
              onEdit={() => setEditingProduct(p)}
              onDeactivate={() => setDeactivatingProduct(p)}
              onActivate={() => handleActivate(p)}
            />
          ))}
        </div>
      )}

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

function ProductRow({
  product,
  onOpen,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  product: Product;
  onOpen: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b box-border last:border-b-0"
      style={{ gridTemplateColumns: '2fr 1fr 2fr 1.2fr', borderColor: c.border }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0 cursor-pointer group" onClick={onOpen}>
        <div className="flex items-center gap-[6px] text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {product.name}
          <ChevronRight size={13} className="opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: c.textMuted }} />
        </div>
        {product.description && (
          <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>
            {product.description}
          </div>
        )}
      </div>
      <span className="w-fit">
        <StatusTag active={product.status === 'ACTIVE'} />
      </span>
      {product.channelNames.length === 0 ? (
        <span style={{ color: c.textMuted }}>—</span>
      ) : (
        <div className="flex flex-wrap gap-[6px] min-w-0">
          {product.channelNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-[4px] rounded-full px-[9px] py-[2px] text-[11.5px] max-w-full truncate"
              style={{ background: c.chipBg, color: c.textPrimary }}
            >
              <Boxes size={11} className="shrink-0" style={{ color: c.textMuted }} />
              {name}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-4">
        <LinkButton onClick={onEdit}>Editar</LinkButton>
        {product.status === 'ACTIVE' && <LinkButton onClick={onDeactivate}>Desativar</LinkButton>}
        {product.status === 'INACTIVE' && <LinkButton onClick={onActivate}>Ativar</LinkButton>}
      </div>
    </div>
  );
}
