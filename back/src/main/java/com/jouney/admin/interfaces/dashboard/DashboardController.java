package com.jouney.admin.interfaces.dashboard;

import com.jouney.admin.application.dashboard.GetDashboardOverview;
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
    private final TerminateProcessInstance terminateProcessInstance;

    public DashboardController(GetDashboardOverview getDashboardOverview, TerminateProcessInstance terminateProcessInstance) {
        this.getDashboardOverview = getDashboardOverview;
        this.terminateProcessInstance = terminateProcessInstance;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/overview")
    public DashboardOverviewResponse overview() {
        return DashboardOverviewResponse.from(getDashboardOverview.execute());
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
