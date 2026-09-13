import { useCallback, useEffect, useRef, useState } from 'react';
import { PlayCircle, Search } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import { ExecutionToolbar, JourneySearchBox } from './ExecutionToolbar';
import { StartPanel } from './StartPanel';
import { ExecutionWorkspace } from './ExecutionWorkspace';
import { ResumeExecutionBox } from './ResumeExecutionBox';
import {
  apiCallLogData,
  formatApiCallLog,
  now,
  setApiCallLogger,
  shouldLogApiCall,
  stopInstance,
  type ApiCallLogEntry,
  type FlowBundle,
  type InstanceResponse,
  type JourneySummary,
  type ResumeInstanceResponse,
  type StepResponse,
} from './api';
import type { LogEntry } from './InspectorPanel';
import { listJourneys as listPublishedJourneys } from '../api/journeys';
import { ToastProvider, useToast } from '../products/Toast';

interface RunningExecution {
  processInstanceId: string;
  businessKey: string;
  journey: JourneySummary;
  flow: FlowBundle;
  step: StepResponse;
  manualKafkaControl: boolean;
  // Canal escolhido pelo usuário no StartPanel (REQ-05.07.003) — ausente só quando a instância
  // nasceu por mensagem (sem seletor); a prévia cai de volta pro primeiro canal da jornada nesse caso.
  channelType?: string;
}

interface Props {
  active: boolean;
  // Setado só nas abas dedicadas abertas via "Executar jornada" no grid de Jornadas — a página já
  // nasce com essa jornada selecionada (StartPanel visível), em vez da busca em branco.
  initialJourney?: JourneySummary;
}

export function ExecutionsPage({ active, initialJourney }: Props) {
  return (
    <ToastProvider>
      <ExecutionsPageContent active={active} initialJourney={initialJourney} />
    </ToastProvider>
  );
}

function ExecutionsPageContent({ active, initialJourney }: Props) {
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState(initialJourney?.name ?? '');
  const [selected, setSelected] = useState<JourneySummary | null>(initialJourney ?? null);
  const [running, setRunning] = useState<RunningExecution | null>(null);
  const [stopping, setStopping] = useState(false);
  // Estado do passo atual mora em ExecutionWorkspace (via onStepChange) — precisa dele aqui só pra
  // saber quando a jornada chegou em ENDED e trocar "Parar execução" pelos botões de conclusão.
  const [currentStep, setCurrentStep] = useState<StepResponse | null>(null);
  const isEnded = currentStep?.type === 'ENDED';
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

  function handleStarted(instance: InstanceResponse, channelType?: string) {
    if (!selected) return;
    setRunning({
      processInstanceId: instance.processInstanceId,
      businessKey: instance.businessKey,
      journey: selected,
      flow: instance.flow,
      step: instance.step,
      manualKafkaControl: instance.manualKafkaControl,
      channelType,
    });
  }

  // Jornada só é conhecida pelo id/nome que o backend devolveu junto da instância retomada — a
  // lista já carregada de jornadas publicadas cobre o caso comum (mesmo objeto que a busca por
  // nome usaria); sem ela (ex.: jornada despublicada nesse meio-tempo), monta um resumo mínimo só
  // com o suficiente pro cabeçalho da execução funcionar.
  function handleResumed(response: ResumeInstanceResponse) {
    const journey: JourneySummary = journeys?.find((j) => j.journeyId === response.journeyId) ?? {
      journeyId: response.journeyId,
      name: response.journeyName,
      description: null,
      productName: '',
      channelTypes: response.channel ? [response.channel] : [],
      publishedVersionNumber: null,
    };
    setSelected(journey);
    setQuery(journey.name);
    setRunning({
      processInstanceId: response.instance.processInstanceId,
      businessKey: response.instance.businessKey,
      journey,
      flow: response.instance.flow,
      step: response.instance.step,
      manualKafkaControl: response.instance.manualKafkaControl,
      channelType: response.channel ?? undefined,
    });
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
      setCurrentStep(null);
      setSelected(null);
      setQuery('');
      preStartLogRef.current = [];
    }
  }

  // Jornada já concluída (ENDED) — nada pra encerrar no motor, só voltar pra tela de início. Sem
  // chamar stopInstance: é exatamente o cenário que fazia handleStop cair no catch acima.
  function handleRestart() {
    if (!running) return;
    setSelected(running.journey);
    setQuery(running.journey.name);
    setRunning(null);
    setCurrentStep(null);
    preStartLogRef.current = [];
  }

  function handleChooseNew() {
    setRunning(null);
    setCurrentStep(null);
    setSelected(null);
    setQuery('');
    preStartLogRef.current = [];
  }

  if (!running) {
    return (
      <SetupState
        journeys={journeys}
        loadError={loadError}
        query={query}
        onQueryChange={handleQueryChange}
        selected={selected}
        onSelect={handleSelect}
        onStarted={handleStarted}
        onResumed={handleResumed}
      />
    );
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ExecutionToolbar
        journeys={journeys}
        loadError={loadError}
        query={query}
        onQueryChange={handleQueryChange}
        selected={selected}
        onSelect={handleSelect}
        running={running.journey}
        isEnded={isEnded}
        onStop={handleStop}
        stopping={stopping}
        onRestart={handleRestart}
        onChooseNew={handleChooseNew}
      />
      <ExecutionWorkspace
        processInstanceId={running.processInstanceId}
        businessKey={running.businessKey}
        journey={running.journey}
        flow={running.flow}
        initialStep={running.step}
        manualKafkaControl={running.manualKafkaControl}
        channelType={running.channelType}
        initialApiLog={preStartLogRef.current}
        onApiCallHandlerChange={handleApiCallHandlerChange}
        onStepChange={setCurrentStep}
      />
    </div>
  );
}

