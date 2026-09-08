package com.jouney.admin.domain.flow;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/** Envelope canônico de snapshot de tela (catálogo SDUI corporativo v1, seção 14.1) — um por
 * FlowNode com embeddedScreenRoot, enviado ao ms-espec-registry na hora do publish pra ser gravado
 * no Strapi. {@code uiStepId} é o id do próprio FlowNode (uma User Task só tem uma tela). */
public record SduiScreenEnvelope(String schemaVersion, String catalogVersion, UUID journeyId, int journeyVersion,
                                  String uiStepId, String status, OffsetDateTime publishedAt,
                                  List<String> supportedTargets, Map<String, String> minRendererVersion,
                                  Map<String, Object> dataSources, List<Object> data) {
}
