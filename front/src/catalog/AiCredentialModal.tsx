import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '../products/Modal';
import { Field, TextInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import type { AiCredentialInput, AiCredentialStatus, AiProviderInfo } from '../api/aiCredentials';

interface Props {
  provider: AiProviderInfo;
  status: AiCredentialStatus | null;
  // Sem nenhum provedor ativo vale o Gemini: a caixa já nasce marcada nele, como o que acontece de fato.
  usedByDefault: boolean;
  onClose: () => void;
  onSubmit: (input: AiCredentialInput) => Promise<void>;
}

// A chave nunca é pré-preenchida (o back não devolve o valor salvo, só se está configurada), mesma
// prática de nunca reexibir um segredo já salvo; com o provedor já configurado, deixá-la em branco
// mantém a atual e permite trocar só o modelo ou a escolha de provedor ativo.
export function AiCredentialModal({ provider, status, usedByDefault, onClose, onSubmit }: Props) {
  const { colors: c } = useAppTheme();
  const configured = !!status?.configured;
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(status?.model ?? '');
  const [active, setActive] = useState(status?.active ?? usedByDefault);
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit({ apiKey, model, active });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a credencial');
      setSaving(false);
    }
  }

  return (
    <Modal
      title={`Credencial de IA — ${provider.label}`}
      subtitle="Usada para gerar a jornada por prompt (opção “IA” em “Nova jornada”)"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!configured && !apiKey.trim()}>
            Salvar
          </PrimaryButton>
        </>
      }
    >
      <form
        id="ai-credential-form"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
        className="flex flex-col gap-4"
      >
        <Field
          label={provider.keyLabel}
          helperText={
            configured
              ? 'Deixe em branco para manter a chave atual. Nunca é reexibida depois de salva.'
              : 'Nunca é reexibida depois de salva — só é possível substituir'
          }
        >
          <div className="relative">
            {/* type="text" + -webkit-text-security (não type="password") de propósito: um campo de
                senha de verdade faz o navegador oferecer "salvar senha?" pro usuário logado, como se
                essa chave fosse a credencial de login — confuso e errado pra uma API key. */}
            <TextInput
              type="text"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              autoFocus
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              name={`ai-api-key-${provider.id.toLowerCase()}`}
              placeholder={configured ? 'Chave já configurada' : 'Cole a chave aqui'}
              style={{ WebkitTextSecurity: visible ? 'none' : 'disc', paddingRight: 34 } as React.CSSProperties}
            />
            <button
              type="button"
              onClick={() => setVisible((v) => !v)}
              title={visible ? 'Ocultar chave' : 'Mostrar chave'}
              className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent cursor-pointer flex items-center justify-center"
              style={{ color: c.textSecondary }}
            >
              {visible ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </Field>
        <Field
          label="Modelo"
          helperText={
            provider.defaultModel
              ? `Em branco usa ${provider.defaultModel}.`
              : 'Em branco usa o modelo padrão configurado no sistema.'
          }
        >
          <TextInput
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            autoComplete="off"
            spellCheck={false}
            name={`ai-model-${provider.id.toLowerCase()}`}
            placeholder={provider.defaultModel ?? 'Modelo padrão do sistema'}
          />
        </Field>
        <label className="flex items-center gap-2 text-[13px] cursor-pointer" style={{ color: c.textPrimary }}>
          <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
          Usar este provedor para gerar jornadas
        </label>
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
