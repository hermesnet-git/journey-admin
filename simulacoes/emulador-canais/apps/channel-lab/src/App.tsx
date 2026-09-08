import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import {
  ButtonDanger,
  ButtonPrimary,
  VivoLogo,
  skinVars,
} from '@telefonica/mistica';
import { BFF_ORIGIN, LabApiError, labApi } from './api.js';
import type {
  AdminJourneySummary,
  AndroidLaunchResult,
  ChannelType,
  DiagnosticEntry,
  EmulatorHardwareConfig,
  FlowBundle,
  LabStatus,
  LabTarget,
  StartVariableDefinition,
  TargetDefinition,
  WhatsAppSessionSummary,
} from './types.js';

const REACT_WEB_ORIGIN = import.meta.env.VITE_REACT_WEB_ORIGIN ?? 'http://127.0.0.1:15171';
const FLUTTER_WEB_ORIGIN = import.meta.env.VITE_FLUTTER_WEB_ORIGIN ?? 'http://127.0.0.1:15172';
const WCE_UI_ORIGIN = import.meta.env.VITE_WCE_UI_ORIGIN ?? 'http://127.0.0.1:15173';
const WHATSAPP_SIMULATED_PHONE = '5511999999999';
const BFF_ENDPOINT = (() => {
  try {
    return new URL(BFF_ORIGIN).host;
  } catch {
    return BFF_ORIGIN;
  }
})();
const LAB_THEME_VARIABLES = {
  '--lab-background': skinVars.colors.backgroundAlternative,
  '--lab-surface': skinVars.colors.backgroundContainer,
  '--lab-surface-alt': skinVars.colors.background,
  '--lab-selected': skinVars.colors.backgroundSelected,
  '--lab-brand': skinVars.colors.brand,
  '--lab-brand-high': skinVars.colors.brandHigh,
  '--lab-brand-low': skinVars.colors.brandLow,
  '--lab-brand-top': skinVars.colors.backgroundBrandTop,
  '--lab-brand-bottom': skinVars.colors.backgroundBrandBottom,
  '--lab-on-brand': skinVars.colors.textPrimaryInverse,
  '--lab-text': skinVars.colors.textPrimary,
  '--lab-text-secondary': skinVars.colors.textSecondary,
  '--lab-neutral': skinVars.colors.neutralMedium,
  '--lab-border': skinVars.colors.borderLow,
  '--lab-border-high': skinVars.colors.border,
  '--lab-success': skinVars.colors.success,
  '--lab-success-low': skinVars.colors.successLow,
  '--lab-error': skinVars.colors.error,
  '--lab-error-low': skinVars.colors.errorLow,
  '--lab-warning-low': skinVars.colors.warningLow,
} as CSSProperties;

const TARGETS: TargetDefinition[] = [
  { id: 'react.web', label: 'React Web', description: 'Renderer Mística Web real', channel: 'WEB', mode: 'iframe', url: REACT_WEB_ORIGIN },
  { id: 'flutter.web', label: 'Flutter Web', description: 'Build Flutter executado no navegador', channel: 'WEB', mode: 'iframe', url: FLUTTER_WEB_ORIGIN },
  { id: 'react.mobile', label: 'React Native', description: 'Aplicativo Expo em dispositivo/emulador', channel: 'MOBILE', mode: 'device' },
  { id: 'flutter.mobile', label: 'Flutter Mobile', description: 'Aplicativo Android/iOS', channel: 'MOBILE', mode: 'device' },
  { id: 'whatsapp.wce', label: 'WhatsApp WCE', description: 'Projeção conversacional via WCE', channel: 'WHATSAPP', mode: 'iframe', url: WCE_UI_ORIGIN },
];

interface AppProps {
  colorScheme: 'light' | 'dark';
  onToggleColorScheme: () => void;
}

function definitions(flow: FlowBundle | null): StartVariableDefinition[] {
  return flow?.flowNodes.find((node) => node.type === 'START' || node.type === 'MESSAGE_START_EVENT')?.startVariables ?? [];
}

function initialVariables(flow: FlowBundle): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const definition of definitions(flow)) {
    const name = definition.name?.trim();
    if (!name) continue;
    if (definition.defaultValue !== undefined) result[name] = definition.defaultValue;
    else if (definition.type === 'boolean') result[name] = false;
  }
  return result;
}

