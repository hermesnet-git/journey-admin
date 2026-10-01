package com.jouney.admin.infrastructure.journey;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.ConnectorConfig;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.FlowAnnotation;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.FlowSection;
import com.jouney.admin.domain.journey.JourneyTemplate;
import com.jouney.admin.domain.journey.JourneyTemplateCatalog;
import com.jouney.admin.domain.sdui.SduiNode;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

/**
 * Templates live as JSON files in {@code resources/journey-templates}, one per example, in the same
 * shape the flow API reads and returns (nodes/connections/annotations of PUT/GET .../flow) — so a
 * template can be authored from a real journey's flow. Gallery order follows the file names
 * (numeric prefix). Loaded once at startup: a malformed file fails the boot instead of a request.
 */
@Component
public class JsonJourneyTemplateCatalog implements JourneyTemplateCatalog {

    private static final String LOCATION = "classpath:journey-templates/*.json";

    private final List<JourneyTemplate> templates;

    public JsonJourneyTemplateCatalog(ObjectMapper objectMapper) {
        this.templates = load(objectMapper);
    }

    @Override
    public List<JourneyTemplate> findAll() {
        return templates;
    }

    @Override
    public Optional<JourneyTemplate> findById(String id) {
        return templates.stream().filter(template -> template.id().equals(id)).findFirst();
    }

    private static List<JourneyTemplate> load(ObjectMapper objectMapper) {
        try {
            Resource[] resources = new PathMatchingResourcePatternResolver().getResources(LOCATION);
            return Arrays.stream(resources)
                    .sorted(Comparator.comparing(Resource::getFilename))
                    .map(resource -> read(objectMapper, resource).toDomain())
                    .toList();
        } catch (IOException e) {
            throw new UncheckedIOException("Não foi possível listar os templates de jornada", e);
        }
    }

    private static TemplateFile read(ObjectMapper objectMapper, Resource resource) {
        try (InputStream in = resource.getInputStream()) {
            return objectMapper.readValue(in, TemplateFile.class);
        } catch (IOException e) {
            throw new UncheckedIOException("Template de jornada inválido: " + resource.getFilename(), e);
        }
    }

    private record TemplateFile(String templateId, String name, String description, String track, String area,
                                List<ChannelType> channelTypes, List<String> highlights, FlowFile flow) {

        JourneyTemplate toDomain() {
            return new JourneyTemplate(templateId, name, description, track, area, channelTypes, highlights,
                    flow.name(),
                    flow.nodes().stream().map(NodeFile::toDomain).toList(),
                    flow.connections().stream().map(ConnectionFile::toDomain).toList(),
                    flow.annotations().stream().map(AnnotationFile::toDomain).toList(),
                    flow.sections() != null ? flow.sections() : List.of());
        }
    }

    private record FlowFile(String name, List<NodeFile> nodes, List<ConnectionFile> connections,
                            List<AnnotationFile> annotations, List<FlowSection> sections) {
    }

    private record NodeFile(String nodeId, FlowNodeType nodeType, String name, String description, int positionX,
                            int positionY, UserTaskFile userTaskConfig, ConnectorFile connectorConfig,
                            List<Map<String, Object>> startVariables) {

        FlowNode toDomain() {
            return new FlowNode(nodeId, nodeType, name, description, positionX, positionY,
                    connectorConfig != null ? connectorConfig.toDomain() : null, startVariables,
                    userTaskConfig != null ? userTaskConfig.embeddedScreenRoot() : null, null,
                    userTaskConfig != null ? userTaskConfig.dataSources() : null);
        }
    }

    private record UserTaskFile(SduiNode embeddedScreenRoot, List<Map<String, Object>> dataSources) {
    }

    private record ConnectorFile(ConnectorType connectorType, Map<String, Object> config, String credentialRef) {

        ConnectorConfig toDomain() {
            return new ConnectorConfig(connectorType, config, credentialRef);
        }
    }

    private record ConnectionFile(String connectionId, String sourceNodeId, String targetNodeId, String condition,
                                  boolean isDefault, boolean onError, String label) {

        FlowConnection toDomain() {
            return new FlowConnection(connectionId, sourceNodeId, targetNodeId, condition, isDefault, onError, label);
        }
    }

    private record AnnotationFile(String id, String text, int positionX, int positionY, List<String> linkedNodeIds) {

        FlowAnnotation toDomain() {
            return new FlowAnnotation(id, text, positionX, positionY, linkedNodeIds);
        }
    }
}
