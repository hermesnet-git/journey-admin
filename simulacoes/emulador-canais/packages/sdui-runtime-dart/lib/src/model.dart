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
const sduiContainerTypes = <String>{
  'ui.screen',
  'ui.container',
  'ui.stack',
  'ui.card',
};
const sduiInputTypes = <String>{
  'ui.textInput',
  'ui.textArea',
  'ui.select',
  'ui.checkbox',
  'ui.datePicker',
};
const sduiActionTypes = <String>{
  'action.submit',
  'action.navigate',
  'action.openUrl',
  'action.setValue',
  'action.track',
  'action.dismiss',
};
const _namespaces = <String>{'form', 'data', 'session', 'route', 'computed'};
const _conditions = <String>{'equals', 'notEquals', 'in', 'notIn'};
const _targets = <String>{
  'react.web',
  'react.mobile',
  'flutter.web',
  'flutter.mobile',
  'whatsapp',
};
final _semver = RegExp(r'^\d+\.\d+\.\d+$');
const _reserved = <String>{
  r'$bindings',
  r'$events',
  r'$visibility',
  r'$active',
};
const _bindingNames = <String, List<String>>{
  'ui.text': ['text'],
  'ui.image': ['source', 'alt'],
  'ui.textInput': ['value'],
  'ui.textArea': ['value'],
  'ui.select': ['value'],
  'ui.checkbox': ['value'],
  'ui.datePicker': ['value'],
  'ui.alert': ['title', 'message'],
  'ui.progress': ['value'],
};
const _eventNames = <String, List<String>>{
  'ui.button': ['onPress'],
  'ui.link': ['onPress'],
  'ui.alert': ['onDismiss'],
};
const _required = <String, List<String>>{
  'ui.text': ['text'],
  'ui.image': ['source', 'alt'],
  'ui.icon': ['name', 'accessibilityLabel'],
  'ui.spacer': ['sizeToken'],
  'ui.textInput': ['label'],
  'ui.textArea': ['label'],
  'ui.select': ['label', 'options'],
  'ui.checkbox': ['label'],
  'ui.datePicker': ['label', 'mode'],
  'ui.button': ['label'],
  'ui.link': ['label'],
  'ui.alert': ['severity', 'message'],
  'ui.progress': ['value'],
};
const _optional = <String, List<String>>{
  'ui.screen': ['title', 'backgroundToken', 'scrollable', 'paddingToken'],
  'ui.container': ['backgroundToken', 'paddingToken', 'borderRadiusToken'],
  'ui.stack': ['direction', 'spacingToken', 'alignment'],
  'ui.card': ['variant', 'paddingToken', 'elevationToken'],
  'ui.text': ['variant', 'colorToken', 'align', 'maxLines'],
  'ui.image': ['fit', 'aspectRatio'],
  'ui.icon': ['sizeToken', 'colorToken'],
  'ui.divider': ['orientation', 'colorToken', 'spacingToken'],
  'ui.spacer': ['axis'],
  'ui.textInput': [
    'placeholder',
    'inputMode',
    'required',
    'readOnly',
    'maxLength',
    'validation',
  ],
  'ui.textArea': [
    'placeholder',
    'required',
    'readOnly',
    'minLines',
    'maxLines',
    'maxLength',
    'validation',
  ],
  'ui.select': ['placeholder', 'required', 'searchable'],
  'ui.checkbox': ['required', 'indeterminate'],
  'ui.datePicker': ['minDate', 'maxDate', 'format', 'required', 'validation'],
  'ui.button': ['variant', 'size', 'fullWidth', 'loading', 'disabled'],
  'ui.link': ['emphasis', 'external', 'accessibilityLabel'],
  'ui.alert': ['title', 'dismissible'],
  'ui.progress': ['label', 'showValue'],
  'ui.loading': ['label', 'sizeToken', 'overlay'],
};
const _allowedReserved = <String, List<String>>{
  'ui.screen': [],
  'ui.container': [r'$visibility', r'$active'],
  'ui.stack': [r'$visibility', r'$active'],
  'ui.card': [r'$visibility', r'$active'],
  'ui.text': [r'$bindings', r'$visibility'],
  'ui.image': [r'$bindings', r'$visibility'],
  'ui.icon': [r'$visibility'],
  'ui.divider': [r'$visibility'],
  'ui.spacer': [r'$visibility'],
  'ui.textInput': [r'$bindings', r'$visibility', r'$active'],
  'ui.textArea': [r'$bindings', r'$visibility', r'$active'],
  'ui.select': [r'$bindings', r'$visibility', r'$active'],
  'ui.checkbox': [r'$bindings', r'$visibility', r'$active'],
  'ui.datePicker': [r'$bindings', r'$visibility', r'$active'],
  'ui.button': [r'$events', r'$visibility', r'$active'],
  'ui.link': [r'$events', r'$visibility', r'$active'],
  'ui.alert': [r'$bindings', r'$events', r'$visibility', r'$active'],
  'ui.progress': [r'$bindings', r'$visibility'],
  'ui.loading': [r'$visibility'],
};

