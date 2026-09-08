import 'package:elastic_journey_sdui_runtime/elastic_journey_sdui_runtime.dart';
import 'package:flutter/material.dart';

import 'tokens.dart';

class RendererDiagnostic {
  const RendererDiagnostic({
    required this.code,
    required this.nodeId,
    required this.message,
  });

  final String code;
  final String nodeId;
  final String message;
}

class SduiRendererFlutter extends StatefulWidget {
  const SduiRendererFlutter({
    required this.runtime,
    this.submitting = false,
    this.tokens = const FlutterMisticaTokens(),
    this.iconRegistry = const {},
    this.onDiagnostic,
    super.key,
  });

  final SduiRuntime runtime;
  final bool submitting;
  final FlutterMisticaTokens tokens;
  final Map<String, IconData> iconRegistry;
  final ValueChanged<RendererDiagnostic>? onDiagnostic;

  @override
  State<SduiRendererFlutter> createState() => _SduiRendererFlutterState();
}

class _SduiRendererFlutterState extends State<SduiRendererFlutter> {
  final Map<String, String> _errors = {};
  final Set<String> _reported = {};

  @override
  void initState() {
    super.initState();
    widget.runtime.addListener(_refresh);
  }

  @override
  void didUpdateWidget(covariant SduiRendererFlutter oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.runtime != widget.runtime) {
      oldWidget.runtime.removeListener(_refresh);
      widget.runtime.addListener(_refresh);
      _errors.clear();
      _reported.clear();
    }
  }

  @override
  void dispose() {
    widget.runtime.removeListener(_refresh);
    super.dispose();
  }

  void _refresh() {
    if (mounted) setState(() {});
  }

  Future<void> _dispatch(SduiNode node, String eventName) async {
    final result = await widget.runtime.dispatch(node, eventName);
    if (!mounted) return;
    setState(() {
      _errors
        ..clear()
        ..addEntries(
          result.errors.map((error) => MapEntry(error.nodeId, error.message)),
        );
    });
  }

  void _change(SduiNode node, dynamic value) {
    widget.runtime.setNodeValue(node, value);
    setState(() => _errors.remove(node.id));
  }

  void _diagnostic(SduiNode node, String code, String message) {
    final key = '$code:${node.id}';
    if (!_reported.add(key)) return;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      widget.onDiagnostic?.call(
        RendererDiagnostic(code: code, nodeId: node.id, message: message),
      );
    });
  }

  @override
  Widget build(BuildContext context) => _node(widget.runtime.root, true);

  Widget _children(
    SduiNode node,
    bool ancestorsActive, {
    Axis direction = Axis.vertical,
    double? gap,
  }) {
    final active = ancestorsActive && widget.runtime.isActive(node);
    final visible = node.children
        .where(widget.runtime.isVisible)
        .map((child) => _node(child, active))
        .toList(growable: false);
    final spacing =
        gap ?? widget.tokens.spacing(node.attributes['spacingToken']);
    final alignment = node.attributes['alignment']?.toString() ?? 'stretch';
    if (direction == Axis.horizontal) {
      return Wrap(
        spacing: spacing,
        runSpacing: spacing,
        alignment: alignment == 'center'
            ? WrapAlignment.center
            : alignment == 'end'
            ? WrapAlignment.end
            : WrapAlignment.start,
        children: visible,
      );
    }
    return Column(
      crossAxisAlignment: alignment == 'start'
          ? CrossAxisAlignment.start
          : alignment == 'center'
          ? CrossAxisAlignment.center
          : alignment == 'end'
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.stretch,
      mainAxisSize: MainAxisSize.min,
      children: _separated(visible, spacing, Axis.vertical),
    );
  }

  Widget _node(SduiNode node, bool ancestorsActive) {
    if (!widget.runtime.isVisible(node)) return const SizedBox.shrink();
    final active = ancestorsActive && widget.runtime.isActive(node);
    final props = node.attributes;
    final text = widget.runtime.resolveText;
    final error = _errors[node.id];

    switch (node.type) {
      case 'ui.screen':
        final body = Container(
          color: widget.tokens.color(
            props['backgroundToken'],
            fallback: widget.tokens.background,
          ),
          padding: EdgeInsets.all(widget.tokens.spacing(props['paddingToken'])),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            mainAxisSize: MainAxisSize.min,
            children: [
              if (text(props['title']).isNotEmpty) ...[
                Text(
                  text(props['title']),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                    fontWeight: FontWeight.w700,
                  ),
                ),
                const SizedBox(height: 16),
              ],
              _children(node, active),
            ],
          ),
        );
        return props['scrollable'] == false
            ? body
            : SingleChildScrollView(child: body);

      case 'ui.container':
        return Container(
          padding: EdgeInsets.all(widget.tokens.spacing(props['paddingToken'])),
          decoration: BoxDecoration(
            color: props['backgroundToken'] == null
                ? null
                : widget.tokens.color(props['backgroundToken']),
            borderRadius: BorderRadius.circular(
              widget.tokens.radius(props['borderRadiusToken']),
            ),
          ),
          child: _children(node, active),
        );

      case 'ui.stack':
        final direction = props['direction']?.toString() ?? 'vertical';
        return _children(
          node,
          active,
          direction: direction == 'horizontal'
              ? Axis.horizontal
              : Axis.vertical,
        );

      case 'ui.card':
        final card = Card(
          elevation: props['elevationToken'] == 'elevation.medium'
              ? 4
              : props['elevationToken'] == 'elevation.none'
              ? 0
              : 1,
          color: widget.tokens.surface,
          clipBehavior: Clip.antiAlias,
          child: Padding(
            padding: EdgeInsets.all(
              widget.tokens.spacing(props['paddingToken']),
            ),
            child: _children(node, active),
          ),
        );
        return card;

      case 'ui.text':
        final variant = props['variant']?.toString() ?? '';
        final style = variant.contains('heading')
            ? Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700)
            : variant.contains('caption')
            ? Theme.of(context).textTheme.bodySmall
            : Theme.of(context).textTheme.bodyLarge?.copyWith(
                fontWeight: variant.contains('medium') ? FontWeight.w500 : null,
              );
        return Text(
          text(widget.runtime.getNodeAttribute(node, 'text')),
          maxLines: props['maxLines'] as int?,
          overflow: props['maxLines'] == null ? null : TextOverflow.ellipsis,
          textAlign: _textAlign(props['align']),
          style: style?.copyWith(
            color: widget.tokens.color(
              props['colorToken'],
              fallback: widget.tokens.textPrimary,
            ),
          ),
        );

      case 'ui.image':
        final source = text(widget.runtime.getNodeAttribute(node, 'source'));
        return Semantics(
          image: true,
          label: text(widget.runtime.getNodeAttribute(node, 'alt')),
          child: AspectRatio(
            aspectRatio: (props['aspectRatio'] as num?)?.toDouble() ?? 16 / 9,
            child: Image.network(
              source,
              fit: _boxFit(props['fit']),
              errorBuilder: (_, _, _) => DecoratedBox(
                decoration: BoxDecoration(
                  color: widget.tokens.backgroundSecondary,
                ),
                child: const Center(child: Icon(Icons.broken_image_outlined)),
              ),
            ),
          ),
        );

      case 'ui.icon':
        final name = props['name']?.toString() ?? '';
        final icon = widget.iconRegistry[name] ?? _defaultIcons[name];
        if (icon == null)
          _diagnostic(
            node,
            'ICON_NOT_REGISTERED',
            "Ícone '$name' não registrado no adapter Flutter.",
          );
        return Semantics(
          label: text(props['accessibilityLabel']),
          child: Icon(
            icon ?? Icons.help_outline,
            size: widget.tokens.iconSize(props['sizeToken']),
            color: widget.tokens.color(
              props['colorToken'],
              fallback: widget.tokens.textPrimary,
            ),
          ),
        );

      case 'ui.divider':
        final spacing = widget.tokens.spacing(props['spacingToken']);
        return Padding(
          padding: props['orientation'] == 'vertical'
              ? EdgeInsets.symmetric(horizontal: spacing)
              : EdgeInsets.symmetric(vertical: spacing),
          child: props['orientation'] == 'vertical'
              ? VerticalDivider(
                  color: widget.tokens.color(
                    props['colorToken'],
                    fallback: widget.tokens.border,
                  ),
                )
              : Divider(
                  color: widget.tokens.color(
                    props['colorToken'],
                    fallback: widget.tokens.border,
                  ),
                ),
        );

      case 'ui.spacer':
        final size = widget.tokens.spacing(props['sizeToken']);
        return SizedBox(
          width: props['axis'] == 'horizontal' || props['axis'] == 'both'
              ? size
              : 0,
          height: props['axis'] == 'horizontal' ? 0 : size,
        );

      case 'ui.textInput':
      case 'ui.textArea':
        final multiline = node.type == 'ui.textArea';
        return TextFormField(
          key: ValueKey('${identityHashCode(widget.runtime)}:${node.id}'),
          initialValue: widget.runtime.getNodeValue(node)?.toString() ?? '',
          readOnly: !active || props['readOnly'] == true,
          keyboardType: _keyboardType(props['inputMode'], multiline),
          minLines: multiline ? (props['minLines'] as int? ?? 3) : 1,
          maxLines: multiline ? (props['maxLines'] as int? ?? 6) : 1,
          maxLength: props['maxLength'] as int?,
          decoration: InputDecoration(
            labelText:
                '${text(props['label'])}${props['required'] == true ? ' *' : ''}',
            hintText: text(props['placeholder']),
            errorText: error,
            border: const OutlineInputBorder(),
          ),
          onChanged: (value) =>
              _change(node, _coerceInput(props['inputMode'], value)),
        );

      case 'ui.select':
        final options = (props['options'] as List? ?? const [])
            .whereType<Map>()
            .toList(growable: false);
        final current = widget.runtime.getNodeValue(node)?.toString();
        if (props['searchable'] == true) {
          final enabledOptions = options
              .where((option) => option['disabled'] != true)
              .toList(growable: false);
          final selected = enabledOptions
              .where((option) => option['value']?.toString() == current)
              .firstOrNull;
          return Autocomplete<String>(
            initialValue: TextEditingValue(
              text: selected == null ? '' : text(selected['label']),
            ),
            optionsBuilder: (editingValue) {
              final query = editingValue.text.trim().toLowerCase();
              return enabledOptions
                  .map((option) => text(option['label']))
                  .where(
                    (label) =>
                        query.isEmpty || label.toLowerCase().contains(query),
                  );
            },
            onSelected: (label) {
              if (!active) return;
              final option = enabledOptions
                  .where((item) => text(item['label']) == label)
                  .firstOrNull;
              if (option != null)
                _change(node, option['value']?.toString() ?? '');
            },
            fieldViewBuilder: (context, controller, focusNode, onSubmitted) =>
                TextFormField(
                  controller: controller,
                  focusNode: focusNode,
                  decoration: InputDecoration(
                    labelText:
                        '${text(props['label'])}${props['required'] == true ? ' *' : ''}',
                    hintText: text(props['placeholder']),
                    errorText: error,
                    border: const OutlineInputBorder(),
                    suffixIcon: const Icon(Icons.search),
                  ),
                ),
          );
        }
        return DropdownButtonFormField<String>(
          initialValue:
              options.any((option) => option['value']?.toString() == current)
              ? current
              : null,
          decoration: InputDecoration(
            labelText:
                '${text(props['label'])}${props['required'] == true ? ' *' : ''}',
            hintText: text(props['placeholder']),
            errorText: error,
            border: const OutlineInputBorder(),
          ),
          items: options
              .map(
                (option) => DropdownMenuItem<String>(
                  value: option['value']?.toString() ?? '',
                  enabled: option['disabled'] != true,
                  child: Text(text(option['label'])),
                ),
              )
              .toList(growable: false),
          onChanged: active ? (value) => _change(node, value) : null,
        );

      case 'ui.checkbox':
        final value = widget.runtime.getNodeValue(node) == true;
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            CheckboxListTile(
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              tristate: props['indeterminate'] == true,
              value: props['indeterminate'] == true ? null : value,
              title: Text(
                '${text(props['label'])}${props['required'] == true ? ' *' : ''}',
              ),
              onChanged: active
                  ? (selected) => _change(node, selected ?? false)
                  : null,
            ),
            if (error != null)
              Text(
                error,
                style: TextStyle(color: widget.tokens.negative, fontSize: 12),
              ),
          ],
        );

      case 'ui.datePicker':
        return _DatePickerField(
          node: node,
          value: widget.runtime.getNodeValue(node)?.toString(),
          error: error,
          label: text(props['label']),
          active: active,
          onChanged: (value) => _change(node, value),
        );

      case 'ui.button':
        final disabled =
            !active ||
            props['disabled'] == true ||
            widget.submitting ||
            props['loading'] == true;
        final label = text(props['label']);
        final content = widget.submitting || props['loading'] == true
            ? const SizedBox.square(
                dimension: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : Text(label);
        final variant = props['variant']?.toString() ?? 'primary';
        final button = variant == 'secondary'
            ? OutlinedButton(
                onPressed: disabled ? null : () => _dispatch(node, 'onPress'),
                child: content,
              )
            : variant == 'link'
            ? TextButton(
                onPressed: disabled ? null : () => _dispatch(node, 'onPress'),
                child: content,
              )
            : FilledButton(
                style: variant == 'danger'
                    ? FilledButton.styleFrom(
                        backgroundColor: widget.tokens.negative,
                      )
                    : null,
                onPressed: disabled ? null : () => _dispatch(node, 'onPress'),
                child: content,
              );
        return props['fullWidth'] == true
            ? SizedBox(width: double.infinity, child: button)
            : Align(alignment: Alignment.centerLeft, child: button);

      case 'ui.link':
        return Align(
          alignment: Alignment.centerLeft,
          child: Semantics(
            link: true,
            label: text(props['accessibilityLabel']).isEmpty
                ? text(props['label'])
                : text(props['accessibilityLabel']),
            child: TextButton.icon(
              onPressed: active ? () => _dispatch(node, 'onPress') : null,
              iconAlignment: IconAlignment.end,
              icon: props['external'] == true
                  ? const Icon(Icons.open_in_new, size: 16)
                  : const SizedBox.shrink(),
              label: Text(text(props['label'])),
            ),
          ),
        );

      case 'ui.alert':
        final severity = props['severity']?.toString() ?? 'informative';
        final palette = _alertPalette(severity);
        return Semantics(
          liveRegion: severity == 'negative',
          child: Container(
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: palette.$1,
              border: Border.all(color: palette.$2),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(_alertIcon(severity), color: palette.$2),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      if (text(
                        widget.runtime.getNodeAttribute(node, 'title'),
                      ).isNotEmpty)
                        Text(
                          text(widget.runtime.getNodeAttribute(node, 'title')),
                          style: TextStyle(
                            color: palette.$2,
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      Text(
                        text(widget.runtime.getNodeAttribute(node, 'message')),
                      ),
                    ],
                  ),
                ),
                if (props['dismissible'] == true)
                  IconButton(
                    tooltip: 'Fechar aviso',
                    onPressed: active
                        ? () => node.events.containsKey('onDismiss')
                              ? _dispatch(node, 'onDismiss')
                              : widget.runtime.dismiss(node.id)
                        : null,
                    icon: const Icon(Icons.close),
                  ),
              ],
            ),
          ),
        );

      case 'ui.progress':
        final raw =
            (widget.runtime.getNodeAttribute(node, 'value') as num?)
                ?.toDouble() ??
            0;
        final value = (raw > 1 ? raw / 100 : raw).clamp(0.0, 1.0);
        return Semantics(
          value: '${(value * 100).round()}%',
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (text(props['label']).isNotEmpty) ...[
                Text(text(props['label'])),
                const SizedBox(height: 8),
              ],
              LinearProgressIndicator(value: value),
              if (props['showValue'] == true) ...[
                const SizedBox(height: 4),
                Text(
                  '${(value * 100).round()}%',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ],
          ),
        );

      case 'ui.loading':
        final body = Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox.square(
              dimension: widget.tokens.iconSize(props['sizeToken']),
              child: const CircularProgressIndicator(strokeWidth: 3),
            ),
            if (text(props['label']).isNotEmpty) ...[
              const SizedBox(height: 8),
              Text(text(props['label'])),
            ],
          ],
        );
        return props['overlay'] == true
            ? Container(
                color: widget.tokens.surface.withValues(alpha: 0.94),
                padding: const EdgeInsets.all(32),
                child: Center(child: body),
              )
            : Center(
                child: Padding(padding: const EdgeInsets.all(12), child: body),
              );

      default:
        _diagnostic(
          node,
          'COMPONENT_NOT_RENDERED',
          "Componente '${node.type}' sem adapter flutter.",
        );
        return const SizedBox.shrink();
    }
  }

  (Color, Color) _alertPalette(String severity) => switch (severity) {
    'negative' => (widget.tokens.negativeLow, widget.tokens.negative),
    'positive' => (widget.tokens.positiveLow, widget.tokens.positive),
    'warning' => (widget.tokens.warningLow, widget.tokens.warning),
    _ => (widget.tokens.informativeLow, widget.tokens.brand),
  };

  IconData _alertIcon(String severity) => switch (severity) {
    'negative' => Icons.error_outline,
    'positive' => Icons.check_circle_outline,
    'warning' => Icons.warning_amber_outlined,
    _ => Icons.info_outline,
  };
}

