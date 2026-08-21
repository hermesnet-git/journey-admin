import { useState } from 'react';
import { Modal } from '../products/Modal';
import { Field, TextInput, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import type { MessagingCluster, ClusterInput, ClusterType } from '../api/messaging';

const CLUSTER_TYPES: { value: ClusterType; label: string }[] = [
  { value: 'KAFKA', label: 'Kafka' },
  { value: 'EVENT_HUBS', label: 'Azure Event Hubs' },
  { value: 'SERVICE_BUS', label: 'Azure Service Bus' },
];

interface ClusterFormModalProps {
  cluster: MessagingCluster | null;
  onClose: () => void;
  onSubmit: (input: ClusterInput) => Promise<void>;
}

export function ClusterFormModal({ cluster, onClose, onSubmit }: ClusterFormModalProps) {
  const [name, setName] = useState(cluster?.name ?? '');
  const [type, setType] = useState<ClusterType>(cluster?.type ?? 'KAFKA');
  const [connectionAddress, setConnectionAddress] = useState(cluster?.connectionAddress ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ name, type, connectionAddress });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar cluster');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={cluster ? 'Editar cluster' : 'Novo cluster'}
      subtitle={cluster ? undefined : 'Cadastre um cluster/broker de mensageria corporativo'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!name || !connectionAddress}>
            {cluster ? 'Salvar alterações' : 'Criar cluster'}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="cluster-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Nome">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} maxLength={150} autoFocus placeholder="ex.: Pagamentos Kafka Prod" />
        </Field>
        <Field label="Tipo">
          <SelectInput value={type} onChange={(e) => setType(e.target.value as ClusterType)}>
            {CLUSTER_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Endereço de conexão" helperText="Bootstrap servers (Kafka) ou namespace (Event Hubs/Service Bus)">
          <TextInput
            value={connectionAddress}
            onChange={(e) => setConnectionAddress(e.target.value)}
            maxLength={300}
            placeholder="ex.: kafka-prod.pagamentos.empresa.com:9092"
          />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
