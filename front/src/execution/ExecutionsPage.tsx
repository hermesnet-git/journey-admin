import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { History, Route } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import { ExecutionToolbar, type ExecutionMode } from './ExecutionToolbar';
import { StartPanel } from './StartPanel';
import { ExecutionWorkspace } from './ExecutionWorkspace';
import { HistoryWorkspace, STATE_LABEL } from './HistoryWorkspace';
import {
  apiCallLogData,
  formatApiCallLog,
  getInstanceHistory,
  now,
  searchInstanceHistory,
  setApiCallLogger,
  shouldLogApiCall,
  stopInstance,
  type ApiCallLogEntry,
  type FlowBundle,
  type HistoricInstanceSummary,
  type InstanceHistoryResponse,
  type InstanceResponse,
  type JourneySummary,
  type StepResponse,
} from './api';
import type { LogEntry } from './InspectorPanel';
import { listJourneys as listPublishedJourneys } from '../api/journeys';
import { ToastProvider, useToast } from '../products/Toast';

const QUICK_LIST_LIMIT = 8;

interface RunningExecution {
  processInstanceId: string;
  businessKey: string;
  journey: JourneySummary;
  flow: FlowBundle;
  step: StepResponse;
  manualKafkaControl: boolean;
}

interface Props {
  active: boolean;
  // Setado só nas abas dedicadas abertas a partir do card "Execuções recentes" do Dashboard — a
  // página já nasce em modo Histórico mostrando esta instância, em vez da busca vazia.
  initialHistoryInstanceId?: string;
}

export function ExecutionsPage({ active, initialHistoryInstanceId }: Props) {
  return (
    <ToastProvider>
      <ExecutionsPageContent active={active} initialHistoryInstanceId={initialHistoryInstanceId} />
    </ToastProvider>
  );
}

