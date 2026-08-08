package com.jouney.admin.application.version;

import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class ListJourneyVersions {

    private final JourneyRepository journeyRepository;
    private final JourneyVersionRepository journeyVersionRepository;

    public ListJourneyVersions(JourneyRepository journeyRepository, JourneyVersionRepository journeyVersionRepository) {
        this.journeyRepository = journeyRepository;
        this.journeyVersionRepository = journeyVersionRepository;
    }

    public List<JourneyVersion> execute(UUID journeyId) {
        if (journeyRepository.findById(journeyId).isEmpty()) {
            throw new JourneyNotFoundException(journeyId);
        }
        return journeyVersionRepository.findByJourneyId(journeyId);
    }
}
