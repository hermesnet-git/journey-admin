import { useEffect, useState, useCallback } from 'react';
import { Plus, Route, Pencil, Ban, Power } from 'lucide-react';
import { PrimaryButton, IconAction, StatusTag } from './ui';
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
          <table className="w-full border-collapse text-[13px]">
            <thead>
              <tr style={{ background: c.bg }}>
                <th className="text-left px-4 py-2 text-[11.5px] font-semibold border-b" style={{ color: c.textSecondary, borderColor: c.border }}>Canal</th>
                <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={{ color: c.textSecondary, borderColor: c.border, width: '1%', minWidth: 110 }}>Tipo</th>
                <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={{ color: c.textSecondary, borderColor: c.border, width: '1%', minWidth: 90 }}>Status</th>
                <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={{ color: c.textSecondary, borderColor: c.border, width: '1%', minWidth: 64 }}>Jornadas</th>
                <th className="text-left whitespace-nowrap px-4 py-2 text-[11.5px] font-semibold border-b" style={{ color: c.textSecondary, borderColor: c.border, width: '1%', minWidth: 76 }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {channels.map((ch, i) => (
                <ChannelRow
                  key={ch.channelId}
                  channel={ch}
                  isLast={i === channels.length - 1}
                  onEdit={() => setEditingChannel(ch)}
                  onDeactivate={() => setDeactivatingChannel(ch)}
                  onActivate={() => handleActivate(ch)}
                />
              ))}
            </tbody>
          </table>
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
  isLast,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  channel: Channel;
  isLast: boolean;
  onEdit: () => void;
  onDeactivate: () => void;
  onActivate: () => void;
}) {
  const { colors: c } = useAppTheme();
  const borderBottom = isLast ? 'none' : `1px solid ${c.border}`;
  return (
    <tr
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <td className="align-middle px-4 py-2" style={{ borderBottom }}>
        <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {channel.name}
        </div>
        {channel.description && (
          <div className="text-[11.5px] truncate" style={{ color: c.textMuted }}>
            {channel.description}
          </div>
        )}
      </td>
      <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom, color: c.textSecondary }}>
        {CHANNEL_TYPE_LABELS[channel.type] ?? channel.type}
      </td>
      <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom }}>
        <StatusTag active={channel.status === 'ACTIVE'} />
      </td>
      <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom, color: c.textSecondary }}>
        {channel.journeyCount}
      </td>
      <td className="whitespace-nowrap align-middle px-4 py-2" style={{ borderBottom }}>
        <div className="flex items-center gap-1">
          <IconAction icon={<Pencil size={14} />} label="Editar" onClick={onEdit} />
          {channel.status === 'ACTIVE' && <IconAction icon={<Ban size={14} />} label="Desativar" onClick={onDeactivate} danger />}
          {channel.status === 'INACTIVE' && <IconAction icon={<Power size={14} />} label="Ativar" onClick={onActivate} />}
        </div>
      </td>
    </tr>
  );
}
