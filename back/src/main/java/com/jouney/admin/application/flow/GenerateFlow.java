package com.jouney.admin.application.flow;

import com.jouney.admin.domain.channel.Channel;
import com.jouney.admin.domain.channel.ChannelNotFoundException;
import com.jouney.admin.domain.channel.ChannelRepository;
import com.jouney.admin.domain.flow.AiFlowGenerator;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.FormRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.product.Product;
import com.jouney.admin.domain.product.ProductNotFoundException;
import com.jouney.admin.domain.product.ProductRepository;
import java.util.Arrays;
import java.util.UUID;
import java.util.function.Consumer;
import org.springframework.stereotype.Service;

/**
 * Protótipo do "gerar fluxo por prompt" da FT-03: monta o mesmo catálogo que um humano vê no
 * designer (formulários, conectores habilitados, jornada/produto/canal) e entrega pra um
 * AiFlowGenerator. Deliberadamente nunca toca em FlowRepository/UpdateFlow — o resultado é só um
 * preview que o canvas do designer carrega no cliente, igual a uma edição manual não salva; o
 * usuário continua revisando e clicando em Salvar por conta própria (território do REQ-06.02.006:
 * nada aqui persiste sozinho).
 */
@Service
public class GenerateFlow {

    private final JourneyRepository journeyRepository;
    private final ChannelRepository channelRepository;
    private final ProductRepository productRepository;
    private final FormRepository formRepository;
    private final AiFlowGenerator aiFlowGenerator;

    public GenerateFlow(JourneyRepository journeyRepository, ChannelRepository channelRepository,
                         ProductRepository productRepository, FormRepository formRepository,
                         AiFlowGenerator aiFlowGenerator) {
        this.journeyRepository = journeyRepository;
        this.channelRepository = channelRepository;
        this.productRepository = productRepository;
        this.formRepository = formRepository;
        this.aiFlowGenerator = aiFlowGenerator;
    }

    public GeneratedFlow execute(UUID journeyId, String prompt, Consumer<String> onProgress) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        Channel channel = channelRepository.findById(journey.getChannelId())
                .orElseThrow(() -> new ChannelNotFoundException(journey.getChannelId()));
        Product product = productRepository.findById(channel.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(channel.getProductId()));

        var forms = formRepository.search(null).stream()
                .map(form -> new GenerationContext.FormSummary(form.getId(), form.getName(), form.getFields().stream()
                        .filter(f -> f.getType() != FormFieldType.TEXT && f.getType() != FormFieldType.FILE_UPLOAD)
                        .map(field -> field.getName())
                        .toList()))
                .toList();
        var enabledConnectors = Arrays.stream(ConnectorType.values()).filter(ConnectorType::isEnabled).toList();

        var context = new GenerationContext(prompt, journey.getName(), journey.getDescription(), product.getName(),
                channel.getName(), channel.getType(), enabledConnectors, forms);
        return aiFlowGenerator.generate(context, onProgress);
    }
}
