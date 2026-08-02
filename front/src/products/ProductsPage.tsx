import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, Boxes, ChevronRight } from 'lucide-react';
import { PrimaryButton, LinkButton, StatusTag, FilterDropdown } from './ui';
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
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]">Produtos</h1>
        <p className="m-0 text-[13.5px] text-[#71717a]">Gerencie produtos e seus canais de atendimento</p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[280px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          <input
            aria-label="Buscar produto"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md border border-[#e4e4e7] text-[13px] bg-white outline-none box-border"
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

      {error && <p className="text-[13px] text-[#b91c1c]">{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg bg-[#f4f4f5] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasProducts={products.length > 0} onCreate={() => setEditingProduct('new')} />
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden">
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold text-[#71717a] border-b border-[#f4f4f5] bg-[#fafafa]"
            style={{ gridTemplateColumns: '2fr 1fr 2fr 1.2fr' }}
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
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 bg-white border border-dashed border-[#e4e4e7] rounded-2xl">
      <div className="w-11 h-11 rounded-full bg-[#f0f9ff] flex items-center justify-center">
        <Boxes size={20} color="#019DF4" />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold text-[#1a1a1a]">
          {hasProducts ? 'Nenhum produto encontrado' : 'Nenhum produto cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] text-[#71717a] max-w-[320px]">
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
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b border-[#f4f4f5] box-border last:border-b-0 hover:bg-[#fafafa]"
      style={{ gridTemplateColumns: '2fr 1fr 2fr 1.2fr' }}
    >
      <div className="min-w-0 cursor-pointer group" onClick={onOpen}>
        <div className="flex items-center gap-[6px] text-[13.5px] font-semibold text-[#1a1a1a] truncate">
          {product.name}
          <ChevronRight size={13} className="text-[#a1a1aa] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
        {product.description && (
          <div className="text-[11.5px] text-[#a1a1aa] truncate">{product.description}</div>
        )}
      </div>
      <span className="w-fit">
        <StatusTag active={product.status === 'ACTIVE'} />
      </span>
      {product.channelNames.length === 0 ? (
        <span className="text-[#a1a1aa]">—</span>
      ) : (
        <div className="flex flex-wrap gap-[6px] min-w-0">
          {product.channelNames.map((name) => (
            <span
              key={name}
              className="inline-flex items-center gap-[4px] rounded-full bg-[#f4f4f5] px-[9px] py-[2px] text-[11.5px] text-[#3f3f46] max-w-full truncate"
            >
              <Boxes size={11} className="shrink-0 text-[#a1a1aa]" />
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
