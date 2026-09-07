import 'dart:async';
import 'dart:convert';

import 'package:http/http.dart' as http;

import 'types.dart';

class JourneyClientException implements Exception {
  const JourneyClientException(this.message, {required this.status, this.code});

  final String message;
  final int status;
  final String? code;

  @override
  String toString() => message;
}

class JourneyClient {
  JourneyClient({
    required String baseUrl,
    this.timeout = const Duration(seconds: 10),
    http.Client? httpClient,
  })  : baseUrl = baseUrl.replaceFirst(RegExp(r'/$'), ''),
        _http = httpClient ?? http.Client();

  final String baseUrl;
  final Duration timeout;
  final http.Client _http;

  Future<FlowBundle> getFlow(String journeyId) async =>
      FlowBundle.fromJson(await _request('GET', '/journeys/${Uri.encodeComponent(journeyId)}/flow'));

  Future<JourneyInstance> startJourney(
    String journeyId, {
    required String channelType,
    JsonMap variables = const {},
  }) async =>
      JourneyInstance.fromJson(await _request(
        'POST',
        '/journeys/${Uri.encodeComponent(journeyId)}/instances?channelType=${Uri.encodeQueryComponent(channelType)}',
        body: variables,
      ));

  Future<JourneyStep> getCurrentStep(String processInstanceId) async => JourneyStep.fromJson(
        await _request('GET', '/instances/${Uri.encodeComponent(processInstanceId)}/current-step'),
      );

  Future<JourneyStep> completeTask(
    String processInstanceId,
    String taskId,
    JsonMap answers,
  ) async =>
      JourneyStep.fromJson(await _request(
        'POST',
        '/instances/${Uri.encodeComponent(processInstanceId)}/tasks/${Uri.encodeComponent(taskId)}/complete',
        body: {'answers': answers},
      ));

  Future<void> stopInstance(String processInstanceId) async {
    await _request('DELETE', '/instances/${Uri.encodeComponent(processInstanceId)}', allowEmpty: true);
  }

  Future<JsonMap> _request(
    String method,
    String path, {
    JsonMap? body,
    bool allowEmpty = false,
  }) async {
    final uri = Uri.parse('$baseUrl$path');
    final headers = <String, String>{
      'accept': 'application/json',
      if (body != null) 'content-type': 'application/json',
    };
    try {
      final response = await switch (method) {
        'GET' => _http.get(uri, headers: headers),
        'POST' => _http.post(uri, headers: headers, body: jsonEncode(body ?? const {})),
        'DELETE' => _http.delete(uri, headers: headers),
        _ => throw UnsupportedError('Método HTTP não suportado: $method'),
      }.timeout(timeout);

      if (response.statusCode == 204 && allowEmpty) return {};
      dynamic decoded;
      try {
        decoded = response.body.isEmpty ? <String, dynamic>{} : jsonDecode(response.body);
      } on FormatException {
        decoded = <String, dynamic>{};
      }
      final payload = decoded is Map
          ? decoded.map((key, value) => MapEntry(key.toString(), value))
          : <String, dynamic>{};
      if (response.statusCode < 200 || response.statusCode >= 300) {
        throw JourneyClientException(
          payload['detail']?.toString() ?? payload['title']?.toString() ?? 'O Emulator BFF respondeu HTTP ${response.statusCode}.',
          status: response.statusCode,
          code: payload['code']?.toString(),
        );
      }
      return payload;
    } on TimeoutException {
      throw JourneyClientException(
        'Tempo limite excedido ao acessar o Emulator BFF.',
        status: 503,
      );
    } on JourneyClientException {
      rethrow;
    } catch (_) {
      throw JourneyClientException(
        'Não foi possível acessar o Emulator BFF.',
        status: 503,
      );
    }
  }
}
