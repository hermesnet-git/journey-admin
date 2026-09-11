package com.jouney.admin.application.execution;

import com.jouney.admin.domain.channel.ChannelType;
import com.jouney.admin.domain.flow.FlowConnection;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.journey.JourneyNotPublishedException;
import com.jouney.admin.domain.publication.Publication;
import com.jouney.admin.domain.publication.PublicationRepository;
import com.jouney.admin.domain.version.JourneyVersion;
import com.jouney.admin.domain.version.JourneyVersionRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Diagrama da jornada sem iniciar instância nenhuma — usado pelo front, ao selecionar uma
 * jornada (ou trocar a versão escolhida, REQ-05.07.007), pra descobrir se o início é por
 * MESSAGE_START_EVENT e quais variáveis de entrada declarar antes de decidir como começar a
 * execução. Sem {@code versionNumber}: publicação ativa (comportamento de sempre); com, essa
 * versão específica (precisa existir, não precisa estar PUBLISHED — é só visualização, quem
 * decide o que oferecer no seletor é o front). */
@Service
public class GetExecutionFlow {

    private final PublicationRepository publicationRepository;
    private final JourneyVersionRepository journeyVersionRepository;

    public GetExecutionFlow(PublicationRepository publicationRepository, JourneyVersionRepository journeyVersionRepository) {
        this.publicationRepository = publicationRepository;
        this.journeyVersionRepository = journeyVersionRepository;
    }

    public ResolvedFlow execute(UUID journeyId, Integer versionNumber) {
        if (versionNumber == null) {
            Publication publication = publicationRepository.findByJourneyId(journeyId)
                    .orElseThrow(() -> new JourneyNotPublishedException(journeyId));
            return new ResolvedFlow(publication.getChannelTypes(), publication.getFlowNodes(), publication.getFlowConnections());
        }
        JourneyVersion version = journeyVersionRepository.findByJourneyId(journeyId).stream()
                .filter(v -> v.getVersionNumber() == versionNumber)
                .findFirst()
                .orElseThrow(() -> new IllegalStateException(
                        "Versão " + versionNumber + " não encontrada para a jornada " + journeyId));
        return new ResolvedFlow(version.getChannelTypes(), version.getFlowNodes(), version.getFlowConnections());
    }

    public record ResolvedFlow(List<ChannelType> channelTypes, List<FlowNode> flowNodes,
                                List<FlowConnection> flowConnections) {
    }
}
