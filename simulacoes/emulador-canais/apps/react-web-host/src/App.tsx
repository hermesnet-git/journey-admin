import { useEffect, useMemo, useState } from 'react';
import { ButtonPrimary, ButtonSecondary, Stack, Text, Title1, ThemeContextProvider, getSkinByName } from '@telefonica/mistica';
import { JourneyClient, JourneyClientError, type FlowBundle, type JourneyInstance, type JourneyStep, type StartVariableDefinition } from '@elastic-journey/journey-client';
import { parseSduiDocument } from '@elastic-journey/sdui-contract';
import { createSduiRuntime } from '@elastic-journey/sdui-runtime';
import { SduiRenderer, type RendererDiagnostic } from '@elastic-journey/renderer-react-web-mistica';

const BFF_URL = import.meta.env.VITE_EMULATOR_BFF_URL ?? 'http://127.0.0.1:18085/api/v1';
const client = new JourneyClient({ baseUrl: BFF_URL });
const INITIAL_QUERY = new URLSearchParams(window.location.search);
const INITIAL_JOURNEY_ID = INITIAL_QUERY.get('journeyId')?.trim() ?? '';
const INITIAL_LAB_BOOTSTRAP = INITIAL_QUERY.get('labBootstrap')?.trim() ?? '';

interface LabBootstrap {
  journeyId: string;
  target: string;
  variables: Record<string, unknown>;
}

interface ReactWebBootstrapResult {
  bootstrap: LabBootstrap;
  flow: FlowBundle;
  instance: JourneyInstance;
}

const reactWebBootstrapRuns = new Map<string, Promise<ReactWebBootstrapResult>>();

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function labBootstrapUrl(token: string): string {
  const url = new URL(BFF_URL);
  url.pathname = `/api/lab/v1/bootstraps/${encodeURIComponent(token)}`;
  url.search = '';
  url.hash = '';
  return url.toString();
}

async function fetchLabBootstrap(token: string): Promise<LabBootstrap> {
  const response = await fetch(labBootstrapUrl(token), { headers: { Accept: 'application/json' } });
  const payload: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = isObject(payload) && typeof payload.detail === 'string' ? payload.detail : '';
    throw new Error(detail || `Não foi possível carregar o bootstrap do Channel Lab (HTTP ${response.status}).`);
  }
  if (!isObject(payload)
    || typeof payload.journeyId !== 'string'
    || typeof payload.target !== 'string'
    || !isObject(payload.variables)) {
    throw new Error('O BFF retornou um bootstrap do Channel Lab inválido.');
  }
  return { journeyId: payload.journeyId, target: payload.target, variables: payload.variables };
}

function removeBootstrapFromBrowserUrl(journeyId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.delete('labBootstrap');
  url.searchParams.set('journeyId', journeyId);
  window.history.replaceState(null, '', url);
}

function runReactWebBootstrap(token: string): Promise<ReactWebBootstrapResult> {
  const existing = reactWebBootstrapRuns.get(token);
  if (existing) return existing;
  const run = (async () => {
    const bootstrap = await fetchLabBootstrap(token);
    if (bootstrap.target !== 'react.web') {
      throw new Error(`O bootstrap recebido pertence ao alvo ${bootstrap.target}, não a react.web.`);
    }
    removeBootstrapFromBrowserUrl(bootstrap.journeyId);
    const flow = await client.getFlow(bootstrap.journeyId);
    if (!flow.channelTypes.includes('WEB')) throw new Error('Esta jornada não está publicada para o canal WEB.');
    const instance = await client.startJourney(bootstrap.journeyId, 'WEB', bootstrap.variables);
    return { bootstrap, flow, instance };
  })();
  reactWebBootstrapRuns.set(token, run);
  void run.catch(() => reactWebBootstrapRuns.delete(token));
  return run;
}

function messageOf(error: unknown): string {
  if (error instanceof JourneyClientError) return error.message;
  return error instanceof Error ? error.message : 'Falha inesperada no canal React Web.';
}

