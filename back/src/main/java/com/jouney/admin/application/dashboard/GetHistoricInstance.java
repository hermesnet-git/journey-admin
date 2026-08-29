package com.jouney.admin.application.dashboard;

import com.jouney.admin.domain.dashboard.HistoricInstanceSummary;
import java.util.Optional;
import org.springframework.stereotype.Component;

/** Busca por processInstanceId ou businessKey digitado à mão — usado pelo card "Execuções recentes"
 * do Dashboard quando a instância procurada não está entre as mais recentes listadas. */
@Component
public class GetHistoricInstance {

    private final RuntimeMonitoringPort monitoring;

    public GetHistoricInstance(RuntimeMonitoringPort monitoring) {
        this.monitoring = monitoring;
    }

    public Optional<HistoricInstanceSummary> execute(String idOrBusinessKey) {
        return monitoring.findInstance(idOrBusinessKey);
    }
}
