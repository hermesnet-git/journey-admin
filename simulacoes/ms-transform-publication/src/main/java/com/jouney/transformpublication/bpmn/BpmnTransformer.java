package com.jouney.transformpublication.bpmn;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jouney.transformpublication.interfaces.publication.PublicationSnapshotRequest;
import com.jouney.transformpublication.interfaces.publication.PublicationSnapshotRequest.ConnectorConfigRequest;
import com.jouney.transformpublication.interfaces.publication.PublicationSnapshotRequest.FlowConnectionRequest;
import com.jouney.transformpublication.interfaces.publication.PublicationSnapshotRequest.FlowNodeRequest;
import java.io.ByteArrayOutputStream;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;
import org.camunda.bpm.model.bpmn.Bpmn;
import org.camunda.bpm.model.bpmn.BpmnModelInstance;
import org.camunda.bpm.model.bpmn.instance.BaseElement;
import org.camunda.bpm.model.bpmn.instance.ConditionExpression;
import org.camunda.bpm.model.bpmn.instance.Definitions;
import org.camunda.bpm.model.bpmn.instance.EndEvent;
import org.camunda.bpm.model.bpmn.instance.ExclusiveGateway;
import org.camunda.bpm.model.bpmn.instance.ExtensionElements;
import org.camunda.bpm.model.bpmn.instance.FlowNode;
import org.camunda.bpm.model.bpmn.instance.Message;
import org.camunda.bpm.model.bpmn.instance.MessageEventDefinition;
import org.camunda.bpm.model.bpmn.instance.Process;
import org.camunda.bpm.model.bpmn.instance.ReceiveTask;
import org.camunda.bpm.model.bpmn.instance.SequenceFlow;
import org.camunda.bpm.model.bpmn.instance.ServiceTask;
import org.camunda.bpm.model.bpmn.instance.StartEvent;
import org.camunda.bpm.model.bpmn.instance.UserTask;
import org.camunda.bpm.model.bpmn.instance.bpmndi.BpmnDiagram;
import org.camunda.bpm.model.bpmn.instance.bpmndi.BpmnEdge;
import org.camunda.bpm.model.bpmn.instance.bpmndi.BpmnPlane;
import org.camunda.bpm.model.bpmn.instance.bpmndi.BpmnShape;
import org.camunda.bpm.model.bpmn.instance.dc.Bounds;
import org.camunda.bpm.model.bpmn.instance.di.Waypoint;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaConnector;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaConnectorId;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaEntry;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaInputOutput;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaInputParameter;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaMap;
import org.camunda.bpm.model.bpmn.instance.camunda.CamundaOutputParameter;
import org.camunda.bpm.model.xml.instance.ModelElementInstance;
import org.springframework.stereotype.Component;

/**
 * Transforms the Admin Portal's journey publication snapshot into an executable BPMN 2.0 process
 * for Camunda 7. The admin's flow model is a general graph since GATEWAY nodes branch into two
 * paths (REQ-03.11.001) that may later reconverge on a common node before END — so every element
 * (nodes and sequence flows) is built directly through the low-level BPMN model API instead of the
 * camunda-bpmn-model fluent chain builder, which is inherently linear/backtracking-based and has
 * no first-class support for the Connector extension element used by attachHttpConnector either.
 *
 * BPMNDI (diagram shapes/edges) is generated straight from the Admin Portal's own node
 * positionX/positionY — the engine doesn't need it to execute, but Cockpit's process diagram view
 * had nothing to render without it. No independent auto-layout: the admin canvas is already the
 * source of truth for where each node sits, so the DI pass just reprojects those same coordinates
 * as BPMN shapes/edges instead of recomputing a layout.
 */
@Component
public class BpmnTransformer {

    // Only used to serialize connector config values (headers/body/outputMapping) into
    // camunda:inputParameter strings — internal detail, no need for the app's shared Jackson
    // config (if any), so it's a plain instance rather than an injected bean.
    private final ObjectMapper objectMapper = new ObjectMapper();

    // {{name}} (Admin Portal's variable reference syntax, REQ-03.09.012/REQ-03.11.003) becomes
    // ${name} (Camunda's own JUEL variable syntax) — the process variables set by an earlier
    // connector's output parameters, or a gateway condition, read directly off process scope.
    private static final Pattern ADMIN_VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    // Reserved process variable names capturing, per REST-connector node, the URL actually called and
    // the raw response body — the connector's own "response" local variable gets overwritten by every
    // node that reuses it, so it can't answer "what did node X get back" once later nodes have also
    // run. ms-espec-registry (SimulationController.trailSince) reads these same two prefixes back —
    // keep both in sync if either changes; there's no shared module between the two services.
    private static final String HTTP_URL_VAR_PREFIX = "__httpUrl__";
    private static final String HTTP_RESPONSE_VAR_PREFIX = "__httpResponse__";