function startDefinitions(flow: FlowBundle | null): StartVariableDefinition[] {
  return flow?.flowNodes.find((node) => node.type === 'START' || node.type === 'MESSAGE_START_EVENT')?.startVariables ?? [];
}

function StepView({ instance, onStep, onError }: { instance: JourneyInstance; onStep: (step: JourneyStep) => void; onError: (message: string) => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<RendererDiagnostic[]>([]);
  const parsed = useMemo(() => instance.step.form ? parseSduiDocument(instance.step.form.sdui) : null, [instance.step.form]);

  const runtime = useMemo(() => {
    if (!parsed?.document) return null;
    return createSduiRuntime({
      document: parsed.document,
      context: { session: { channel: 'WEB', locale: 'pt-BR' } },
      handlers: {
        submit: async (answers) => {
          if (!instance.step.taskId) return;
          setSubmitting(true);
          try {
            onStep(await client.completeTask(instance.processInstanceId, instance.step.taskId, { answers }));
          } catch (error) {
            onError(messageOf(error));
          } finally {
            setSubmitting(false);
          }
        },
        openUrl: ({ url }) => {
          if (typeof url !== 'string') return;
          const destination = new URL(url, window.location.origin);
          if (destination.protocol !== 'http:' && destination.protocol !== 'https:') throw new Error('URL bloqueada pelo canal.');
          window.open(destination, '_blank', 'noopener,noreferrer');
        },
        navigate: ({ route }) => {
          window.dispatchEvent(new CustomEvent('elastic-journey:navigate', { detail: { route } }));
        },
        track: ({ event }) => {
          if (typeof event === 'string') window.dispatchEvent(new CustomEvent('elastic-journey:track', { detail: { event } }));
        },
      },
    });
  }, [instance.processInstanceId, instance.step.taskId, parsed?.document, onError, onStep]);

  if (instance.step.type === 'WAITING') {
    return <Stack space={16}><Title1>Jornada aguardando</Title1><Text>{instance.step.nodeName ?? instance.step.nodeType ?? 'Processamento externo'}</Text><ButtonPrimary onPress={async () => onStep(await client.getCurrentStep(instance.processInstanceId))}>Atualizar passo</ButtonPrimary></Stack>;
  }
  if (instance.step.type === 'ENDED') return <Stack space={12}><Title1>Jornada concluída</Title1><Text>A instância chegou ao fim.</Text></Stack>;
  if (!parsed?.valid || !runtime) {
    return <div className="host-error">SDUI incompatível: {parsed?.diagnostics.map((item) => `${item.code} (${item.path})`).join(', ') || 'formulário ausente'}</div>;
  }

  return (
    <>
      {instance.step.errorMessage ? <div className="host-error">{instance.step.errorMessage}</div> : null}
      <SduiRenderer
        runtime={runtime}
        submitting={submitting}
        onDiagnostics={(diagnostic) => setDiagnostics((current) => current.some((item) => item.code === diagnostic.code && item.nodeId === diagnostic.nodeId) ? current : [...current, diagnostic])}
      />
      {diagnostics.length > 0 ? <div className="host-meta">Diagnóstico do renderer: {diagnostics.map((item) => `${item.code}:${item.nodeId}`).join(', ')}</div> : null}
    </>
  );
}

export function App() {
  const [journeyIdInput, setJourneyIdInput] = useState(INITIAL_JOURNEY_ID);
  const [selectedId, setSelectedId] = useState('');
  const [flow, setFlow] = useState<FlowBundle | null>(null);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [instance, setInstance] = useState<JourneyInstance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const skin = getSkinByName('Blau');

  useEffect(() => {
    if (!INITIAL_LAB_BOOTSTRAP && !INITIAL_JOURNEY_ID) return;
    let active = true;
    setLoading(true);
    const initialization = INITIAL_LAB_BOOTSTRAP
      ? runReactWebBootstrap(INITIAL_LAB_BOOTSTRAP)
      : client.getFlow(INITIAL_JOURNEY_ID).then((loadedFlow) => ({
        bootstrap: null,
        flow: loadedFlow,
        instance: null,
      }));
    initialization
      .then((result) => {
        if (!active) return;
        const journeyId = result.bootstrap?.journeyId ?? INITIAL_JOURNEY_ID;
        setJourneyIdInput(journeyId);
        setSelectedId(journeyId);
        setFlow(result.flow);
        if (result.bootstrap) setVariables(result.bootstrap.variables);
        if (result.instance) setInstance(result.instance);
      })
      .catch((cause) => {
        if (active) setError(messageOf(cause));
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const loadJourney = async (): Promise<void> => {
    const journeyId = journeyIdInput.trim();
    if (!journeyId) {
      setError('Informe o journeyId selecionado no Admin ou recebido pelo Channel Lab.');
      return;
    }
    setVariables({});
    setError('');
    setLoading(true);
    try {
      const loadedFlow = await client.getFlow(journeyId);
      setSelectedId(journeyId);
      setFlow(loadedFlow);
      const url = new URL(window.location.href);
      url.searchParams.set('journeyId', journeyId);
      window.history.replaceState(null, '', url);
    } catch (cause) {
      setSelectedId('');
      setFlow(null);
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  const start = async (): Promise<void> => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    try {
      setInstance(await client.startJourney(selectedId, 'WEB', variables));
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  const stop = async (): Promise<void> => {
    if (!instance) return;
    try {
      await client.stopInstance(instance.processInstanceId);
      setInstance(null);
    } catch (cause) {
      setError(messageOf(cause));
    }
  };

  return (
    <ThemeContextProvider theme={{ skin, colorScheme: 'light', i18n: { locale: 'pt-BR', phoneNumberFormattingRegionCode: 'BR' } }}>
      <div className="host-shell">
        <header className="host-header">
          <div><Title1>Canal React Web</Title1><Text size={14}>Implementação de referência · integração exclusiva via Emulator BFF</Text></div>
          <span className="host-badge">react.web · :15171</span>
        </header>
        {error ? <div className="host-error" role="alert">{error}</div> : null}
        <section className="host-panel">
          {!instance ? (
            <div className="host-form">
              <label className="host-field">Journey ID
                <input
                  value={journeyIdInput}
                  disabled={loading}
                  placeholder="UUID da jornada publicada"
                  onChange={(event) => setJourneyIdInput(event.currentTarget.value)}
                />
              </label>
              <ButtonSecondary onPress={loadJourney} disabled={!journeyIdInput.trim() || loading}>Carregar jornada</ButtonSecondary>
              {startDefinitions(flow).map((definition) => {
                const name = String(definition.name ?? '');
                if (!name) return null;
                return <label key={name} className="host-field">{String(definition.label ?? name)}
                  <input
                    type={definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : 'text'}
                    required={definition.required !== false}
                    value={String(variables[name] ?? '')}
                    onChange={(event) => setVariables((current) => ({ ...current, [name]: definition.type === 'number' ? Number(event.currentTarget.value) : event.currentTarget.value }))}
                  />
                </label>;
              })}
              {flow ? <ButtonPrimary onPress={start} disabled={!selectedId || loading} showSpinner={loading}>Iniciar jornada</ButtonPrimary> : null}
            </div>
          ) : (
            <>
              <div className="host-meta">processInstanceId: {instance.processInstanceId}<br />taskId: {instance.step.taskId ?? '—'} · estado: {instance.step.type}</div>
              <StepView instance={instance} onStep={(step) => setInstance((current) => current ? { ...current, step } : current)} onError={setError} />
              <div className="host-actions"><ButtonSecondary onPress={stop}>Encerrar instância</ButtonSecondary></div>
            </>
          )}
        </section>
      </div>
    </ThemeContextProvider>
  );
}