class _DatePickerField extends StatelessWidget {
  const _DatePickerField({
    required this.node,
    required this.value,
    required this.label,
    required this.active,
    required this.onChanged,
    this.error,
  });

  final SduiNode node;
  final String? value;
  final String label;
  final bool active;
  final String? error;
  final ValueChanged<String> onChanged;

  @override
  Widget build(BuildContext context) {
    final mode = node.attributes['mode']?.toString() ?? 'date';
    return InkWell(
      onTap: active
          ? () async {
              if (mode == 'time') {
                final selected = await showTimePicker(
                  context: context,
                  initialTime: _time(value),
                );
                if (selected != null)
                  onChanged('${_two(selected.hour)}:${_two(selected.minute)}');
                return;
              }
              final selected = await showDatePicker(
                context: context,
                initialDate: _date(value),
                firstDate:
                    _dateLimit(node.attributes['minDate']) ?? DateTime(1900),
                lastDate:
                    _dateLimit(node.attributes['maxDate']) ?? DateTime(2100),
              );
              if (selected == null) return;
              if (mode == 'dateTime') {
                if (!context.mounted) return;
                final time = await showTimePicker(
                  context: context,
                  initialTime: _time(value),
                );
                if (time != null)
                  onChanged(
                    DateTime(
                      selected.year,
                      selected.month,
                      selected.day,
                      time.hour,
                      time.minute,
                    ).toIso8601String(),
                  );
              } else {
                onChanged(
                  '${selected.year}-${_two(selected.month)}-${_two(selected.day)}',
                );
              }
            }
          : null,
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: '$label${node.attributes['required'] == true ? ' *' : ''}',
          errorText: error,
          border: const OutlineInputBorder(),
          suffixIcon: const Icon(Icons.calendar_today_outlined),
        ),
        child: Text(
          _display(value, mode, node.attributes['format']?.toString()) ??
              'Selecione',
        ),
      ),
    );
  }
}