    public record Result(String processId, byte[] bpmnXml) {
    }

    public Result transform(PublicationSnapshotRequest request) {
        String processId = ProcessIds.forJourney(request.journeyId());

        BpmnModelInstance modelInstance = Bpmn.createEmptyModel();
        Definitions definitions = modelInstance.newInstance(Definitions.class);
        definitions.setTargetNamespace("http://bpmn.io/schema/bpmn");
        modelInstance.setDefinitions(definitions);

        Process process = modelInstance.newInstance(Process.class);
        process.setId(processId);
        process.setName(request.journeyName());
        process.setExecutable(true);
        process.setCamundaHistoryTimeToLive(180);
        definitions.getRootElements().add(process);

        Map<String, FlowNode> byId = new HashMap<>();
        for (FlowNodeRequest node : request.flowNodes()) {
            FlowNode element = createNode(modelInstance, process, definitions, node);
            byId.put(node.id(), element);
        }

        Map<String, SequenceFlow> flowsById = new HashMap<>();
        for (FlowConnectionRequest connection : request.flowConnections()) {
            FlowNode source = byId.get(connection.sourceNodeId());
            FlowNode target = byId.get(connection.targetNodeId());
            if (source == null || target == null) {
                throw new BpmnTransformationException("Connection " + connection.id() + " references an unknown node");
            }
            // Order matters: reference-setting calls below (setSource/setTarget/setDefault) resolve
            // the target element's id within the document, so `flow` must already be attached to the
            // model tree (added to the process) before any of them run — otherwise Camunda's model
            // API rejects it with "element is not part of model".
            SequenceFlow flow = modelInstance.newInstance(SequenceFlow.class);
            flow.setId(connection.id());
            process.getFlowElements().add(flow);
            flow.setSource(source);
            flow.setTarget(target);
            source.getOutgoing().add(flow);
            target.getIncoming().add(flow);
            flowsById.put(connection.id(), flow);

            if (connection.condition() != null && !connection.condition().isBlank()) {
                ConditionExpression conditionExpression = modelInstance.newInstance(ConditionExpression.class);
                conditionExpression.setTextContent(resolveCondition(connection.condition()));
                flow.setConditionExpression(conditionExpression);
            }
            if (connection.isDefault() && source instanceof ExclusiveGateway gateway) {
                gateway.setDefault(flow);
            }
        }

        addDiagramInterchange(modelInstance, definitions, process, request, byId, flowsById);

        Bpmn.validateModel(modelInstance);
        return new Result(processId, toXmlBytes(modelInstance));
    }

    // Reprojects each node's own positionX/positionY (already tracked by the admin canvas) as a
    // BPMNShape, and draws each sequence flow as a straight two-point edge between the source's
    // right-center and the target's left-center — enough for Cockpit's diagram view to render the
    // process instead of showing an empty canvas, without reimplementing a layout algorithm.
    private void addDiagramInterchange(BpmnModelInstance modelInstance, Definitions definitions, Process process,
                                        PublicationSnapshotRequest request, Map<String, FlowNode> byId,
                                        Map<String, SequenceFlow> flowsById) {
        BpmnDiagram diagram = modelInstance.newInstance(BpmnDiagram.class);
        diagram.setId("BPMNDiagram_" + process.getId());
        definitions.getBpmDiagrams().add(diagram);

        BpmnPlane plane = modelInstance.newInstance(BpmnPlane.class);
        plane.setId("BPMNPlane_" + process.getId());
        plane.setBpmnElement(process);
        diagram.setBpmnPlane(plane);

        Map<String, Bounds> boundsById = new HashMap<>();
        for (FlowNodeRequest node : request.flowNodes()) {
            BpmnShape shape = modelInstance.newInstance(BpmnShape.class);
            shape.setId("BPMNShape_" + node.id());
            shape.setBpmnElement(byId.get(node.id()));

            double width = shapeWidth(node.type());
            double height = shapeHeight(node.type());
            Bounds bounds = modelInstance.newInstance(Bounds.class);
            bounds.setX(node.positionX() != null ? node.positionX() : 0);
            // Center smaller shapes (events/gateways) on the same row as the 80px-tall tasks around them.
            bounds.setY((node.positionY() != null ? node.positionY() : 0) + (80 - height) / 2.0);
            bounds.setWidth(width);
            bounds.setHeight(height);
            shape.setBounds(bounds);

            plane.getDiagramElements().add(shape);
            boundsById.put(node.id(), bounds);
        }

        for (FlowConnectionRequest connection : request.flowConnections()) {
            SequenceFlow flow = flowsById.get(connection.id());
            Bounds sourceBounds = boundsById.get(connection.sourceNodeId());
            Bounds targetBounds = boundsById.get(connection.targetNodeId());
            if (flow == null || sourceBounds == null || targetBounds == null) {
                continue;
            }

            BpmnEdge edge = modelInstance.newInstance(BpmnEdge.class);
            edge.setId("BPMNEdge_" + connection.id());
            edge.setBpmnElement(flow);
            edge.getWaypoints().add(waypoint(modelInstance, sourceBounds.getX() + sourceBounds.getWidth(),
                    sourceBounds.getY() + sourceBounds.getHeight() / 2.0));
            edge.getWaypoints().add(waypoint(modelInstance, targetBounds.getX(),
                    targetBounds.getY() + targetBounds.getHeight() / 2.0));
            plane.getDiagramElements().add(edge);
        }
    }

