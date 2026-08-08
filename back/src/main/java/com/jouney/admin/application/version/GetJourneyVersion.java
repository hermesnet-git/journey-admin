package com.jouney.admin.application.version;

import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionNotFoundException;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetJourneyVersion {

    private final JourneyVersionRepository journeyVersionRepository;

    public GetJourneyVersion(JourneyVersionRepository journeyVersionRepository) {
        this.journeyVersionRepository = journeyVersionRepository;
    }

    public JourneyVersion execute(UUID journeyId, UUID versionId) {
        JourneyVersion version = journeyVersionRepository.findById(versionId)
                .orElseThrow(() -> new JourneyVersionNotFoundException(versionId));
        if (!version.getJourneyId().equals(journeyId)) {
            throw new JourneyVersionNotFoundException(versionId);
        }
        return version;
    }
}
