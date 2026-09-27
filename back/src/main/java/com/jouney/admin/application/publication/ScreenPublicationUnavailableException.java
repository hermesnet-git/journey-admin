package com.jouney.admin.application.publication;

/** Lançada por {@link com.jouney.admin.application.version.PublishJourneyVersion} quando
 * {@link ScreenPublicationPort#isAvailable()} responde não-disponível — falha rápido, antes de
 * deployar no runtime, em vez de só descobrir depois, no meio do publish de verdade. */
public class ScreenPublicationUnavailableException extends RuntimeException {

    public ScreenPublicationUnavailableException(String message) {
        super(message);
    }
}
