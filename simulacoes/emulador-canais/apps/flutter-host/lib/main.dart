import 'dart:async';
import 'dart:convert';

import 'package:elastic_journey_client/elastic_journey_client.dart';
import 'package:elastic_journey_renderer_flutter_mistica/elastic_journey_renderer_flutter_mistica.dart';
import 'package:elastic_journey_sdui_runtime/elastic_journey_sdui_runtime.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:url_launcher/url_launcher.dart';

import 'lab_url_cleanup.dart';

void main() => runApp(const ElasticJourneyFlutterHost());

const _configuredBffUrl = String.fromEnvironment('EMULATOR_BFF_BASE_URL');
const _configuredJourneyId = String.fromEnvironment('JOURNEY_ID');
const _configuredLabBootstrapToken = String.fromEnvironment(
  'LAB_BOOTSTRAP_TOKEN',
);

String get _defaultBffUrl {
  if (kIsWeb) {
    return 'http://127.0.0.1:18085/api/v1';
  }
  if (defaultTargetPlatform == TargetPlatform.android) {
    return 'http://10.0.2.2:18085/api/v1';
  }
  return 'http://127.0.0.1:18085/api/v1';
}

class ElasticJourneyFlutterHost extends StatelessWidget {
  const ElasticJourneyFlutterHost({super.key});

  @override
  Widget build(BuildContext context) {
    const tokens = FlutterMisticaTokens();
    return MaterialApp(
      debugShowCheckedModeBanner: false,
      title: 'Elastic Journey · Flutter',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: tokens.brand,
          surface: tokens.surface,
        ),
        scaffoldBackgroundColor: tokens.background,
        inputDecorationTheme: const InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
        ),
        useMaterial3: true,
      ),
      home: const ChannelHostPage(),
    );
  }
}

class ChannelHostPage extends StatefulWidget {
  const ChannelHostPage({super.key});

  @override
  State<ChannelHostPage> createState() => _ChannelHostPageState();
}

class _ChannelHostPageState extends State<ChannelHostPage> {
  late final String _bffUrl = _configuredBffUrl.isEmpty
      ? _defaultBffUrl
      : _configuredBffUrl;
  late final JourneyClient _client = JourneyClient(baseUrl: _bffUrl);
  late final String _labBootstrapToken = kIsWeb
      ? Uri.base.queryParameters['labBootstrap']?.trim() ?? ''
      : _configuredLabBootstrapToken.trim();
  late final TextEditingController _journeyId = TextEditingController(
    text: _configuredJourneyId.isNotEmpty
        ? _configuredJourneyId
        : Uri.base.queryParameters['journeyId'] ?? '',
  );
  final Map<String, TextEditingController> _variableControllers = {};
  final List<RendererDiagnostic> _diagnostics = [];
  FlowBundle? _flow;
  JourneyInstance? _instance;
  SduiRuntime? _runtime;
  List<String> _sduiDiagnostics = const [];
  bool _loading = false;
  bool _submitting = false;
  String? _selectedJourneyId;
  String? _error;