function ExecutionsPageContent({ active, initialHistoryInstanceId }: Props) {
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<JourneySummary | null>(null);
  const [running, setRunning] = useState<RunningExecution | null>(null);
  const [stopping, setStopping] = useState(false);

  const [mode, setMode] = useState<ExecutionMode>(initialHistoryInstanceId ? 'history' : 'live');
  const [historyQuery, setHistoryQuery] = useState('');
  const [historyOnlyFinished, setHistoryOnlyFinished] = useState(false);
  const [historyResults, setHistoryResults] = useState<HistoricInstanceSummary[] | null>(null);
  const [historyLoadError, setHistoryLoadError] = useState<string | null>(null);
  // Id em busca no momento (lista→detalhe ou abertura direta vinda do Dashboard) — null quando não
  // há nada carregando nem carregado, o que faz a tela cair de volta na busca/lista.
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);
  const [historyDetail, setHistoryDetail] = useState<InstanceHistoryResponse | null>(null);
  const [historyDetailError, setHistoryDetailError] = useState<string | null>(null);
  // Chamadas feitas antes de existir uma instância pra chamar de "running" (getJourneyFlow ao
  // selecionar, startInstance/sendTestMessage ao executar) — sem log próprio ainda pra guardá-las, a
  // aba Log do ExecutionWorkspace só nasce quando `running` é setado, então acumula aqui até lá.
  const preStartLogRef = useRef<LogEntry[]>([]);
  // Enquanto uma execução está de pé, ExecutionWorkspace assume o registro (ver
  // handleApiCallHandlerChange abaixo) — este ref é como ele "se anuncia" sem que este componente
  // precise chamar setApiCallLogger de novo pra trocar de dono.
  const liveLoggerRef = useRef<((entry: ApiCallLogEntry) => void) | null>(null);

  useEffect(() => {
    // A aba de Execuções fica montada mesmo quando não está visível (ver App.tsx), então precisa
    // refazer a busca toda vez que volta a ficar ativa — senão jornada recém incluída/alterada/
    // publicada em outra aba não aparece sem dar refresh na página.
    if (!active || running) return;
    listPublishedJourneys({ status: 'PUBLISHED' })
      .then(setJourneys)
      .catch((e) => setLoadError(e instanceof Error ? e.message : 'Erro ao carregar jornadas.'));
  }, [active, running]);

  // Único registro de setApiCallLogger pra vida inteira da página (nunca trocado) — é o que garante
  // que toda chamada que StartPanel/ExecutionToolbar/ExecutionWorkspace fizerem, em qualquer fase,
  // seja vista por alguém. Repassa pro handler ao vivo de ExecutionWorkspace quando ele existe
  // (liveLoggerRef, setado via onApiCallHandlerChange abaixo); senão acumula em preStartLogRef, pra
  // a aba Log poder abrir já mostrando o pedido que de fato deu origem à execução. Registrar e
  // trocar entre os dois donos via um único efeito (em vez de cada componente chamar
  // setApiCallLogger na sua própria montagem/desmontagem) evita a corrida onde o cleanup de um
  // efeito derruba o registro que o outro acabou de fazer no mesmo commit.
  useEffect(() => {
    setApiCallLogger((entry) => {
      if (liveLoggerRef.current) {
        liveLoggerRef.current(entry);
        return;
      }
      if (!shouldLogApiCall(entry)) return;
      const { message, isError } = formatApiCallLog(entry);
      preStartLogRef.current = [
        ...preStartLogRef.current,
        { id: `pre-${preStartLogRef.current.length}`, time: now(), message, data: apiCallLogData(entry), isError },
      ];
    });
    return () => setApiCallLogger(null);
  }, []);

  const handleApiCallHandlerChange = useCallback((handler: ((entry: ApiCallLogEntry) => void) | null) => {
    liveLoggerRef.current = handler;
  }, []);

  function handleSelect(journey: JourneySummary) {
    preStartLogRef.current = [];
    setQuery(journey.name);
    setSelected(journey);
  }

  function handleQueryChange(value: string) {
    setQuery(value);
    if (selected && value !== selected.name) setSelected(null);
  }

  function handleStarted(instance: InstanceResponse) {
    if (!selected) return;
    setRunning({
      processInstanceId: instance.processInstanceId,
      businessKey: instance.businessKey,
      journey: selected,
      flow: instance.flow,
      step: instance.step,
      manualKafkaControl: instance.manualKafkaControl,
    });
  }

  useEffect(() => {
    // Recarrega ao entrar em modo Histórico ou trocar o filtro "só concluídas" — a busca por texto
    // (jornada/business key) é só um filtro em cima desse resultado, feito no próprio ExecutionToolbar
    // (mesmo padrão da busca de jornada do modo Ao vivo, que também filtra em cima de uma lista já
    // carregada em vez de bater no backend a cada tecla). Não recarrega enquanto um detalhe está
    // carregando/carregado — nesse momento a lista de fundo não importa pro que está na tela.
    if (mode !== 'history' || historyLoadingId || historyDetail) return;
    searchInstanceHistory({ finished: historyOnlyFinished || undefined })
      .then(setHistoryResults)
      .catch((e) => setHistoryLoadError(e instanceof Error ? e.message : 'Erro ao buscar histórico.'));
  }, [mode, historyOnlyFinished, historyLoadingId, historyDetail]);

  const openHistoryDetail = useCallback((processInstanceId: string) => {
    setHistoryLoadingId(processInstanceId);
    setHistoryDetail(null);
    setHistoryDetailError(null);
    getInstanceHistory(processInstanceId)
      .then((detail) => {
        setHistoryDetail(detail);
        setHistoryLoadingId(null);
      })
      .catch((e) => {
        setHistoryDetailError(e instanceof Error ? e.message : 'Erro ao carregar o histórico desta instância.');
        setHistoryLoadingId(null);
      });
  }, []);

  // Abas dedicadas vindas do Dashboard já nascem apontando pra uma instância — só dispara uma vez,
  // no mount desta aba específica (cada aba dedicada é uma montagem nova de ExecutionsPageContent,
  // ver App.tsx: chave por processInstanceId).
  useEffect(() => {
    if (initialHistoryInstanceId) openHistoryDetail(initialHistoryInstanceId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSelectHistoryInstance(instance: HistoricInstanceSummary) {
    openHistoryDetail(instance.id);
  }

  function handleHistoryBack() {
    setHistoryLoadingId(null);
    setHistoryDetail(null);
    setHistoryDetailError(null);
  }

  async function handleStop() {
    if (!running) return;
    setStopping(true);
    try {
      await stopInstance(running.processInstanceId);
    } catch {
      // A instância pode já ter terminado sozinha nesse meio-tempo, ou o motor pode estar fora do
      // ar — nenhum dos dois deveria travar o usuário na tela: ele já pediu pra sair.
      showToast('Execução encerrada na tela, mas não foi possível confirmar o encerramento no motor.', 'error');
    } finally {
      setStopping(false);
      setRunning(null);
      setSelected(null);
      setQuery('');
      preStartLogRef.current = [];
    }
  }

  // Só alimenta o "pill" travado da toolbar (mostra journeyName/businessKey) — construído a partir
  // do detalhe já carregado, ou de um rótulo provisório enquanto ainda carrega (abertura direta por
  // id vinda do Dashboard não tem esses campos até a resposta chegar).
  const historySelected: HistoricInstanceSummary | null = historyDetail
    ? {
        id: historyDetail.processInstanceId,
        businessKey: historyDetail.businessKey,
        journeyName: historyDetail.journeyName,
        startTime: historyDetail.startTime,
        endTime: historyDetail.endTime,
        durationMillis: historyDetail.durationMillis,
        state: historyDetail.state,
      }
    : historyLoadingId
      ? { id: historyLoadingId, businessKey: '', journeyName: 'Carregando…', startTime: '', endTime: null, durationMillis: null, state: '' }
      : null;

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ExecutionToolbar
        mode={mode}
        onModeChange={setMode}
        journeys={journeys}
        loadError={loadError}
        query={query}
        onQueryChange={handleQueryChange}
        selected={selected}
        onSelect={handleSelect}
        running={running?.journey ?? null}
        onStop={handleStop}
        stopping={stopping}
        historyQuery={historyQuery}
        onHistoryQueryChange={setHistoryQuery}
        historyResults={historyResults}
        historyLoadError={historyLoadError}
        historyOnlyFinished={historyOnlyFinished}
        onHistoryOnlyFinishedChange={setHistoryOnlyFinished}
        onSelectHistoryInstance={handleSelectHistoryInstance}
        historySelected={historySelected}
        onHistoryBack={handleHistoryBack}
      />
      {mode === 'live' ? (
        running ? (
          <ExecutionWorkspace
            processInstanceId={running.processInstanceId}
            businessKey={running.businessKey}
            journey={running.journey}
            flow={running.flow}
            initialStep={running.step}
            manualKafkaControl={running.manualKafkaControl}
            initialApiLog={preStartLogRef.current}
            onApiCallHandlerChange={handleApiCallHandlerChange}
          />
        ) : selected ? (
          <StartPanel key={selected.journeyId} journey={selected} onStarted={handleStarted} />
        ) : (
          <EmptyState journeys={journeys} loadError={loadError} onSelect={handleSelect} />
        )
      ) : historyDetailError ? (
        <HistoryErrorState message={historyDetailError} />
      ) : historyDetail ? (
        <HistoryWorkspace key={historyDetail.processInstanceId} history={historyDetail} />
      ) : historyLoadingId ? (
        <HistorySkeleton />
      ) : (
        <HistoryEmptyState results={historyResults} loadError={historyLoadError} onSelect={handleSelectHistoryInstance} />
      )}
    </div>
  );
}

// Cabeçalho compacto compartilhado pelos dois estados iniciais — ícone + título curto + uma linha
// de instrução, nunca mais que isso: o resto da tela é a lista real abaixo, não texto explicando a
// lista que podia simplesmente estar ali.
function StartHeader({ icon: Icon, title, hint }: { icon: typeof Route; title: string; hint: string }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div
        className="w-9 h-9 shrink-0 rounded-full flex items-center justify-center"
        style={{ background: skinVars.colors.backgroundAlternative }}
      >
        <Icon size={16} color={skinVars.colors.textSecondary} />
      </div>
      <div>
        <Text size={15} weight="bold" color={skinVars.colors.textPrimary}>
          {title}
        </Text>
        <Text size={12.5} color={skinVars.colors.textSecondary}>
          {hint}
        </Text>
      </div>
    </div>
  );
}