function variablesValid(flow: FlowBundle | null, values: Record<string, unknown>): boolean {
  return definitions(flow).every((definition) => {
    if (definition.required === false || !definition.name) return true;
    const value = values[definition.name];
    return value !== undefined && value !== null && (typeof value !== 'string' || value.trim() !== '');
  });
}

function dateLabel(value: string | null): string {
  if (!value) return 'data não informada';
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? value : date.toLocaleString('pt-BR');
}

function formatGb(ramMb: number): string {
  return (ramMb / 1024).toFixed(ramMb % 1024 === 0 ? 0 : 1);
}

export function App({ colorScheme, onToggleColorScheme }: AppProps) {
  const [channel, setChannel] = useState<ChannelType>('WEB');
  const [target, setTarget] = useState<LabTarget>('react.web');
  const [journeys, setJourneys] = useState<AdminJourneySummary[]>([]);
  const [selectedJourney, setSelectedJourney] = useState<AdminJourneySummary | null>(null);
  const [flow, setFlow] = useState<FlowBundle | null>(null);
  const [variables, setVariables] = useState<Record<string, unknown>>({});
  const [query, setQuery] = useState('');
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [launchStatus, setLaunchStatus] = useState('');
  const [bffOnline, setBffOnline] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [deviceInstruction, setDeviceInstruction] = useState('');
  const whatsAppPhone = WHATSAPP_SIMULATED_PHONE;
  const [whatsAppSession, setWhatsAppSession] = useState<WhatsAppSessionSummary | null>(null);
  const [diagnostics, setDiagnostics] = useState<DiagnosticEntry[]>([]);
  const [emulatorConfig, setEmulatorConfig] = useState<EmulatorHardwareConfig | null>(null);
  const [ramDraft, setRamDraft] = useState(0);
  const [cpuDraft, setCpuDraft] = useState(0);
  const [savingEmulatorConfig, setSavingEmulatorConfig] = useState(false);
  const [emulatorPanelExpanded, setEmulatorPanelExpanded] = useState(false);
  const [labStatus, setLabStatus] = useState<LabStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(false);
  const [autoRefreshStatus, setAutoRefreshStatus] = useState(true);
  const catalogRequest = useRef<AbortController | null>(null);
  const flowRequest = useRef<AbortController | null>(null);
  const emulatorConfigBaseline = useRef<{ ramMb: number; cpuCores: number } | null>(null);

  const channelTargets = useMemo(() => TARGETS.filter((item) => item.channel === channel), [channel]);
  const filteredJourneys = useMemo(() => {
    const term = query.trim().toLocaleLowerCase('pt-BR');
    if (!term) return journeys;
    return journeys.filter((journey) => [journey.name, journey.productName, journey.journeyId]
      .some((value) => value.toLocaleLowerCase('pt-BR').includes(term)));
  }, [journeys, query]);

  const log = (level: DiagnosticEntry['level'], operation: string, detail: string, correlationId?: string): void => {
    setDiagnostics((current) => [{
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      level,
      operation,
      detail,
      ...(correlationId ? { correlationId } : {}),
    }, ...current].slice(0, 40));
  };

  const reportError = (operation: string, cause: unknown): void => {
    const message = cause instanceof Error ? cause.message : 'Falha inesperada no Channel Lab.';
    if (cause instanceof LabApiError && cause.status === 503) setBffOnline(false);
    setError(message);
    log('error', operation, message, cause instanceof LabApiError ? cause.correlationId : undefined);
  };

  const loadCatalog = async (selectedChannel: ChannelType): Promise<void> => {
    catalogRequest.current?.abort();
    const controller = new AbortController();
    catalogRequest.current = controller;
    setLoadingCatalog(true);
    setError('');
    try {
      const result = await labApi.listJourneys(selectedChannel, controller.signal);
      setBffOnline(true);
      setJourneys(result);
      log('info', 'Catálogo', `${result.length} jornada(s) publicada(s) para ${selectedChannel}.`);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) reportError('Catálogo', cause);
    } finally {
      if (catalogRequest.current === controller) setLoadingCatalog(false);
    }
  };

  const refreshStatus = async (): Promise<void> => {
    setLoadingStatus(true);
    try {
      setLabStatus(await labApi.getStatus());
    } catch {
      setLabStatus(null);
    } finally {
      setLoadingStatus(false);
    }
  };

  useEffect(() => {
    void labApi.health().then((online) => setBffOnline(online)).catch(() => setBffOnline(false));
    void refreshStatus();
  }, []);

  useEffect(() => {
    if (!autoRefreshStatus) return;
    const interval = setInterval(() => { void refreshStatus(); }, 30_000);
    return () => clearInterval(interval);
  }, [autoRefreshStatus]);

  useEffect(() => {
    flowRequest.current?.abort();
    setTarget(channelTargets[0]!.id);
    setSelectedJourney(null);
    setFlow(null);
    setVariables({});
    setPreviewUrl('');
    setDeviceInstruction('');
    void loadCatalog(channel);
    return () => {
      catalogRequest.current?.abort();
      flowRequest.current?.abort();
    };
  }, [channel]);

  useEffect(() => {
    if (channel !== 'MOBILE') {
      setEmulatorConfig(null);
      setEmulatorPanelExpanded(false);
      return;
    }
    let active = true;
    void labApi.getEmulatorConfig().then((result) => {
      if (!active) return;
      setEmulatorConfig(result);
      setRamDraft(result.ramMb);
      setCpuDraft(result.cpuCores);
      // "Padrão" é o que já estava configurado na primeira consulta desta
      // sessão do Channel Lab — não um valor fixo. Só captura uma vez.
      if (!emulatorConfigBaseline.current) emulatorConfigBaseline.current = { ramMb: result.ramMb, cpuCores: result.cpuCores };
    }).catch(() => { /* painel de RAM/CPU só aparece quando a consulta funciona */ });
    return () => { active = false; };
  }, [channel]);

  const saveEmulatorConfig = async (): Promise<void> => {
    setSavingEmulatorConfig(true);
    setError('');
    try {
      const result = await labApi.setEmulatorConfig(ramDraft, cpuDraft);
      setEmulatorConfig(result);
      log('info', 'Emulador', `RAM ${result.ramMb} MB e ${result.cpuCores} núcleo(s) aplicados para ${result.avdName}.`);
    } catch (cause) {
      reportError('Configuração do emulador', cause);
    } finally {
      setSavingEmulatorConfig(false);
    }
  };

  const selectJourney = async (journey: AdminJourneySummary): Promise<void> => {
    flowRequest.current?.abort();
    const controller = new AbortController();
    flowRequest.current = controller;
    setSelectedJourney(journey);
    setFlow(null);
    setVariables({});
    setLoadingFlow(true);
    setError('');
    setPreviewUrl('');
    setDeviceInstruction('');
    try {
      const loaded = await labApi.getFlow(journey.journeyId, controller.signal);
      setBffOnline(true);
      if (!loaded.channelTypes.includes(channel)) {
        throw new Error(`A jornada selecionada não possui publicação para o canal ${channel}.`);
      }
      setFlow(loaded);
      setVariables(initialVariables(loaded));
      log('info', 'Fluxo', `Metadados carregados para ${journey.journeyId}.`);
    } catch (cause) {
      if (!(cause instanceof DOMException && cause.name === 'AbortError')) reportError('Fluxo', cause);
    } finally {
      if (flowRequest.current === controller) setLoadingFlow(false);
    }
  };

  const launch = async (): Promise<void> => {
    if (!selectedJourney || !flow || !variablesValid(flow, variables)) return;
    setLaunching(true);
    setError('');
    setPreviewUrl('');
    setDeviceInstruction('');
    setLaunchStatus(target === 'react.mobile' || target === 'flutter.mobile'
      ? 'Preparando o Android. O AVD pode levar alguns minutos para iniciar.'
      : 'Preparando o canal selecionado.');
    try {
      if (target === 'whatsapp.wce') {
        const session = await labApi.startWhatsApp(selectedJourney.journeyId, whatsAppPhone.trim(), variables);
        setBffOnline(true);
        setWhatsAppSession(session);
        setPreviewUrl(TARGETS.find((item) => item.id === target)!.url!);
        if (session.rendererDiagnostic) {
          setError(session.rendererDiagnostic);
          log('error', 'WhatsApp SDUI', session.rendererDiagnostic);
        } else {
          log('info', 'WhatsApp', `Sessão iniciada: ${session.processInstanceId}; passo ${session.stepType}.`);
        }
        return;
      }
      const bootstrap = await labApi.createBootstrap(selectedJourney.journeyId, target, variables);
      setBffOnline(true);
      const definition = TARGETS.find((item) => item.id === target)!;
      if (definition.mode === 'iframe') {
        const url = new URL(definition.url!);
        url.searchParams.set('labBootstrap', bootstrap.token);
        setPreviewUrl(url.toString());
      } else if (target === 'react.mobile') {
        setLaunchStatus('Localizando ou iniciando o AVD e abrindo o Expo Go…');
        const result = await labApi.launchAndroid(target, bootstrap.token);
        setDeviceInstruction(deviceResultText(result));
        void refreshStatus();
      } else if (target === 'flutter.mobile') {
        setLaunchStatus('Localizando ou iniciando o AVD e compilando o aplicativo Flutter…');
        const result = await labApi.launchAndroid(target, bootstrap.token);
        setDeviceInstruction(deviceResultText(result));
        void refreshStatus();
      }
      log('info', 'Bootstrap', `Token criado para ${target}; expira em ${dateLabel(bootstrap.expiresAt)}.`);
    } catch (cause) {
      reportError('Execução', cause);
    } finally {
      setLaunching(false);
      setLaunchStatus('');
    }
  };

  const stopWhatsApp = async (): Promise<void> => {
    if (!whatsAppSession) return;
    setLaunching(true);
    try {
      await labApi.stopWhatsApp(whatsAppSession.from);
      setBffOnline(true);
      log('info', 'WhatsApp', `Sessão ${whatsAppSession.processInstanceId} encerrada.`);
      setWhatsAppSession(null);
      setPreviewUrl('');
    } catch (cause) {
      reportError('Encerramento WhatsApp', cause);
    } finally {
      setLaunching(false);
    }
  };

  return <div className="lab-shell" style={LAB_THEME_VARIABLES}>
    {launching && launchStatus ? <div className="launch-overlay" role="status" aria-live="polite">
      <div className="launch-dialog"><span className="launch-spinner" /><h2>Iniciando canal</h2><p>{launchStatus}</p><small>Não feche esta página enquanto o ambiente está sendo preparado.</small></div>
    </div> : null}
    <header className="topbar">
      <div className="brand"><span className="brand-mark"><VivoLogo size={42} color="#ffffff" /></span><div><h1>Channel Lab</h1><p>Elastic Journey · laboratório de canais digitais</p></div></div>
      <div className="topbar-actions">
        <button
          className={`theme-toggle ${colorScheme}`}
          type="button"
          role="switch"
          aria-checked={colorScheme === 'dark'}
          aria-label={`Ativar tema ${colorScheme === 'light' ? 'escuro' : 'claro'}`}
          title={`Tema atual: ${colorScheme === 'light' ? 'claro' : 'escuro'}`}
          onClick={onToggleColorScheme}
        >
          <span aria-hidden="true">☀</span>
          <i aria-hidden="true"><b /></i>
          <span aria-hidden="true">☾</span>
          <strong>{colorScheme === 'light' ? 'Claro' : 'Escuro'}</strong>
        </button>
        <div className="service-status"><span className={`status-dot ${bffOnline === true ? 'up' : bffOnline === false ? 'down' : ''}`} /> Emulator BFF · {BFF_ENDPOINT}</div>
      </div>
    </header>

    {error ? <div className="global-error" role="alert"><strong>Não foi possível concluir a operação.</strong><span>{error}</span></div> : null}

    <main className="workspace">
      <aside className="control-panel">
        <section className="control-section">
          <div className="section-heading"><span>01</span><div><h2>Escolha o canal</h2><p>Filtra somente publicações compatíveis</p></div></div>
          <div className="channel-grid">
            {(['WEB', 'MOBILE', 'WHATSAPP'] as const).map((item) => <button key={item} className={channel === item ? 'selected' : ''} onClick={() => setChannel(item)}><span>{item === 'WEB' ? '◫' : item === 'MOBILE' ? '▯' : '◉'}</span>{item}</button>)}
          </div>
          <label className="field">Implementação real
            <select value={target} onChange={(event) => { setTarget(event.currentTarget.value as LabTarget); setPreviewUrl(''); setDeviceInstruction(''); }}>
              {channelTargets.map((item) => <option key={item.id} value={item.id}>{item.label} — {item.description}</option>)}
            </select>
          </label>
          {channel === 'MOBILE' && emulatorConfig ? <div className="emulator-tuning">
            <div className="emulator-tuning-header"><strong>Memória e processador do emulador</strong><span>{emulatorConfig.avdName}</span></div>
            <button
              type="button"
              className="emulator-tuning-summary"
              aria-expanded={emulatorPanelExpanded}
              onClick={() => setEmulatorPanelExpanded((current) => !current)}
            >
              <span>{formatGb(emulatorConfig.ramMb)} GB · {emulatorConfig.cpuCores} núcleo{emulatorConfig.cpuCores === 1 ? '' : 's'}</span>
              <i className={emulatorPanelExpanded ? 'open' : ''}>⌄</i>
            </button>
            {emulatorPanelExpanded ? <div className="emulator-tuning-body">
              <label className="field">Memória RAM · {formatGb(ramDraft)} GB
                <input type="range" min={1536} max={emulatorConfig.maxRamMb} step={512} value={ramDraft} disabled={savingEmulatorConfig} onChange={(event) => setRamDraft(Number(event.currentTarget.value))} />
              </label>
              <label className="field">Processador · {cpuDraft} núcleo{cpuDraft === 1 ? '' : 's'}
                <input type="range" min={1} max={emulatorConfig.maxCpuCores} step={1} value={cpuDraft} disabled={savingEmulatorConfig} onChange={(event) => setCpuDraft(Number(event.currentTarget.value))} />
              </label>
              <div className="emulator-tuning-actions">
                <button
                  type="button"
                  className="emulator-tuning-reset"
                  disabled={savingEmulatorConfig || (ramDraft === (emulatorConfigBaseline.current ?? emulatorConfig).ramMb && cpuDraft === (emulatorConfigBaseline.current ?? emulatorConfig).cpuCores)}
                  onClick={() => {
                    const baseline = emulatorConfigBaseline.current ?? emulatorConfig;
                    setRamDraft(baseline.ramMb);
                    setCpuDraft(baseline.cpuCores);
                  }}
                >Redefinir padrão</button>
                <button
                  type="button"
                  className="emulator-tuning-save"
                  disabled={savingEmulatorConfig || (ramDraft === emulatorConfig.ramMb && cpuDraft === emulatorConfig.cpuCores)}
                  onClick={() => void saveEmulatorConfig()}
                >{savingEmulatorConfig ? 'Aplicando…' : 'Aplicar'}</button>
              </div>
              <small className="field-hint">{emulatorConfig.deviceConnected
                ? 'Vale a partir da próxima vez que o emulador for reaberto — feche o AVD atual para aplicar.'
                : 'Vale no próximo lançamento do canal.'}</small>
            </div> : null}
          </div> : null}
        </section>

        <section className="control-section journey-section">
          <div className="section-heading"><span>02</span><div><h2>Selecione a jornada</h2><p>Origem exclusiva: Admin Backend via BFF</p></div></div>
          <div className="search-row"><input type="search" value={query} onChange={(event) => setQuery(event.currentTarget.value)} placeholder="Buscar nome, produto ou ID" /><button onClick={() => loadCatalog(channel)} disabled={loadingCatalog} title="Atualizar catálogo">↻</button></div>
          <div className="journey-list" aria-busy={loadingCatalog}>
            {loadingCatalog ? <div className="skeletons"><i /><i /><i /></div> : null}
            {!loadingCatalog && filteredJourneys.length === 0 ? <div className="empty-list">Nenhuma jornada publicada encontrada para {channel}.</div> : null}
            {!loadingCatalog && filteredJourneys.map((journey) => <button key={journey.journeyId} className={selectedJourney?.journeyId === journey.journeyId ? 'journey selected' : 'journey'} onClick={() => selectJourney(journey)}>
              <span className="radio" /><span className="journey-copy"><strong>{journey.name}</strong><small>{journey.productName}</small><code>{journey.journeyId}</code></span><span className="version">v{journey.publishedVersionNumber ?? '—'}</span>
            </button>)}
          </div>
        </section>

        <section className="control-section">
          <div className="section-heading"><span>03</span><div><h2>Contexto inicial</h2><p>Enviado ao host por bootstrap temporário</p></div></div>
          {!selectedJourney ? <p className="section-placeholder">Selecione uma jornada para carregar as variáveis.</p> : loadingFlow ? <p className="section-placeholder">Carregando fluxo…</p> : null}
          {flow && definitions(flow).length === 0 ? <p className="section-placeholder success">Esta jornada não exige variáveis iniciais.</p> : null}
          {flow ? <div className="variables">{definitions(flow).map((definition) => <VariableField key={definition.name} definition={definition} value={definition.name ? variables[definition.name] : undefined} onChange={(value) => definition.name && setVariables((current) => ({ ...current, [definition.name!]: value }))} />)}</div> : null}
          {target === 'whatsapp.wce' && flow ? <label className="field">Número simulado
            <input value={whatsAppPhone} disabled readOnly aria-describedby="whatsapp-phone-hint" />
            <small className="field-hint" id="whatsapp-phone-hint">Identificador fixo configurado para esta simulação.</small>
          </label> : null}
          <div className="mistica-action primary-action">
            <ButtonPrimary
              disabled={!selectedJourney || !flow || !variablesValid(flow, variables) || launching || (target === 'whatsapp.wce' && (!whatsAppPhone || Boolean(whatsAppSession)))}
              showSpinner={launching}
              loadingText="Preparando…"
              onPress={() => void launch()}
            >
              {target === 'whatsapp.wce' ? whatsAppSession ? 'Conversa ativa' : 'Iniciar conversa' : 'Abrir no canal'} →
            </ButtonPrimary>
          </div>
          {whatsAppSession ? <div className="mistica-action stop-action"><ButtonDanger onPress={() => void stopWhatsApp()} disabled={launching}>Encerrar sessão WhatsApp</ButtonDanger></div> : null}
        </section>
      </aside>

      <section className="stage">
        <div className="stage-header"><div><span className="eyebrow">ALVO ATUAL</span><h2>{TARGETS.find((item) => item.id === target)?.label}</h2></div><span className="target-badge">{target}</span></div>
        <div className="stage-body">
          {previewUrl ? <iframe key={previewUrl} src={previewUrl} title={`Preview ${target}`} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" /> : deviceInstruction ? <DevicePanel target={target} instruction={deviceInstruction} /> : <EmptyStage target={target} />}
        </div>
        <div className="stage-footer"><span>O Channel Lab coordena, mas não renderiza SDUI.</span>{previewUrl ? <a href={previewUrl} target="_blank" rel="noreferrer">Abrir em nova janela ↗</a> : null}</div>
      </section>

      <div className="side-column">
        <aside className="diagnostics">
          <div className="diagnostics-header"><div><span className="live-dot" /> Diagnóstico</div><button onClick={() => setDiagnostics([])}>Limpar</button></div>
          <dl className="summary">
            <div><dt>Canal</dt><dd>{channel}</dd></div><div><dt>Alvo</dt><dd>{target}</dd></div><div><dt>Journey ID</dt><dd>{selectedJourney?.journeyId ?? '—'}</dd></div><div><dt>Versão publicada</dt><dd>{selectedJourney?.publishedVersionNumber ?? '—'}</dd></div><div><dt>Variáveis</dt><dd>{Object.keys(variables).length}</dd></div>
          </dl>
          <div className="event-log">
            {diagnostics.length === 0 ? <p>Nenhum evento técnico registrado.</p> : diagnostics.map((entry) => <article key={entry.id} className={entry.level}><time>{new Date(entry.timestamp).toLocaleTimeString('pt-BR')}</time><strong>{entry.operation}</strong><span>{entry.detail}</span>{entry.correlationId ? <code>correlationId: {entry.correlationId}</code> : null}</article>)}
          </div>
          <div className="privacy-note">Valores das variáveis não são exibidos no diagnóstico.</div>
        </aside>

        <aside className="lab-status">
          <div className="diagnostics-header">
            <div>Status do ambiente</div>
            <div className="lab-status-actions">
              <label className="lab-status-auto" title="Atualizar sozinho a cada 30 segundos">
                <input type="checkbox" checked={autoRefreshStatus} onChange={(event) => setAutoRefreshStatus(event.currentTarget.checked)} />
                Auto 30s
              </label>
              <button onClick={() => void refreshStatus()} disabled={loadingStatus} title="Atualizar status">{loadingStatus ? '…' : '↻'}</button>
            </div>
          </div>
          <div className="lab-status-list" aria-busy={loadingStatus}>
            {!labStatus ? <p className="lab-status-empty">{loadingStatus ? 'Consultando…' : 'Não foi possível consultar o status.'}</p> : labStatus.items.map((item) => <div key={item.id} className="lab-status-row">
              <span className={`status-dot ${item.status === 'up' ? 'up' : item.status === 'down' ? 'down' : 'pending'}`} title={item.help} />
              <span className="lab-status-label" title={item.help}>{item.label}</span>
              <span className="lab-status-detail">{item.detail}</span>
            </div>)}
          </div>
        </aside>
      </div>
    </main>
    <footer className="app-footer"><span>channel-lab · {window.location.host}</span><span>BFF: {BFF_ORIGIN}</span></footer>
  </div>;
}

