import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { Modal } from '../products/Modal';
import { Field, TextInput, PrimaryButton, SecondaryButton, ErrorBanner } from '../products/ui';
import { useAppTheme } from '../shell/theme';

interface Props {
  onClose: () => void;
  onSubmit: (apiKey: string) => Promise<void>;
}

// Só o formulário de digitar a chave — nunca pré-preenchido com o valor salvo (o back não devolve
// a chave de volta, só se está configurada), mesma prática de nunca reexibir um segredo já salvo.
export function AiCredentialModal({ onClose, onSubmit }: Props) {
  const { colors: c } = useAppTheme();
  const [apiKey, setApiKey] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setSaving(true);
    setError(null);
    try {
      await onSubmit(apiKey);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar a chave');
      setSaving(false);
    }
  }

  return (
    <Modal
      title="Credencial de IA — Gemini"
      subtitle="Usada pela geração de fluxo por prompt (“Gerar com IA” no editor de jornada)"
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Cancelar</SecondaryButton>
          <PrimaryButton onClick={submit} loading={saving} disabled={!apiKey.trim()}>
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
        <Field label="Chave de API do Gemini" helperText="Nunca é reexibida depois de salva — só é possível substituir">
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
              name="gemini-api-key"
              placeholder="Cole a chave aqui"
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
        {error && <ErrorBanner>{error}</ErrorBanner>}
      </form>
    </Modal>
  );
}
