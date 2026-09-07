import 'package:web/web.dart' as web;

void removeLabBootstrapFromUrl(String journeyId) {
  final current = Uri.base;
  final remainingParameters =
      <String, dynamic>{
          for (final entry in current.queryParametersAll.entries)
            entry.key: List<String>.of(entry.value),
        }
        ..remove('labBootstrap')
        ..['journeyId'] = journeyId;
  final sanitized = current.replace(queryParameters: remainingParameters);
  web.window.history.replaceState(null, '', sanitized.toString());
}