// Mesmo padrão visual da tela inicial do Diagnóstico (cabeçalho com ícone + card de busca + caixa
// tracejada) — cobre toda a configuração da execução (busca da jornada e o StartPanel depois de
// escolhida). Só dá lugar ao toolbar compacto quando a execução de fato começa (ver `running` no
// return acima) — antes disso não há por que trocar de layout.
function SetupState({
  journeys,
  loadError,
  query,
  onQueryChange,
  selected,
  onSelect,
  onStarted,
  onResumed,
}: {
  journeys: JourneySummary[] | null;
  loadError: string | null;
  query: string;
  onQueryChange: (value: string) => void;
  selected: JourneySummary | null;
  onSelect: (journey: JourneySummary) => void;
  onStarted: (instance: InstanceResponse) => void;
  onResumed: (response: ResumeInstanceResponse) => void;
}) {
  return (
    <div className="flex-1 min-h-0 overflow-auto p-[32px_40px] box-border">
      <div className="mb-6 flex items-start gap-4 flex-wrap">
        <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: skinVars.colors.brand }}>
          <PlayCircle size={24} color="#fff" strokeWidth={2} />
        </div>
        <div>
          <h1 className="m-0 mb-1 text-[22px] font-semibold tracking-[-0.02em]" style={{ color: skinVars.colors.textPrimary }}>
            Execução
          </h1>
          <p className="m-0 text-[13.5px] max-w-[640px]" style={{ color: skinVars.colors.textSecondary }}>
            Execute manualmente uma jornada publicada e acompanhe cada etapa em tempo real.
          </p>
        </div>
      </div>

      <div
        className="rounded-xl p-3 mb-6"
        style={{ border: `1px solid ${skinVars.colors.border}`, background: skinVars.colors.backgroundContainer }}
      >
        <div className="max-w-[420px]">
          <JourneySearchBox journeys={journeys} loadError={loadError} query={query} onQueryChange={onQueryChange} selected={selected} onSelect={onSelect} />
        </div>

        <div className="flex items-center gap-3 my-3 max-w-[420px]">
          <div className="flex-1 h-px" style={{ background: skinVars.colors.border }} />
          <Text size={11} color={skinVars.colors.textSecondary}>
            ou
          </Text>
          <div className="flex-1 h-px" style={{ background: skinVars.colors.border }} />
        </div>

        <ResumeExecutionBox onResumed={onResumed} />
      </div>

      {selected ? (
        <StartPanel key={selected.journeyId} journey={selected} onStarted={onStarted} />
      ) : (
        <div
          className="rounded-xl flex flex-col items-center justify-center gap-2 py-16 px-6 text-center"
          style={{ border: `1px dashed ${skinVars.colors.border}` }}
        >
          <Search size={20} color={skinVars.colors.textSecondary} />
          <Text size={13.5} weight="medium" color={skinVars.colors.textPrimary}>
            Busque uma jornada para executar
          </Text>
          <Text size={12} color={skinVars.colors.textSecondary}>
            Digite o nome de uma jornada publicada na busca acima.
          </Text>
        </div>
      )}
      {loadError && (
        <Text size={13} color={skinVars.colors.error}>
          {loadError}
        </Text>
      )}
    </div>
  );
}
