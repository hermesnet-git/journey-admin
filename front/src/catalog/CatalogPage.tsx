import { useEffect, useState, useMemo, useCallback } from 'react';
import { Search, Plus, KeyRound, Server } from 'lucide-react';
import { PrimaryButton, LinkButton, StatusTag, FilterDropdown, SelectInput } from '../products/ui';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ToastProvider, useToast } from '../products/Toast';
import { useAppTheme } from '../shell/theme';
import { useAuth } from '../auth/AuthContext';
import { ApiClientError } from '../api/client';
import {
  listClusters,
  createCluster,
  updateCluster,
  deactivateCluster,
  activateCluster,
  listCredentials,
  createCredential,
  updateCredential,
  deactivateCredential,
  activateCredential,
  testCredentialConnection,
  type MessagingCluster,
  type ClusterInput,
  type CredentialReference,
  type CredentialInput,
} from '../api/messaging';
import { ClusterFormModal } from './ClusterFormModal';
import { CredentialFormModal } from './CredentialFormModal';

const STATUS_OPTIONS = [
  { value: '', label: 'Todos os status' },
  { value: 'ACTIVE', label: 'Ativos' },
  { value: 'INACTIVE', label: 'Inativos' },
];

// REQ-14.03: catálogo de clusters/credenciais (FT-14) — leitura liberada pra qualquer papel
// autenticado, escrita (criar/editar/(de)ativar) restrita a ADMIN.
export function CatalogPage() {
  return (
    <ToastProvider>
      <CatalogPageContent />
    </ToastProvider>
  );
}

