import { useCallback, useEffect, useRef, useState } from 'react';
import { Route } from 'lucide-react';
import { Text, skinVars } from '@telefonica/mistica';
import { ExecutionToolbar } from './ExecutionToolbar';
import { StartPanel } from './StartPanel';
import { ExecutionWorkspace } from './ExecutionWorkspace';
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
}

interface Props {
  active: boolean;
}

export function ExecutionsPage({ active }: Props) {
  return (
    <ToastProvider>
      <ExecutionsPageContent active={active} />
    </ToastProvider>
  );
}

function ExecutionsPageContent({ active }: Props) {
  const { showToast } = useToast();
  const [journeys, setJourneys] = useState<JourneySummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<JourneySummary | null>(null);
  const [running, setRunning] = useState<RunningExecution | null>(null);
  const [stopping, setStopping] = useState(false);
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

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <ExecutionToolbar
        journeys={journeys}
        loadError={loadError}
        query={query}
        onQueryChange={handleQueryChange}
        selected={selected}
        onSelect={handleSelect}
        running={running?.journey ?? null}
        onStop={handleStop}
        stopping={stopping}
      />
      {running ? (
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
        <EmptyState />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex-1 min-h-0 flex flex-col items-center justify-center gap-4 px-6">
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center"
        style={{ background: skinVars.colors.backgroundAlternative }}
      >
        <Route size={20} color={skinVars.colors.textSecondary} />
      </div>
      <div className="flex flex-col items-center gap-2 max-w-[460px] text-center">
        <Text size={16} weight="bold" color={skinVars.colors.textPrimary} textAlign="center">
          Aviso importante
        </Text>
        <Text size={13.5} color={skinVars.colors.textSecondary} textAlign="center">
          Busque uma jornada <strong style={{ color: skinVars.colors.textPrimary }}>PUBLICADA</strong> acima. Ao
          executá-la, uma instância do processo é iniciada na engine de runtime e executada tarefa
          por tarefa, sendo possível interagir com tarefas de usuário, tarefas síncronas e
          assíncronas — esta funcionalidade é ideal para simular como se a jornada estivesse sendo
          executada no canal digital (app, site etc.) e é ideal para analisar seu comportamento e
          identificar possíveis ausências de configurações de tarefas e variáveis.
        </Text>
      </div>
    </div>
  );
}
