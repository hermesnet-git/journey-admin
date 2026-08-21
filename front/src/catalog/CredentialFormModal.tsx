import { useState } from 'react';
import { Modal } from '../products/Modal';
import { Field, TextInput, SelectInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import type { MessagingCluster, CredentialReference, CredentialInput } from '../api/messaging';

interface CredentialFormModalProps {
  credential: CredentialReference | null;
  clusters: MessagingCluster[];
  defaultClusterId?: string;
  onClose: () => void;
  onSubmit: (input: CredentialInput) => Promise<void>;
}

export function CredentialFormModal({ credential, clusters, defaultClusterId, onClose, onSubmit }: CredentialFormModalProps) {
  const [referenceName, setReferenceName] = useState(credential?.referenceName ?? '');
  const [clusterId, setClusterId] = useState(credential?.clusterId ?? defaultClusterId ?? clusters[0]?.clusterId ?? '');
  const [keyVaultUri, setKeyVaultUri] = useState(credential?.keyVaultUri ?? '');
  const [secretName, setSecretName] = useState(credential?.secretName ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ referenceName, clusterId, keyVaultUri, secretName });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar credencial');
      setSaving(false);
    }
  }

  const canSubmit = !!referenceName && !!clusterId && !!keyVaultUri && !!secretName;

  return (
    <Modal
      title={credential ? 'Editar credencial' : 'Nova credencial'}
      subtitle={credential ? undefined : 'Referência a um secret do Azure Key Vault — o valor do segredo nunca é digitado aqui'}
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!canSubmit}>
            {credential ? 'Salvar alterações' : 'Criar credencial'}
          </PrimaryButton>
        </>
      }
    >
      <form
        id="credential-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field label="Nome de referência" helperText="É o valor usado como credencial na configuração do conector">
          <TextInput
            value={referenceName}
            onChange={(e) => setReferenceName(e.target.value)}
            maxLength={150}
            autoFocus
            placeholder="ex.: credential-pagamentos-prod"
          />
        </Field>
        <Field label="Cluster">
          <SelectInput value={clusterId} onChange={(e) => setClusterId(e.target.value)}>
            {clusters.map((cl) => (
              <option key={cl.clusterId} value={cl.clusterId}>
                {cl.name}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="URI do Key Vault">
          <TextInput
            value={keyVaultUri}
            onChange={(e) => setKeyVaultUri(e.target.value)}
            maxLength={300}
            placeholder="https://elastic-journey-kv.vault.azure.net/"
          />
        </Field>
        <Field label="Nome do secret" helperText="Nome do secret dentro do cofre acima — nunca o valor">
          <TextInput
            value={secretName}
            onChange={(e) => setSecretName(e.target.value)}
            maxLength={150}
            placeholder="ex.: kafka-pagamentos-prod-elastic-svc"
          />
        </Field>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
