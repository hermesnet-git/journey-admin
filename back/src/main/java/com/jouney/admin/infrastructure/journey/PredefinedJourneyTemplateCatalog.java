package com.jouney.admin.infrastructure.journey;

import com.jouney.admin.domain.flow.FlowNodeType;
import com.jouney.admin.domain.journey.JourneyTemplate;
import com.jouney.admin.domain.journey.JourneyTemplateCatalog;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Component;

@Component
public class PredefinedJourneyTemplateCatalog implements JourneyTemplateCatalog {

    public static final String APPROVAL_TEMPLATE_ID = "aprovacao-pedido";

    private static final JourneyTemplate APPROVAL_TEMPLATE = new JourneyTemplate(
            APPROVAL_TEMPLATE_ID,
            "Aprovação de Pedido",
            "Solicita aprovação do usuário e notifica o resultado conforme a decisão.",
            List.of(
                    node("inicio", FlowNodeType.START, "Início", "Inicia o fluxo", 80, 100),
                    node("solicitar-aprovacao", FlowNodeType.USER_TASK, "Solicitar Aprovação",
                            "Coleta a decisão do aprovador", 380, 100),
                    node("decisao", FlowNodeType.GATEWAY, "Aprovado?", "Direciona conforme a decisão", 680, 100),
                    node("notificar-aprovacao", FlowNodeType.SERVICE_TASK, "Notificar Aprovação",
                            "Envia notificação de aprovação", 980, 30),
                    node("notificar-reprovacao", FlowNodeType.SERVICE_TASK, "Notificar Reprovação",
                            "Envia notificação de reprovação", 980, 230),
                    node("fim-aprovado", FlowNodeType.END, "Fim", "Encerra o fluxo", 1280, 30),
                    node("fim-reprovado", FlowNodeType.END, "Fim", "Encerra o fluxo", 1280, 230)),
            List.of(
                    connection("inicio", "solicitar-aprovacao"),
                    connection("solicitar-aprovacao", "decisao"),
                    // The template is deliberately an editable skeleton. The approval path remains
                    // without a condition until the author creates the approval field/variable;
                    // the rejection path is the safe default branch.
                    new JourneyTemplate.ConnectionSpec("decisao", "notificar-aprovacao", null, false),
                    new JourneyTemplate.ConnectionSpec("decisao", "notificar-reprovacao", null, true),
                    connection("notificar-aprovacao", "fim-aprovado"),
                    connection("notificar-reprovacao", "fim-reprovado")));

    private static final List<JourneyTemplate> TEMPLATES = List.of(APPROVAL_TEMPLATE);

    @Override
    public List<JourneyTemplate> findAll() {
        return TEMPLATES;
    }

    @Override
    public Optional<JourneyTemplate> findById(String id) {
        return TEMPLATES.stream().filter(template -> template.id().equals(id)).findFirst();
    }

    private static JourneyTemplate.NodeSpec node(String key, FlowNodeType type, String name, String description,
                                                  int positionX, int positionY) {
        return new JourneyTemplate.NodeSpec(key, type, name, description, positionX, positionY);
    }

    private static JourneyTemplate.ConnectionSpec connection(String from, String to) {
        return new JourneyTemplate.ConnectionSpec(from, to, null, false);
    }
}
