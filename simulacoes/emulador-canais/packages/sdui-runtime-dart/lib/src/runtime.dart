import 'model.dart';

typedef RuntimeListener = void Function();
typedef RuntimeActionHandler = Future<void> Function(
  JsonMap params,
  RuntimeActionContext context,
);
typedef RuntimeSubmitHandler = Future<void> Function(
  JsonMap answers,
  RuntimeActionContext context,
);

class RuntimeActionContext {
  const RuntimeActionContext({
    required this.node,
    required this.eventName,
    required this.event,
  });

  final SduiNode node;
  final String eventName;
  final SduiEvent event;
}

class RuntimeHandlers {
  const RuntimeHandlers({
    this.submit,
    this.navigate,
    this.openUrl,
    this.track,
  });

  final RuntimeSubmitHandler? submit;
  final RuntimeActionHandler? navigate;
  final RuntimeActionHandler? openUrl;
  final RuntimeActionHandler? track;
}

class FieldError {
  const FieldError({
    required this.nodeId,
    required this.path,
    required this.rule,
    required this.message,
  });

  final String nodeId;
  final String path;
  final String rule;
  final String message;
}

class ActionResult {
  const ActionResult({
    required this.handled,
    this.submitted = false,
    this.errors = const [],
  });

  final bool handled;
  final bool submitted;
  final List<FieldError> errors;
}

class SduiRuntime {
  SduiRuntime({
    required this.root,
    JsonMap? context,
    this.handlers = const RuntimeHandlers(),
  }) : context = {
          'form': <String, dynamic>{},
          'data': <String, dynamic>{},
          'session': <String, dynamic>{},
          'route': <String, dynamic>{},
          'computed': <String, dynamic>{},
          ...?context,
        } {
    _walk(root, (node) {
      final binding = node.bindings['value'];
      if (binding != null && !_read(binding.path).$1 && node.props.containsKey('value')) {
        _write(binding.path, node.props['value']);
      }
    });
  }

  final SduiNode root;
  final JsonMap context;
  final RuntimeHandlers handlers;
  final Set<String> _dismissed = {};
  final Set<RuntimeListener> _listeners = {};

  void addListener(RuntimeListener listener) => _listeners.add(listener);
  void removeListener(RuntimeListener listener) => _listeners.remove(listener);

  bool isVisible(SduiNode node) {
    if (_dismissed.contains(node.id)) return false;
    final visibility = node.visibility;
    if (visibility == null) return true;
    final actual = _read(visibility.path).$2;
    final expected = visibility.value;
    return switch (visibility.rule) {
      'equals' => _equal(actual, expected),
      'notEquals' => !_equal(actual, expected),
      'in' => expected is List && expected.any((item) => _equal(actual, item)),
      'notIn' => expected is! List || !expected.any((item) => _equal(actual, item)),
      _ => true,
    };
  }

  String resolveText(dynamic value) {
    if (value is! String) return '';
    return value.replaceAllMapped(RegExp(r'\{\{\s*([^{}]+?)\s*\}\}'), (match) {
      final resolved = _read(match.group(1)!);
      return resolved.$1 && resolved.$2 != null ? resolved.$2.toString() : '';
    });
  }

  dynamic getNodeValue(SduiNode node) {
    final binding = node.bindings['value'];
    if (binding == null) return node.props['value'];
    final resolved = _read(binding.path);
    return resolved.$1 ? resolved.$2 : node.props['value'];
  }

  bool setNodeValue(SduiNode node, dynamic value) {
    final binding = node.bindings['value'];
    if (binding == null || binding.mode != 'twoWay' || !binding.path.startsWith('form.')) {
      return false;
    }
    final written = _write(binding.path, value);
    if (written) _notify();
    return written;
  }

  void dismiss(String nodeId) {
    _dismissed.add(nodeId);
    _notify();
  }

  List<FieldError> validate() {
    final errors = <FieldError>[];
    _walk(root, (node) {
      if (!_inputTypes.contains(node.type) || !isVisible(node)) return;
      final binding = node.bindings['value'];
      if (binding == null || !binding.path.startsWith('form.')) return;
      final value = getNodeValue(node);
      final rules = <JsonMap>[
        ...?node.props['validation'] is List
            ? (node.props['validation'] as List)
                .whereType<Map>()
                .map((item) => item.map((key, value) => MapEntry(key.toString(), value)))
            : null,
      ];
      if (node.props['required'] == true && !rules.any((rule) => rule['rule'] == 'required')) {
        rules.insert(0, {'rule': 'required', 'message': 'Campo obrigatório.'});
      }
      if (node.props['maxLength'] is num && !rules.any((rule) => rule['rule'] == 'maxLength')) {
        rules.add({'rule': 'maxLength', 'value': node.props['maxLength'], 'message': 'Limite de caracteres excedido.'});
      }
      for (final rule in rules) {
        final name = rule['rule']?.toString() ?? '';
        if (_passes(name, rule['value'], value)) continue;
        errors.add(FieldError(
          nodeId: node.id,
          path: binding.path,
          rule: name,
          message: rule['message']?.toString() ?? _defaultMessage(name),
        ));
      }
    });
    return errors;
  }

