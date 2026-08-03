package com.jouney.admin.application.publication;

import com.jouney.admin.domain.Status;
import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormRepository;
import com.jouney.admin.domain.journey.ChannelInactiveException;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class PublishJourney {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final FlowRepository flowRepository;
    private final FormRepository formRepository;
    private final PublicationRepository publicationRepository;
    private final RuntimePublicationPort runtimePublicationPort;

    public PublishJourney(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                           ProductRepository productRepository, FlowRepository flowRepository,
                           FormRepository formRepository, PublicationRepository publicationRepository,
                           RuntimePublicationPort runtimePublicationPort) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.flowRepository = flowRepository;
        this.formRepository = formRepository;
        this.publicationRepository = publicationRepository;
        this.runtimePublicationPort = runtimePublicationPort;
    }

    public void execute(UUID journeyId) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));

        Channel channel = channelRepository.findById(journey.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(journey.getChannelId()));
        if (channel.getStatus() != Status.ACTIVE) {
            throw new ChannelInactiveException(channel.getId());
        }

        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));
        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }

        Flow flow = flowRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new IllegalStateException("Journey has no flow: " + journeyId));

        List<Form> forms = flow.getNodes().stream()
                .map(FlowNode::getFormId)
                .filter(Objects::nonNull)
                .distinct()
                .map(formRepository::findById)
                .flatMap(java.util.Optional::stream)
                .toList();

        UUID existingId = publicationRepository.findByJourneyId(journeyId).map(Publication::getId).orElse(null);
        Publication snapshot = Publication.create(existingId, journeyId, journey.getName(), journey.getDescription(),
                product.getId(), product.getName(), channel.getId(), channel.getName(), channel.getType(),
                flow.getNodes(), flow.getConnections(), forms);

        runtimePublicationPort.publish(snapshot);

        publicationRepository.save(snapshot);
        journey.publish();
        journeyRepository.save(journey);
    }
}
