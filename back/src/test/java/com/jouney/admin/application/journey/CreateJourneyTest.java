package com.jouney.admin.application.journey;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyTemplateNotFoundException;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import com.jouney.admin.infrastructure.journey.PredefinedJourneyTemplateCatalog;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CreateJourneyTest {

    @Mock
    private JourneyRepository journeyRepository;
    @Mock
    private ProductRepository productRepository;
    @Mock
    private FlowRepository flowRepository;
    @Mock
    private JourneyVersionRepository journeyVersionRepository;
    @Mock
    private RecordAuditEvent recordAuditEvent;

    private CreateJourney createJourney;
    private Product product;

    @BeforeEach
    void setUp() {
        product = Product.create("Produto", "Descrição", Set.of(ChannelType.WEB));
        when(productRepository.findById(product.getId())).thenReturn(java.util.Optional.of(product));
        createJourney = new CreateJourney(journeyRepository, productRepository, flowRepository,
                journeyVersionRepository, new PredefinedJourneyTemplateCatalog(), recordAuditEvent);
    }

    @Test
    void createsFlowAndInitialDraftFromSelectedTemplate() {
        stubSaves();
        UUID actorId = UUID.randomUUID();

        createJourney.execute(product.getId(), Set.of(ChannelType.WEB), "Minha jornada", "Descrição",
                PredefinedJourneyTemplateCatalog.APPROVAL_TEMPLATE_ID, actorId);

        ArgumentCaptor<Flow> flowCaptor = ArgumentCaptor.forClass(Flow.class);
        ArgumentCaptor<JourneyVersion> versionCaptor = ArgumentCaptor.forClass(JourneyVersion.class);
        verify(flowRepository).save(flowCaptor.capture());
        verify(journeyVersionRepository).save(versionCaptor.capture());

        Flow flow = flowCaptor.getValue();
        JourneyVersion version = versionCaptor.getValue();
        assertThat(flow.getNodes()).hasSize(7);
        assertThat(flow.getConnections()).hasSize(6);
        assertThat(version.getFlowNodes()).extracting(node -> node.getId())
                .containsExactlyElementsOf(flow.getNodes().stream().map(node -> node.getId()).toList());
        assertThat(version.getFlowConnections()).extracting(connection -> connection.getId())
                .containsExactlyElementsOf(flow.getConnections().stream().map(connection -> connection.getId()).toList());
    }

    @Test
    void keepsBlankCreationBackwardCompatibleWhenTemplateIsAbsent() {
        stubSaves();
        createJourney.execute(product.getId(), Set.of(ChannelType.WEB), "Em branco", "Descrição", null,
                UUID.randomUUID());

        ArgumentCaptor<Flow> flowCaptor = ArgumentCaptor.forClass(Flow.class);
        verify(flowRepository).save(flowCaptor.capture());
        assertThat(flowCaptor.getValue().getNodes()).isEmpty();
        assertThat(flowCaptor.getValue().getConnections()).isEmpty();
    }

    @Test
    void rejectsUnknownTemplateBeforePersistingJourney() {
        assertThatThrownBy(() -> createJourney.execute(product.getId(), Set.of(ChannelType.WEB), "Jornada",
                "Descrição", "modelo-inexistente", UUID.randomUUID()))
                .isInstanceOf(JourneyTemplateNotFoundException.class);

        verify(journeyRepository, never()).save(any());
    }

    private void stubSaves() {
        when(journeyRepository.save(any(Journey.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(flowRepository.save(any(Flow.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(journeyVersionRepository.save(any(JourneyVersion.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }
}