  JsonMap answers() {
    final result = <String, dynamic>{};
    _walk(root, (node) {
      if (!_inputTypes.contains(node.type) || !isVisible(node)) return;
      final binding = node.bindings['value'];
      if (binding == null || !binding.path.startsWith('form.')) return;
      final value = getNodeValue(node);
      if (value != null) result[binding.path.substring('form.'.length)] = value;
    });
    return result;
  }

  Future<ActionResult> dispatch(SduiNode node, String eventName) async {
    final event = node.events[eventName];
    if (event == null || !sduiActionTypes.contains(event.action)) {
      return const ActionResult(handled: false);
    }
    final actionContext = RuntimeActionContext(node: node, eventName: eventName, event: event);
    switch (event.action) {
      case 'action.submit':
        final errors = validate();
        if (errors.isNotEmpty) return ActionResult(handled: true, errors: errors);
        await handlers.submit?.call(answers(), actionContext);
        return const ActionResult(handled: true, submitted: true);
      case 'action.navigate':
        await handlers.navigate?.call(event.params, actionContext);
        return ActionResult(handled: handlers.navigate != null);
      case 'action.openUrl':
        await handlers.openUrl?.call(event.params, actionContext);
        return ActionResult(handled: handlers.openUrl != null);
      case 'action.track':
        await handlers.track?.call(event.params, actionContext);
        return ActionResult(handled: handlers.track != null);
      case 'action.setValue':
        final path = event.params['path'];
        final handled = path is String && path.startsWith('form.') && _write(path, event.params['value']);
        if (handled) _notify();
        return ActionResult(handled: handled);
      case 'action.dismiss':
        dismiss(node.id);
        return const ActionResult(handled: true);
      default:
        return const ActionResult(handled: false);
    }
  }

  (bool, dynamic) _read(String path) {
    final parts = path.split('.');
    if (parts.length < 2 || !_namespaces.contains(parts.first)) return (false, null);
    dynamic current = context;
    for (final part in parts) {
      if (current is! Map || !current.containsKey(part)) return (false, null);
      current = current[part];
    }
    return (true, current);
  }

  bool _write(String path, dynamic value) {
    final parts = path.split('.');
    if (parts.length < 2 || !_namespaces.contains(parts.first)) return false;
    Map<String, dynamic> current = context;
    for (final part in parts.take(parts.length - 1)) {
      final child = current[part];
      if (child is Map<String, dynamic>) {
        current = child;
      } else if (child is Map) {
        current = child.map((key, value) => MapEntry(key.toString(), value));
      } else {
        final created = <String, dynamic>{};
        current[part] = created;
        current = created;
      }
    }
    current[parts.last] = value;
    return true;
  }

  void _notify() {
    for (final listener in _listeners.toList(growable: false)) listener();
  }
}

const _namespaces = {'form', 'data', 'session', 'route', 'computed'};
const _inputTypes = {'ui.textInput', 'ui.textArea', 'ui.select', 'ui.checkbox', 'ui.datePicker'};

void _walk(SduiNode node, void Function(SduiNode) visit) {
  visit(node);
  for (final child in node.children) _walk(child, visit);
}

bool _equal(dynamic left, dynamic right) => left == right || left.toString() == right.toString();
bool _empty(dynamic value) => value == null || value == '' || (value is List && value.isEmpty);

bool _passes(String rule, dynamic expected, dynamic value) => switch (rule) {
      'required' => !_empty(value) && value != false,
      'minLength' => _empty(value) || value.toString().length >= (expected as num? ?? 0),
      'maxLength' => _empty(value) || value.toString().length <= (expected as num? ?? double.infinity),
      'email' => _empty(value) || RegExp(r'^[^\s@]+@[^\s@]+\.[^\s@]+$').hasMatch(value.toString()),
      'min' => _empty(value) || (num.tryParse(value.toString()) ?? double.negativeInfinity) >= (expected as num? ?? double.negativeInfinity),
      'max' => _empty(value) || (num.tryParse(value.toString()) ?? double.infinity) <= (expected as num? ?? double.infinity),
      _ => true,
    };

String _defaultMessage(String rule) => const {
      'required': 'Campo obrigatório.',
      'minLength': 'Valor menor que o permitido.',
      'maxLength': 'Valor maior que o permitido.',
      'email': 'Informe um e-mail válido.',
      'min': 'Valor menor que o permitido.',
      'max': 'Valor maior que o permitido.',
    }[rule] ?? 'Valor inválido.';
