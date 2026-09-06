package com.jouney.admin.domain.flow;

import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.RenderTarget;
import com.jouney.admin.domain.componentregistry.TargetStatus;
import com.jouney.admin.domain.sdui.SduiNode;
import java.time.OffsetDateTime;
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
public final class SduiEnvelopeBuilder {

    private static final String SCHEMA_VERSION = "1.0";
    private static final String CATALOG_VERSION = "1.0";

    private SduiEnvelopeBuilder() {
    }

    public static List<SduiScreenEnvelope> buildAll(UUID journeyId, int revision, List<FlowNode> flowNodes,
                                                      Map<String, ComponentDefinition> componentRegistry) {
        List<SduiScreenEnvelope> envelopes = new ArrayList<>();
        for (FlowNode node : flowNodes) {
            if (node.getEmbeddedScreenRoot() == null) {
                continue;
            }
            envelopes.add(build(journeyId, node.getId(), revision, node.getEmbeddedScreenRoot(), componentRegistry));
        }
        return envelopes;
    }

    private static SduiScreenEnvelope build(UUID journeyId, String screenId, int revision, SduiNode root,
                                             Map<String, ComponentDefinition> componentRegistry) {
        Set<String> usedKeys = new LinkedHashSet<>();
        collectKeys(root, usedKeys);
        List<ComponentDefinition> used = usedKeys.stream().map(componentRegistry::get).filter(Objects::nonNull).toList();

        List<String> supportedTargets = new ArrayList<>();
        Map<String, String> minRendererVersion = new LinkedHashMap<>();
        for (String target : RenderTarget.ALL) {
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

        return new SduiScreenEnvelope(SCHEMA_VERSION, CATALOG_VERSION, journeyId, screenId, revision, "published",
                OffsetDateTime.now(), supportedTargets, minRendererVersion, root);
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
