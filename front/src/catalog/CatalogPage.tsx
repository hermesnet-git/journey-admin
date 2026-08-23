import { useEffect, useState, useMemo, useCallback } from 'react';
import {
  Search,
  Plus,
  KeyRound,
  Server,
  RefreshCw,
  ChevronDown,
  CircleCheck,
  CircleDashed,
  CircleX,
  Pencil,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { PrimaryButton, SecondaryButton, ActionsMenu } from '../products/ui';
import { KafkaIcon, EventHubsIcon, ServiceBusIcon } from './brandIcons';
import { ConfirmDialog } from '../products/ConfirmDialog';
import { ToastProvider, useToast } from '../products/Toast';
import { useAppTheme } from '../shell/theme';
import { useAuth } from '../auth/AuthContext';
import {
  listClusters,
  createCluster,
  updateCluster,
  deleteCluster,
  listCredentials,
  createCredential,
  updateCredential,
  deleteCredential,
  testCredentialConnection,
  type MessagingCluster,
  type ClusterType,
  type ClusterInput,
  type CredentialReference,
  type CredentialInput,
} from '../api/messaging';
import { getAiCredentialStatus, saveAiCredential, deleteAiCredential, type AiCredentialStatus } from '../api/aiCredentials';
import { ClusterFormModal } from './ClusterFormModal';
import { CredentialFormModal } from './CredentialFormModal';
import { AiCredentialModal } from './AiCredentialModal';

type ConnectionTestState = { status: 'idle' | 'testing' | 'ok' | 'error'; message?: string };
const IDLE_CONNECTION_TEST: ConnectionTestState = { status: 'idle' };
type Colors = ReturnType<typeof useAppTheme>['colors'];

// Mesma linguagem visual da grid de requisitos da página "Sobre" (SobrePage.tsx): grid tipada por
// nível, chevron de expandir/colapsar, cabeçalho uppercase tracked.
// Última coluna encolhida (era 140px, larga o bastante pra até 3 ícones lado a lado) agora que
// carrega só o gatilho "⋮" do ActionsMenu.
const CATALOG_GRID_COLS = 'minmax(0,2.2fr) 130px minmax(0,1.6fr) 56px';

// Logos oficiais das marcas (vendorizados em brandIcons.tsx) em vez de ícones genéricos.
const CLUSTER_TYPE_ICON: Record<ClusterType, typeof KafkaIcon> = {
  KAFKA: KafkaIcon,
  EVENT_HUBS: EventHubsIcon,
  SERVICE_BUS: ServiceBusIcon,
};

const CLUSTER_TYPE_LABEL: Record<ClusterType, string> = {
  KAFKA: 'Kafka',
  EVENT_HUBS: 'Event Hubs',
  SERVICE_BUS: 'Service Bus',
};

function connectionMeta(state: ConnectionTestState, c: Colors) {
  if (state.status === 'testing') return { Icon: RefreshCw, color: c.textMuted, label: 'Testando conexão...', spin: true };
  if (state.status === 'ok') return { Icon: CircleCheck, color: c.success, label: 'Conectado', spin: false };
  if (state.status === 'error')
    return { Icon: CircleX, color: c.danger, label: state.message ? `Falha: ${state.message}` : 'Falha na conexão', spin: false };
  return { Icon: CircleDashed, color: c.textMuted, label: 'Conexão não testada', spin: false };
}

// REQ-14.03: catálogo de clusters/credenciais (FT-14) — leitura liberada pra qualquer papel
// autenticado, escrita (criar/editar/excluir) restrita a ADMIN.
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
  const [selectedClusterId, setSelectedClusterId] = useState<string | null>(null);
  const [editingCluster, setEditingCluster] = useState<MessagingCluster | 'new' | null>(null);
  const [deletingCluster, setDeletingCluster] = useState<MessagingCluster | null>(null);
  const [editingCredential, setEditingCredential] = useState<CredentialReference | 'new' | null>(null);
  const [deletingCredential, setDeletingCredential] = useState<CredentialReference | null>(null);
  const [connectionTests, setConnectionTests] = useState<Record<string, ConnectionTestState>>({});
  const [aiCredential, setAiCredential] = useState<AiCredentialStatus | null>(null);
  const [configuringAiCredential, setConfiguringAiCredential] = useState(false);
  const [removingAiCredential, setRemovingAiCredential] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clusterList, credentialList, aiStatus] = await Promise.all([
        listClusters(),
        listCredentials(),
        getAiCredentialStatus('GEMINI'),
      ]);
      setClusters(clusterList);
      setCredentials(credentialList);
      setAiCredential(aiStatus);
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
    () => clusters.filter((cl) => !search || cl.name.toLowerCase().includes(search.toLowerCase())),
    [clusters, search],
  );

  const expandedCluster = filteredClusters.find((cl) => cl.clusterId === selectedClusterId) ?? null;

  function toggleExpandCluster(clusterId: string) {
    setSelectedClusterId((current) => (current === clusterId ? null : clusterId));
  }

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

  async function confirmDeleteCluster() {
    if (!deletingCluster) return;
    const cluster = deletingCluster;
    setDeletingCluster(null);
    try {
      await deleteCluster(cluster.clusterId);
      await reload();
      showToast('Cluster excluído com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir cluster', 'error');
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

  async function confirmDeleteCredential() {
    if (!deletingCredential) return;
    const credential = deletingCredential;
    setDeletingCredential(null);
    try {
      await deleteCredential(credential.credentialId);
      await reload();
      showToast('Credencial excluída com sucesso.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao excluir credencial', 'error');
    }
  }

  async function handleTestConnection(credential: CredentialReference) {
    const { credentialId } = credential;
    setConnectionTests((prev) => ({ ...prev, [credentialId]: { status: 'testing' } }));
    try {
      const result = await testCredentialConnection(credentialId);
      setConnectionTests((prev) => ({
        ...prev,
        [credentialId]: { status: result.ok ? 'ok' : 'error', message: result.message },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao testar conexão';
      setConnectionTests((prev) => ({ ...prev, [credentialId]: { status: 'error', message } }));
    }
  }

  async function handleSaveAiCredential(apiKey: string) {
    const status = await saveAiCredential('GEMINI', apiKey);
    setAiCredential(status);
    setConfiguringAiCredential(false);
    showToast('Credencial de IA salva com sucesso.');
  }

  async function confirmRemoveAiCredential() {
    setRemovingAiCredential(false);
    try {
      await deleteAiCredential('GEMINI');
      setAiCredential({ configured: false, updatedAt: null });
      showToast('Credencial de IA removida.');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Erro ao remover credencial de IA', 'error');
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
        {canWrite && (
          <PrimaryButton onClick={() => setEditingCluster('new')}>
            <Plus size={14} /> Novo cluster
          </PrimaryButton>
        )}
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
        <ClustersTable
          clusters={filteredClusters}
          credentials={credentials}
          expandedId={selectedClusterId}
          canWrite={canWrite}
          connectionTests={connectionTests}
          onToggleExpand={toggleExpandCluster}
          onEdit={setEditingCluster}
          onDelete={setDeletingCluster}
          onNewCredential={(clusterId) => {
            setSelectedClusterId(clusterId);
            setEditingCredential('new');
          }}
          onEditCredential={setEditingCredential}
          onDeleteCredential={setDeletingCredential}
          onTestConnection={handleTestConnection}
        />
      )}

      <div
        className="flex items-center justify-between gap-3 mt-6 p-4 rounded-xl flex-wrap"
        style={{ border: `1px solid ${c.border}`, background: c.surface }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: c.accentSoft }}>
            <Sparkles size={16} color={c.accent} />
          </div>
          <div className="min-w-0">
            <div className="text-[13.5px] font-semibold" style={{ color: c.textPrimary }}>
              Credencial de IA — Gemini
            </div>
            <div className="text-[12px]" style={{ color: c.textSecondary }}>
              {aiCredential?.configured
                ? `Configurada${aiCredential.updatedAt ? ` · atualizada ${formatAiCredentialDate(aiCredential.updatedAt)}` : ''}`
                : 'Não configurada — a geração de fluxo por prompt (“Gerar com IA”) não funciona até configurar'}
            </div>
          </div>
        </div>
        {canWrite && (
          <div className="flex items-center gap-2 shrink-0">
            {aiCredential?.configured && <SecondaryButton onClick={() => setRemovingAiCredential(true)}>Remover</SecondaryButton>}
            <PrimaryButton onClick={() => setConfiguringAiCredential(true)}>
              {aiCredential?.configured ? 'Substituir chave' : 'Configurar chave'}
            </PrimaryButton>
          </div>
        )}
      </div>

      {editingCluster && (
        <ClusterFormModal
          cluster={editingCluster === 'new' ? null : editingCluster}
          onClose={() => setEditingCluster(null)}
          onSubmit={handleClusterSubmit}
        />
      )}
      {deletingCluster && (
        <ConfirmDialog
          title="Excluir cluster"
          message={(() => {
            const credentialCount = credentials.filter((cr) => cr.clusterId === deletingCluster.clusterId).length;
            const cascadeNote =
              credentialCount > 0
                ? ` As ${credentialCount} credencial${credentialCount === 1 ? '' : 'is'} associada${credentialCount === 1 ? '' : 's'} a ele também será${credentialCount === 1 ? '' : 'ão'} excluída${credentialCount === 1 ? '' : 's'}.`
                : '';
            return `Tem certeza que deseja excluir "${deletingCluster.name}"? Essa ação não pode ser desfeita.${cascadeNote} Não será possível se o cluster ou alguma dessas credenciais estiver associado a uma jornada publicada.`;
          })()}
          confirmLabel="Excluir"
          onConfirm={confirmDeleteCluster}
          onCancel={() => setDeletingCluster(null)}
        />
      )}

      {editingCredential && (
        <CredentialFormModal
          credential={editingCredential === 'new' ? null : editingCredential}
          clusters={clusters}
          defaultClusterId={expandedCluster?.clusterId}
          onClose={() => setEditingCredential(null)}
          onSubmit={handleCredentialSubmit}
        />
      )}
      {deletingCredential && (
        <ConfirmDialog
          title="Excluir credencial"
          message={`Tem certeza que deseja excluir "${deletingCredential.referenceName}"? Essa ação não pode ser desfeita. Não será possível se ela estiver associada a uma jornada publicada.`}
          confirmLabel="Excluir"
          onConfirm={confirmDeleteCredential}
          onCancel={() => setDeletingCredential(null)}
        />
      )}

      {configuringAiCredential && (
        <AiCredentialModal onClose={() => setConfiguringAiCredential(false)} onSubmit={handleSaveAiCredential} />
      )}
      {removingAiCredential && (
        <ConfirmDialog
          title="Remover credencial de IA"
          message="Tem certeza que deseja remover a chave de API do Gemini? A geração de fluxo por prompt para de funcionar até uma nova chave ser configurada."
          confirmLabel="Remover"
          onConfirm={confirmRemoveAiCredential}
          onCancel={() => setRemovingAiCredential(false)}
        />
      )}
    </div>
  );
}

function formatAiCredentialDate(iso: string): string {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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
            ? 'Ajuste a busca para encontrar o que procura.'
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
  credentials,
  expandedId,
  canWrite,
  connectionTests,
  onToggleExpand,
  onEdit,
  onDelete,
  onNewCredential,
  onEditCredential,
  onDeleteCredential,
  onTestConnection,
}: {
  clusters: MessagingCluster[];
  credentials: CredentialReference[];
  expandedId: string | null;
  canWrite: boolean;
  connectionTests: Record<string, ConnectionTestState>;
  onToggleExpand: (clusterId: string) => void;
  onEdit: (cl: MessagingCluster) => void;
  onDelete: (cl: MessagingCluster) => void;
  onNewCredential: (clusterId: string) => void;
  onEditCredential: (cr: CredentialReference) => void;
  onDeleteCredential: (cr: CredentialReference) => void;
  onTestConnection: (cr: CredentialReference) => void;
}) {
  const { colors: c } = useAppTheme();
  return (
    <div className="rounded-xl overflow-hidden" style={{ border: `1px solid ${c.border}`, background: c.surface }}>
      <div
        className="grid items-center px-4"
        style={{ gridTemplateColumns: CATALOG_GRID_COLS, minHeight: 34, borderBottom: `1px solid ${c.border}` }}
      >
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em] py-2" style={{ color: c.textMuted }}>
          Cluster
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
          Tipo
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
          Endereço
        </span>
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.04em]" style={{ color: c.textMuted }}>
          Ações
        </span>
      </div>
      {clusters.map((cl, i) => {
        const expanded = cl.clusterId === expandedId;
        const isLast = i === clusters.length - 1;
        const clusterCredentials = credentials.filter((cr) => cr.clusterId === cl.clusterId);
        return (
          <div key={cl.clusterId}>
            <ClusterRow
              cluster={cl}
              expanded={expanded}
              isLast={isLast}
              credentialCount={clusterCredentials.length}
              canWrite={canWrite}
              onToggle={() => onToggleExpand(cl.clusterId)}
              onEdit={onEdit}
              onDelete={onDelete}
              onNewCredential={onNewCredential}
            />
            {expanded && clusterCredentials.length === 0 && (
              <div className="pl-[46px] pr-4 py-3" style={{ borderBottom: isLast ? 'none' : `1px solid ${c.border}` }}>
                <span className="text-[12px] italic" style={{ color: c.textMuted }}>
                  Nenhuma credencial cadastrada para este cluster.
                </span>
              </div>
            )}
            {expanded &&
              clusterCredentials.map((cr, j) => (
                <CredentialLeafRow
                  key={cr.credentialId}
                  credential={cr}
                  isLast={isLast && j === clusterCredentials.length - 1}
                  canWrite={canWrite}
                  connectionState={connectionTests[cr.credentialId] ?? IDLE_CONNECTION_TEST}
                  onTest={() => onTestConnection(cr)}
                  onEdit={() => onEditCredential(cr)}
                  onDelete={() => onDeleteCredential(cr)}
                />
              ))}
          </div>
        );
      })}
    </div>
  );
}