function QuickListRow({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <tr
      onClick={onClick}
      className="cursor-pointer"
      style={{ borderTop: `1px solid ${skinVars.colors.border}` }}
      onMouseEnter={(e) => (e.currentTarget.style.background = skinVars.colors.backgroundAlternative)}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {children}
    </tr>
  );
}

function QuickListSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="h-[42px] rounded-lg animate-pulse" style={{ background: skinVars.colors.backgroundAlternative }} />
      ))}
    </div>
  );
}

function EmptyState({
  journeys,
  loadError,
  onSelect,
}: {
  journeys: JourneySummary[] | null;
  loadError: string | null;
  onSelect: (journey: JourneySummary) => void;
}) {
  const visible = journeys?.slice(0, QUICK_LIST_LIMIT) ?? [];
  return (
    <div className="flex-1 min-h-0 overflow-auto flex justify-center px-6 py-10">
      <div className="w-full max-w-[640px]">
        <StartHeader icon={Route} title="Executar uma jornada" hint="Escolha uma jornada publicada abaixo, ou busque pelo nome acima." />
        {loadError ? (
          <Text size={13} color={skinVars.colors.error}>
            {loadError}
          </Text>
        ) : journeys === null ? (
          <QuickListSkeleton />
        ) : visible.length === 0 ? (
          <Text size={13} color={skinVars.colors.textSecondary}>
            Nenhuma jornada publicada ainda.
          </Text>
        ) : (
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <tbody>
              {visible.map((journey) => (
                <QuickListRow key={journey.journeyId} onClick={() => onSelect(journey)}>
                  <td className="py-[10px] pr-3 min-w-0">
                    <Text size={13} weight="medium" color={skinVars.colors.textPrimary} truncate>
                      {journey.name}
                    </Text>
                  </td>
                  <td className="py-[10px] text-right shrink-0">
                    <Text size={11.5} color={skinVars.colors.textSecondary}>
                      {journey.productName} · {journey.channelName}
                      {journey.publishedVersionNumber != null && ` · v${journey.publishedVersionNumber}`}
                    </Text>
                  </td>
                </QuickListRow>
              ))}
            </tbody>
          </table>
        )}
        {journeys && journeys.length > QUICK_LIST_LIMIT && (
          <Text size={11.5} color={skinVars.colors.textSecondary}>
            +{journeys.length - QUICK_LIST_LIMIT} outras — use a busca acima para encontrar uma delas.
          </Text>
        )}
      </div>
    </div>
  );
}