function deviceResultText(result: AndroidLaunchResult): string {
  const emulator = result.avdName ? `${result.avdName} (${result.deviceId})` : result.deviceId;
  return `${result.detail}\nDispositivo: ${emulator}`;
}

function EmptyStage({ target }: { target: LabTarget }) {
  const mobile = target === 'react.mobile' || target === 'flutter.mobile';
  return <div className="stage-empty">
    <div className="empty-icon">◇</div>
    <h3>{mobile ? 'O aplicativo será aberto no dispositivo' : 'O canal aparecerá aqui'}</h3>
    <p>{mobile
      ? 'Selecione a jornada, preencha o contexto inicial e clique em “Abrir no canal”. O Channel Lab iniciará o AVD quando necessário.'
      : 'Selecione a jornada, preencha o contexto inicial e abra a execução.'}</p>
    <div className="architecture"><span>Channel Lab</span><b>→</b><span>{mobile ? 'AVD / dispositivo' : 'Host real'}</span><b>→</b><span>Emulator BFF</span><b>→</b><span>ms-journey</span></div>
  </div>;
}

function VariableField({ definition, value, onChange }: { definition: StartVariableDefinition; value: unknown; onChange: (value: unknown) => void }) {
  const label = definition.label ?? definition.name ?? 'Variável';
  if (definition.type === 'boolean') return <label className="boolean-field"><input type="checkbox" checked={value === true} onChange={(event) => onChange(event.currentTarget.checked)} /><span>{label}{definition.required !== false ? ' *' : ''}</span></label>;
  const type = definition.type === 'number' ? 'number' : definition.type === 'date' ? 'date' : definition.type === 'datetime' ? 'datetime-local' : 'text';
  return <label className="field">{label}{definition.required !== false ? ' *' : ''}<input type={type} required={definition.required !== false} value={value == null ? '' : String(value)} onChange={(event) => onChange(type === 'number' && event.currentTarget.value ? Number(event.currentTarget.value) : event.currentTarget.value)} /></label>;
}

function DevicePanel({ target, instruction }: { target: LabTarget; instruction: string }) {
  const copy = async (): Promise<void> => navigator.clipboard.writeText(instruction);
  return <div className="device-panel"><div className="device-art"><div><span /><span /><span /></div></div><h3>Continue no {target === 'react.mobile' ? 'React Native' : 'Flutter Mobile'}</h3><p>O bootstrap contém a jornada e as variáveis, sem expor seus valores no link.</p><pre>{instruction}</pre><button onClick={copy}>Copiar instrução</button><small>O dispositivo precisa alcançar o Emulator BFF configurado no aplicativo.</small></div>;
}
