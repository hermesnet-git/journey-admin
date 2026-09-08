import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  JourneyClient,
  JourneyClientError,
  type FlowBundle,
  type JourneyInstance,
  type JourneyStep,
  type StartVariableDefinition,
} from '@elastic-journey/journey-client';
import { parseSduiDocument, type SduiDocument } from '@elastic-journey/sdui-contract';
import { createSduiRuntime } from '@elastic-journey/sdui-runtime';
import {
  SduiRendererNative,
  REACT_MOBILE_RENDERER_VERSION,
  defaultMobileMisticaTokens,
  type NativeRendererDiagnostic,
} from '@elastic-journey/renderer-react-native-mistica';

const DEFAULT_BFF_URL = Platform.OS === 'android'
  ? 'http://10.0.2.2:18085/api/v1'
  : 'http://127.0.0.1:18085/api/v1';
const BFF_URL = process.env.EXPO_PUBLIC_EMULATOR_BFF_URL?.trim() || DEFAULT_BFF_URL;
const INITIAL_JOURNEY_ID = process.env.EXPO_PUBLIC_JOURNEY_ID?.trim() || '';
const client = new JourneyClient({ baseUrl: BFF_URL });
const colors = defaultMobileMisticaTokens.colors;

interface LabBootstrap {
  journeyId: string;
  target: string;
  variables: Record<string, unknown>;
}

interface ReactMobileBootstrapResult {
  bootstrap: LabBootstrap;
  flow: FlowBundle;
  instance: JourneyInstance;
}

const reactMobileBootstrapRuns = new Map<string, Promise<ReactMobileBootstrapResult>>();

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
  if (payload.target !== 'react.mobile') {
    throw new Error(`O bootstrap recebido pertence ao alvo ${payload.target}, não a react.mobile.`);
  }
  return { journeyId: payload.journeyId, target: payload.target, variables: payload.variables };
}

function runReactMobileBootstrap(token: string): Promise<ReactMobileBootstrapResult> {
  const existing = reactMobileBootstrapRuns.get(token);
  if (existing) return existing;
  const run = (async () => {
    const bootstrap = await fetchLabBootstrap(token);
    const flow = await client.getFlow(bootstrap.journeyId);
    if (!flow.channelTypes.includes('MOBILE')) throw new Error('Esta jornada não está publicada para o canal MOBILE.');
    const instance = await client.startJourney(bootstrap.journeyId, 'MOBILE', bootstrap.variables);
    return { bootstrap, flow, instance };
  })();
  reactMobileBootstrapRuns.set(token, run);
  void run.catch(() => reactMobileBootstrapRuns.delete(token));
  return run;
}

function messageOf(error: unknown): string {
  if (error instanceof JourneyClientError) return error.message;
  return error instanceof Error ? error.message : 'Falha inesperada no canal React Native.';
}

function journeyIdFromUrl(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('journeyId')?.trim() ?? '';
  } catch {
    return '';
  }
}

function labBootstrapFromUrl(url: string | null): string {
  if (!url) return '';
  try {
    return new URL(url).searchParams.get('labBootstrap')?.trim() ?? '';
  } catch {
    return '';
  }
}

function versionParts(version: string): [number, number, number] | null {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(version);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3] ?? 0)];
}

function versionAtLeast(current: string, minimum: string): boolean {
  const currentParts = versionParts(current);
  const minimumParts = versionParts(minimum);
  if (!currentParts || !minimumParts) return false;
  for (let index = 0; index < currentParts.length; index += 1) {
    if (currentParts[index]! > minimumParts[index]!) return true;
    if (currentParts[index]! < minimumParts[index]!) return false;
  }
  return true;
}

