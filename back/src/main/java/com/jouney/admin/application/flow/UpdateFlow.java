package com.jouney.admin.application.flow;

import com.jouney.admin.application.version.CreateJourneyVersion;
import com.jouney.admin.domain.auth.AuthenticatedUser;
import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowAnnotation;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.flow.FlowRepository;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.FormRepository;
import com.jouney.admin.domain.journey.Journey;
import com.jouney.admin.domain.journey.JourneyInactiveException;
import com.jouney.admin.domain.journey.JourneyNotFoundException;
import com.jouney.admin.domain.journey.JourneyRepository;
import com.jouney.admin.domain.journey.JourneyStatus;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/**
 * Updates a journey's live flow, then keeps the current DRAFT version in sync with it
 * (REQ-06.02.009) via {@link CreateJourneyVersion}: updates that DRAFT's snapshot in place, or
 * creates one if none exists (typically right after a publish). Other versions are never touched
 * here — only DRAFT is ever replaced (REQ-06.02.006).
 */
@Service
public class UpdateFlow {

    private final FlowRepository flowRepository;
    private final JourneyRepository journeyRepository;
    private final CreateJourneyVersion createJourneyVersion;
    private final FormRepository formRepository;

    public UpdateFlow(FlowRepository flowRepository, JourneyRepository journeyRepository,
                       CreateJourneyVersion createJourneyVersion, FormRepository formRepository) {
        this.flowRepository = flowRepository;
        this.journeyRepository = journeyRepository;
        this.createJourneyVersion = createJourneyVersion;
        this.formRepository = formRepository;
    }

    public Flow execute(UUID journeyId, String name, List<FlowNode> nodes, List<FlowConnection> connections,
                         List<FlowAnnotation> annotations) {
        Journey journey = journeyRepository.findById(journeyId)
                .orElseThrow(() -> new JourneyNotFoundException(journeyId));
        if (journey.getStatus() == JourneyStatus.INACTIVE) {
            throw new JourneyInactiveException(journeyId);
        }
        // Every journey is born with a Flow row (Flow.initial(), see CreateJourney), so this is
        // normally an update; falling back to a fresh Flow here just makes that an upsert instead
        // of failing with a misleading "journey not found" if that row were ever missing.
        Flow flow = flowRepository.findByJourneyId(journeyId).orElseGet(() -> Flow.initial(journeyId));
        flow.replace(name, nodes, connections, annotations, formFieldNamesByFormId(nodes));
        Flow saved = flowRepository.save(flow);

        createJourneyVersion.execute(journeyId, null, currentUserId());

        return saved;
    }

    // REQ-03.09.014/REQ-03.11.004: os campos do formulário vinculado a uma USER_TASK viram
    // referências {{variavel}} disponíveis para nós downstream, igual ao outputMapping de um
    // conector. Resolvido aqui (não no FlowValidator, que continua puro domínio, sem acesso a
    // repositório) já que este é o único lugar que já tem tanto os nós do fluxo quanto um
    // FormRepository. TEXT (só texto exibido, não coleta nada) e FILE_UPLOAD (referência a um
    // arquivo, não algo que caiba numa mensagem/condição) ficam de fora, igual ao equivalente no
    // front (model.ts, userTaskFormVariables).
    private Map<UUID, List<String>> formFieldNamesByFormId(List<FlowNode> nodes) {
        Set<UUID> formIds = nodes.stream()
                .filter(n -> n.getType() == FlowNodeType.USER_TASK && n.getFormId() != null)
                .map(FlowNode::getFormId)
                .collect(Collectors.toSet());
        Map<UUID, List<String>> result = new HashMap<>();
        for (UUID formId : formIds) {
            formRepository.findById(formId).ifPresent(form -> result.put(formId, form.getFields().stream()
                    .filter(f -> f.getType() != FormFieldType.TEXT && f.getType() != FormFieldType.FILE_UPLOAD)
                    .map(FormField::getName)
                    .toList()));
        }
        return result;
    }

    private UUID currentUserId() {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthenticatedUser user) {
            return user.userId();
        }
        return null;
    }
}
