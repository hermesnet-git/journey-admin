typedef JsonMap = Map<String, dynamic>;

const sduiComponentTypes = <String>{
  'ui.screen',
  'ui.container',
  'ui.stack',
  'ui.card',
  'ui.text',
  'ui.image',
  'ui.icon',
  'ui.divider',
  'ui.spacer',
  'ui.textInput',
  'ui.textArea',
  'ui.select',
  'ui.checkbox',
  'ui.datePicker',
  'ui.button',
  'ui.link',
  'ui.alert',
  'ui.progress',
  'ui.loading',
};

const sduiActionTypes = <String>{
  'action.submit',
  'action.navigate',
  'action.openUrl',
  'action.setValue',
  'action.track',
  'action.dismiss',
};

class SduiBinding {
  const SduiBinding({required this.path, required this.mode});

  final String path;
  final String mode;

  factory SduiBinding.fromJson(JsonMap json) => SduiBinding(
        path: json['path'] as String? ?? '',
        mode: json['mode'] as String? ?? 'oneWay',
      );
}

class SduiEvent {
  const SduiEvent({required this.action, this.params = const {}});

  final String action;
  final JsonMap params;

  factory SduiEvent.fromJson(JsonMap json) => SduiEvent(
        action: json['action'] as String? ?? '',
        params: _map(json['params']),
      );
}

class SduiVisibility {
  const SduiVisibility({required this.path, required this.rule, this.value});

  final String path;
  final String rule;
  final dynamic value;

  factory SduiVisibility.fromJson(JsonMap json) => SduiVisibility(
        path: json['path'] as String? ?? '',
        rule: json['rule'] as String? ?? '',
        value: json['value'],
      );
}

class SduiNode {
  const SduiNode({
    required this.id,
    required this.type,
    required this.version,
    required this.props,
    required this.bindings,
    required this.events,
    required this.children,
    this.visibility,
  });

  final String id;
  final String type;
  final String version;
  final JsonMap props;
  final Map<String, SduiBinding> bindings;
  final Map<String, SduiEvent> events;
  final List<SduiNode> children;
  final SduiVisibility? visibility;

  factory SduiNode.fromJson(JsonMap json) {
    final bindings = <String, SduiBinding>{};
    _map(json['bindings']).forEach((key, value) {
      final raw = _map(value);
      if (raw.isNotEmpty) bindings[key] = SduiBinding.fromJson(raw);
    });
    final events = <String, SduiEvent>{};
    _map(json['events']).forEach((key, value) {
      final raw = _map(value);
      if (raw.isNotEmpty) events[key] = SduiEvent.fromJson(raw);
    });
    final visibility = _map(json['visibility']);
    return SduiNode(
      id: json['id'] as String? ?? '',
      type: json['type'] as String? ?? '',
      version: json['version'] as String? ?? '',
      props: _map(json['props']),
      bindings: bindings,
      events: events,
      children: _list(json['children'])
          .map(_map)
          .where((value) => value.isNotEmpty)
          .map(SduiNode.fromJson)
          .toList(growable: false),
      visibility: visibility.isEmpty ? null : SduiVisibility.fromJson(visibility),
    );
  }
}

class SduiParseResult {
  const SduiParseResult({this.root, this.diagnostics = const []});

  final SduiNode? root;
  final List<String> diagnostics;
  bool get valid => root != null && diagnostics.isEmpty;
}

SduiParseResult parseSduiDocument(dynamic input) {
  final document = _map(input);
  if (document.isEmpty) {
    return const SduiParseResult(diagnostics: ['SDUI_DOCUMENT_NOT_OBJECT']);
  }
  final rootJson = document.containsKey('root') ? _map(document['root']) : document;
  final diagnostics = <String>[];
  final ids = <String>{};

  void validate(JsonMap raw, String path) {
    final id = raw['id'];
    final type = raw['type'];
    final version = raw['version'];
    if (id is! String || id.trim().isEmpty) {
      diagnostics.add('SDUI_NODE_ID_REQUIRED ($path.id)');
    } else if (!ids.add(id)) {
      diagnostics.add('SDUI_NODE_ID_DUPLICATED ($path.id)');
    }
    if (type is! String || !sduiComponentTypes.contains(type)) {
      diagnostics.add('SDUI_COMPONENT_UNSUPPORTED ($path.type)');
    }
    if (version is! String || !RegExp(r'^1\.\d+$').hasMatch(version)) {
      diagnostics.add('SDUI_VERSION_UNSUPPORTED ($path.version)');
    }
    if (raw['props'] != null && raw['props'] is! Map) {
      diagnostics.add('SDUI_PROPS_INVALID ($path.props)');
    }
    final children = raw['children'];
    if (children != null && children is! List) {
      diagnostics.add('SDUI_CHILDREN_INVALID ($path.children)');
    } else {
      for (var index = 0; index < _list(children).length; index++) {
        final child = _map(_list(children)[index]);
        if (child.isEmpty) {
          diagnostics.add('SDUI_NODE_NOT_OBJECT ($path.children[$index])');
        } else {
          validate(child, '$path.children[$index]');
        }
      }
    }
  }

  if (rootJson.isEmpty) {
    diagnostics.add('SDUI_ROOT_REQUIRED');
    return SduiParseResult(diagnostics: diagnostics);
  }
  validate(rootJson, document.containsKey('root') ? r'$.root' : r'$');
  if (rootJson['type'] != 'ui.screen') diagnostics.add('SDUI_ROOT_NOT_SCREEN');
  return SduiParseResult(
    root: diagnostics.isEmpty ? SduiNode.fromJson(rootJson) : null,
    diagnostics: diagnostics,
  );
}

JsonMap _map(dynamic value) => value is Map
    ? value.map((key, child) => MapEntry(key.toString(), child))
    : <String, dynamic>{};

List<dynamic> _list(dynamic value) => value is List ? value : const [];

