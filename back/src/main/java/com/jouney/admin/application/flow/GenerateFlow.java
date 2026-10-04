package com.jouney.admin.application.flow;

import com.jouney.admin.domain.flow.AiFlowGenerator;
import com.jouney.admin.domain.flow.ConnectorType;
import com.jouney.admin.domain.flow.GeneratedFlow;
import com.jouney.admin.domain.flow.GenerationContext;
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
 * designer (conectores habilitados, jornada/produto/canal) e entrega pra um AiFlowGenerator.
 * Deliberadamente nunca toca em FlowRepository/UpdateFlow — o resultado é só um
 * preview que o canvas do designer carrega no cliente, igual a uma edição manual não salva; o
 * usuário continua revisando e clicando em Salvar por conta própria (território do REQ-06.02.006:
 * nada aqui persiste sozinho).
 */
@Service
public class GenerateFlow {

    private final JourneyRepository journeyRepository;
    private final ProductRepository productRepository;
    private final AiFlowGenerator aiFlowGenerator;

    public GenerateFlow(JourneyRepository journeyRepository, ProductRepository productRepository,
                         AiFlowGenerator aiFlowGenerator) {
        this.journeyRepository = journeyRepository;
        this.productRepository = productRepository;
        this.aiFlowGenerator = aiFlowGenerator;
    }

    public GeneratedFlow execute(UUID journeyId, String prompt, Consumer<String> onProgress) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        Product product = productRepository.findById(journey.getProductId())
                .orElseThrow(() -> new ProductNotFoundException(journey.getProductId()));
        // Jornada pode atender vários tipos de canal agora — a IA só usa um como dica de tom/
        // formato no prompt, não precisa ser exaustiva; o primeiro da lista já basta.
        var channelType = journey.getChannelTypes().iterator().next();

        var enabledConnectors = Arrays.stream(ConnectorType.values()).filter(ConnectorType::isEnabled).toList();


        var context = new GenerationContext(prompt, journey.getName(), journey.getDescription(), product.getName(),
                channelType, enabledConnectors);
        return aiFlowGenerator.generate(context, onProgress);
    }
}
