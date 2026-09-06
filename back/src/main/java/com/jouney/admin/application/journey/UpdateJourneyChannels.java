package com.jouney.admin.application.journey;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyInactiveException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Lets a journey add/remove channels after creation (e.g. start Web-only, expand to WhatsApp
 * later) — the flow and screens are shared, only the set of channel types the journey serves
 * changes. */
@Service
public class UpdateJourneyChannels {

    private final JourneyRepository journeyRepository;
    private final ProductRepository productRepository;
    private final RecordAuditEvent recordAuditEvent;

    public UpdateJourneyChannels(JourneyRepository journeyRepository, ProductRepository productRepository,
                                  RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.productRepository = productRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Journey execute(UUID journeyId, Set<ChannelType> channelTypes) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        if (journey.getStatus() == JourneyStatus.INACTIVE) {
            throw new JourneyInactiveException(journeyId);
        }
        Product product = productRepository.findById(journey.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(journey.getProductId()));
        JourneyChannelValidation.validate(journey.getProductId(), product.getChannelTypes(), channelTypes);
        journey.updateChannels(channelTypes);
        Journey saved = journeyRepository.save(journey);
        recordAuditEvent.record("JOURNEY_CHANNELS_UPDATE", "JOURNEY", journeyId, AuditResult.SUCCESS);
        return saved;
    }
}
