import { useAppTheme } from '../shell/theme';
import type { JourneyVersion } from '../api/versions';

function formatDateTime(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleString('pt-BR');
}

interface VersionDetailPanelProps {
  version: JourneyVersion;
}

export function VersionDetailPanel({ version }: VersionDetailPanelProps) {
  const { colors: c } = useAppTheme();
  const snapshot = version.snapshot;

  return (
    <div
      className="mx-10 my-3 rounded-xl border px-5 py-4 grid grid-cols-2 gap-x-6 gap-y-3 box-border"
      style={{ background: c.surface, borderColor: c.border }}
      onClick={(e) => e.stopPropagation()}
    >
      <Field label="Produto" value={snapshot.productName} />
      <Field label="Canal" value={`${snapshot.channelName} (${snapshot.channelType})`} />
      <Field label="Criado por" value={version.createdBy} />
      <Field label="Criado em" value={formatDateTime(version.createdAt)} />
      <Field label="Publicado em" value={formatDateTime(version.publishedAt)} />
      <Field label="ID da versão" value={version.versionId} />
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
