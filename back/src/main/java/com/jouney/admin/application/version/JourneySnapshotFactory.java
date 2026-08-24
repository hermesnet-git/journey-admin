package com.jouney.admin.application.version;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.form.Form;
import java.util.List;
import org.springframework.stereotype.Component;

/**
 * Resolves the forms referenced by a flow's nodes — shared by every use case that snapshots a
 * journey's current live state into a {@link com.jouney.admin.domain.version.JourneyVersion}.
 * Sempre vazio hoje: User Task não referencia mais um Form por id (embeddedScreen é uma cópia
 * embutida no próprio nó, nunca uma referência viva) — mantido como ponto único caso o snapshot
 * volte a carregar formulários por outro motivo no futuro.
 */
@Component
class JourneySnapshotFactory {

    List<Form> resolveForms(Flow flow) {
        return List.of();
    }
}
