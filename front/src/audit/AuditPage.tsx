import { useCallback, useEffect, useState } from 'react';
import { Search, ShieldCheck } from 'lucide-react';
import { Field, TextInput, SelectInput } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import { listAuditEvents, type AuditEvent, type AuditResult } from '../api/audit';

const RESULT_OPTIONS: { value: '' | AuditResult; label: string }[] = [
  { value: '', label: 'Todos os resultados' },
  { value: 'SUCCESS', label: 'Sucesso' },
  { value: 'FAILURE', label: 'Falha' },
  { value: 'DENIED', label: 'Negado' },
];

const RESOURCE_TYPE_OPTIONS = [
  { value: '', label: 'Todos os recursos' },
  { value: 'PRODUCT', label: 'Produto' },
  { value: 'CHANNEL', label: 'Canal' },
  { value: 'JOURNEY', label: 'Jornada' },
  { value: 'JOURNEY_VERSION', label: 'Versão de jornada' },
  { value: 'SESSION', label: 'Sessão' },
  { value: 'ENDPOINT', label: 'Endpoint' },
  { value: 'AUDIT_LOG', label: 'Log de auditoria' },
];

const PAGE_SIZE = 20;

export function AuditPage() {
  const { colors: c } = useAppTheme();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [totalElements, setTotalElements] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [userId, setUserId] = useState('');
  const [resourceType, setResourceType] = useState('');
  const [result, setResult] = useState<'' | AuditResult>('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [correlationId, setCorrelationId] = useState('');

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listAuditEvents({
        userId: userId || undefined,
        resourceType: resourceType || undefined,
        result: result || undefined,
        from: from ? new Date(from).toISOString() : undefined,
        to: to ? new Date(to).toISOString() : undefined,
        correlationId: correlationId || undefined,
        page,
        size: PAGE_SIZE,
      });
      setEvents(data.items);
      setTotalElements(data.totalElements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar eventos de auditoria');
    } finally {
      setLoading(false);
    }
  }, [userId, resourceType, result, from, to, correlationId, page]);

  useEffect(() => {
    reload();
  }, [reload]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setPage(0);
    reload();
  }

  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Auditoria
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Consulte os eventos registrados de autenticação, autorização e operações de negócio
        </p>
      </div>

      <form
        onSubmit={applyFilters}
        className="grid gap-3 mb-5 p-4 rounded-2xl"
        style={{ background: c.surface, border: `1px solid ${c.border}`, gridTemplateColumns: 'repeat(3, 1fr)' }}
      >
        <Field label="Usuário (ID)" optional>
          <TextInput value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="UUID do usuário" />
        </Field>
        <Field label="Tipo de recurso" optional>
          <SelectInput value={resourceType} onChange={(e) => setResourceType(e.target.value)}>
            {RESOURCE_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="Resultado" optional>
          <SelectInput value={result} onChange={(e) => setResult(e.target.value as '' | AuditResult)}>
            {RESULT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectInput>
        </Field>
        <Field label="De" optional>
          <TextInput type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="Até" optional>
          <TextInput type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <Field label="Correlation ID" optional>
          <TextInput value={correlationId} onChange={(e) => setCorrelationId(e.target.value)} placeholder="ID de correlação" />
        </Field>
        <div className="col-span-3 flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center gap-[6px] rounded-md px-3 py-2 text-[13px] font-medium cursor-pointer border-0"
            style={{ background: c.accent, color: '#fff' }}
          >
            <Search size={14} /> Filtrar
          </button>
        </div>
      </form>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[44px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : events.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <AuditTable events={events} />
          <div className="flex items-center justify-between mt-4">
            <span className="text-[12.5px]" style={{ color: c.textSecondary }}>
              {totalElements} evento{totalElements === 1 ? '' : 's'} · página {page + 1} de {totalPages}
            </span>
            <div className="flex gap-2">
              <PageButton disabled={page === 0} onClick={() => setPage((p) => Math.max(0, p - 1))}>
                Anterior
              </PageButton>
              <PageButton disabled={page + 1 >= totalPages} onClick={() => setPage((p) => p + 1)}>
                Próxima
              </PageButton>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PageButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: React.ReactNode }) {
  const { colors: c } = useAppTheme();
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-md px-3 py-[6px] text-[12.5px] font-medium border cursor-pointer"
      style={{
        borderColor: c.border,
        background: c.surface,
        color: disabled ? c.textMuted : c.textPrimary,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function ResultBadge({ result }: { result: AuditEvent['result'] }) {
  const { colors: c } = useAppTheme();
  const map: Record<AuditEvent['result'], { bg: string; border: string; fg: string; label: string }> = {
    SUCCESS: { bg: c.successSoft, border: c.successBorder, fg: c.success, label: 'Sucesso' },
    FAILURE: { bg: c.dangerSoft, border: c.dangerBorder, fg: c.danger, label: 'Falha' },
    DENIED: { bg: c.warningSoft, border: c.warningBorder, fg: c.warning, label: 'Negado' },
  };
  const s = map[result];
  return (
    <span
      className="inline-flex items-center rounded-full px-[8px] py-[2px] text-[11px] font-semibold"
      style={{ background: s.bg, border: `1px solid ${s.border}`, color: s.fg }}
    >
      {s.label}
    </span>
  );
}

function AuditTable({ events }: { events: AuditEvent[] }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div
        className="grid px-4 py-[6px] text-[11.5px] font-semibold border-b"
        style={{
          gridTemplateColumns: '1.3fr 1fr 1.3fr 1fr 0.8fr',
          color: c.textSecondary,
          borderColor: c.border,
          background: c.bg,
        }}
      >
        <span>Data/hora</span>
        <span>Usuário</span>
        <span>Ação</span>
        <span>Recurso</span>
        <span>Resultado</span>
      </div>
      {events.map((event) => (
        <div
          key={event.auditEventId}
          className="grid items-center px-4 py-[6px] text-[12.5px] border-b box-border last:border-b-0"
          style={{ gridTemplateColumns: '1.3fr 1fr 1.3fr 1fr 0.8fr', borderColor: c.border }}
        >
          <span style={{ color: c.textSecondary }}>{new Date(event.occurredAt).toLocaleString('pt-BR')}</span>
          <span className="truncate" style={{ color: c.textPrimary }} title={event.userId ?? undefined}>
            {event.userId ? event.userId.slice(0, 8) : 'Anônimo'}
          </span>
          <span className="font-medium truncate" style={{ color: c.textPrimary }}>
            {event.action}
          </span>
          <span className="truncate" style={{ color: c.textSecondary }} title={event.resourceId ?? undefined}>
            {event.resourceType}
            {event.resourceId ? ` · ${event.resourceId.slice(0, 8)}` : ''}
          </span>
          <ResultBadge result={event.result} />
        </div>
      ))}
    </div>
  );
}

function EmptyState() {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 rounded-2xl border-dashed"
      style={{ background: c.surface, border: `1px dashed ${c.border}` }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
        <ShieldCheck size={20} color={c.accent} />
      </div>
      <p className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
        Nenhum evento encontrado
      </p>
      <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
        Ajuste os filtros para encontrar o que procura.
      </p>
    </div>
  );
}

