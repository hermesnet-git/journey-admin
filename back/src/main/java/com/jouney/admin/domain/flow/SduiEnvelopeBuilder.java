package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.datasource.DataSource;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.RenderTarget;
import com.jouney.admin.domain.componentregistry.TargetStatus;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.sdui.SduiNode;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;

/** Monta o envelope canônico (seção 14.1) por tela publicável — {@code supportedTargets} e
 * {@code minRendererVersion} são CALCULADOS (interseção dos alvos SUPPORTED entre todos os
 * componentes usados na árvore, e o máximo de versão mínima exigida entre eles), não fixos, pra
 * continuarem corretos conforme o Component Registry ganhar mais alvos/versões. */
@SuppressWarnings("unchecked")
public final class SduiEnvelopeBuilder {

    private static final String SCHEMA_VERSION = "1.0.0";
    private static final String CATALOG_VERSION = "1.0.0";

    private SduiEnvelopeBuilder() {
    }

    public static List<SduiScreenEnvelope> buildAll(UUID journeyId, int journeyVersion,
                                                      List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                                                      Map<String, ComponentDefinition> componentRegistry,
                                                      Map<String, DataSource> dataSourcesByName) {
        List<SduiScreenEnvelope> envelopes = new ArrayList<>();
        List<FlowViolation> violations = new ArrayList<>();
        for (FlowNode node : flowNodes) {
            if (node.getEmbeddedScreenRoot() == null) {
                continue;
            }
            Map<String, Object> dataSources = freezeDataSources(node, dataSourcesByName, violations);
            envelopes.add(build(journeyId, journeyVersion, node.getId(), channelTypes,
                    node.getEmbeddedScreenRoot(), componentRegistry, dataSources));
        }
        if (!violations.isEmpty()) {
            throw new FlowValidationException(violations);
        }
        return envelopes;
    }

    // dataSources do envelope (ADR-002, catálogo seção 14.4): por apelido, o que a tela declarou
    // (fonte, parâmetros, obrigatória, mensagem de erro) mais uma cópia da configuração da fonte no
    // catálogo — congelada aqui, então alterar a fonte depois só afeta as próximas publicações, e o
    // ms-espec-registry executa sem consultar o admin em tempo de execução.
    private static Map<String, Object> freezeDataSources(FlowNode node, Map<String, DataSource> dataSourcesByName,
                                                         List<FlowViolation> violations) {
        Map<String, Object> frozen = new LinkedHashMap<>();
        if (node.getScreenDataSources() == null) {
            return frozen;
        }
        for (Map<String, Object> declaration : node.getScreenDataSources()) {
            String alias = String.valueOf(declaration.get("alias"));
            String sourceName = String.valueOf(declaration.get("source"));
            DataSource source = dataSourcesByName.get(sourceName);
            if (source == null) {
                violations.add(new FlowViolation(node.getId(), "A fonte de dados '" + sourceName + "' usada na tela de '"
                        + node.getName() + "' não existe no catálogo de fontes de dados"));
                continue;
            }
            Map<String, Object> params = declaration.get("params") instanceof Map<?, ?> m
                    ? new LinkedHashMap<>((Map<String, Object>) m) : new LinkedHashMap<>();
            for (String param : source.getParams()) {
                if (!(params.get(param) instanceof String value) || value.isBlank()) {
                    violations.add(new FlowViolation(node.getId(), "A fonte de dados '" + alias + "' da tela de '"
                            + node.getName() + "' não informa o valor do parâmetro '" + param + "'"));
                }
            }
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("source", source.getName());
            entry.put("params", params);
            entry.put("required", Boolean.TRUE.equals(declaration.get("required")));
            entry.put("errorMessage", declaration.get("errorMessage") instanceof String msg && !msg.isBlank()
                    ? msg : "Não foi possível carregar as informações agora.");
            entry.put("url", source.getUrl());
            entry.put("timeoutMs", source.getTimeoutMs());
            entry.put("itemsPath", source.getItemsPath());
            entry.put("exposedFields", source.getExposedFields());
            entry.put("credentialRef", source.getCredentialRef());
            frozen.put(alias, entry);
        }
        return frozen;
    }

