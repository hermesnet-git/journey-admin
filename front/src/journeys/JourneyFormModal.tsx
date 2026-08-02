import { useEffect, useState } from 'react';
import { Modal } from '../products/Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton } from '../products/ui';
import { listProducts, listChannels, type Product, type Channel } from '../api/products';
import type { Journey, JourneyCreateInput, JourneyUpdateInput } from '../api/journeys';

interface JourneyFormModalProps {
  journey: Journey | null;
  defaultProductId?: string;
  defaultChannelId?: string;
  onClose: () => void;
  onSubmit: (input: JourneyCreateInput | JourneyUpdateInput) => Promise<void>;
}

export function JourneyFormModal({
  journey,
  defaultProductId,
  defaultChannelId,
  onClose,
  onSubmit,
}: JourneyFormModalProps) {
  const [name, setName] = useState(journey?.name ?? '');
  const [description, setDescription] = useState(journey?.description ?? '');
  const [products, setProducts] = useState<Product[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [productId, setProductId] = useState(journey?.productId ?? defaultProductId ?? '');
  const [channelId, setChannelId] = useState(journey?.channelId ?? defaultChannelId ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listProducts({ status: 'ACTIVE' }).then(setProducts);
  }, []);

  useEffect(() => {
    if (!productId) {
      setChannels([]);
      return;
    }
    listChannels(productId, { status: 'ACTIVE' }).then(setChannels);
  }, [productId]);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      if (journey) {
        await onSubmit({ name, description });
      } else {
        await onSubmit({ channelId, name, description });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar jornada');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={journey ? 'Editar jornada' : 'Nova jornada'}
      subtitle={journey ? undefined : 'Cadastre uma jornada específica para um canal'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton
            type="submit"
            form="journey-form"
            loading={saving}
            disabled={!name || !description || (!journey && !channelId)}
          >
            {journey ? 'Salvar alterações' : 'Criar jornada'}
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
        {journey ? (
          <div className="rounded-lg bg-[#fafafa] border border-[#f0f0f2] px-3 py-[10px] text-[12.5px] text-[#52525b]">
            {journey.productName} <span className="text-[#a1a1aa]">›</span> {journey.channelName}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Produto">
              <SelectInput
                value={productId}
                onChange={(e) => {
                  setProductId(e.target.value);
                  setChannelId('');
                }}
              >
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
                {channels.map((c) => (
                  <option key={c.channelId} value={c.channelId}>
                    {c.name}
                  </option>
                ))}
              </SelectInput>
            </Field>
          </div>
        )}
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={200} autoFocus />
        </Field>
        <Field label="Descrição">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        {error && (
          <div className="rounded-lg bg-[#fef2f2] border border-[#fecaca] px-3 py-2 text-[12.5px] text-[#b91c1c]">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}
