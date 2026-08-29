package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.application.dashboard.GetDashboardOverview;
import com.jouney.admin.application.dashboard.GetHistoricInstance;
import com.jouney.admin.application.dashboard.TerminateProcessInstance;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {

    private final GetDashboardOverview getDashboardOverview;
    private final GetHistoricInstance getHistoricInstance;
    private final TerminateProcessInstance terminateProcessInstance;

    public DashboardController(GetDashboardOverview getDashboardOverview, GetHistoricInstance getHistoricInstance,
                                TerminateProcessInstance terminateProcessInstance) {
        this.getDashboardOverview = getDashboardOverview;
        this.getHistoricInstance = getHistoricInstance;
        this.terminateProcessInstance = terminateProcessInstance;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/overview")
    public DashboardOverviewResponse overview() {
        return DashboardOverviewResponse.from(getDashboardOverview.execute());
    }

    // Busca por processInstanceId OU businessKey digitado à mão no card "Execuções recentes" — 404
    // sem corpo quando não acha de nenhum jeito (nunca "motor fora do ar", ver
    // RuntimeEngineMonitoringAdapter#findInstance).
    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/{idOrBusinessKey}")
    public ResponseEntity<InstanceResponse> findInstance(@PathVariable String idOrBusinessKey) {
        return getHistoricInstance.execute(idOrBusinessKey)
                .map(InstanceResponse::from)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    // Ação destrutiva sobre o motor de runtime — igual às outras ações administrativas do portal,
    // fica restrita a quem pode editar (VIEWER não altera nada em nenhuma outra tela).
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @DeleteMapping("/instances/{processInstanceId}")
    public ResponseEntity<Void> terminateInstance(@PathVariable String processInstanceId) {
        terminateProcessInstance.execute(processInstanceId);
        return ResponseEntity.noContent().build();
    }
}
