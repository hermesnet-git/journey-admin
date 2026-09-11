package com.jouney.admin.application.execution;

import com.jouney.admin.domain.execution.ResolvedForm;
import java.util.Map;
import java.util.UUID;

/** Pede ao ms-espec-registry — guardião do contrato SDUI — a tela já resolvida (interpolação e
 * binding oneWay aplicados) de uma User Task específica. O admin/back nunca interpreta a árvore
 * SDUI em si, só repassa o que recebe ao front, no mesmo espírito do {@code ms-journey}. */
public interface FormResolutionPort {

    ResolvedForm resolveForm(UUID journeyId, int journeyVersion, String nodeId, Map<String, Object> variables);
}
