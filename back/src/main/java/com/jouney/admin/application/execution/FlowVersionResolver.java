package com.jouney.admin.application.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Resolve qual fluxo/versão de fato rodou (ou está rodando) numa instância, quando só se conhece
 * o processDefinitionId do motor — usado por qualquer caso de uso que reconstrói uma instância
 * sem ter recebido a versão de antemão (ao contrário de {@link StartExecution}, que já sabe qual
 * versão o usuário escolheu): Diagnóstico (qualquer instância, viva ou terminada) e retomada de
 * execução (instância viva encontrada por ID/business key). Resolve via versionTag do
 * process-definition ("v"+N, REQ-02.09.005); sem versionTag correlacionável, cai na publicação
 * ativa da jornada. */
@Component
public class FlowVersionResolver {

    private final JourneyVersionRepository journeyVersionRepository;
    private final PublicationRepository publicationRepository;
    private final RuntimeExecutionPort runtimeExecutionPort;

    public FlowVersionResolver(JourneyVersionRepository journeyVersionRepository,
                                PublicationRepository publicationRepository,
                                RuntimeExecutionPort runtimeExecutionPort) {
        this.journeyVersionRepository = journeyVersionRepository;
        this.publicationRepository = publicationRepository;
        this.runtimeExecutionPort = runtimeExecutionPort;
    }

    public ResolvedFlow resolve(UUID journeyId, String processDefinitionId) {
        Integer versionNumber = parseVersionNumber(safeVersionTag(processDefinitionId));
        if (versionNumber != null) {
            JourneyVersion match = journeyVersionRepository.findByJourneyId(journeyId).stream()
                    .filter(v -> v.getVersionNumber() == versionNumber)
                    .findFirst().orElse(null);
            if (match != null) {
                return new ResolvedFlow(match.getJourneyName(), versionNumber, match.getChannelTypes(),
                        match.getFlowNodes(), match.getFlowConnections());
            }
        }
        Publication publication = publicationRepository.findByJourneyId(journeyId)
                .orElseThrow(() -> new IllegalStateException(
                        "Jornada " + journeyId + " não tem publicação ativa nem versão correlacionável"));
        return new ResolvedFlow(publication.getJourneyName(), versionNumber, publication.getChannelTypes(),
                publication.getFlowNodes(), publication.getFlowConnections());
    }

    private String safeVersionTag(String processDefinitionId) {
        try {
            return runtimeExecutionPort.getVersionTag(processDefinitionId);
        } catch (RuntimeException e) {
            return null;
        }
    }

    private static Integer parseVersionNumber(String versionTag) {
        if (versionTag == null || !versionTag.startsWith("v")) {
            return null;
        }
        try {
            return Integer.parseInt(versionTag.substring(1));
        } catch (NumberFormatException e) {
            return null;
        }
    }

    public record ResolvedFlow(String journeyName, Integer versionNumber, List<ChannelType> channelTypes,
                                List<FlowNode> flowNodes, List<FlowConnection> flowConnections) {
    }
}