List<Widget> _separated(List<Widget> children, double spacing, Axis axis) {
  if (children.length < 2 || spacing == 0) return children;
  final result = <Widget>[];
  for (var index = 0; index < children.length; index++) {
    if (index > 0)
      result.add(
        SizedBox(
          width: axis == Axis.horizontal ? spacing : 0,
          height: axis == Axis.vertical ? spacing : 0,
        ),
      );
    result.add(children[index]);
  }
  return result;
}

const _defaultIcons = <String, IconData>{
  'info': Icons.info_outline,
  'success': Icons.check_circle_outline,
  'warning': Icons.warning_amber_outlined,
  'error': Icons.error_outline,
  'calendar': Icons.calendar_today_outlined,
  'user': Icons.person_outline,
  'email': Icons.email_outlined,
  'phone': Icons.phone_outlined,
  'location': Icons.location_on_outlined,
  'lock': Icons.lock_outline,
  'search': Icons.search,
  'arrow-right': Icons.arrow_forward,
  'close': Icons.close,
};

TextAlign _textAlign(dynamic value) => switch (value?.toString()) {
  'center' => TextAlign.center,
  'right' || 'end' => TextAlign.right,
  'justify' => TextAlign.justify,
  _ => TextAlign.left,
};

BoxFit _boxFit(dynamic value) => switch (value?.toString()) {
  'contain' => BoxFit.contain,
  'fill' => BoxFit.fill,
  'fitWidth' => BoxFit.fitWidth,
  'fitHeight' => BoxFit.fitHeight,
  _ => BoxFit.cover,
};

