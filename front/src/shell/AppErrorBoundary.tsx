import { Component, useState, type ReactNode } from 'react';
import { ServerCrash, Copy, Check } from 'lucide-react';
import { setServerErrorHandler, type ServerErrorInfo } from '../api/client';
import { LIGHT_APP_COLORS } from './theme';

const SUPPORT_MESSAGE =
  'A aplicação encontrou um erro inesperado. Tente novamente em instantes e, se o problema persistir, contate o time de sustentação ou o administrador do sistema.';

function ErrorNotice({
  fullScreen,
  detail,
  onDismiss,
}: {
  fullScreen: boolean;
  detail?: ServerErrorInfo | string;
  onDismiss?: () => void;
}) {
  const c = LIGHT_APP_COLORS;
  const [copied, setCopied] = useState(false);
  const rows: { label: string; value: string }[] =
    typeof detail === 'string'
      ? [{ label: 'Detalhe', value: detail }]
      : detail
        ? [
            { label: 'Status HTTP', value: String(detail.status) },
            ...(detail.code ? [{ label: 'Código', value: detail.code }] : []),
            { label: 'Mensagem', value: detail.message },
            ...(detail.path ? [{ label: 'Endpoint', value: detail.path }] : []),
          ]
        : [];

  function handleCopy() {
    const text = rows.map((r) => `${r.label}: ${r.value}`).join('\n');
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    });
  }

  const content = (
    <div
      className="flex flex-col gap-4 rounded-2xl p-6 overflow-auto"
      style={{
        background: c.surface,
        border: `1px solid ${c.dangerBorder}`,
        boxShadow: `0 20px 50px -12px ${c.shadow}`,
        width: 600,
        maxWidth: '92vw',
        height: 380,
        maxHeight: '92vh',
        minWidth: 420,
        minHeight: 260,
        resize: 'both',
        boxSizing: 'border-box',
      }}
    >
      <div className="flex items-start gap-3 shrink-0">
        <div className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center" style={{ background: c.dangerSoft }}>
          <ServerCrash size={18} color={c.danger} />
        </div>
        <div className="min-w-0">
          <h2 className="m-0 text-[15px] font-semibold" style={{ color: c.textPrimary }}>
            Ocorreu um erro na aplicação
          </h2>
          <p className="m-0 mt-[6px] text-[13px] leading-[19px]" style={{ color: c.textSecondary }}>
            {SUPPORT_MESSAGE}
          </p>
        </div>
      </div>

      {rows.length > 0 && (
        <div
          className="w-full flex-1 min-h-0 text-left rounded-lg overflow-hidden flex flex-col"
          style={{ background: c.chipBg, border: `1px solid ${c.border}` }}
        >
          <div
            className="flex items-center justify-between gap-2 px-3 py-[7px] border-b shrink-0"
            style={{ borderColor: c.border }}
          >
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
              Detalhes técnicos
            </span>
            <button
              type="button"
              onClick={handleCopy}
              title={copied ? 'Copiado!' : 'Copiar detalhes do erro'}
              aria-label="Copiar detalhes do erro"
              className="inline-flex items-center justify-center w-6 h-6 rounded-md border-0 cursor-pointer"
              style={{ background: copied ? c.successSoft : 'transparent', color: copied ? c.success : c.textMuted }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
            </button>
          </div>
          <div className="px-3 py-[10px] flex-1 min-h-0 overflow-auto flex flex-col gap-[6px]">
            {rows.map((row) => (
              <div key={row.label} className="text-[11.5px] leading-[16px]" style={{ color: c.textSecondary }}>
                <span className="font-semibold" style={{ color: c.textPrimary }}>
                  {row.label}:
                </span>{' '}
                <span className="font-mono break-all">{row.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {onDismiss && (
        <div className="flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onDismiss}
            className="px-4 py-[8px] rounded-md text-[13px] font-medium cursor-pointer border-0"
            style={{ background: c.accent, color: '#fff' }}
          >
            Entendi
          </button>
        </div>
      )}
    </div>
  );

  if (!fullScreen) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(15,23,42,0.45)' }}>
        {content}
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center p-4" style={{ background: c.bg }}>
      {content}
    </div>
  );
}

interface State {
  crashed: boolean;
  crashDetail: string | null;
  serverError: ServerErrorInfo | null;
}

export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { crashed: false, crashDetail: null, serverError: null };

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { crashed: true, crashDetail: error instanceof Error ? error.message : String(error) };
  }

  componentDidCatch(error: unknown) {
    console.error('Unhandled application error:', error);
  }

  componentDidMount() {
    setServerErrorHandler((info) => this.setState({ serverError: info }));
  }

  componentWillUnmount() {
    setServerErrorHandler(null);
  }

  render() {
    if (this.state.crashed) {
      return <ErrorNotice fullScreen detail={this.state.crashDetail ?? undefined} />;
    }
    return (
      <>
        {this.props.children}
        {this.state.serverError && (
          <ErrorNotice fullScreen={false} detail={this.state.serverError} onDismiss={() => this.setState({ serverError: null })} />
        )}
      </>
    );
  }
}
