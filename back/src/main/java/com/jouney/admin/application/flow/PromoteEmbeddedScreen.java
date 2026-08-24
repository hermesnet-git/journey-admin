package com.jouney.admin.application.flow;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeNotFoundException;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormRepository;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

// "Salvar como formulário reutilizável" — copia a tela desenhada no editor embutido do nó
// (embeddedScreen) pra um Form novo no catálogo, pelo mesmo caminho de domínio que a criação
// manual usa (Form.create). Não altera o FlowNode: não mexe em embeddedScreen — os dois passam a
// existir de forma independente (é uma cópia, não vira uma referência viva).
@Service
public class PromoteEmbeddedScreen {

    private final JourneyRepository journeyRepository;
    private final FlowRepository flowRepository;
    private final FormRepository formRepository;

    public PromoteEmbeddedScreen(JourneyRepository journeyRepository, FlowRepository flowRepository,
                                  FormRepository formRepository) {
        this.journeyRepository = journeyRepository;
        this.flowRepository = flowRepository;
        this.formRepository = formRepository;
    }

    public Form execute(UUID journeyId, String nodeId, String name, String description) {
        journeyRepository.findById(journeyId).orElseThrow(() -> new JourneyNotFoundException(journeyId));
        Flow flow = flowRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        FlowNode node = flow.getNodes().stream()
                .filter(n -> n.getId().equals(nodeId))
                .findFirst()
                .orElseThrow(() -> new FlowNodeNotFoundException(nodeId));
        return formRepository.save(Form.create(name, description, node.getEmbeddedScreen()));
    }
}
