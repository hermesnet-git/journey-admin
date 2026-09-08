package com.jouney.especregistry.sdui;

import tools.jackson.databind.JsonNode;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Espelha domain/flow/SduiScreenEnvelope + SduiSnapshotFactory do admin/back — o envelope
 * canônico do catálogo (seção 14.1), recebido via POST /api/v1/sdui-snapshots na hora do publish
 * de uma jornada e persistido no Strapi (content-type {@code sdui-snapshot}). */
public record SduiScreenEnvelope(String schemaVersion, String catalogVersion, UUID journeyId,
                                  int journeyVersion, String uiStepId, String status,
                                  OffsetDateTime publishedAt, List<String> supportedTargets,
                                  Map<String, String> minRendererVersion,
                                  Map<String, Object> dataSources, JsonNode data) {
}