TextInputType _keyboardType(dynamic mode, bool multiline) =>
    switch (mode?.toString()) {
      'email' => TextInputType.emailAddress,
      'tel' => TextInputType.phone,
      'number' => TextInputType.number,
      'decimal' => const TextInputType.numberWithOptions(decimal: true),
      'url' => TextInputType.url,
      _ => multiline ? TextInputType.multiline : TextInputType.text,
    };

dynamic _coerceInput(dynamic mode, String value) {
  if (value.isEmpty) return value;
  if (mode == 'number') return num.tryParse(value) ?? value;
  if (mode == 'decimal')
    return double.tryParse(value.replaceFirst(',', '.')) ?? value;
  return value;
}

DateTime _date(String? value) {
  final parsed = value == null ? null : DateTime.tryParse(value);
  return parsed ?? DateTime.now();
}

DateTime? _dateLimit(dynamic value) {
  if (value == 'today') return DateTime.now();
  return value is String ? DateTime.tryParse(value) : null;
}

TimeOfDay _time(String? value) {
  if (value != null && RegExp(r'^\d{2}:\d{2}$').hasMatch(value)) {
    final parts = value.split(':').map(int.parse).toList(growable: false);
    return TimeOfDay(hour: parts[0], minute: parts[1]);
  }
  final parsed = value == null ? null : DateTime.tryParse(value);
  return parsed == null ? TimeOfDay.now() : TimeOfDay.fromDateTime(parsed);
}

String _two(int value) => value.toString().padLeft(2, '0');

String? _display(String? value, String mode, String? format) {
  if (value == null || value.isEmpty) return null;
  if (mode == 'time') return value;
  final date = DateTime.tryParse(value);
  if (date == null) return value;
  final datePart = format == 'MM/dd/yyyy'
      ? '${_two(date.month)}/${_two(date.day)}/${date.year}'
      : format == 'yyyy-MM-dd'
      ? '${date.year}-${_two(date.month)}-${_two(date.day)}'
      : '${_two(date.day)}/${_two(date.month)}/${date.year}';
  return mode == 'dateTime'
      ? '$datePart ${_two(date.hour)}:${_two(date.minute)}'
      : datePart;
}
