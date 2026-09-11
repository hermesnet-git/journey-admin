package com.jouney.admin.application.execution;

import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Diagrama da jornada sem iniciar instância nenhuma — usado pelo front, ao selecionar uma
 * jornada, pra descobrir se o início é por MESSAGE_START_EVENT antes de decidir como começar a
 * execução. */
@Service
public class GetExecutionFlow {

    private final PublicationRepository publicationRepository;

    public GetExecutionFlow(PublicationRepository publicationRepository) {
        this.publicationRepository = publicationRepository;
    }

    public Publication execute(UUID journeyId) {
        return publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
    }
}
