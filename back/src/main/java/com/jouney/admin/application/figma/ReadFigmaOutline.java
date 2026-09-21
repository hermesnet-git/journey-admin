package com.jouney.admin.application.figma;

import com.jouney.admin.domain.figma.FigmaFlowExtractor;
import com.jouney.admin.domain.figma.FigmaOutline;
import com.jouney.admin.infrastructure.figma.FigmaApiClient;
import org.springframework.stereotype.Service;

/** Lista o que um arquivo de design tem de importável, sem contar nada ainda. */
@Service
public class ReadFigmaOutline {

    private final FigmaApiClient client;

    public ReadFigmaOutline(FigmaApiClient client) {
        this.client = client;
    }

    public FigmaOutline execute(String fileKey, String token) {
        return FigmaFlowExtractor.outlineOf(client.readOutline(fileKey, token));
    }
}