  @override
  void initState() {
    super.initState();
    if (_labBootstrapToken.isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadLabBootstrap());
    } else if (_journeyId.text.trim().isNotEmpty) {
      WidgetsBinding.instance.addPostFrameCallback((_) => _loadJourney());
    }
  }

  @override
  void dispose() {
    _journeyId.dispose();
    for (final controller in _variableControllers.values) {
      controller.dispose();
    }
    super.dispose();
  }

  Future<void> _loadJourney() async {
    final id = _journeyId.text.trim();
    if (id.isEmpty) {
      setState(
        () => _error =
            'Informe o journeyId selecionado no Admin ou recebido pelo Channel Lab.',
      );
      return;
    }
    _setBusy(true);
    try {
      final flow = await _client.getFlow(id);
      _replaceVariableControllers(flow.startVariables);
      if (!mounted) return;
      setState(() {
        _flow = flow;
        _selectedJourneyId = id;
        _instance = null;
        _runtime = null;
        _error = null;
      });
    } catch (error) {
      _showError(error);
    } finally {
      _setBusy(false);
    }
  }

  Future<void> _loadLabBootstrap() async {
    _setBusy(true);
    try {
      final bootstrap = await _fetchLabBootstrap(_labBootstrapToken);
      final expectedTarget = kIsWeb ? 'flutter.web' : 'flutter.mobile';
      if (bootstrap.target != expectedTarget) {
        throw JourneyClientException(
          'O bootstrap foi criado para ${bootstrap.target}, mas este host aceita apenas $expectedTarget.',
          status: 409,
          code: 'LAB_BOOTSTRAP_TARGET_MISMATCH',
        );
      }
      removeLabBootstrapFromUrl(bootstrap.journeyId);

      final flow = await _client.getFlow(bootstrap.journeyId);
      _ensureFlowSupportsChannel(flow);
      if (!mounted) return;
      _replaceVariableControllers(
        flow.startVariables,
        values: bootstrap.variables,
      );
      setState(() {
        _journeyId.text = bootstrap.journeyId;
        _flow = flow;
        _selectedJourneyId = bootstrap.journeyId;
        _instance = null;
        _runtime = null;
        _error = null;
      });

      final instance = await _client.startJourney(
        bootstrap.journeyId,
        channelType: _channelType,
        variables: bootstrap.variables,
      );
      if (!mounted) return;
      setState(() {
        _instance = instance;
        _error = null;
      });
      _prepareStep(instance.step);
    } catch (error) {
      _showError(error);
    } finally {
      _setBusy(false);
    }
  }

  Future<_LabBootstrap> _fetchLabBootstrap(String token) async {
    final uri = _labBootstrapUri(token);
    try {
      final response = await http
          .get(uri, headers: const {'accept': 'application/json'})
          .timeout(const Duration(seconds: 10));
      dynamic decoded;
      try {
        decoded = response.bodyBytes.isEmpty
            ? <String, dynamic>{}
            : jsonDecode(utf8.decode(response.bodyBytes));
      } on FormatException {
        decoded = <String, dynamic>{};
      }
      final payload = decoded is Map
          ? decoded.map((key, value) => MapEntry(key.toString(), value))
          : <String, dynamic>{};
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw JourneyClientException(
          payload['detail']?.toString() ??
              payload['title']?.toString() ??
              'O Emulator BFF respondeu HTTP ${response.statusCode} ao carregar o bootstrap.',
          status: response.statusCode,
          code: payload['code']?.toString(),
        );
      }
      return _LabBootstrap.fromJson(payload);
    } on TimeoutException {
      throw const JourneyClientException(
        'Tempo limite excedido ao carregar o bootstrap do Channel Lab.',
        status: 503,
        code: 'LAB_BOOTSTRAP_TIMEOUT',
      );
    } on JourneyClientException {
      rethrow;
    } catch (_) {
      throw const JourneyClientException(
        'Não foi possível carregar o bootstrap do Channel Lab.',
        status: 503,
        code: 'LAB_BOOTSTRAP_UNAVAILABLE',
      );
    }
  }

  Uri _labBootstrapUri(String token) {
    final configured = Uri.parse(_bffUrl);
    final rootPath = configured.path
        .replaceFirst(RegExp(r'/api/v1/?$'), '')
        .replaceFirst(RegExp(r'/$'), '');
    return configured.replace(
      path: '$rootPath/api/lab/v1/bootstraps/${Uri.encodeComponent(token)}',
      query: '',
      fragment: '',
    );
  }

  void _replaceVariableControllers(
    List<StartVariableDefinition> definitions, {
    Map<String, dynamic> values = const {},
  }) {
    for (final controller in _variableControllers.values) {
      controller.dispose();
    }
    _variableControllers
      ..clear()
      ..addEntries(
        definitions
            .where((definition) => definition.name.isNotEmpty)
            .map(
              (definition) => MapEntry(
                definition.name,
                TextEditingController(
                  text: values[definition.name]?.toString() ?? '',
                ),
              ),
            ),
      );
  }

  Map<String, dynamic> _variables() {
    final result = <String, dynamic>{};
    for (final definition
        in _flow?.startVariables ?? const <StartVariableDefinition>[]) {
      final raw = _variableControllers[definition.name]?.text ?? '';
      result[definition.name] = switch (definition.type) {
        'number' => num.tryParse(raw.replaceFirst(',', '.')) ?? raw,
        'boolean' => raw.toLowerCase() == 'true',
        _ => raw,
      };
    }
    return result;
  }

  String get _channelType => kIsWeb ? 'WEB' : 'MOBILE';

  void _ensureFlowSupportsChannel(FlowBundle flow) {
    final supportsChannel = flow.channelTypes.any(
      (channel) => channel.trim().toUpperCase() == _channelType,
    );
    if (!supportsChannel) {
      throw JourneyClientException(
        'A jornada não está publicada para o canal $_channelType.',
        status: 409,
        code: 'FLOW_CHANNEL_NOT_SUPPORTED',
      );
    }
  }

  Future<void> _startJourney() async {
    final id = _selectedJourneyId;
    if (id == null) return;
    _setBusy(true);
    try {
      final flow = _flow;
      if (flow == null) return;
      _ensureFlowSupportsChannel(flow);
      final instance = await _client.startJourney(
        id,
        channelType: _channelType,
        variables: _variables(),
      );
      if (!mounted) return;
      setState(() => _instance = instance);
      _prepareStep(instance.step);
    } catch (error) {
      _showError(error);
    } finally {
      _setBusy(false);
    }
  }

  void _prepareStep(JourneyStep step) {
    _diagnostics.clear();
    _sduiDiagnostics = const [];
    final form = step.form;
    if (step.type != 'USER_TASK' || form == null) {
      setState(() => _runtime = null);
      return;
    }
    final parsed = parseSduiDocument(form.sdui);
    if (!parsed.valid || parsed.root == null) {
      setState(() {
        _runtime = null;
        _sduiDiagnostics = parsed.diagnostics;
      });
      return;
    }
    final runtime = SduiRuntime(
      root: parsed.root!,
      context: {
        'session': {
          'channel': kIsWeb ? 'FLUTTER_WEB' : 'FLUTTER_MOBILE',
          'locale': 'pt-BR',
        },
      },
      handlers: RuntimeHandlers(
        submit: _submitAnswers,
        openUrl: _openUrl,
        navigate: (params, _) async => _notify(
          'Navegação solicitada: ${params['route'] ?? params['destination'] ?? 'destino não informado'}',
        ),
        track: (params, _) async =>
            _notify('Evento registrado: ${params['event'] ?? 'sem nome'}'),
      ),
    );
    setState(() => _runtime = runtime);
  }

  Future<void> _submitAnswers(
    Map<String, dynamic> answers,
    RuntimeActionContext _,
  ) async {
    final instance = _instance;
    final taskId = instance?.step.taskId;
    if (instance == null || taskId == null) return;
    setState(() => _submitting = true);
    try {
      final step = await _client.completeTask(
        instance.processInstanceId,
        taskId,
        answers,
      );
      if (!mounted) return;
      setState(() {
        _instance = instance.withStep(step);
        _error = null;
      });
      _prepareStep(step);
    } catch (error) {
      _showError(error);
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  Future<void> _openUrl(
    Map<String, dynamic> params,
    RuntimeActionContext _,
  ) async {
    final uri = Uri.tryParse(params['url']?.toString() ?? '');
    if (uri == null || (uri.scheme != 'http' && uri.scheme != 'https')) {
      throw const JourneyClientException(
        'URL bloqueada pelo canal Flutter.',
        status: 400,
      );
    }
    if (!await launchUrl(uri, mode: LaunchMode.externalApplication)) {
      throw const JourneyClientException(
        'Não foi possível abrir a URL solicitada.',
        status: 500,
      );
    }
  }

  Future<void> _refreshStep() async {
    final instance = _instance;
    if (instance == null) return;
    _setBusy(true);
    try {
      final step = await _client.getCurrentStep(instance.processInstanceId);
      if (!mounted) return;
      setState(() => _instance = instance.withStep(step));
      _prepareStep(step);
    } catch (error) {
      _showError(error);
    } finally {
      _setBusy(false);
    }
  }

  Future<void> _stopInstance() async {
    final instance = _instance;
    if (instance == null) return;
    try {
      await _client.stopInstance(instance.processInstanceId);
      if (!mounted) return;
      setState(() {
        _instance = null;
        _runtime = null;
        _error = null;
      });
    } catch (error) {
      _showError(error);
    }
  }

  void _setBusy(bool value) {
    if (mounted) setState(() => _loading = value);
  }

  void _showError(Object error) {
    if (!mounted) return;
    setState(
      () => _error = error is JourneyClientException
          ? error.message
          : 'Falha inesperada no canal Flutter.',
    );
  }

  void _notify(String message) {
    if (!mounted) return;
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Canal Flutter',
              style: TextStyle(fontWeight: FontWeight.w700),
            ),
            Text(
              'Referência Web e Mobile · via Emulator BFF',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w400),
            ),
          ],
        ),
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Chip(
                label: Text(kIsWeb ? 'flutter.web · :15172' : 'flutter.mobile'),
              ),
            ),
          ),
        ],
      ),
      body: SafeArea(
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 920),
            child: ListView(
              padding: const EdgeInsets.all(20),
              children: [
                if (_error != null) ...[
                  _HostAlert(message: _error!),
                  const SizedBox(height: 16),
                ],
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(20),
                    child: _instance == null ? _bootstrap() : _activeJourney(),
                  ),
                ),
                const SizedBox(height: 12),
                Text(
                  'BFF: $_bffUrl',
                  style: Theme.of(context).textTheme.bodySmall,
                  textAlign: TextAlign.center,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _bootstrap() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        TextField(
          controller: _journeyId,
          enabled: !_loading,
          decoration: const InputDecoration(
            labelText: 'Journey ID',
            hintText: 'UUID da jornada publicada',
            border: OutlineInputBorder(),
          ),
          onChanged: (_) => setState(() {}),
          onSubmitted: (_) => _loadJourney(),
        ),
        const SizedBox(height: 12),
        OutlinedButton.icon(
          onPressed: _journeyId.text.trim().isEmpty || _loading
              ? null
              : _loadJourney,
          icon: const Icon(Icons.download_outlined),
          label: const Text('Carregar jornada'),
        ),
        if (_flow != null) ...[
          const SizedBox(height: 20),
          Text(
            'Variáveis de início',
            style: Theme.of(context).textTheme.titleMedium,
          ),
          const SizedBox(height: 12),
          ..._flow!.startVariables.map(_variableField),
          FilledButton.icon(
            onPressed: _loading ? null : _startJourney,
            icon: _loading
                ? const SizedBox.square(
                    dimension: 18,
                    child: CircularProgressIndicator(strokeWidth: 2),
                  )
                : const Icon(Icons.play_arrow),
            label: const Text('Iniciar jornada'),
          ),
        ],
      ],
    );
  }

  Widget _variableField(StartVariableDefinition definition) {
    if (definition.type == 'boolean') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: DropdownButtonFormField<String>(
          initialValue:
              _variableControllers[definition.name]?.text.toLowerCase() ==
                  'true'
              ? 'true'
              : 'false',
          decoration: InputDecoration(
            labelText: definition.label,
            border: const OutlineInputBorder(),
          ),
          items: const [
            DropdownMenuItem(value: 'false', child: Text('Não')),
            DropdownMenuItem(value: 'true', child: Text('Sim')),
          ],
          onChanged: (value) =>
              _variableControllers[definition.name]?.text = value ?? 'false',
        ),
      );
    }
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: TextField(
        controller: _variableControllers[definition.name],
        keyboardType: definition.type == 'number'
            ? const TextInputType.numberWithOptions(decimal: true)
            : null,
        decoration: InputDecoration(
          labelText: '${definition.label}${definition.required ? ' *' : ''}',
          border: const OutlineInputBorder(),
        ),
      ),
    );
  }

  Widget _activeJourney() {
    final instance = _instance!;
    final step = instance.step;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Theme.of(context).colorScheme.surfaceContainerHighest,
            borderRadius: BorderRadius.circular(8),
          ),
          child: Text(
            'processInstanceId: ${instance.processInstanceId}\ntaskId: ${step.taskId ?? '—'} · estado: ${step.type}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ),
        const SizedBox(height: 16),
        if (step.errorMessage != null) ...[
          _HostAlert(message: step.errorMessage!),
          const SizedBox(height: 12),
        ],
        if (step.type == 'WAITING') ...[
          Text(
            'Jornada aguardando',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          Text(step.nodeName ?? step.nodeType ?? 'Processamento externo'),
          const SizedBox(height: 12),
          FilledButton(
            onPressed: _loading ? null : _refreshStep,
            child: const Text('Atualizar passo'),
          ),
        ] else if (step.type == 'ENDED') ...[
          Text(
            'Jornada concluída',
            style: Theme.of(context).textTheme.headlineSmall,
          ),
          const SizedBox(height: 8),
          const Text('A instância chegou ao fim.'),
        ] else if (_runtime != null) ...[
          SduiRendererFlutter(
            runtime: _runtime!,
            submitting: _submitting,
            onDiagnostic: (diagnostic) {
              if (_diagnostics.any(
                (item) =>
                    item.code == diagnostic.code &&
                    item.nodeId == diagnostic.nodeId,
              )) {
                return;
              }
              setState(() => _diagnostics.add(diagnostic));
            },
          ),
        ] else ...[
          _HostAlert(
            message:
                'SDUI incompatível: ${_sduiDiagnostics.isEmpty ? 'formulário ausente' : _sduiDiagnostics.join(', ')}',
          ),
        ],
        if (_diagnostics.isNotEmpty) ...[
          const SizedBox(height: 12),
          Text(
            'Diagnóstico do renderer: ${_diagnostics.map((item) => '${item.code}:${item.nodeId}').join(', ')}',
            style: Theme.of(context).textTheme.bodySmall,
          ),
        ],
        const SizedBox(height: 20),
        OutlinedButton(
          onPressed: _stopInstance,
          child: const Text('Encerrar instância'),
        ),
      ],
    );
  }
}

