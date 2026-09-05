package com.jouney.admin.application.journey;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class CreateJourney {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final FlowRepository flowRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final RecordAuditEvent recordAuditEvent;

    public CreateJourney(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                          ProductRepository productRepository, FlowRepository flowRepository,
                          JourneyVersionRepository journeyVersionRepository, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.flowRepository = flowRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public Journey execute(UUID channelId, String name, String description, UUID createdBy) {
        Channel channel = channelRepository.findById(channelId)
                .orElseThrow(() -> new ChannelNotFoundException(channelId));

        if (channel.getStatus() != Status.ACTIVE) {
            throw new ChannelInactiveException(channelId);
        }

        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));

        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }

        Journey journey = journeyRepository.save(Journey.create(channelId, name, description));
        flowRepository.save(Flow.initial(journey.getId()));

        // REQ-06.02.001: every journey is born with an initial DRAFT version (empty flow, matching
        // the flow just created above).
        JourneyVersion initialVersion = JourneyVersion.createDraft(journey.getId(), 1, null, createdBy,
                journey.getName(), journey.getDescription(), product.getId(), product.getName(), channel.getId(),
                channel.getName(), channel.getType(), List.of(), List.of());
        journeyVersionRepository.save(initialVersion);

        recordAuditEvent.record("JOURNEY_CREATE", "JOURNEY", journey.getId(), AuditResult.SUCCESS);
        return journey;
    }
}
