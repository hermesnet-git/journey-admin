package com.jouney.admin.application.version;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.application.publication.RuntimePublicationPort;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionNotPublishedException;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Version-scoped "Despublicar" entry point (REQ-06.04.009): despublica só {@code versionId} — o
 * deployment dela no runtime, nada mais. Uma versão nova pode publicar sem despublicar as
 * anteriores (ver {@link PublishJourneyVersion}), então esta versão pode não ser a única PUBLISHED
 * da jornada: só flipa {@link Journey} pra UNPUBLISHED se não sobrar nenhuma outra publicada.
 */
@Service
public class UnpublishJourneyVersion {

    private final JourneyVersionRepository journeyVersionRepository;
    private final JourneyRepository journeyRepository;
    private final RuntimePublicationPort runtimePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public UnpublishJourneyVersion(JourneyVersionRepository journeyVersionRepository, JourneyRepository journeyRepository,
                                    RuntimePublicationPort runtimePublicationPort, RecordAuditEvent recordAuditEvent) {
        this.journeyVersionRepository = journeyVersionRepository;
        this.journeyRepository = journeyRepository;
        this.runtimePublicationPort = runtimePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = journeyVersionRepository.findById(versionId)
                .filter(v -> v.getJourneyId().equals(journeyId))
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
        if (version.getStatus() != VersionStatus.PUBLISHED) {
            throw new VersionNotPublishedException(versionId);
        }

        try {
            runtimePublicationPort.unpublish(journeyId, version.getRuntimeDeploymentId());
        } catch (RuntimeException e) {
            recordAuditEvent.record("JOURNEY_VERSION_UNPUBLISH", "JOURNEY_VERSION", versionId, AuditResult.FAILURE,
                    Map.of("error", errorMessage(e)), null);
            throw e;
        }

        version.unpublish();
        JourneyVersion unpublished = journeyVersionRepository.save(version);

        // Só derruba o status da jornada se essa era a última versão publicada — outra pode
        // continuar viva, e nesse caso a jornada como um todo continua PUBLISHED.
        if (journeyVersionRepository.findAllByJourneyIdAndStatus(journeyId, VersionStatus.PUBLISHED).isEmpty()) {
            Journey journey = journeyRepository.findById(journeyId)
                    .orElseThrow(() -> new JourneyNotFoundException(journeyId));
            journey.unpublish();
            journeyRepository.save(journey);
        }

        recordAuditEvent.record("JOURNEY_VERSION_UNPUBLISH", "JOURNEY_VERSION", versionId, AuditResult.SUCCESS,
                Map.of("status", "UNPUBLISHED"), null);

        return unpublished;
    }

    private static String errorMessage(Exception e) {
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }
}