    private Waypoint waypoint(BpmnModelInstance modelInstance, double x, double y) {
        Waypoint waypoint = modelInstance.newInstance(Waypoint.class);
        waypoint.setX(x);
        waypoint.setY(y);
        return waypoint;
    }

    private double shapeWidth(String type) {
        return switch (type) {
            case "START", "MESSAGE_START_EVENT", "END" -> 36;
            case "GATEWAY" -> 50;
            default -> 100;
        };
    }

    private double shapeHeight(String type) {
        return switch (type) {
            case "START", "MESSAGE_START_EVENT", "END" -> 36;
            case "GATEWAY" -> 50;
            default -> 80;
        };
    }

    private FlowNode createNode(BpmnModelInstance modelInstance, Process process, Definitions definitions, FlowNodeRequest node) {
        return switch (node.type()) {
            case "START" -> newElement(modelInstance, process, StartEvent.class, node);
            case "MESSAGE_START_EVENT" -> {
                StartEvent event = newElement(modelInstance, process, StartEvent.class, node);
                // MessageEventDefinition isn't itself a FlowElement (it's nested inside the event, not
                // a direct child of the process), so it needs its own containment step before any
                // reference-setting call on it is safe — same "must be attached first" rule as flows.
                MessageEventDefinition definition = modelInstance.newInstance(MessageEventDefinition.class);
                event.getEventDefinitions().add(definition);
                definition.setMessage(getOrCreateMessage(modelInstance, definitions, messageName(node)));
                yield event;
            }
            case "USER_TASK" -> {
                UserTask task = newElement(modelInstance, process, UserTask.class, node);
                if (node.formId() != null) {
                    addInputParameter(modelInstance, task, "formId", node.formId().toString());
                }
                yield task;
            }
            case "SERVICE_TASK" -> {
                ServiceTask task = newElement(modelInstance, process, ServiceTask.class, node);
                attachServiceTask(modelInstance, task, node);
                yield task;
            }
            case "RECEIVE_TASK" -> {
                ReceiveTask task = newElement(modelInstance, process, ReceiveTask.class, node);
                task.setMessage(getOrCreateMessage(modelInstance, definitions, messageName(node)));
                attachConnectorConfig(modelInstance, task, node);
                yield task;
            }
            case "GATEWAY" -> newElement(modelInstance, process, ExclusiveGateway.class, node);
            case "END" -> newElement(modelInstance, process, EndEvent.class, node);
            default -> throw new BpmnTransformationException("Unsupported node type: " + node.type());
        };
    }

    // Adds the element to the process before returning it: every reference-setting call (setSource/
    // setTarget/setDefault/setMessage) requires the element it's called on to already be attached to
    // the model tree, so nodes must join the process before any such call — not after, as a plain
    // "build then attach" order would naturally suggest.
    private <T extends FlowNode> T newElement(BpmnModelInstance modelInstance, Process process, Class<T> type, FlowNodeRequest node) {
        T element = modelInstance.newInstance(type);
        element.setId(node.id());
        element.setName(node.name());
        process.getFlowElements().add(element);
        return element;
    }

