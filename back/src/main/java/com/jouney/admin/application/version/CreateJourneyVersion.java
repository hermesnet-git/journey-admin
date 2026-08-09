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
import com.jouney.admin.domain.version.VersionStatus;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Keeps the journey's current DRAFT version in sync with its live flow/forms/product/channel
 * state (REQ-06.02.002/003/009): if a DRAFT already exists, its snapshot is replaced in place —
 * same id/versionNumber, fresher content — since a DRAFT is "what's currently being edited", not
 * a series of throwaway branches. Only when no DRAFT exists (typically right after a publish,
 * since the previous DRAFT just became PUBLISHED) is a brand new version created. Either way, the
 * result never affects other versions: they're untouched.
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
        var forms = snapshotFactory.resolveForms(flow);

        var existingDraft = journeyVersionRepository.findByJourneyIdAndStatus(journeyId, VersionStatus.DRAFT);
        if (existingDraft.isPresent()) {
            JourneyVersion draft = existingDraft.get();
            draft.replaceContent(journey.getName(), journey.getDescription(), product.getId(), product.getName(),
                    channel.getId(), channel.getName(), channel.getType(), flow.getNodes(), flow.getConnections(),
                    forms);
            JourneyVersion saved = journeyVersionRepository.save(draft);
            recordAuditEvent.record("JOURNEY_VERSION_UPDATE", "JOURNEY_VERSION", saved.getId(), AuditResult.SUCCESS,
                    createdBy);
            return saved;
        }

        int nextVersionNumber = journeyVersionRepository.findMaxVersionNumber(journeyId) + 1;
        JourneyVersion version = JourneyVersion.createDraft(journeyId, nextVersionNumber, description, createdBy,
                journey.getName(), journey.getDescription(), product.getId(), product.getName(), channel.getId(),
                channel.getName(), channel.getType(), flow.getNodes(), flow.getConnections(), forms);
        JourneyVersion saved = journeyVersionRepository.save(version);
        recordAuditEvent.record("JOURNEY_VERSION_CREATE", "JOURNEY_VERSION", saved.getId(), AuditResult.SUCCESS,
                createdBy);
        return saved;
    }
}
