import { useState } from 'react';
import { Modal } from './Modal';
import { Field, TextInput, TextArea, SelectInput, PrimaryButton, SecondaryButton } from './ui';
import type { Channel, ChannelInput, ChannelType } from '../api/products';

const CHANNEL_TYPE_OPTIONS: { value: ChannelType; text: string }[] = [
  { value: 'WEB', text: 'Web' },
  { value: 'MOBILE', text: 'Mobile' },
  { value: 'WHATSAPP', text: 'WhatsApp' },
  { value: 'URA', text: 'URA' },
  { value: 'CONTACT_CENTER', text: 'Contact Center' },
  { value: 'OTHER', text: 'Outro' },
];

interface ChannelFormModalProps {
  channel: Channel | null;
  onClose: () => void;
  onSubmit: (input: ChannelInput) => Promise<void>;
}

export function ChannelFormModal({ channel, onClose, onSubmit }: ChannelFormModalProps) {
  const [name, setName] = useState(channel?.name ?? '');
  const [description, setDescription] = useState(channel?.description ?? '');
  const [type, setType] = useState<ChannelType>(channel?.type ?? 'WEB');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, description, type });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar canal');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={channel ? 'Editar canal' : 'Novo canal'}
      subtitle={channel ? undefined : 'Cadastre um canal de atendimento para este produto'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton type="button" onClick={onClose}>
            Cancelar
          </SecondaryButton>
          <PrimaryButton type="submit" form="channel-form" loading={saving} disabled={!name || !description}>
            {channel ? 'Salvar alterações' : 'Criar canal'}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="channel-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={100} autoFocus />
        </Field>
        <Field label="Tipo de canal">
          <SelectInput value={type} onChange={(e) => setType(e.target.value as ChannelType)}>
            {CHANNEL_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.text}
              </option>
            ))}
          </SelectInput>
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
