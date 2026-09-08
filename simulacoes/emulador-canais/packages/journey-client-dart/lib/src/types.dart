typedef JsonMap = Map<String, dynamic>;

class StartVariableDefinition {
  const StartVariableDefinition({
    required this.name,
    required this.type,
    required this.label,
    required this.required,
  });

  final String name;
  final String type;
  final String label;
  final bool required;

  factory StartVariableDefinition.fromJson(JsonMap json) => StartVariableDefinition(
        name: json['name']?.toString() ?? '',
        type: json['type']?.toString() ?? 'string',
        label: json['label']?.toString() ?? json['name']?.toString() ?? '',
        required: json['required'] != false,
      );
}

class FlowNode {
  const FlowNode({required this.id, required this.type, required this.name, required this.startVariables});

  final String id;
  final String type;
  final String name;
  final List<StartVariableDefinition> startVariables;

  factory FlowNode.fromJson(JsonMap json) => FlowNode(
        id: json['id']?.toString() ?? '',
        type: json['type']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        startVariables: _list(json['startVariables'])
            .map(_map)
            .map(StartVariableDefinition.fromJson)
            .toList(growable: false),
      );
}

class FlowBundle {
  const FlowBundle({required this.channelTypes, required this.flowNodes});

  final List<String> channelTypes;
  final List<FlowNode> flowNodes;

  factory FlowBundle.fromJson(JsonMap json) => FlowBundle(
        channelTypes: _list(json['channelTypes']).map((item) => item.toString()).toList(growable: false),
        flowNodes: _list(json['flowNodes']).map(_map).map(FlowNode.fromJson).toList(growable: false),
      );

  List<StartVariableDefinition> get startVariables {
    for (final node in flowNodes) {
      if (node.type == 'START' || node.type == 'MESSAGE_START_EVENT') return node.startVariables;
    }
    return const [];
  }
}

class FormPayload {
  const FormPayload({required this.id, required this.name, this.description, required this.sdui, required this.context});

  final String id;
  final String name;
  final String? description;
  final dynamic sdui;
  final JsonMap context;

  factory FormPayload.fromJson(JsonMap json) => FormPayload(
        id: json['id']?.toString() ?? '',
        name: json['name']?.toString() ?? '',
        description: json['description']?.toString(),
        sdui: json['sdui'],
        context: json['context'] is Map ? Map<String, dynamic>.from(json['context'] as Map) : <String, dynamic>{},
      );
}

class JourneyStep {
  const JourneyStep({
    required this.type,
    this.taskId,
    this.nodeId,
    this.nodeName,
    this.nodeType,
    this.form,
    this.errorMessage,
  });

  final String type;
  final String? taskId;
  final String? nodeId;
  final String? nodeName;
  final String? nodeType;
  final FormPayload? form;
  final String? errorMessage;

  factory JourneyStep.fromJson(JsonMap json) => JourneyStep(
        type: json['type']?.toString() ?? 'WAITING',
        taskId: json['taskId']?.toString(),
        nodeId: json['nodeId']?.toString(),
        nodeName: json['nodeName']?.toString(),
        nodeType: json['nodeType']?.toString(),
        form: json['form'] is Map ? FormPayload.fromJson(_map(json['form'])) : null,
        errorMessage: json['errorMessage']?.toString(),
      );
}

class JourneyInstance {
  const JourneyInstance({required this.processInstanceId, required this.businessKey, required this.flow, required this.step});

  final String processInstanceId;
  final String businessKey;
  final FlowBundle flow;
  final JourneyStep step;

  factory JourneyInstance.fromJson(JsonMap json) => JourneyInstance(
        processInstanceId: json['processInstanceId']?.toString() ?? '',
        businessKey: json['businessKey']?.toString() ?? '',
        flow: FlowBundle.fromJson(_map(json['flow'])),
        step: JourneyStep.fromJson(_map(json['step'])),
      );

  JourneyInstance withStep(JourneyStep value) => JourneyInstance(
        processInstanceId: processInstanceId,
        businessKey: businessKey,
        flow: flow,
        step: value,
      );
}

JsonMap _map(dynamic value) => value is Map
    ? value.map((key, child) => MapEntry(key.toString(), child))
    : <String, dynamic>{};

List<dynamic> _list(dynamic value) => value is List ? value : const [];
