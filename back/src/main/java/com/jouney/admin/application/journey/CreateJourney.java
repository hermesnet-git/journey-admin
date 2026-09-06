package com.jouney.admin.application.journey;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.channel.ProductInactiveException;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyTemplate;
import com.jouney.admin.domain.journey.JourneyTemplateCatalog;
import com.jouney.admin.domain.journey.JourneyTemplateNotFoundException;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CreateJourney {

    private final JourneyRepository journeyRepository;
    private final ProductRepository productRepository;
    private final FlowRepository flowRepository;
    private final JourneyVersionRepository journeyVersionRepository;
    private final JourneyTemplateCatalog journeyTemplateCatalog;
    private final RecordAuditEvent recordAuditEvent;

    public CreateJourney(JourneyRepository journeyRepository, ProductRepository productRepository,
                          FlowRepository flowRepository, JourneyVersionRepository journeyVersionRepository,
                          JourneyTemplateCatalog journeyTemplateCatalog, RecordAuditEvent recordAuditEvent) {
        this.journeyRepository = journeyRepository;
        this.productRepository = productRepository;
        this.flowRepository = flowRepository;
        this.journeyVersionRepository = journeyVersionRepository;
        this.journeyTemplateCatalog = journeyTemplateCatalog;
        this.recordAuditEvent = recordAuditEvent;
    }

    @Transactional
    public Journey execute(UUID productId, Set<ChannelType> channelTypes, String name, String description,
                            String templateId, UUID createdBy) {
        Product product = productRepository.findById(productId)
                .orElseThrow(() -> new ProductNotFoundException(productId));
        if (!product.isActive()) {
            throw new ProductInactiveException(product.getId());
        }
        JourneyChannelValidation.validate(productId, product.getChannelTypes(), channelTypes);
        JourneyTemplate template = resolveTemplate(templateId);

        Journey journey = journeyRepository.save(Journey.create(productId, channelTypes, name, description));
        Flow flow = flowRepository.save(template == null
                ? Flow.initial(journey.getId())
                : template.instantiate(journey.getId()));

        // REQ-06.02.001: every journey is born with an initial DRAFT version containing exactly
        // the same flow that was created for it — blank or instantiated from a template.
        JourneyVersion initialVersion = JourneyVersion.createDraft(journey.getId(), 1, null, createdBy,
                journey.getName(), journey.getDescription(), product.getId(), product.getName(),
                List.copyOf(channelTypes), flow.getNodes(), flow.getConnections());
        journeyVersionRepository.save(initialVersion);

        recordAuditEvent.record("JOURNEY_CREATE", "JOURNEY", journey.getId(), AuditResult.SUCCESS);
        return journey;
    }

    private JourneyTemplate resolveTemplate(String templateId) {
        if (templateId == null || templateId.isBlank()) {
            return null;
        }
        return journeyTemplateCatalog.findById(templateId.trim())
                .orElseThrow(() -> new JourneyTemplateNotFoundException(templateId));
    }
}
