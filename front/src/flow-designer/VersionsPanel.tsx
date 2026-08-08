import { useEffect, useState } from 'react';
import { Modal } from '../products/Modal';
import { PrimaryButton, SecondaryButton } from '../products/ui';
import { useAppTheme } from '../shell/theme';
import { ApiClientError } from '../api/client';
import {
  listJourneyVersions,
  createJourneyVersion,
  publishJourneyVersion,
  type JourneyVersion,
  type VersionStatus,
} from '../api/versions';

function statusMeta(c: ReturnType<typeof useAppTheme>['colors'], status: VersionStatus) {
  switch (status) {
    case 'DRAFT':
      return { label: 'Rascunho', bg: c.chipBg, color: c.textSecondary };
    case 'PUBLISHED':
      return { label: 'Publicada', bg: c.successSoft, color: c.success };
    case 'ARCHIVED':
      return { label: 'Arquivada', bg: c.warningSoft, color: c.warning };
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export function VersionsPanel({ journeyId, onClose }: { journeyId: string; onClose: () => void }) {
  const { colors: c } = useAppTheme();
  const [versions, setVersions] = useState<JourneyVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [inspecting, setInspecting] = useState<JourneyVersion | null>(null);

  const reload = () => {
    setLoading(true);
    listJourneyVersions(journeyId)
      .then(setVersions)
      .catch((err) => setError(err instanceof Error ? err.message : 'Erro ao carregar versões.'))
      .finally(() => setLoading(false));
  };

  useEffect(reload, [journeyId]);

  async function handleCreate() {
    setCreating(true);
    setError(null);
    try {
      await createJourneyVersion(journeyId);
      reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar versão.');
    } finally {
      setCreating(false);
    }
  }

  async function handlePublish(versionId: string) {
    setBusyVersionId(versionId);
    setError(null);
    try {
      await publishJourneyVersion(journeyId, versionId);
      reload();
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 422
          ? 'Não é possível publicar: o produto ou o canal está inativo.'
          : err instanceof Error
            ? err.message
            : 'Erro ao publicar versão.';
      setError(message);
    } finally {
      setBusyVersionId(null);
    }
  }

  if (inspecting) {
    return (
      <Modal
        title={`Versão ${inspecting.versionNumber}`}
        subtitle={statusMeta(c, inspecting.status).label}
        onClose={() => setInspecting(null)}
        footer={<SecondaryButton onClick={() => setInspecting(null)}>Fechar</SecondaryButton>}
      >
        <p className="m-0 text-[12.5px]" style={{ color: c.textSecondary }}>
          Snapshot somente leitura — visualizar uma versão não altera o fluxo em edição.
        </p>
        <pre
          className="m-0 rounded-lg p-3 text-[11.5px] overflow-auto max-h-[360px]"
          style={{ background: c.chipBg, color: c.textPrimary }}
        >
          {JSON.stringify(inspecting.snapshot, null, 2)}
        </pre>
      </Modal>
    );
  }

  return (
    <Modal
      title="Versões da jornada"
      subtitle="Histórico de versões, publicação e edição independente do fluuxo."
      onClose={onClose}
      footer={
        <>
          <SecondaryButton onClick={onClose}>Fechar</SecondaryButton>
          <PrimaryButton onClick={handleCreate} loading={creating}>
            Nova versão
          </PrimaryButton>
        </>
      }
    >
      {error && (
        <p className="m-0 text-[12.5px]" style={{ color: c.danger }}>
          {error}
        </p>
      )}
      {loading ? (
        <p className="m-0 text-[13px]" style={{ color: c.textSecondary }}>
          Carregando...
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {versions.map((v) => {
            const meta = statusMeta(c, v.status);
            return (
              <div
                key={v.versionId}
                className="rounded-lg p-3 flex items-center justify-between gap-3"
                style={{ border: `1px solid ${c.border}` }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold" style={{ color: c.textPrimary }}>
                      v{v.versionNumber}
                    </span>
                    <span
                      className="inline-flex items-center rounded-full px-[9px] py-[2px] text-[11px] font-medium"
                      style={{ background: meta.bg, color: meta.color }}
                    >
                      {meta.label}
                    </span>
                  </div>
                  {v.description && (
                    <p className="m-0 mt-1 text-[12px] truncate" style={{ color: c.textSecondary }}>
                      {v.description}
                    </p>
                  )}
                  <p className="m-0 mt-1 text-[11.5px]" style={{ color: c.textMuted }}>
                    Criada em {formatDate(v.createdAt)}
                    {v.publishedAt && ` · Publicada em ${formatDate(v.publishedAt)}`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <SecondaryButton onClick={() => setInspecting(v)}>Ver</SecondaryButton>
                  {v.status === 'DRAFT' && (
                    <PrimaryButton onClick={() => handlePublish(v.versionId)} loading={busyVersionId === v.versionId}>
                      Publicar
                    </PrimaryButton>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