function targetCompatibilityError(document: SduiDocument | null): string {
  if (!document || !('supportedTargets' in document)) return '';
  if (!document.supportedTargets.includes('react.mobile')) return 'Esta tela não foi publicada para o alvo react.mobile.';
  if (document.schemaVersion.split('.')[0] !== '1' || document.catalogVersion.split('.')[0] !== '1') {
    return 'A versão do snapshot SDUI não é compatível com o catálogo v1.';
  }
  const minimum = document.minRendererVersion['react.mobile'];
  if (minimum && !versionAtLeast(REACT_MOBILE_RENDERER_VERSION, minimum)) {
    return `A tela exige renderer react.mobile ${minimum} ou superior; o aplicativo possui ${REACT_MOBILE_RENDERER_VERSION}.`;
  }
  return '';
}

function startDefinitions(flow: FlowBundle | null): StartVariableDefinition[] {
  return flow?.flowNodes.find((node) => node.type === 'START' || node.type === 'MESSAGE_START_EVENT')?.startVariables ?? [];
}

function initialVariables(flow: FlowBundle): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const definition of startDefinitions(flow)) {
    const name = String(definition.name ?? '').trim();
    if (!name) continue;
    if ('defaultValue' in definition && definition.defaultValue !== undefined) result[name] = definition.defaultValue;
    else if (definition.type === 'boolean') result[name] = false;
  }
  return result;
}

function hasRequiredVariables(flow: FlowBundle | null, variables: Record<string, unknown>): boolean {
  return startDefinitions(flow).every((definition) => {
    if (definition.required === false) return true;
    const name = String(definition.name ?? '').trim();
    if (!name) return true;
    const value = variables[name];
    return value !== undefined && value !== null && (typeof value !== 'string' || value.trim().length > 0);
  });
}

interface ActionButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  secondary?: boolean;
  busy?: boolean;
}

function ActionButton({ label, onPress, disabled = false, secondary = false, busy = false }: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, busy }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        {
          backgroundColor: secondary ? 'transparent' : colors.brand,
          borderColor: colors.brand,
          opacity: disabled ? 0.5 : pressed ? 0.78 : 1,
        },
      ]}
    >
      {busy
        ? <ActivityIndicator color={secondary ? colors.brand : colors.onBrand} />
        : <Text style={[styles.actionButtonLabel, { color: secondary ? colors.brand : colors.onBrand }]}>{label}</Text>}
    </Pressable>
  );
}

interface StartVariableFieldProps {
  definition: StartVariableDefinition;
  value: unknown;
  onChange: (value: unknown) => void;
}

function StartVariableField({ definition, value, onChange }: StartVariableFieldProps) {
  const name = String(definition.name ?? '').trim();
  const label = String(definition.label ?? name);
  if (!name) return null;

  if (definition.type === 'boolean') {
    return (
      <View style={styles.switchField}>
        <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}{definition.required !== false ? ' *' : ''}</Text>
        <Switch accessibilityLabel={label} value={value === true} onValueChange={onChange} trackColor={{ true: String(colors.brand) }} />
      </View>
    );
  }

  const isNumber = definition.type === 'number';
  const placeholder = definition.type === 'date'
    ? 'AAAA-MM-DD'
    : definition.type === 'datetime'
      ? 'AAAA-MM-DDThh:mm:ss'
      : '';

  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>{label}{definition.required !== false ? ' *' : ''}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value === undefined || value === null ? '' : String(value)}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        keyboardType={isNumber ? 'decimal-pad' : 'default'}
        autoCapitalize="none"
        onChangeText={(nextValue) => {
          if (!isNumber) onChange(nextValue);
          else onChange(nextValue.trim() === '' ? '' : Number(nextValue.replace(',', '.')));
        }}
        style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
      />
    </View>
  );
}

interface StepViewProps {
  journeyId: string;
  instance: JourneyInstance;
  onStep: (step: JourneyStep) => void;
  onError: (message: string) => void;
  onNotice: (message: string) => void;
}