function ClusterRow({
  cluster,
  expanded,
  isLast,
  credentialCount,
  canWrite,
  onToggle,
  onEdit,
  onDelete,
  onNewCredential,
}: {
  cluster: MessagingCluster;
  expanded: boolean;
  isLast: boolean;
  credentialCount: number;
  canWrite: boolean;
  onToggle: () => void;
  onEdit: (cl: MessagingCluster) => void;
  onDelete: (cl: MessagingCluster) => void;
  onNewCredential: (clusterId: string) => void;
}) {
  const { colors: c } = useAppTheme();
  const TypeIcon = CLUSTER_TYPE_ICON[cluster.type];
  return (
    <div
      className="grid items-center px-4 cursor-pointer"
      style={{
        gridTemplateColumns: CATALOG_GRID_COLS,
        minHeight: 44,
        background: c.chipBg,
        borderBottom: isLast && !expanded ? 'none' : `1px solid ${c.border}`,
      }}
      onClick={onToggle}
    >
      <div className="flex items-center gap-[8px] min-w-0 py-2">
        <ChevronDown
          size={13}
          className="shrink-0 transition-transform"
          style={{ color: c.textMuted, transform: expanded ? 'none' : 'rotate(-90deg)' }}
        />
        <span className="text-[13px] font-semibold truncate" style={{ color: c.textPrimary }}>
          {cluster.name}
        </span>
        <span className="text-[11px] shrink-0" style={{ color: c.textMuted }}>
          · {credentialCount} credencial{credentialCount === 1 ? '' : 'is'}
        </span>
      </div>
      <span className="flex items-center gap-[6px] text-[11.5px] font-semibold" style={{ color: c.textPrimary }}>
        <TypeIcon size={14} className="shrink-0" />
        {CLUSTER_TYPE_LABEL[cluster.type]}
      </span>
      <span className="truncate text-[11.5px] font-mono" style={{ color: c.textSecondary }} title={cluster.connectionAddress}>
        {cluster.connectionAddress}
      </span>
      <div onClick={(e) => e.stopPropagation()}>
        {canWrite && (
          <ActionsMenu
            label="Ações do cluster"
            actions={[
              { icon: Pencil, label: 'Editar', onClick: () => onEdit(cluster) },
              { icon: Plus, label: 'Nova credencial', onClick: () => onNewCredential(cluster.clusterId) },
              { icon: Trash2, label: 'Excluir', onClick: () => onDelete(cluster), variant: 'danger' },
            ]}
          />
        )}
      </div>
    </div>
  );
}

