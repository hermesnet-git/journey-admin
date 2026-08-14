import { useEffect, useState } from 'react';
import { X, FileJson } from 'lucide-react';
import { useAppTheme, type AppColors } from '../shell/theme';
import type { JourneyVersion, VersionStatus } from '../api/versions';
import { PublicationSnapshotModal } from './PublicationSnapshotModal';

function statusMeta(c: AppColors, status: VersionStatus) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Rascunho', bg: c.chipBg, color: c.textSecondary };
    case 'PUBLISHED':
      return { label: 'Publicada', bg: c.successSoft, color: c.success };
    case 'UNPUBLISHED':
      return { label: 'Despublicada', bg: c.chipBg, color: c.textMuted };
    case 'INACTIVE':
      return { label: 'Inativa', bg: c.chipBg, color: c.textMuted };
  }
}

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

interface VersionDetailPanelProps {
  journeyId: string;
  version: JourneyVersion;
  onClose: () => void;
}

export function VersionDetailPanel({ journeyId, version, onClose }: VersionDetailPanelProps) {
  const { colors: c } = useAppTheme();
  const [showJson, setShowJson] = useState(false);
  const meta = statusMeta(c, version.status);
  const snapshot = version.snapshot;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  const nodesById = new Map(snapshot.flowNodes.map((n) => [n.id, n]));

  return (
    <div
      className="mx-10 my-3 rounded-xl border box-border"
      style={{ background: c.surface, borderColor: c.border }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col">
        <div className="flex items-start justify-between gap-4 px-5 py-4 border-b" style={{ borderColor: c.border }}>
          <div className="min-w-0">
            <div className="flex items-center gap-[8px]">
              <h2 className="m-0 text-[16px] font-semibold tracking-[-0.01em]" style={{ color: c.textPrimary }}>
                v{version.versionNumber}
              </h2>
              <span
                className="inline-flex items-center rounded-full px-[9px] py-[2px] text-[11px] font-medium"
                style={{ background: meta.bg, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
            {version.description && (
              <p className="m-0 mt-[3px] text-[12.5px]" style={{ color: c.textSecondary }}>
                {version.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowJson(true)}
              title="Ver JSON do snapshot"
              className="flex items-center justify-center w-7 h-7 rounded-md border cursor-pointer"
              style={{ borderColor: c.border, background: c.surface, color: c.textSecondary }}
            >
              <FileJson size={14} />
            </button>
            <button
              type="button"
              aria-label="Fechar"
              onClick={onClose}
              className="flex items-center justify-center w-7 h-7 rounded-md border-0 bg-transparent cursor-pointer"
              style={{ color: c.textMuted }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="overflow-auto px-6 py-5 flex flex-col gap-6" style={{ maxHeight: '60vh' }}>
          <section className="grid grid-cols-2 gap-x-4 gap-y-3">
            <Field label="Produto" value={snapshot.productName} />
            <Field label="Canal" value={`${snapshot.channelName} (${snapshot.channelType})`} />
            <Field label="Criado por" value={version.createdBy} />
            <Field label="Criado em" value={formatDateTime(version.createdAt)} />
            <Field label="Publicado em" value={formatDateTime(version.publishedAt)} />
            <Field label="ID da versão" value={version.versionId} />
          </section>

          <section>
            <SectionTitle c={c}>Fluxo ({snapshot.flowNodes.length} nós, {snapshot.flowConnections.length} conexões)</SectionTitle>
            {snapshot.flowNodes.length === 0 ? (
              <EmptyHint c={c}>Nenhum nó definido.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {snapshot.flowNodes.map((node) => (
                  <div
                    key={node.id}
                    className="rounded-lg px-3 py-2 border"
                    style={{ borderColor: c.border, background: c.bg }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12.5px] font-medium truncate" style={{ color: c.textPrimary }}>
                        {node.name}
                      </span>
                      <span
                        className="shrink-0 rounded px-[6px] py-[1px] text-[10.5px] font-medium"
                        style={{ background: c.chipBg, color: c.textSecondary }}
                      >
                        {node.type}
                      </span>
                    </div>
                    {node.description && (
                      <p className="m-0 mt-[2px] text-[11.5px]" style={{ color: c.textSecondary }}>
                        {node.description}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {snapshot.flowConnections.length > 0 && (
            <section>
              <SectionTitle c={c}>Conexões</SectionTitle>
              <div className="flex flex-col gap-1 mt-2">
                {snapshot.flowConnections.map((conn) => (
                  <div key={conn.id} className="text-[12px]" style={{ color: c.textSecondary }}>
                    {nodesById.get(conn.sourceNodeId)?.name ?? conn.sourceNodeId}
                    {' → '}
                    {nodesById.get(conn.targetNodeId)?.name ?? conn.targetNodeId}
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle c={c}>Formulários ({snapshot.forms.length})</SectionTitle>
            {snapshot.forms.length === 0 ? (
              <EmptyHint c={c}>Nenhum formulário associado.</EmptyHint>
            ) : (
              <div className="flex flex-col gap-2 mt-2">
                {snapshot.forms.map((form) => (
                  <div key={form.id} className="rounded-lg px-3 py-2 border" style={{ borderColor: c.border, background: c.bg }}>
                    <div className="text-[12.5px] font-medium" style={{ color: c.textPrimary }}>
                      {form.name}
                    </div>
                    {form.description && (
                      <p className="m-0 mt-[2px] text-[11.5px]" style={{ color: c.textSecondary }}>
                        {form.description}
                      </p>
                    )}
                    <p className="m-0 mt-[2px] text-[11.5px]" style={{ color: c.textMuted }}>
                      {form.fields.length} campo(s)
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showJson && (
        <PublicationSnapshotModal
          journeyId={journeyId}
          journeyName={`v${version.versionNumber}`}
          title={`Snapshot: v${version.versionNumber}`}
          subtitle="JSON armazenado para esta versão da jornada."
          data={snapshot}
          onClose={() => setShowJson(false)}
        />
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  const { colors: c } = useAppTheme();
  return (
    <div className="min-w-0">
      <div className="text-[11px] font-medium uppercase tracking-[0.03em]" style={{ color: c.textMuted }}>
        {label}
      </div>
      <div className="text-[12.5px] truncate" style={{ color: c.textPrimary }} title={value}>
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ c, children }: { c: AppColors; children: React.ReactNode }) {
  return (
    <h3 className="m-0 text-[12.5px] font-semibold" style={{ color: c.textPrimary }}>
      {children}
    </h3>
  );
}

function EmptyHint({ c, children }: { c: AppColors; children: React.ReactNode }) {
  return (
    <p className="m-0 mt-2 text-[12px]" style={{ color: c.textSecondary }}>
      {children}
    </p>
  );
}