    private Message getOrCreateMessage(BpmnModelInstance modelInstance, Definitions definitions, String name) {
        for (Message existing : modelInstance.getModelElementsByType(Message.class)) {
            if (name.equals(existing.getName())) {
                return existing;
            }
        }
        Message message = modelInstance.newInstance(Message.class);
        message.setId(name);
        message.setName(name);
        definitions.getRootElements().add(message);
        return message;
    }

    private String messageName(FlowNodeRequest node) {
        return "Message_" + node.id();
    }

    /**
     * REST connector config gets translated into a native Camunda HTTP Connector
     * (camunda:type="connector", connectorId "http-connector") — the call executes synchronously
     * inside the engine, no external worker needed (the platform's premise is that generic engine
     * capability should cover this, not a bespoke implementation). Kafka (or a node with no
     * connector configured) keeps the external-task pattern, since this Camunda distribution has no
     * native broker connector — a worker is still required for that case.
     */
    private void attachServiceTask(BpmnModelInstance modelInstance, ServiceTask element, FlowNodeRequest node) {
        ConnectorConfigRequest connectorConfig = node.connectorConfig();
        if (connectorConfig != null && "REST".equalsIgnoreCase(connectorConfig.connectorType())) {
            attachHttpConnector(modelInstance, element, connectorConfig, node.id());
            return;
        }
        element.setCamundaType("external");
        element.setCamundaTopic(topicName(node));
        attachConnectorConfig(modelInstance, element, node);
    }