function CredentialLeafRow({
  credential,
  isLast,
  canWrite,
  connectionState,
  onTest,
  onEdit,
  onDelete,
}: {
  credential: CredentialReference;
  isLast: boolean;
  canWrite: boolean;
  connectionState: ConnectionTestState;
  onTest: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const { colors: c } = useAppTheme();
  const meta = connectionMeta(connectionState, c);
  return (
    <div
      className="grid items-center px-4"
      style={{ gridTemplateColumns: CATALOG_GRID_COLS, minHeight: 34, borderBottom: isLast ? 'none' : `1px solid ${c.border}` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = c.hoverBg)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      <div className="flex items-start gap-2 min-w-0 py-[6px] pl-[30px]">
        <KeyRound size={12} className="shrink-0 mt-[2px]" style={{ color: c.textMuted }} />
        <div className="min-w-0">
          <div className="text-[12px] leading-[16px] font-medium truncate" style={{ color: c.textSecondary }}>
            {credential.referenceName}
          </div>
          <div
            className="text-[11px] truncate mt-px"
            style={{ color: c.textMuted }}
            title={`${credential.keyVaultUri} · ${credential.secretName}`}
          >
            {credential.keyVaultUri} · {credential.secretName}
          </div>
          <div className="flex items-center gap-[4px] text-[11px] mt-[2px]" style={{ color: meta.color }} title={connectionState.message}>
            <meta.Icon size={10} className={meta.spin ? 'shrink-0 animate-spin' : 'shrink-0'} />
            {meta.label}
            <button
              type="button"
              onClick={onTest}
              disabled={connectionState.status === 'testing'}
              title="Testar conexão"
              className="inline-flex items-center justify-center rounded-full border-0 bg-transparent cursor-pointer disabled:cursor-not-allowed"
              style={{ width: 16, height: 16, color: c.textMuted }}
            >
              <RefreshCw size={10} />
            </button>
          </div>
        </div>
      </div>
      <span className="text-[11px]" style={{ color: c.textMuted }}>
        —
      </span>
      <span className="text-[11px]" style={{ color: c.textMuted }}>
        —
      </span>
      <div>
        {canWrite && (
          <ActionsMenu
            label="Ações da credencial"
            actions={[
              { icon: Pencil, label: 'Editar', onClick: onEdit },
              { icon: Trash2, label: 'Excluir', onClick: onDelete, variant: 'danger' },
            ]}
          />
        )}
      </div>
    </div>
  );
}