class _LabBootstrap {
  const _LabBootstrap({
    required this.journeyId,
    required this.target,
    required this.variables,
  });

  final String journeyId;
  final String target;
  final Map<String, dynamic> variables;

  factory _LabBootstrap.fromJson(Map<String, dynamic> json) {
    final journeyId = json['journeyId']?.toString().trim() ?? '';
    final target = json['target']?.toString().trim() ?? '';
    final rawVariables = json['variables'];
    if (journeyId.isEmpty || target.isEmpty || rawVariables is! Map) {
      throw const JourneyClientException(
        'O Emulator BFF retornou um bootstrap inválido.',
        status: 502,
        code: 'INVALID_LAB_BOOTSTRAP',
      );
    }
    return _LabBootstrap(
      journeyId: journeyId,
      target: target,
      variables: rawVariables.map(
        (key, value) => MapEntry(key.toString(), value),
      ),
    );
  }
}

class _HostAlert extends StatelessWidget {
  const _HostAlert({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(14),
    decoration: BoxDecoration(
      color: Theme.of(context).colorScheme.errorContainer,
      border: Border.all(color: Theme.of(context).colorScheme.error),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Row(
      children: [
        Icon(Icons.error_outline, color: Theme.of(context).colorScheme.error),
        const SizedBox(width: 10),
        Expanded(child: Text(message)),
      ],
    ),
  );
}
