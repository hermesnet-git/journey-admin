package com.jouney.admin.application.execution;

import com.jouney.admin.application.execution.RuntimeExecutionPort.HistoricInstance;
import com.jouney.admin.domain.execution.HistoricInstanceEntry;
import com.jouney.admin.domain.execution.ProcessIds;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Busca de instâncias no histórico — a aba "Histórico" do Diagnóstico. Ao contrário do resto da
 * Execução (que só enxerga instâncias ainda vivas no motor), aqui vem sempre da API de história,
 * que responde pra qualquer estado, ativa ou já terminada. */
@Service
public class SearchExecutionHistory {

    private static final int MAX_RESULTS = 500;

    private final RuntimeExecutionPort runtimeExecutionPort;

    public SearchExecutionHistory(RuntimeExecutionPort runtimeExecutionPort) {
        this.runtimeExecutionPort = runtimeExecutionPort;
    }

    public List<HistoricInstanceEntry> execute(UUID journeyId, String businessKey, Boolean finished,
                                                Instant startedFrom, Instant startedTo) {
        String processDefinitionKey = journeyId != null ? ProcessIds.keyForJourney(journeyId) : null;
        List<HistoricInstance> instances = runtimeExecutionPort.searchHistoricInstances(
                processDefinitionKey, businessKey, startedFrom, startedTo, finished, MAX_RESULTS);
        Map<String, String> channels = runtimeExecutionPort.getChannelsForInstances(instances.stream().map(HistoricInstance::id).toList());
        return instances.stream()
                .map(i -> new HistoricInstanceEntry(i.id(), i.businessKey(), i.processDefinitionName(),
                        i.processDefinitionVersion(), i.startTime(), i.endTime(), i.durationInMillis(), i.state(),
                        channels.get(i.id())))
                .toList();
    }
}
