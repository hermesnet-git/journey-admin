package com.jouney.admin.interfaces.diagnostico;

import com.jouney.admin.application.diagnostico.GetExecutionHistoryDetail;
import com.jouney.admin.application.diagnostico.SearchExecutionHistory;
import com.jouney.admin.domain.diagnostico.HistoricInstanceEntry;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * FT-15 Diagnóstico — busca e detalhe histórico de qualquer instância (ativa ou já terminada),
 * originada tanto pela Execução (FT-05, admin) quanto por um canal digital, sem distinção (REQ-
 * 15.02.004). Funcionalidade separada da Execução por design (REQ-15.04.001) — responde sempre pra
 * qualquer estado via APIs de história do motor ({@link
 * com.jouney.admin.application.execution.RuntimeExecutionPort}), nunca presume instância viva.
 */
@RestController
@RequestMapping("/api/v1")
public class DiagnosticoController {

    private final SearchExecutionHistory searchExecutionHistory;
    private final GetExecutionHistoryDetail getExecutionHistoryDetail;

    public DiagnosticoController(SearchExecutionHistory searchExecutionHistory,
                                  GetExecutionHistoryDetail getExecutionHistoryDetail) {
        this.searchExecutionHistory = searchExecutionHistory;
        this.getExecutionHistoryDetail = getExecutionHistoryDetail;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/search")
    public List<HistoricInstanceEntry> search(@RequestParam(required = false) UUID journeyId,
                                               @RequestParam(required = false) String businessKey,
                                               @RequestParam(required = false) Boolean finished,
                                               @RequestParam(required = false) Instant startedFrom,
                                               @RequestParam(required = false) Instant startedTo) {
        return searchExecutionHistory.execute(journeyId, businessKey, finished, startedFrom, startedTo);
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/instances/{processInstanceId}/history")
    public InstanceHistoryResponse history(@PathVariable String processInstanceId) {
        return InstanceHistoryResponse.from(getExecutionHistoryDetail.execute(processInstanceId));
    }
}