    private static SduiScreenEnvelope build(UUID journeyId, int journeyVersion, String uiStepId,
                                             List<ChannelType> channelTypes, SduiNode root,
                                             Map<String, ComponentDefinition> componentRegistry,
                                             Map<String, Object> dataSources) {
        Set<String> usedKeys = new LinkedHashSet<>();
        collectKeys(root, usedKeys);
        List<ComponentDefinition> used = usedKeys.stream().map(componentRegistry::get).filter(Objects::nonNull).toList();

        List<String> supportedTargets = new ArrayList<>();
        Map<String, String> minRendererVersion = new LinkedHashMap<>();
        for (String target : RenderTarget.ALL) {
            if (!targetBelongsToJourney(target, channelTypes)) {
                continue;
            }
            boolean allSupported = !used.isEmpty() && used.stream().allMatch(d -> {
                var support = d.getSupportedTargets().get(target);
                return support != null && support.status() == TargetStatus.SUPPORTED;
            });
            if (!allSupported) {
                continue;
            }
            supportedTargets.add(target);
            String maxVersion = used.stream()
                    .map(d -> d.getSupportedTargets().get(target).minRendererVersion())
                    .max(SduiEnvelopeBuilder::compareVersions)
                    .orElse("1.0.0");
            minRendererVersion.put(target, maxVersion);
        }

        return new SduiScreenEnvelope(SCHEMA_VERSION, CATALOG_VERSION, journeyId, journeyVersion, uiStepId,
                "published", OffsetDateTime.now(ZoneOffset.UTC), supportedTargets, minRendererVersion, dataSources, toTuple(root));
    }

    private static boolean targetBelongsToJourney(String target, List<ChannelType> channelTypes) {
        if (target.equals(RenderTarget.WHATSAPP)) {
            return channelTypes.contains(ChannelType.WHATSAPP);
        }
        if (target.endsWith(".web")) {
            return channelTypes.contains(ChannelType.WEB);
        }
        if (target.endsWith(".mobile")) {
            return channelTypes.contains(ChannelType.MOBILE);
        }
        return false;
    }

    /** Converte o modelo normalizado de autoria na tupla canônica de publicação. */
    private static List<Object> toTuple(SduiNode node) {
        Map<String, Object> attributes = new LinkedHashMap<>();
        attributes.put("id", node.id());
        attributes.put("version", node.version());
        if (node.props() != null) attributes.putAll(node.props());
        if (node.bindings() != null && !node.bindings().isEmpty()) attributes.put("$bindings", node.bindings());
        if (node.events() != null && !node.events().isEmpty()) attributes.put("$events", node.events());
        if (node.visibility() != null) attributes.put("$visibility", node.visibility());
        if (node.active() != null) attributes.put("$active", node.active());
        List<Object> tuple = new ArrayList<>();
        tuple.add(node.type());
        tuple.add(attributes);
        if (node.children() != null) tuple.add(node.children().stream().map(SduiEnvelopeBuilder::toTuple).toList());
        return tuple;
    }

    private static void collectKeys(SduiNode node, Set<String> acc) {
        acc.add(node.type() + "@" + node.version());
        if (node.children() != null) {
            node.children().forEach(child -> collectKeys(child, acc));
        }
    }

    // Compara versões "major.minor.patch" numericamente (não como string — "1.10.0" > "1.9.0",
    // ao contrário da ordem lexicográfica); segmento ausente ou não numérico conta como 0.
    private static int compareVersions(String a, String b) {
        String[] partsA = a.split("\\.");
        String[] partsB = b.split("\\.");
        int length = Math.max(partsA.length, partsB.length);
        for (int i = 0; i < length; i++) {
            int va = i < partsA.length ? parseIntSafe(partsA[i]) : 0;
            int vb = i < partsB.length ? parseIntSafe(partsB[i]) : 0;
            if (va != vb) {
                return Integer.compare(va, vb);
            }
        }
        return 0;
    }

    private static int parseIntSafe(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            return 0;
        }
    }
}
