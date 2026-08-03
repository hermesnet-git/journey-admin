import { useEffect, useState, useCallback } from 'react';
import { Plus, Route } from 'lucide-react';
import { PrimaryButton, LinkButton, StatusTag } from './ui';
import { useAppTheme } from '../shell/theme';
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
  openNewSignal?: number;
  onOpenNewConsumed?: () => void;
}

export function ProductChannelsPage({ product, openNewSignal, onOpenNewConsumed }: ProductChannelsPageProps) {
  const { colors: c } = useAppTheme();
  const { showToast } = useToast();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingChannel, setEditingChannel] = useState<Channel | 'new' | null>(null);
  const [deactivatingChannel, setDeactivatingChannel] = useState<Channel | null>(null);

  useEffect(() => {
    if (openNewSignal) {
      setEditingChannel('new');
      onOpenNewConsumed?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openNewSignal]);

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
    <div className="flex-1 overflow-auto min-w-0">
      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : channels.length === 0 ? (
        <EmptyState hasChannels={channels.length > 0} onCreate={() => setEditingChannel('new')} />
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
          <div
            className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
            style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
          >
            <span>Canal</span>
            <span>Tipo</span>
            <span>Status</span>
            <span>Jornadas</span>
            <span>Ações</span>
          </div>
          {channels.map((ch) => (
            <ChannelRow
              key={ch.channelId}
              channel={ch}
              onEdit={() => setEditingChannel(ch)}
              onDeactivate={() => setDeactivatingChannel(ch)}
              onActivate={() => handleActivate(ch)}
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
          {hasChannels ? 'Nenhum canal encontrado' : 'Nenhum canal cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
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
  const { colors: c } = useAppTheme();
  return (
    <div
      className="grid items-center px-4 py-3 text-[13px] border-b box-border last:border-b-0"
      style={{ gridTemplateColumns: '2.5fr 1fr 1fr 1fr 1.2fr', borderColor: c.border }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="min-w-0">
        <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {channel.name}
        </div>
        {channel.description && (
          <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>
            {channel.description}
          </div>
        )}
      </div>
      <span style={{ color: c.textSecondary }}>{CHANNEL_TYPE_LABELS[channel.type] ?? channel.type}</span>
      <span className="w-fit">
        <StatusTag active={channel.status === 'ACTIVE'} />
      </span>
      <span style={{ color: c.textSecondary }}>{channel.journeyCount}</span>
      <div className="flex items-center gap-4">
        <LinkButton onClick={onEdit}>Editar</LinkButton>
        {channel.status === 'ACTIVE' && <LinkButton onClick={onDeactivate}>Desativar</LinkButton>}
        {channel.status === 'INACTIVE' && <LinkButton onClick={onActivate}>Ativar</LinkButton>}
      </div>
    </div>
  );
}