class SduiBinding {
  const SduiBinding({required this.path, required this.mode});
  final String path;
  final String mode;
  factory SduiBinding.fromJson(JsonMap j) => SduiBinding(
    path: j['path']?.toString() ?? '',
    mode: j['mode']?.toString() ?? '',
  );
}

class SduiEvent {
  const SduiEvent({required this.action, this.params = const {}});
  final String action;
  final JsonMap params;
  factory SduiEvent.fromJson(JsonMap j) => SduiEvent(
    action: j['action']?.toString() ?? '',
    params: _map(j['params']),
  );
}

class SduiCondition {
  const SduiCondition({required this.path, required this.rule, this.value});
  final String path;
  final String rule;
  final dynamic value;
  factory SduiCondition.fromJson(JsonMap j) => SduiCondition(
    path: j['path']?.toString() ?? '',
    rule: j['rule']?.toString() ?? '',
    value: j['value'],
  );
}

class SduiNode {
  const SduiNode({
    required this.id,
    required this.type,
    required this.version,
    required this.attributes,
    required this.bindings,
    required this.events,
    required this.children,
    this.visibility,
    this.active,
  });
  final String id, type, version;
  final JsonMap attributes;
  final Map<String, SduiBinding> bindings;
  final Map<String, SduiEvent> events;
  final List<SduiNode> children;
  final SduiCondition? visibility, active;
}

class SduiParseResult {
  const SduiParseResult({this.root, this.diagnostics = const []});
  final SduiNode? root;
  final List<String> diagnostics;
  bool get valid => root != null && diagnostics.isEmpty;
}

