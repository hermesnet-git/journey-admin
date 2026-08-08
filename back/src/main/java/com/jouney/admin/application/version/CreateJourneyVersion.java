package com.jouney.admin.application.version;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Creates a new DRAFT version of a journey (REQ-06.02.002/003), snapshotting the journey's
 * current live flow/forms/product/channel state. Editing the resulting DRAFT never affects other
 * versions, since each version owns an independent copy of that content.
 */
@Service
public class CreateJourneyVersion {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final FlowRepository flowRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final JourneySnapshotFactory snapshotFactory;
    private final RecordAuditEvent recordAuditEvent;

    public CreateJourneyVersion(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                                 ProductRepository productRepository, FlowRepository flowRepository,
                                 JourneyVersionRepository journeyVersionRepository,
                                 JourneySnapshotFactory snapshotFactory, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.flowRepository = flowRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.snapshotFactory = snapshotFactory;
        this.recordAuditEvent = recordAuditEvent;
    }

    public JourneyVersion execute(UUID journeyId, String description, UUID createdBy) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        Channel channel = channelRepository.findById(journey.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(journey.getChannelId()));
        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));
        Flow flow = flowRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new IllegalStateException("Journey has no flow: " + journeyId));

        int nextVersionNumber = journeyVersionRepository.findMaxVersionNumber(journeyId) + 1;
        JourneyVersion version = JourneyVersion.createDraft(journeyId, nextVersionNumber, description, createdBy,
                journey.getName(), journey.getDescription(), product.getId(), product.getName(), channel.getId(),
                channel.getName(), channel.getType(), flow.getNodes(), flow.getConnections(),
                snapshotFactory.resolveForms(flow));
        JourneyVersion saved = journeyVersionRepository.save(version);
        recordAuditEvent.record("JOURNEY_VERSION_CREATE", "JOURNEY_VERSION", saved.getId(), AuditResult.SUCCESS,
                createdBy);
        return saved;
    }
}
