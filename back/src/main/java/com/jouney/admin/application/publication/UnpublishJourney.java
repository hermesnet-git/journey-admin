package com.jouney.admin.application.publication;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.domain.version.VersionStatus;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Journey-level "Despublicar": desde que uma jornada passou a poder ter mais de uma versão
 * PUBLISHED ao mesmo tempo (publicar uma versão nova não despublica a anterior — ver
 * {@link com.jouney.admin.application.version.PublishJourneyVersion}), despublicar a jornada
 * inteira significa despublicar cada versão publicada dela, uma a uma — cada uma mirando só o seu
 * próprio deployment no runtime (nunca "tudo daquela chave"). Se qualquer uma tiver instância
 * ativa, para na hora (a exceção do runtime propaga) e as versões já despublicadas antes dela na
 * lista permanecem despublicadas — não há rollback.
 */
@Service
public class UnpublishJourney {

    private final JourneyRepository journeyRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final RuntimePublicationPort runtimePublicationPort;
    private final RecordAuditEvent recordAuditEvent;

    public UnpublishJourney(JourneyRepository journeyRepository, JourneyVersionRepository journeyVersionRepository,
                             RuntimePublicationPort runtimePublicationPort, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.runtimePublicationPort = runtimePublicationPort;
        this.recordAuditEvent = recordAuditEvent;
    }

    public void execute(UUID journeyId) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        if (journey.getStatus() != JourneyStatus.PUBLISHED) {
            throw new JourneyNotPublishedException(journeyId);
        }

        List<JourneyVersion> publishedVersions =
                journeyVersionRepository.findAllByJourneyIdAndStatus(journeyId, VersionStatus.PUBLISHED);
        for (JourneyVersion version : publishedVersions) {
            try {
                runtimePublicationPort.unpublish(journeyId, version.getRuntimeDeploymentId());
            } catch (RuntimeException e) {
                recordAuditEvent.record("JOURNEY_UNPUBLISH", "JOURNEY", journeyId, AuditResult.FAILURE,
                        Map.of("error", errorMessage(e), "versionId", version.getId().toString()), null);
                throw e;
            }
            version.unpublish();
            journeyVersionRepository.save(version);
        }

        journey.unpublish();
        journeyRepository.save(journey);
        recordAuditEvent.record("JOURNEY_UNPUBLISH", "JOURNEY", journeyId, AuditResult.SUCCESS,
                Map.of("status", "UNPUBLISHED"), null);
    }

    private static String errorMessage(Exception e) {
        return e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
    }
}