const HISTORY_STATE_TONE: Record<string, string> = {
  ACTIVE: skinVars.colors.brand,
  COMPLETED: skinVars.colors.success,
};

function HistoryStateTag({ state }: { state: string }) {
  const color = HISTORY_STATE_TONE[state] ?? skinVars.colors.textSecondary;
  return (
    <Text size={11} weight="medium" color={color}>
      {STATE_LABEL[state] ?? state}
    </Text>
  );
}

function HistoryEmptyState({
  results,
  loadError,
  onSelect,
}: {
  results: HistoricInstanceSummary[] | null;
  loadError: string | null;
  onSelect: (instance: HistoricInstanceSummary) => void;
}) {
  const visible = results?.slice(0, QUICK_LIST_LIMIT) ?? [];
  return (
    <div className="flex-1 min-h-0 overflow-auto flex justify-center px-6 py-10">
      <div className="w-full max-w-[640px]">
        <StartHeader icon={History} title="Diagnosticar uma execução" hint="Escolha uma execução recente abaixo, ou busque por jornada/business key acima." />
        {loadError ? (
          <Text size={13} color={skinVars.colors.error}>
            {loadError}
          </Text>
        ) : results === null ? (
          <QuickListSkeleton />
        ) : visible.length === 0 ? (
          <Text size={13} color={skinVars.colors.textSecondary}>
            Nenhuma execução encontrada ainda.
          </Text>
        ) : (
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <tbody>
              {visible.map((instance) => (
                <QuickListRow key={instance.id} onClick={() => onSelect(instance)}>
                  <td className="py-[10px] pr-3 min-w-0">
                    <Text size={13} weight="medium" color={skinVars.colors.textPrimary} truncate>
                      {instance.journeyName}
                    </Text>
                    <Text size={11} color={skinVars.colors.textSecondary} truncate>
                      {instance.businessKey}
                    </Text>
                  </td>
                  <td className="py-[10px] pr-3 text-right shrink-0">
                    <HistoryStateTag state={instance.state} />
                  </td>
                  <td className="py-[10px] text-right shrink-0 w-[90px]">
                    <Text size={11} color={skinVars.colors.textSecondary}>
                      {timeAgo(instance.startTime)}
                    </Text>
                  </td>
                </QuickListRow>
              ))}
            </tbody>
          </table>
        )}
        {results && results.length > QUICK_LIST_LIMIT && (
          <Text size={11.5} color={skinVars.colors.textSecondary}>
            +{results.length - QUICK_LIST_LIMIT} outras — use a busca acima para encontrar uma delas.
          </Text>
        )}
      </div>
    </div>
  );
}

// Único uso restante é historyDetailError — mantém o próprio erro visível (cor de erro), não texto
// neutro, já que "algo deu errado" e "nada aqui ainda" pedem tratamentos visuais diferentes.
function HistoryErrorState({ message }: { message: string }) {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-2 px-6">
      <Text size={13.5} color={skinVars.colors.error} textAlign="center">
        {message}
      </Text>
    </div>
  );
}

// Enquanto getInstanceHistory resolve — mesma ideia dos "skeleton states" já usados no Dashboard,
// não um texto solto de "Carregando..." no meio da tela vazia.
function HistorySkeleton() {
  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-[72px] shrink-0 animate-pulse" style={{ background: skinVars.colors.backgroundAlternative }} />
      <div className="flex-1 min-h-0 p-6">
        <div className="h-full rounded-lg animate-pulse" style={{ background: skinVars.colors.backgroundAlternative }} />
      </div>
    </div>
  );
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'agora mesmo';
  if (diffMin < 60) return `há ${diffMin} min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} h`;
  return `há ${Math.floor(diffH / 24)} d`;
}
