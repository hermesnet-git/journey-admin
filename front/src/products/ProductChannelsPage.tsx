import { useEffect, useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Search, Plus, Route } from 'lucide-react';
import { PrimaryButton, LinkButton, StatusTag, FilterDropdown } from './ui';
import {
  listChannels,
  createChannel,
  updateChannel,
  deactivateChannel,
  activateChannel,
  type Channel,
  type ChannelInput,
  type Product,
} from '../api/products';
import { ChannelFormModal } from './ChannelFormModal';
import { ConfirmDialog } from './ConfirmDialog';
import { ApiClientError } from '../api/client';
import { useToast } from './Toast';

type StatusFilter = '' | 'ACTIVE' | 'INACTIVE';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

const CHANNEL_TYPE_LABELS: Record<string, string> = {
  WEB: 'Web',
  MOBILE: 'Mobile',
  WHATSAPP: 'WhatsApp',
  URA: 'URA',
  CONTACT_CENTER: 'Contact Center',
  OTHER: 'Outro',
};

interface ProductChannelsPageProps {
  product: Product;
  onBack: () => void;
}

export function ProductChannelsPage({ product, onBack }: ProductChannelsPageProps) {
  const { showToast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [editingChannel, setEditingChannel] = useState<Channel | 'new' | null>(null);
  const [deactivatingChannel, setDeactivatingChannel] = useState<Channel | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setChannels(await listChannels(product.productId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar canais');
    } finally {
      setLoading(false);
    }
  }, [product.productId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const filtered = useMemo(
    () =>
      channels
        .filter((c) => !statusFilter || c.status === statusFilter)
        .filter((c) => !search || c.name.toLowerCase().includes(search.toLowerCase())),
    [channels, search, statusFilter],
  );

  async function handleSubmit(input: ChannelInput) {
    const isNew = editingChannel === 'new';
    if (isNew) {
      await createChannel(product.productId, input);
    } else if (editingChannel) {
      await updateChannel(editingChannel.channelId, input);
    }
    setEditingChannel(null);
    await reload();
    showToast(isNew ? 'Canal criado com sucesso.' : 'Canal atualizado com sucesso.');
  }

  async function confirmDeactivate() {
    if (!deactivatingChannel) return;
    const channel = deactivatingChannel;
    setDeactivatingChannel(null);
    try {
      await deactivateChannel(channel.channelId);
      await reload();
      showToast('Canal desativado com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível desativar: existe jornada com publicação ativa neste canal.'
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar canal';
      showToast(message, 'error');
    }
  }

  async function handleActivate(channel: Channel) {
    try {
      await activateChannel(channel.channelId);
      await reload();
      showToast('Canal ativado com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ativar canal', 'error');
    }
  }

  return (
    <div className="flex-1 overflow-auto p-[28px_40px] box-border">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-[6px] text-[12.5px] text-[#71717a] bg-transparent border-0 p-0 cursor-pointer hover:text-[#1a1a1a]"
      >
        <ArrowLeft size={14} /> Voltar para produtos
      </button>

      <div className="mb-6 mt-3">
        <h1 className="m-0 text-[21px] font-semibold tracking-[-0.02em]">{product.name}</h1>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[280px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 text-[#a1a1aa] pointer-events-none" />
          <input
            aria-label="Buscar canal"
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
          <PrimaryButton onClick={() => setEditingChannel('new')}>
            <Plus size={14} /> Novo canal
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
        <EmptyState hasChannels={channels.length > 0} onCreate={() => setEditingChannel('new')} />
      ) : (
        <div className="bg-white border border-[#e4e4e7] rounded-2xl overflow-hidden">
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold text-[#71717a] border-b border-[#f4f4f5] bg-[#fafafa]"
            style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr' }}
          >
            <span>Canal</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Jornadas</span>
            <span>Ações</span>
          </div>
          {filtered.map((c) => (
            <ChannelRow
              key={c.channelId}
              channel={c}
              onEdit={() => setEditingChannel(c)}
              onDeactivate={() => setDeactivatingChannel(c)}
              onActivate={() => handleActivate(c)}
            />
          ))}
        </div>
      )}

      {editingChannel && (
        <ChannelFormModal
          channel={editingChannel === 'new' ? null : editingChannel}
          onClose={() => setEditingChannel(null)}
          onSubmit={handleSubmit}
        />
      )}

      {deactivatingChannel && (
        <ConfirmDialog
          title="Desativar canal"
          message={`Tem certeza que deseja desativar "${deactivatingChannel.name}"? As jornadas e o histórico associados não serão removidos.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivate}
          onCancel={() => setDeactivatingChannel(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasChannels, onCreate }: { hasChannels: boolean; onCreate: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 bg-white border border-dashed border-[#e4e4e7] rounded-2xl">
      <div className="w-11 h-11 rounded-full bg-[#f0f9ff] flex items-center justify-center">
        <Route size={20} color="#019DF4" />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold text-[#1a1a1a]">
          {hasChannels ? 'Nenhum canal encontrado' : 'Nenhum canal cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] text-[#71717a] max-w-[320px]">
          {hasChannels
            ? 'Ajuste a busca ou os filtros para encontrar o que procura.'
            : 'Canais são as formas de atendimento pelas quais este produto disponibiliza jornadas.'}
        </p>
      </div>
      {!hasChannels && (
        <PrimaryButton onClick={onCreate}>
          <Plus size={14} /> Criar primeiro canal
        </PrimaryButton>
      )}
    </div>
  );
}

function ChannelRow({
  channel,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  channel: Channel;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b border-[#f4f4f5] box-border last:border-b-0 hover:bg-[#fafafa]"
      style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr' }}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold text-[#1a1a1a] truncate">{channel.name}</div>
        {channel.description && (
          <div className="text-[11.5px] text-[#a1a1aa] truncate">{channel.description}</div>
        )}
      </div>
      <span className="text-[#71717a]">{CHANNEL_TYPE_LABELS[channel.type] ?? channel.type}</span>
      <span className="w-fit">
        <StatusTag active={channel.status === 'ACTIVE'} />
      </span>
      <span className="text-[#71717a]">{channel.journeyCount}</span>
      <div className="flex items-center gap-4">
        <LinkButton onClick={onEdit}>Editar</LinkButton>
        {channel.status === 'ACTIVE' && <LinkButton onClick={onDeactivate}>Desativar</LinkButton>}
        {channel.status === 'INACTIVE' && <LinkButton onClick={onActivate}>Ativar</LinkButton>}
      </div>
    </div>
  );
}