function CatalogPageContent() {
  const { colors: c } = useAppTheme();
  const { user } = useAuth();
  const { showToast } = useToast();
  const canWrite = user?.role === 'ADMIN';

  const [clusters, setClusters] = useState<MessagingCluster[]>([]);
  const [credentials, setCredentials] = useState<CredentialReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [editingCluster, setEditingCluster] = useState<MessagingCluster | 'new' | null>(null);
  const [deactivatingCluster, setDeactivatingCluster] = useState<MessagingCluster | null>(null);
  const [editingCredential, setEditingCredential] = useState<CredentialReference | 'new' | null>(null);
  const [deactivatingCredential, setDeactivatingCredential] = useState<CredentialReference | null>(null);
  const [testingCredentialId, setTestingCredentialId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clusterList, credentialList] = await Promise.all([listClusters(), listCredentials()]);
      setClusters(clusterList);
      setCredentials(credentialList);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao carregar o catálogo de integrações');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const filteredClusters = useMemo(
    () =>
      clusters
        .filter((cl) => !statusFilter || cl.status === statusFilter)
        .filter((cl) => !search || cl.name.toLowerCase().includes(search.toLowerCase())),
    [clusters, search, statusFilter],
  );

  const selectedCluster = filteredClusters.find((cl) => cl.clusterId === selectedClusterId) ?? filteredClusters[0] ?? null;
  const credentialsForSelected = selectedCluster
    ? credentials.filter((cr) => cr.clusterId === selectedCluster.clusterId)
    : [];

  async function handleClusterSubmit(input: ClusterInput) {
    const isNew = editingCluster === 'new';
    if (isNew) {
      await createCluster(input);
    } else if (editingCluster) {
      await updateCluster(editingCluster.clusterId, input);
    }
    setEditingCluster(null);
    await reload();
    showToast(isNew ? 'Cluster criado com sucesso.' : 'Cluster atualizado com sucesso.');
  }

  async function confirmDeactivateCluster() {
    if (!deactivatingCluster) return;
    const cluster = deactivatingCluster;
    setDeactivatingCluster(null);
    try {
      await deactivateCluster(cluster.clusterId);
      await reload();
      showToast('Cluster desativado com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível desativar: existe credencial ativa ou conector de jornada publicada referenciando este cluster.'
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar cluster';
      showToast(message, 'error');
    }
  }

  async function handleActivateCluster(cluster: MessagingCluster) {
    try {
      await activateCluster(cluster.clusterId);
      await reload();
      showToast('Cluster ativado com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ativar cluster', 'error');
    }
  }

  async function handleCredentialSubmit(input: CredentialInput) {
    const isNew = editingCredential === 'new';
    if (isNew) {
      await createCredential(input);
    } else if (editingCredential) {
      await updateCredential(editingCredential.credentialId, input);
    }
    setEditingCredential(null);
    await reload();
    showToast(isNew ? 'Credencial criada com sucesso.' : 'Credencial atualizada com sucesso.');
  }

  async function confirmDeactivateCredential() {
    if (!deactivatingCredential) return;
    const credential = deactivatingCredential;
    setDeactivatingCredential(null);
    try {
      await deactivateCredential(credential.credentialId);
      await reload();
      showToast('Credencial desativada com sucesso.');
    } catch (err) {
      const message =
        err instanceof ApiClientError && err.status === 409
          ? 'Não é possível desativar: existe conector de jornada publicada referenciando esta credencial.'
          : err instanceof Error
            ? err.message
            : 'Erro ao desativar credencial';
      showToast(message, 'error');
    }
  }

  async function handleActivateCredential(credential: CredentialReference) {
    try {
      await activateCredential(credential.credentialId);
      await reload();
      showToast('Credencial ativada com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao ativar credencial', 'error');
    }
  }

  async function handleTestConnection(credential: CredentialReference) {
    setTestingCredentialId(credential.credentialId);
    try {
      const result = await testCredentialConnection(credential.credentialId);
      showToast(result.message, result.ok ? 'success' : 'error');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao testar conexão', 'error');
    } finally {
      setTestingCredentialId(null);
    }
  }

  return (
    <div className="flex-1 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6">
        <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: c.textPrimary }}>
          Catálogo de Integrações
        </h1>
        <p className="m-0 text-[13.5px]" style={{ color: c.textSecondary }}>
          Clusters de mensageria corporativos e referências de credencial usadas pelos conectores das jornadas
        </p>
      </div>

      <div className="flex items-center justify-between gap-3 mb-[18px] flex-wrap">
        <div className="relative w-[240px]">
          <Search size={15} className="absolute left-[10px] top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: c.textMuted }} />
          <input
            aria-label="Buscar cluster"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full py-2 pl-[32px] pr-3 rounded-md text-[13px] outline-none box-border"
            style={{ border: `1px solid ${c.border}`, background: c.surface, color: c.textPrimary }}
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown label="Status" options={STATUS_OPTIONS} value={statusFilter} onChange={setStatusFilter} />
          {canWrite && (
            <PrimaryButton onClick={() => setEditingCluster('new')}>
              <Plus size={14} /> Novo cluster
            </PrimaryButton>
          )}
        </div>
      </div>

      {error && <p className="text-[13px]" style={{ color: c.danger }}>{error}</p>}

      {loading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-[52px] rounded-lg animate-pulse" style={{ background: c.skeletonBg }} />
          ))}
        </div>
      ) : filteredClusters.length === 0 ? (
        <EmptyState hasClusters={clusters.length > 0} canWrite={canWrite} onCreate={() => setEditingCluster('new')} />
      ) : (
        <div className="flex flex-col gap-5">
          <ClustersTable
            clusters={filteredClusters}
            selectedId={selectedCluster?.clusterId ?? null}
            canWrite={canWrite}
            onSelect={(cl) => setSelectedClusterId(cl.clusterId)}
            onEdit={setEditingCluster}
            onDeactivate={setDeactivatingCluster}
            onActivate={handleActivateCluster}
          />

          <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
            <div className="flex items-center justify-between gap-3 px-4 py-3 border-b flex-wrap" style={{ borderColor: c.border, background: c.bg }}>
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-semibold" style={{ color: c.textPrimary }}>Credenciais</span>
                <span className="text-[12.5px]" style={{ color: c.textSecondary }}>do cluster</span>
                <div className="w-[220px]">
                  <SelectInput value={selectedCluster?.clusterId ?? ''} onChange={(e) => setSelectedClusterId(e.target.value)}>
                    {filteredClusters.map((cl) => (
                      <option key={cl.clusterId} value={cl.clusterId}>
                        {cl.name}
                      </option>
                    ))}
                  </SelectInput>
                </div>
              </div>
              {canWrite && selectedCluster && (
                <PrimaryButton onClick={() => setEditingCredential('new')}>
                  <Plus size={14} /> Nova credencial
                </PrimaryButton>
              )}
            </div>
            <div className="p-4">
              {credentialsForSelected.length === 0 ? (
                <p className="m-0 text-[13px]" style={{ color: c.textSecondary }}>
                  Nenhuma credencial cadastrada para este cluster.
                </p>
              ) : (
                <CredentialsTable
                  credentials={credentialsForSelected}
                  canWrite={canWrite}
                  testingCredentialId={testingCredentialId}
                  onEdit={setEditingCredential}
                  onDeactivate={setDeactivatingCredential}
                  onActivate={handleActivateCredential}
                  onTestConnection={handleTestConnection}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {editingCluster && (
        <ClusterFormModal
          cluster={editingCluster === 'new' ? null : editingCluster}
          onClose={() => setEditingCluster(null)}
          onSubmit={handleClusterSubmit}
        />
      )}
      {deactivatingCluster && (
        <ConfirmDialog
          title="Desativar cluster"
          message={`Tem certeza que deseja desativar "${deactivatingCluster.name}"? Não será possível se houver credencial ativa ou conector de jornada publicada referenciando este cluster.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivateCluster}
          onCancel={() => setDeactivatingCluster(null)}
        />
      )}

      {editingCredential && selectedCluster && (
        <CredentialFormModal
          credential={editingCredential === 'new' ? null : editingCredential}
          clusters={clusters}
          defaultClusterId={selectedCluster.clusterId}
          onClose={() => setEditingCredential(null)}
          onSubmit={handleCredentialSubmit}
        />
      )}
      {deactivatingCredential && (
        <ConfirmDialog
          title="Desativar credencial"
          message={`Tem certeza que deseja desativar "${deactivatingCredential.referenceName}"? Não será possível se houver conector de jornada publicada referenciando esta credencial.`}
          confirmLabel="Desativar"
          onConfirm={confirmDeactivateCredential}
          onCancel={() => setDeactivatingCredential(null)}
        />
      )}
    </div>
  );
}

function EmptyState({ hasClusters, canWrite, onCreate }: { hasClusters: boolean; canWrite: boolean; onCreate: () => void }) {
  const { colors: c } = useAppTheme();
  return (
    <div
      className="flex flex-col items-center justify-center text-center gap-3 py-[64px] px-6 rounded-2xl border-dashed"
      style={{ background: c.surface, border: `1px dashed ${c.border}` }}
    >
      <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: c.accentSoft }}>
        <Server size={20} color={c.accent} />
      </div>
      <div>
        <p className="m-0 text-[14px] font-semibold" style={{ color: c.textPrimary }}>
          {hasClusters ? 'Nenhum cluster encontrado' : 'Nenhum cluster cadastrado ainda'}
        </p>
        <p className="m-0 mt-1 text-[12.5px] max-w-[320px]" style={{ color: c.textSecondary }}>
          {hasClusters
            ? 'Ajuste a busca ou os filtros para encontrar o que procura.'
            : canWrite
              ? 'Cadastre um cluster de mensageria corporativo para disponibilizá-lo aos conectores das jornadas.'
              : 'Peça a um administrador para cadastrar um cluster de mensageria corporativo.'}
        </p>
      </div>
      {!hasClusters && canWrite && (
        <PrimaryButton onClick={onCreate}>
          <Plus size={14} /> Criar primeiro cluster
        </PrimaryButton>
      )}
    </div>
  );
}

function ClustersTable({
  clusters,
  selectedId,
  canWrite,
  onSelect,
  onEdit,
  onDeactivate,
  onActivate,
}: {
  clusters: MessagingCluster[];
  selectedId: string | null;
  canWrite: boolean;
  onSelect: (cl: MessagingCluster) => void;
  onEdit: (cl: MessagingCluster) => void;
  onDeactivate: (cl: MessagingCluster) => void;
  onActivate: (cl: MessagingCluster) => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: c.surface, border: `1px solid ${c.border}` }}>
      <div
        className="grid px-4 py-[10px] text-[11.5px] font-semibold border-b"
        style={{ gridTemplateColumns: '2fr 1fr 2fr 1fr 1.2fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
      >
        <span>Cluster</span>
        <span>Tipo</span>
        <span>Endereço de conexão</span>
        <span>Status</span>
        <span>Ações</span>
      </div>
      {clusters.map((cl) => {
        const selected = cl.clusterId === selectedId;
        return (
          <div
            key={cl.clusterId}
            className="grid items-center px-4 py-3 text-[13px] border-b box-border last:border-b-0 cursor-pointer"
            style={{ gridTemplateColumns: '2fr 1fr 2fr 1fr 1.2fr', borderColor: c.border, background: selected ? c.accentSoft : 'transparent' }}
            onClick={() => onSelect(cl)}
            onMouseEnter={(e) => {
              if (!selected) e.currentTarget.style.background = c.hoverBg;
            }}
            onMouseLeave={(e) => {
              if (!selected) e.currentTarget.style.background = 'transparent';
            }}
          >
            <div className="text-[13.5px] font-semibold truncate" style={{ color: c.textPrimary }}>
              {cl.name}
            </div>
            <span style={{ color: c.textSecondary }}>{cl.type}</span>
            <span className="truncate" style={{ color: c.textSecondary }} title={cl.connectionAddress}>
              {cl.connectionAddress}
            </span>
            <span className="w-fit">
              <StatusTag active={cl.status === 'ACTIVE'} />
            </span>
            {canWrite ? (
              <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                <LinkButton onClick={() => onEdit(cl)}>Editar</LinkButton>
                {cl.status === 'ACTIVE' && <LinkButton onClick={() => onDeactivate(cl)}>Desativar</LinkButton>}
                {cl.status === 'INACTIVE' && <LinkButton onClick={() => onActivate(cl)}>Ativar</LinkButton>}
              </div>
            ) : (
              <span />
            )}
          </div>
        );
      })}
    </div>
  );
}

function CredentialsTable({
  credentials,
  canWrite,
  testingCredentialId,
  onEdit,
  onDeactivate,
  onActivate,
  onTestConnection,
}: {
  credentials: CredentialReference[];
  canWrite: boolean;
  testingCredentialId: string | null;
  onEdit: (cr: CredentialReference) => void;
  onDeactivate: (cr: CredentialReference) => void;
  onActivate: (cr: CredentialReference) => void;
  onTestConnection: (cr: CredentialReference) => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}` }}>
      <div
        className="grid px-3 py-[8px] text-[11px] font-semibold border-b"
        style={{ gridTemplateColumns: '1.4fr 1.4fr 1.4fr 0.7fr 1.6fr', color: c.textSecondary, borderColor: c.border, background: c.bg }}
      >
        <span>Referência</span>
        <span>Key Vault</span>
        <span>Secret</span>
        <span>Status</span>
        <span>Ações</span>
      </div>
      {credentials.map((cr) => {
        const testing = testingCredentialId === cr.credentialId;
        return (
          <div
            key={cr.credentialId}
            className="grid items-center px-3 py-[10px] text-[12.5px] border-b box-border last:border-b-0"
            style={{ gridTemplateColumns: '1.4fr 1.4fr 1.4fr 0.7fr 1.6fr', borderColor: c.border }}
          >
            <div className="flex items-center gap-[6px] font-semibold truncate" style={{ color: c.textPrimary }}>
              <KeyRound size={12} style={{ color: c.textMuted }} />
              {cr.referenceName}
            </div>
            <span className="truncate" style={{ color: c.textSecondary }} title={cr.keyVaultUri}>
              {cr.keyVaultUri}
            </span>
            <span className="truncate" style={{ color: c.textSecondary }} title={cr.secretName}>
              {cr.secretName}
            </span>
            <span className="w-fit">
              <StatusTag active={cr.status === 'ACTIVE'} />
            </span>
            <div className="flex items-center gap-3">
              <LinkButton onClick={() => onTestConnection(cr)} disabled={testing}>
                {testing ? 'Testando...' : 'Testar conexão'}
              </LinkButton>
              {canWrite && (
                <>
                  <LinkButton onClick={() => onEdit(cr)}>Editar</LinkButton>
                  {cr.status === 'ACTIVE' && <LinkButton onClick={() => onDeactivate(cr)}>Desativar</LinkButton>}
                  {cr.status === 'INACTIVE' && <LinkButton onClick={() => onActivate(cr)}>Ativar</LinkButton>}
                </>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
