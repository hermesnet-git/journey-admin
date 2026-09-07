package com.jouney.admin.application.version;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.application.publication.SduiPublicationUnavailableException;
import com.jouney.admin.application.publication.SduiScreenPublicationPort;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.componentregistry.ComponentDefinition;
import com.jouney.admin.domain.componentregistry.ComponentDefinitionRepository;
import com.jouney.admin.domain.flow.FlowValidator;
import com.jouney.admin.domain.flow.SduiEnvelopeBuilder;
import com.jouney.admin.domain.flow.SduiScreenEnvelope;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionHasNoFlowException;
import com.jouney.admin.domain.version.VersionNotDraftException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;

/**
 * Publishes a DRAFT journey version (REQ-06.04): validates product/flow like the legacy
 * {@link com.jouney.admin.application.publication.PublishJourney}, sends the version's own
 * snapshot to the runtime. A previously-PUBLISHED version of the same journey is left untouched —
 * the runtime already keeps every deployed version independently addressable (Camunda versions by
 * process definition key), and any instance already running on that older version must be allowed
 * to keep running; despublicar it is a separate, explicit action (see
 * {@link UnpublishJourneyVersion}). The core of this
 * (everything past the DRAFT check) is reused by {@link RepublishJourneyVersion} (REQ-06.04.011)
 * for UNPUBLISHED versions, since going live is otherwise identical regardless of which status a
 * version is coming from.
 */
@Service
public class PublishJourneyVersion {

    private final JourneyRepository journeyRepository;
    private final ProductRepository productRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final PublicationRepository publicationRepository;
    private final RuntimePublicationPort runtimePublicationPort;
    private final RecordAuditEvent recordAuditEvent;
    private final ComponentDefinitionRepository componentDefinitionRepository;
    private final SduiScreenPublicationPort sduiScreenPublicationPort;

    public PublishJourneyVersion(JourneyRepository journeyRepository, ProductRepository productRepository,
                                  JourneyVersionRepository journeyVersionRepository,
                                  PublicationRepository publicationRepository,
                                  RuntimePublicationPort runtimePublicationPort, RecordAuditEvent recordAuditEvent,
                                  ComponentDefinitionRepository componentDefinitionRepository,
                                  SduiScreenPublicationPort sduiScreenPublicationPort) {
        this.journeyRepository = journeyRepository;
        this.productRepository = productRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.publicationRepository = publicationRepository;
        this.runtimePublicationPort = runtimePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
        this.componentDefinitionRepository = componentDefinitionRepository;
        this.sduiScreenPublicationPort = sduiScreenPublicationPort;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = findVersion(journeyId, versionId);
        if (version.getStatus() != VersionStatus.DRAFT) {
            throw new VersionNotDraftException(versionId);
        }
        return goLive(journeyId, version, "DRAFT", "JOURNEY_VERSION_PUBLISH");
    }

    JourneyVersion findVersion(UUID journeyId, UUID versionId) {
        return journeyVersionRepository.findById(versionId)
                .filter(v -> v.getJourneyId().equals(journeyId))
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
    }

    JourneyVersion goLive(UUID journeyId, JourneyVersion version, String previousStatus, String auditAction) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        Product product = productRepository.findById(version.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(version.getProductId()));
        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }

        if (version.getFlowNodes().isEmpty()) {
            throw new VersionHasNoFlowException(version.getId());
        }
        // Salvar não valida mais (rascunho pode ficar inconsistente) — publicar é o único ponto
        // que garante a jornada estruturalmente válida antes de ir ao ar, tanto num publish comum
        // quanto num republish (ambos convergem aqui).
        Map<String, ComponentDefinition> componentRegistry = componentDefinitionRepository.findAll().stream()
                .collect(Collectors.toMap(ComponentDefinition::key, d -> d));
        FlowValidator.validate(version.getFlowNodes(), version.getFlowConnections(), componentRegistry,
                version.getChannelTypes());

        UUID existingPublicationId = publicationRepository.findByJourneyId(journeyId)
                .map(Publication::getId).orElse(null);
        Publication publication = Publication.create(existingPublicationId, journeyId, version.getJourneyName(),
                version.getJourneyDescription(), version.getProductId(), version.getProductName(),
                version.getChannelTypes(), version.getFlowNodes(), version.getFlowConnections(), version.getId(),
                version.getVersionNumber());
        List<SduiScreenEnvelope> sduiEnvelopes = SduiEnvelopeBuilder.buildAll(journeyId, version.getVersionNumber(),
                version.getFlowNodes(), componentRegistry);
        String deploymentId;
        try {
            // Checa disponibilidade antes de qualquer efeito colateral (deploy no runtime incluso)
            // — só quando a versão tem tela pra publicar de verdade, pra não checar o Strapi à toa
            // numa jornada sem User Task com tela nenhuma. Falha rápido (timeout curto do próprio
            // isAvailable()) em vez de deployar no runtime e só descobrir depois, no publish do
            // SDUI, que o Strapi está fora do ar.
            if (!sduiEnvelopes.isEmpty() && !sduiScreenPublicationPort.isAvailable()) {
                throw new SduiPublicationUnavailableException(
                        "Não foi possível publicar: o serviço de telas SDUI (ms-espec-registry/Strapi) está indisponível no momento.");
            }
            deploymentId = runtimePublicationPort.publish(publication);
            sduiScreenPublicationPort.publish(sduiEnvelopes);
        } catch (RuntimeException e) {
            recordAuditEvent.record(auditAction, "JOURNEY_VERSION", version.getId(), AuditResult.FAILURE,
                    Map.of("status", previousStatus), Map.of("error", errorMessage(e)));
            throw e;
        }
        publicationRepository.save(publication);

        // Uma versão PUBLISHED anterior da mesma jornada, se existir, fica como está — o runtime já
        // mantém as duas independentemente (Camunda versiona por chave), e quem já estava numa
        // instância da versão antiga precisa poder terminar sem interrupção. Despublicar a antiga
        // (se for o caso) é uma ação separada e explícita, não um efeito colateral de publicar uma
        // versão nova.
        version.publish(deploymentId);
        JourneyVersion published = journeyVersionRepository.save(version);

        journey.publish();
        journeyRepository.save(journey);

        recordAuditEvent.record(auditAction, "JOURNEY_VERSION", version.getId(), AuditResult.SUCCESS,
                Map.of("status", previousStatus), Map.of("status", "PUBLISHED"));

        return published;
    }

    private static String errorMessage(Exception e) {
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }
}
