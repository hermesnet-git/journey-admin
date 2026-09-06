import { useState } from 'react';
import { Modal } from './Modal';
import { Field, TextInput, TextArea, PrimaryButton, SecondaryButton, ErrorBanner } from './ui';
import { ChannelTypeChecklist } from './ChannelTypeChecklist';
import type { ChannelType, Product, ProductInput } from '../api/products';

const ALL_CHANNEL_TYPES: ChannelType[] = ['WEB', 'MOBILE', 'WHATSAPP'];

interface ProductFormModalProps {
  product: Product | null;
  onClose: () => void;
  onSubmit: (input: ProductInput) => Promise<void>;
}

export function ProductFormModal({ product, onClose, onSubmit }: ProductFormModalProps) {
  const [name, setName] = useState(product?.name ?? '');
  const [description, setDescription] = useState(product?.description ?? '');
  const [channelTypes, setChannelTypes] = useState<ChannelType[]>(product?.channelTypes ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, description, channelTypes });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar produto');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={product ? 'Editar produto' : 'Novo produto'}
      subtitle={product ? undefined : 'Cadastre um produto para organizar seus canais e jornadas'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!name || !description || channelTypes.length === 0}>
            {product ? 'Salvar alterações' : 'Criar produto'}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="product-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus />
        </Field>
        <Field label="Descrição">
          <TextArea value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <Field label="Canais" helperText="As jornadas deste produto poderão ser expostas nos canais marcados.">
          <ChannelTypeChecklist options={ALL_CHANNEL_TYPES} selected={channelTypes} onChange={setChannelTypes} />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