function StepView({ journeyId, instance, onStep, onError, onNotice }: StepViewProps) {
  const [submitting, setSubmitting] = useState(false);
  const [diagnostics, setDiagnostics] = useState<NativeRendererDiagnostic[]>([]);
  const parsed = useMemo(
    () => instance.step.form ? parseSduiDocument(instance.step.form.sdui) : null,
    [instance.step.form],
  );
  const compatibilityError = useMemo(() => targetCompatibilityError(parsed?.document ?? null), [parsed?.document]);

  const runtime = useMemo(() => {
    if (!parsed?.document || compatibilityError) return null;
    return createSduiRuntime({
      document: parsed.document,
      context: {
        session: { channel: 'MOBILE', locale: 'pt-BR' },
        route: { journeyId },
      },
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
        openUrl: async ({ url }) => {
          if (typeof url !== 'string') return;
          let destination: URL;
          try {
            destination = new URL(url);
          } catch {
            throw new Error('A jornada informou uma URL inválida.');
          }
          if (destination.protocol !== 'http:' && destination.protocol !== 'https:') {
            throw new Error('URL bloqueada pelo canal.');
          }
          if (!await Linking.canOpenURL(destination.toString())) throw new Error('O dispositivo não pode abrir essa URL.');
          await Linking.openURL(destination.toString());
        },
        navigate: ({ route }) => {
          if (typeof route === 'string') onNotice(`Navegação solicitada para: ${route}`);
        },
        track: ({ event }) => {
          if (typeof event === 'string') onNotice(`Evento registrado: ${event}`);
        },
      },
    });
  }, [compatibilityError, instance.processInstanceId, instance.step.taskId, journeyId, onError, onNotice, onStep, parsed?.document]);

  const reportDiagnostic = useCallback((diagnostic: NativeRendererDiagnostic) => {
    setDiagnostics((current) => current.some((item) => item.code === diagnostic.code && item.nodeId === diagnostic.nodeId)
      ? current
      : [...current, diagnostic]);
  }, []);

  const refresh = async (): Promise<void> => {
    setSubmitting(true);
    try {
      onStep(await client.getCurrentStep(instance.processInstanceId));
    } catch (error) {
      onError(messageOf(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (instance.step.type === 'WAITING') {
    return (
      <View style={styles.statePanel}>
        <Text accessibilityRole="header" style={[styles.stateTitle, { color: colors.textPrimary }]}>Jornada aguardando</Text>
        <Text style={{ color: colors.textSecondary }}>{instance.step.nodeName ?? instance.step.nodeType ?? 'Processamento externo'}</Text>
        <ActionButton label="Atualizar passo" onPress={() => void refresh()} disabled={submitting} busy={submitting} />
      </View>
    );
  }

  if (instance.step.type === 'ENDED') {
    return (
      <View style={styles.statePanel}>
        <Text accessibilityRole="header" style={[styles.stateTitle, { color: colors.textPrimary }]}>Jornada concluída</Text>
        <Text style={{ color: colors.textSecondary }}>A instância chegou ao fim.</Text>
      </View>
    );
  }

  if (!parsed?.valid || !runtime) {
    const detail = compatibilityError || parsed?.diagnostics.map((item) => `${item.code} (${item.path})`).join(', ') || 'formulário ausente';
    return <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.negative }]}>SDUI incompatível: {detail}</Text>;
  }

  return (
    <View style={styles.rendererArea}>
      {instance.step.errorMessage
        ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.negative }]}>{instance.step.errorMessage}</Text>
        : null}
      <View style={styles.rendererArea}>
        <SduiRendererNative runtime={runtime} submitting={submitting} onDiagnostics={reportDiagnostic} />
      </View>
      {diagnostics.length > 0
        ? <Text style={[styles.diagnostic, { color: colors.textSecondary }]}>Diagnóstico do renderer: {diagnostics.map((item) => `${item.code}:${item.nodeId}`).join(', ')}</Text>
        : null}
    </View>
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
  const [notice, setNotice] = useState('');

  const loadJourneyById = useCallback(async (rawJourneyId: string): Promise<void> => {
    const journeyId = rawJourneyId.trim();
    if (!journeyId) {
      setError('Informe o journeyId selecionado no Admin ou recebido pelo Channel Lab.');
      return;
    }
    setError('');
    setNotice('');
    setLoading(true);
    setInstance(null);
    try {
      const loadedFlow = await client.getFlow(journeyId);
      setJourneyIdInput(journeyId);
      setSelectedId(journeyId);
      setFlow(loadedFlow);
      setVariables(initialVariables(loadedFlow));
    } catch (cause) {
      setSelectedId('');
      setFlow(null);
      setVariables({});
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadLabBootstrapByToken = useCallback(async (rawToken: string): Promise<void> => {
    const token = rawToken.trim();
    if (!token) return;
    setError('');
    setNotice('');
    setLoading(true);
    setInstance(null);
    try {
      const result = await runReactMobileBootstrap(token);
      setJourneyIdInput(result.bootstrap.journeyId);
      setSelectedId(result.bootstrap.journeyId);
      setFlow(result.flow);
      setVariables(result.bootstrap.variables);
      setInstance(result.instance);
    } catch (cause) {
      setSelectedId('');
      setFlow(null);
      setVariables({});
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void Linking.getInitialURL().then((url) => {
      if (!active) return;
      const bootstrapToken = labBootstrapFromUrl(url);
      if (bootstrapToken) {
        void loadLabBootstrapByToken(bootstrapToken);
        return;
      }
      const deepLinkedId = journeyIdFromUrl(url);
      const initialId = deepLinkedId || INITIAL_JOURNEY_ID;
      if (initialId) void loadJourneyById(initialId);
    });
    const subscription = Linking.addEventListener('url', ({ url }) => {
      const bootstrapToken = labBootstrapFromUrl(url);
      if (bootstrapToken) {
        void loadLabBootstrapByToken(bootstrapToken);
        return;
      }
      const journeyId = journeyIdFromUrl(url);
      if (journeyId) void loadJourneyById(journeyId);
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, [loadJourneyById, loadLabBootstrapByToken]);

  const handleStep = useCallback((step: JourneyStep) => {
    setError('');
    setInstance((current) => current ? { ...current, step } : current);
  }, []);

  const handleError = useCallback((message: string) => setError(message), []);
  const handleNotice = useCallback((message: string) => setNotice(message), []);

  const start = async (): Promise<void> => {
    if (!selectedId || !flow) return;
    if (!flow.channelTypes.includes('MOBILE')) {
      setError('Esta jornada não está publicada para o canal MOBILE.');
      return;
    }
    if (!hasRequiredVariables(flow, variables)) {
      setError('Preencha todas as variáveis iniciais obrigatórias.');
      return;
    }
    setLoading(true);
    setError('');
    setNotice('');
    try {
      setInstance(await client.startJourney(selectedId, 'MOBILE', variables));
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  const stop = async (): Promise<void> => {
    if (!instance) return;
    setLoading(true);
    setError('');
    try {
      if (instance.step.type !== 'ENDED') await client.stopInstance(instance.processInstanceId);
      setInstance(null);
      setNotice('Instância encerrada no canal.');
    } catch (cause) {
      setError(messageOf(cause));
    } finally {
      setLoading(false);
    }
  };

  const mobileSupported = flow?.channelTypes.includes('MOBILE') ?? true;
  const canStart = Boolean(selectedId && flow && mobileSupported && hasRequiredVariables(flow, variables));

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" backgroundColor={String(colors.surface)} />
      <SafeAreaView style={[styles.app, { backgroundColor: colors.backgroundPrimary }]}>
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={styles.headerText}>
            <Text accessibilityRole="header" style={[styles.title, { color: colors.textPrimary }]}>Canal React Native</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>Referência nativa · integração exclusiva via Emulator BFF</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: colors.informativeLow }]}>
            <Text style={[styles.badgeText, { color: colors.brand }]}>react.mobile · :18081</Text>
          </View>
        </View>

        {error ? <Text accessibilityRole="alert" style={[styles.feedback, { backgroundColor: colors.negativeLow, borderColor: colors.negative, color: colors.negative }]}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" style={[styles.feedback, { backgroundColor: colors.informativeLow, borderColor: colors.brand, color: colors.textPrimary }]}>{notice}</Text> : null}

        {!instance ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.formScroll}>
            <View style={[styles.panel, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.field}>
                <Text style={[styles.fieldLabel, { color: colors.textPrimary }]}>Journey ID</Text>
                <TextInput
                  accessibilityLabel="Journey ID"
                  value={journeyIdInput}
                  editable={!loading}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="UUID da jornada publicada"
                  placeholderTextColor={colors.textSecondary}
                  onChangeText={setJourneyIdInput}
                  onSubmitEditing={() => void loadJourneyById(journeyIdInput)}
                  style={[styles.input, { borderColor: colors.border, color: colors.textPrimary }]}
                />
              </View>
              <ActionButton
                label="Carregar jornada"
                onPress={() => void loadJourneyById(journeyIdInput)}
                disabled={!journeyIdInput.trim() || loading}
                secondary
                busy={loading}
              />

              {flow && !mobileSupported
                ? <Text accessibilityRole="alert" style={[styles.errorText, { color: colors.negative }]}>A jornada carregada não oferece o canal MOBILE.</Text>
                : null}

              {startDefinitions(flow).map((definition) => {
                const name = String(definition.name ?? '').trim();
                if (!name) return null;
                return (
                  <StartVariableField
                    key={name}
                    definition={definition}
                    value={variables[name]}
                    onChange={(value) => setVariables((current) => ({ ...current, [name]: value }))}
                  />
                );
              })}

              {flow
                ? <ActionButton label="Iniciar jornada" onPress={() => void start()} disabled={!canStart || loading} busy={loading} />
                : null}
            </View>
          </ScrollView>
        ) : (
          <View style={styles.instanceArea}>
            <Text numberOfLines={2} style={[styles.instanceMeta, { backgroundColor: colors.surface, color: colors.textSecondary }]}>processInstanceId: {instance.processInstanceId}{'\n'}taskId: {instance.step.taskId ?? '—'} · estado: {instance.step.type}</Text>
            <View style={styles.rendererArea}>
              <StepView journeyId={selectedId} instance={instance} onStep={handleStep} onError={handleError} onNotice={handleNotice} />
            </View>
            <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
              <ActionButton label={instance.step.type === 'ENDED' ? 'Voltar' : 'Encerrar instância'} onPress={() => void stop()} disabled={loading} secondary busy={loading} />
            </View>
          </View>
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  actionButton: { alignItems: 'center', borderRadius: 24, borderWidth: 1, justifyContent: 'center', minHeight: 48, paddingHorizontal: 22, paddingVertical: 10 },
  actionButtonLabel: { fontSize: 16, fontWeight: '700' },
  app: { flex: 1 },
  badge: { borderRadius: 14, paddingHorizontal: 10, paddingVertical: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  diagnostic: { fontSize: 11, paddingHorizontal: 12, paddingVertical: 6 },
  errorText: { fontSize: 14, lineHeight: 20, padding: 16 },
  feedback: { borderBottomWidth: 1, fontSize: 14, lineHeight: 20, paddingHorizontal: 16, paddingVertical: 10 },
  field: { gap: 7, width: '100%' },
  fieldLabel: { fontSize: 14, fontWeight: '600' },
  footer: { alignItems: 'flex-start', borderTopWidth: StyleSheet.hairlineWidth, padding: 10 },
  formScroll: { flexGrow: 1, padding: 16 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', gap: 12, justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerText: { flex: 1, gap: 2 },
  input: { borderRadius: 9, borderWidth: 1, fontSize: 16, minHeight: 48, paddingHorizontal: 12, paddingVertical: 10 },
  instanceArea: { flex: 1 },
  instanceMeta: { fontSize: 11, lineHeight: 15, paddingHorizontal: 12, paddingVertical: 7 },
  panel: { alignSelf: 'center', borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, gap: 16, maxWidth: 640, padding: 16, width: '100%' },
  rendererArea: { flex: 1 },
  statePanel: { gap: 16, padding: 20 },
  stateTitle: { fontSize: 24, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 16 },
  switchField: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  title: { fontSize: 20, fontWeight: '700' },
});