SduiParseResult parseSduiDocument(dynamic input) {
  final diagnostics = <String>[];
  final ids = <String>{};
  final envelope = _map(input);
  final isEnvelope = envelope.isNotEmpty;
  if (isEnvelope) {
    const allowedEnvelope = {
      'schemaVersion',
      'catalogVersion',
      'journeyId',
      'journeyVersion',
      'uiStepId',
      'status',
      'publishedAt',
      'supportedTargets',
      'minRendererVersion',
      'dataSources',
      'data',
    };
    for (final key in envelope.keys) {
      if (!allowedEnvelope.contains(key)) {
        diagnostics.add('SDUI_PROP_UNSUPPORTED (\$.$key)');
      }
    }
    for (final key in [
      'schemaVersion',
      'catalogVersion',
      'journeyId',
      'uiStepId',
      'status',
      'publishedAt',
    ]) {
      if ((envelope[key]?.toString() ?? '').trim().isEmpty)
        diagnostics.add('SDUI_DOCUMENT_INVALID (\$.${key})');
    }
    if (envelope['journeyVersion'] is! int ||
        (envelope['journeyVersion'] as int) < 1) {
      diagnostics.add(r'SDUI_DOCUMENT_INVALID ($.journeyVersion)');
    }
    for (final key in ['schemaVersion', 'catalogVersion']) {
      if (!_semver.hasMatch(envelope[key]?.toString() ?? '')) {
        diagnostics.add('SDUI_COMPONENT_VERSION_UNSUPPORTED (\$.$key)');
      }
    }
    if (envelope['status'] != 'published' &&
        envelope['status'] != 'deprecated') {
      diagnostics.add(r'SDUI_DOCUMENT_INVALID ($.status)');
    }
    final publishedAt = envelope['publishedAt']?.toString() ?? '';
    if (!publishedAt.endsWith('Z') ||
        DateTime.tryParse(publishedAt)?.isUtc != true) {
      diagnostics.add(r'SDUI_DOCUMENT_INVALID ($.publishedAt)');
    }
    final targets = envelope['supportedTargets'];
    if (targets is! List ||
        targets.any((target) => !_targets.contains(target))) {
      diagnostics.add(r'SDUI_TARGET_UNSUPPORTED ($.supportedTargets)');
    }
    final minimums = envelope['minRendererVersion'];
    if (minimums is! Map) {
      diagnostics.add(
        r'SDUI_RENDERER_VERSION_UNSUPPORTED ($.minRendererVersion)',
      );
    } else if (targets is List) {
      for (final target in targets) {
        if (!_semver.hasMatch(minimums[target]?.toString() ?? '')) {
          diagnostics.add(
            'SDUI_RENDERER_VERSION_UNSUPPORTED (\$.minRendererVersion.$target)',
          );
        }
      }
    }
    if (_map(envelope['dataSources']).isNotEmpty ||
        envelope['dataSources'] is! Map) {
      diagnostics.add(r'SDUI_DOCUMENT_INVALID ($.dataSources)');
    }
  }
  final raw = isEnvelope ? envelope['data'] : input;
  SduiNode? parse(dynamic value, String path, [String? parentType]) {
    if (value is! List) {
      diagnostics.add('SDUI_DOCUMENT_INVALID ($path)');
      return null;
    }
    final type = value.isNotEmpty ? value[0] : null;
    if (value.length < 2 || value[1] is! Map) {
      diagnostics.add('SDUI_DOCUMENT_INVALID ($path[1])');
    }
    final attrs = value.length > 1 ? _map(value[1]) : <String, dynamic>{};
    if (type is! String || !sduiComponentTypes.contains(type)) {
      diagnostics.add('SDUI_COMPONENT_UNSUPPORTED ($path[0])');
      return null;
    }
    if (type == 'ui.screen' && parentType != null) {
      diagnostics.add('SDUI_COMPONENT_NESTING_INVALID ($path[0])');
    }
    final container = sduiContainerTypes.contains(type);
    if (value.length != (container ? 3 : 2)) {
      diagnostics.add('SDUI_DOCUMENT_INVALID ($path)');
    }
    final id = attrs['id']?.toString() ?? '';
    if (id.isEmpty)
      diagnostics.add('SDUI_COMPONENT_ID_REQUIRED ($path[1].id)');
    else if (!ids.add(id))
      diagnostics.add('SDUI_COMPONENT_ID_DUPLICATED ($path[1].id)');
    final version = attrs['version']?.toString() ?? '';
    if (!RegExp(r'^1\.\d+\.\d+$').hasMatch(version))
      diagnostics.add('SDUI_COMPONENT_VERSION_UNSUPPORTED ($path[1].version)');
    final allowed = {
      'id',
      'version',
      ...?_required[type],
      ...?_optional[type],
      ...?_allowedReserved[type],
    };
    for (final key in attrs.keys) {
      if (key.startsWith(r'$') && !_reserved.contains(key))
        diagnostics.add('SDUI_RESERVED_ATTRIBUTE_UNSUPPORTED ($path[1].$key)');
      else if (!allowed.contains(key))
        diagnostics.add('SDUI_PROP_UNSUPPORTED ($path[1].$key)');
    }
    for (final key in _required[type] ?? const []) {
      if (attrs[key] == null ||
          (attrs[key] == '' && !(type == 'ui.image' && key == 'alt')))
        diagnostics.add('SDUI_PROP_REQUIRED ($path[1].$key)');
    }
    final bindings = <String, SduiBinding>{};
    final bindingsRaw = attrs[r'$bindings'];
    if (bindingsRaw != null) {
      if (bindingsRaw is! Map)
        diagnostics.add(r'SDUI_BINDING_INVALID');
      else
        _map(bindingsRaw).forEach((key, value) {
          final b = _map(value);
          final binding = SduiBinding.fromJson(b);
          if (!(_bindingNames[type] ?? const []).contains(key) ||
              !_validPath(binding.path) ||
              (binding.mode != 'oneWay' && binding.mode != 'twoWay') ||
              (binding.mode == 'twoWay' && !binding.path.startsWith('form.')) ||
              (!sduiInputTypes.contains(type) && binding.mode != 'oneWay'))
            diagnostics.add('SDUI_BINDING_INVALID ($path[1].\$bindings.$key)');
          else
            bindings[key] = binding;
        });
    }
    if (sduiInputTypes.contains(type) && !bindings.containsKey('value'))
      diagnostics.add('SDUI_BINDING_INVALID ($path[1].\$bindings.value)');
    final events = <String, SduiEvent>{};
    final eventsRaw = attrs[r'$events'];
    if (eventsRaw != null) {
      if (eventsRaw is! Map)
        diagnostics.add('SDUI_EVENT_INVALID ($path[1].\$events)');
      else
        _map(eventsRaw).forEach((key, value) {
          final e = SduiEvent.fromJson(_map(value));
          if (!(_eventNames[type] ?? const []).contains(key) ||
              !sduiActionTypes.contains(e.action))
            diagnostics.add('SDUI_EVENT_INVALID ($path[1].\$events.$key)');
          else
            events[key] = e;
        });
    }
    if ((type == 'ui.button' || type == 'ui.link') &&
        !events.containsKey('onPress'))
      diagnostics.add('SDUI_EVENT_INVALID ($path[1].\$events.onPress)');
    if (type == 'ui.alert' &&
        events.containsKey('onDismiss') &&
        attrs['dismissible'] != true)
      diagnostics.add('SDUI_EVENT_INVALID ($path[1].\$events.onDismiss)');
    if (type == 'ui.stack' &&
        attrs['direction'] != null &&
        !['vertical', 'horizontal'].contains(attrs['direction']))
      diagnostics.add('SDUI_PROP_INVALID ($path[1].direction)');
    if (type == 'ui.stack' &&
        attrs['alignment'] != null &&
        !['start', 'center', 'end', 'stretch'].contains(attrs['alignment']))
      diagnostics.add('SDUI_PROP_INVALID ($path[1].alignment)');
    if (type == 'ui.datePicker' &&
        !['date', 'time', 'dateTime'].contains(attrs['mode']))
      diagnostics.add('SDUI_PROP_INVALID ($path[1].mode)');
    if (type == 'ui.progress' &&
        (attrs['value'] is! num || attrs['value'] < 0 || attrs['value'] > 1))
      diagnostics.add('SDUI_PROP_INVALID ($path[1].value)');
    if (type == 'ui.select' &&
        (attrs['options'] is! List ||
            (attrs['options'] as List).any((option) {
              final item = _map(option);
              return item['value'] is! String ||
                  (item['value'] as String).trim().isEmpty ||
                  item['label'] is! String ||
                  (item['label'] as String).trim().isEmpty;
            }))) {
      diagnostics.add('SDUI_PROP_INVALID ($path[1].options)');
    }
    SduiCondition? parseCondition(String key) {
      if (attrs[key] != null && attrs[key] is! Map) {
        diagnostics.add('SDUI_CONDITION_INVALID ($path[1].$key)');
        return null;
      }
      final c = _map(attrs[key]);
      if (c.isEmpty) return null;
      final parsed = SduiCondition.fromJson(c);
      if (!_validPath(parsed.path) ||
          !_conditions.contains(parsed.rule) ||
          !c.containsKey('value'))
        diagnostics.add('SDUI_CONDITION_INVALID ($path[1].$key)');
      return parsed;
    }

    final children = <SduiNode>[];
    if (container) {
      final list = value.length > 2 ? value[2] : null;
      if (list is! List)
        diagnostics.add('SDUI_DOCUMENT_INVALID ($path[2])');
      else
        for (var i = 0; i < list.length; i++) {
          final child = parse(list[i], '$path[2][$i]', type);
          if (child != null) children.add(child);
        }
    }
    final attributes = <String, dynamic>{};
    attrs.forEach((key, value) {
      if (key != 'id' && key != 'version' && !key.startsWith(r'$'))
        attributes[key] = value;
    });
    return SduiNode(
      id: id,
      type: type,
      version: version,
      attributes: attributes,
      bindings: bindings,
      events: events,
      children: children,
      visibility: parseCondition(r'$visibility'),
      active: parseCondition(r'$active'),
    );
  }

  final root = parse(raw, isEnvelope ? r'$.data' : r'$');
  if (root?.type != 'ui.screen') diagnostics.add('SDUI_ROOT_INVALID');
  return SduiParseResult(
    root: diagnostics.isEmpty ? root : null,
    diagnostics: diagnostics,
  );
}

bool _validPath(String path) =>
    path.contains('.') && _namespaces.contains(path.split('.').first);
JsonMap _map(dynamic value) => value is Map
    ? value.map((key, child) => MapEntry(key.toString(), child))
    : <String, dynamic>{};
