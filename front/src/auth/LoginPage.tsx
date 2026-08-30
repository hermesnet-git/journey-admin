import { useState } from 'react';
import { GitBranch } from 'lucide-react';
import { Tag } from '@telefonica/mistica';
import { useAppTheme } from '../shell/theme';
import { Field, TextInput, PrimaryButton, ErrorBanner } from '../products/ui.tsx';
import { useAuth } from './AuthContext';
import { ApiClientError } from '../api/client';

export function LoginPage() {
  const { colors: c } = useAppTheme();
  const { login } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      setError(err instanceof ApiClientError && err.status === 401 ? 'Usuário ou senha inválidos.' : 'Não foi possível autenticar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: c.bg }}>
      <form
        onSubmit={handleSubmit}
        className="w-[360px] rounded-xl p-6 flex flex-col gap-4"
        style={{ background: c.surface, border: `1px solid ${c.border}`, boxShadow: `0 12px 32px -10px ${c.shadow}` }}
      >
        <div className="flex flex-col items-center gap-3 pb-1">
          <div className="w-[36px] h-[36px] rounded-lg flex items-center justify-center" style={{ background: c.accent }}>
            <GitBranch size={19} color="#fff" strokeWidth={2} />
          </div>
          <div className="text-[17px] font-bold" style={{ color: c.textPrimary }}>
            Dynamic Journey Admin
          </div>
          <Tag type="promo" small>
            Autenticação mockada (MVP)
          </Tag>
          <p className="text-[11.5px] text-center" style={{ color: c.textMuted }}>
            Este login simula um provedor de identidade e não representa uma integração real de autenticação.
          </p>
        </div>

        {error && <ErrorBanner>{error}</ErrorBanner>}

        <Field label="Usuário">
          <TextInput value={username} onChange={(e) => setUsername(e.target.value)} autoFocus />
        </Field>
        <Field label="Senha">
          <TextInput type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </Field>

        <PrimaryButton onClick={() => handleSubmit()} disabled={loading} loading={loading}>
          Entrar
        </PrimaryButton>

        <p className="text-[11px] text-center" style={{ color: c.textMuted }}>
          Usuário de demonstração: <strong>admin</strong> / <strong>admin</strong>
        </p>
      </form>
    </div>
  );
}
