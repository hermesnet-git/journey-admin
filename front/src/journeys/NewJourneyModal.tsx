import { useEffect, useState } from 'react';
import { Modal } from '../products/Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';
import { createJourney, type Journey } from '../api/journeys';

interface NewJourneyModalProps {
  onClose: () => void;
  onCreated: (journey: Journey) => void;
}

export function NewJourneyModal({ onClose, onCreated }: NewJourneyModalProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [productId, setProductId] = useState('');
  const [channelId, setChannelId] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts({ status: 'ACTIVE' }).then(setProducts);
  }, []);

  useEffect(() => {
    if (!productId) {
      setChannels([]);
      setChannelId('');
      return;
    }
    listChannels(productId, { status: 'ACTIVE' }).then(setChannels);
  }, [productId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      const journey = await createJourney({ channelId, name, description });
      onCreated(journey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar jornada');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Nova jornada"
      subtitle="Informe os dados da jornada antes de desenhar o fluxo"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!productId || !channelId || !name.trim()}>
            Criar jornada
          </PrimaryButton>
        </>
      }
    >
      <form
        id="journey-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Produto">
          <SelectInput value={productId} onChange={(e) => setProductId(e.target.value)} autoFocus>
            <option value="">Selecione...</option>
            {products.map((p) => (
              <option key={p.productId} value={p.productId}>
                {p.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Canal">
          <SelectInput value={channelId} onChange={(e) => setChannelId(e.target.value)} disabled={!productId}>
            <option value="">Selecione...</option>
            {channels.map((ch) => (
              <option key={ch.channelId} value={ch.channelId}>
                {ch.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Nome da jornada">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} />
        </Field>
        <Field label="Descrição" optional>
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