    private String resolveVariables(String text) {
        if (text == null) {
            return null;
        }
        Matcher matcher = ADMIN_VARIABLE_TOKEN.matcher(text);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement("${" + matcher.group(1) + "}"));
        }
        matcher.appendTail(result);
        return result.toString();
    }

    // A gateway condition (REQ-03.11.003, e.g. "{{codigoPorte}} == 5") is a single boolean JUEL
    // expression, not text with an embedded reference like a URL/header — resolveVariables would
    // leave the comparison operator outside the ${...} wrapper, turning the whole condition into a
    // literal string. Every {{name}} becomes a bare variable reference inside one ${...} instead.
    private String resolveCondition(String condition) {
        Matcher matcher = ADMIN_VARIABLE_TOKEN.matcher(condition);
        StringBuilder result = new StringBuilder();
        while (matcher.find()) {
            matcher.appendReplacement(result, Matcher.quoteReplacement(matcher.group(1)));
        }
        matcher.appendTail(result);
        return "${" + result + "}";
    }

    private void attachHttpConnector(BpmnModelInstance modelInstance, ServiceTask element, ConnectorConfigRequest connectorConfig,
                                      String nodeId) {
        Map<String, Object> config = connectorConfig.config() != null ? connectorConfig.config() : Map.of();

        ExtensionElements extensionElements = modelInstance.newInstance(ExtensionElements.class);
        element.setExtensionElements(extensionElements);
        CamundaConnector connector = extensionElements.addExtensionElement(CamundaConnector.class);
        CamundaConnectorId connectorId = modelInstance.newInstance(CamundaConnectorId.class);
        connectorId.setTextContent("http-connector");
        connector.setCamundaConnectorId(connectorId);

        CamundaInputOutput inputOutput = modelInstance.newInstance(CamundaInputOutput.class);
        connector.setCamundaInputOutput(inputOutput);

        String url = appendQueryParams(resolveVariables(asString(config.get("url"), "")), config.get("params"));
        inputOutput.getCamundaInputParameters().add(newInputParameter(modelInstance, "url", url));
        inputOutput.getCamundaInputParameters().add(newInputParameter(modelInstance, "method", asString(config.get("method"), "GET")));

        // Unlike the RestClient used by the "Testar chamada" feature (REQ-03.10), which infers
        // Content-Type automatically for a structured body, Camunda's native http-connector sends
        // the payload as-is with no Content-Type unless one is explicitly provided — most APIs
        // (including ms-mock-api-rest) then reject a JSON body with 415, and the output mapping's
        // jsonPath fails against that error body instead of the real response. Default to
        // application/json whenever there's a body, unless the admin already set their own.
        Map<String, Object> headers = new LinkedHashMap<>();
        if (config.get("headers") instanceof Map<?, ?> configuredHeaders) {
            configuredHeaders.forEach((key, value) -> headers.put(String.valueOf(key), value));
        }
        boolean hasContentType = headers.keySet().stream().anyMatch(key -> key.equalsIgnoreCase("Content-Type"));
        if (config.get("body") != null && !hasContentType) {
            headers.put("Content-Type", "application/json");
        }
        if (!headers.isEmpty()) {
            CamundaInputParameter headersParam = modelInstance.newInstance(CamundaInputParameter.class);
            headersParam.setCamundaName("headers");
            CamundaMap map = modelInstance.newInstance(CamundaMap.class);
            headers.forEach((key, value) -> {
                CamundaEntry entry = modelInstance.newInstance(CamundaEntry.class);
                entry.setCamundaKey(key);
                entry.setTextContent(resolveVariables(String.valueOf(value)));
                map.getCamundaEntries().add(entry);
            });
            headersParam.setValue(map);
            inputOutput.getCamundaInputParameters().add(headersParam);
        }

        if (config.get("body") != null) {
            inputOutput.getCamundaInputParameters()
                    .add(newInputParameter(modelInstance, "payload", resolveVariables(serialize(config.get("body")))));
        }
        if (connectorConfig.credentialRef() != null) {
            inputOutput.getCamundaInputParameters().add(newInputParameter(modelInstance, "credentialRef", connectorConfig.credentialRef()));
        }

        // The HTTP connector binds its raw response body to the "response" local variable (as plain
        // text, not a structured object) — each output rule reads it back with Spin's JSONPath
        // function, no scripting required. `.element().value()` (not `.stringValue()`) reads the
        // matched node in its real JSON type (string/number/boolean) instead of forcing String —
        // auto-generated mappings from a real API response routinely include numeric/boolean fields,
        // and `.stringValue()` throws SpinJsonDataFormatException the moment one of those is hit.
        for (Map<String, Object> rule : outputMappingOf(config)) {
            if (rule.get("name") instanceof String name && !name.isBlank() && rule.get("jsonPath") instanceof String jsonPath) {
                CamundaOutputParameter outputParameter = modelInstance.newInstance(CamundaOutputParameter.class);
                outputParameter.setCamundaName(name);
                outputParameter.setTextContent("${S(response).jsonPath(\"" + jsonPath + "\").element().value()}");
                inputOutput.getCamundaOutputParameters().add(outputParameter);
            }
        }

        // Always captured (regardless of outputMapping), so the admin UI can show "what URL was
        // called / what came back" per node even when no output variable was mapped from it — `url`
        // already carries the same ${...} expressions the input parameter above uses, so it
        // re-resolves to the exact same value that was actually called. Confirmed independently of
        // the "execution doesn't exist" issue (see SimulationController/ms-espec-registry notes): that
        // reproduces identically even with these two lines removed entirely.
        inputOutput.getCamundaOutputParameters().add(rawOutputParameter(modelInstance, HTTP_URL_VAR_PREFIX + nodeId, url));
        inputOutput.getCamundaOutputParameters().add(rawOutputParameter(modelInstance, HTTP_RESPONSE_VAR_PREFIX + nodeId, "${response}"));
    }

    private CamundaOutputParameter rawOutputParameter(BpmnModelInstance modelInstance, String name, String expression) {
        CamundaOutputParameter parameter = modelInstance.newInstance(CamundaOutputParameter.class);
        parameter.setCamundaName(name);
        parameter.setTextContent(expression);
        return parameter;
    }

    private CamundaInputParameter newInputParameter(BpmnModelInstance modelInstance, String name, String value) {
        CamundaInputParameter parameter = modelInstance.newInstance(CamundaInputParameter.class);
        parameter.setCamundaName(name);
        parameter.setTextContent(value);
        return parameter;
    }

    private String asString(Object value, String fallback) {
        return value instanceof String s ? s : fallback;
    }

    // ponytail: values are encoded as literal query params at generation time — fine since Admin
    // Portal's params config is static per journey, not resolved from runtime data.
    private String appendQueryParams(String url, Object paramsValue) {
        if (!(paramsValue instanceof Map<?, ?> params) || params.isEmpty()) {
            return url;
        }
        String query = params.entrySet().stream()
                .map(e -> URLEncoder.encode(String.valueOf(e.getKey()), StandardCharsets.UTF_8) + "="
                        + URLEncoder.encode(String.valueOf(e.getValue()), StandardCharsets.UTF_8))
                .collect(Collectors.joining("&"));
        return url + (url.contains("?") ? "&" : "?") + query;
    }

    /**
     * Carries the Admin Portal's connectorConfig (method/url/headers/body/params/inputMapping/
     * credentialRef — REST or Kafka, whatever keys are present) onto the BPMN element as
     * camunda:inputParameter entries, so the external task worker listening on the topic actually
     * knows what call to make instead of just its own topic name. outputMapping rules (REQ-03.09.010,
     * {@code {name, jsonPath}}) are passed one per rule (as {@code outputMapping.<name>} = jsonPath)
     * rather than a single serialized blob: an auto-generated mapping from a real API response can
     * easily produce dozens of rules, and one combined JSON string routinely exceeds the 4000-char
     * TEXT_ column Camunda's default (H2) schema uses for historic variables — a value that long
     * fails the whole process instantiation instead of just failing to fit. Applying each JSONPath to
     * the real HTTP response is the worker's job, not BPMN's; each rule additionally gets one
     * camunda:outputParameter mapping the worker-completed local variable up into the process scope
     * under that same name.
     */
    private void attachConnectorConfig(BpmnModelInstance modelInstance, BaseElement element, FlowNodeRequest node) {
        ConnectorConfigRequest connectorConfig = node.connectorConfig();
        if (connectorConfig == null) {
            return;
        }
        if (connectorConfig.credentialRef() != null) {
            addInputParameter(modelInstance, element, "credentialRef", connectorConfig.credentialRef());
        }
        Map<String, Object> config = connectorConfig.config();
        if (config == null) {
            return;
        }
        for (Map.Entry<String, Object> entry : config.entrySet()) {
            if ("outputMapping".equals(entry.getKey()) || entry.getValue() == null) {
                continue;
            }
            addInputParameter(modelInstance, element, entry.getKey(), serialize(entry.getValue()));
        }
        for (Map<String, Object> rule : outputMappingOf(config)) {
            if (rule.get("name") instanceof String name && !name.isBlank() && rule.get("jsonPath") instanceof String jsonPath) {
                addInputParameter(modelInstance, element, "outputMapping." + name, jsonPath);
                addOutputParameter(modelInstance, element, name, "${" + name + "}");
            }
        }
    }

    private CamundaInputOutput getOrCreateInputOutput(BpmnModelInstance modelInstance, BaseElement element) {
        ExtensionElements extensionElements = element.getExtensionElements();
        if (extensionElements == null) {
            extensionElements = modelInstance.newInstance(ExtensionElements.class);
            element.setExtensionElements(extensionElements);
        }
        for (ModelElementInstance child : extensionElements.getElements()) {
            if (child instanceof CamundaInputOutput inputOutput) {
                return inputOutput;
            }
        }
        return extensionElements.addExtensionElement(CamundaInputOutput.class);
    }

    private void addInputParameter(BpmnModelInstance modelInstance, BaseElement element, String name, String value) {
        getOrCreateInputOutput(modelInstance, element).getCamundaInputParameters()
                .add(newInputParameter(modelInstance, name, value));
    }

    private void addOutputParameter(BpmnModelInstance modelInstance, BaseElement element, String name, String expression) {
        CamundaOutputParameter parameter = modelInstance.newInstance(CamundaOutputParameter.class);
        parameter.setCamundaName(name);
        parameter.setTextContent(expression);
        getOrCreateInputOutput(modelInstance, element).getCamundaOutputParameters().add(parameter);
    }

    @SuppressWarnings("unchecked")
    private List<Map<String, Object>> outputMappingOf(Map<String, Object> config) {
        if (!(config.get("outputMapping") instanceof List<?> list)) {
            return List.of();
        }
        List<Map<String, Object>> result = new ArrayList<>();
        for (Object item : list) {
            if (item instanceof Map<?, ?> map) {
                result.add((Map<String, Object>) map);
            }
        }
        return result;
    }

    private String serialize(Object value) {
        if (value instanceof String s) {
            return s;
        }
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new BpmnTransformationException("Failed to serialize connector config value: " + e.getMessage());
        }
    }

    private String topicName(FlowNodeRequest node) {
        String connector = node.connectorConfig() != null && node.connectorConfig().connectorType() != null
                ? node.connectorConfig().connectorType().toLowerCase()
                : "generic";
        return connector + "-" + node.id();
    }

    private byte[] toXmlBytes(BpmnModelInstance model) {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        Bpmn.writeModelToStream(out, model);
        return out.toByteArray();
    }
}
