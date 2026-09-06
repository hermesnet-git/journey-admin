import { useEffect, useState } from 'react';
import { Modal } from '../products/Modal';
import { Field, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { ChannelTypeChecklist } from '../products/ChannelTypeChecklist';
import { getProduct, type ChannelType } from '../api/products';
import { updateJourneyChannels, type Journey } from '../api/journeys';

interface Props {
  journey: Journey;
  onClose: () => void;
  onUpdated: (journey: Journey) => void;
}

// Deixa uma jornada já criada crescer pra mais canais (ex.: começou só no Web, agora também no
// WhatsApp) sem precisar recriar fluxo/telas — mesmo checklist da criação, só que já pré-marcado.
export function EditJourneyChannelsModal({ journey, onClose, onUpdated }: Props) {
  const [availableTypes, setAvailableTypes] = useState<ChannelType[]>([]);
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>(journey.channelTypes);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getProduct(journey.productId).then((product) => setAvailableTypes(product.channelTypes));
  }, [journey.productId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateJourneyChannels(journey.journeyId, channelTypes);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao atualizar canais');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Canais da jornada"
      subtitle="Todos os canais marcados usam o mesmo fluxo e as mesmas telas desta jornada."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={channelTypes.length === 0}>
            Salvar
          </PrimaryButton>
        </>
      }
    >
      <Field label="Canais">
        <ChannelTypeChecklist options={availableTypes} selected={channelTypes} onChange={setChannelTypes} />
      </Field>
      {error && (
        <div className="mt-3">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      )}
    </Modal>
  );
}
