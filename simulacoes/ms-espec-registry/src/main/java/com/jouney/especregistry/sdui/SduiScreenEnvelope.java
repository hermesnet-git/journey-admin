package com.jouney.especregistry.sdui;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Espelha domain/flow/SduiScreenEnvelope + SduiSnapshotFactory do admin/back — o envelope
 * canônico do catálogo (seção 14.1), recebido via POST /api/v1/sdui-snapshots na hora do publish
 * de uma jornada e persistido no Strapi (content-type {@code sdui-snapshot}). */
@JsonIgnoreProperties(ignoreUnknown = true)
public record SduiScreenEnvelope(String schemaVersion, String catalogVersion, UUID journeyId, String screenId,
                                  int revision, String status, OffsetDateTime publishedAt,
                                  List<String> supportedTargets, Map<String, String> minRendererVersion,
                                  SduiNode root) {
}
