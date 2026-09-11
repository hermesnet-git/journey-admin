package com.jouney.admin.application.execution;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/** Ações e consultas de execução de uma instância contra o motor de runtime — separado de
 * {@link com.jouney.admin.application.dashboard.RuntimeMonitoringPort} (agregados pro Dashboard):
 * este é o vocabulário de "rodar uma jornada passo a passo", usado pela funcionalidade de
 * Execução. */
public interface RuntimeExecutionPort {

    record ProcessInstance(String id, String definitionKey, String definitionId, String businessKey) {
    }

    record ActiveTask(String id, String name, String taskDefinitionKey) {
    }

    record LeafActivity(String activityId, String activityType, String activityName) {
    }

    /** {@code id} é o identificador da própria activity instance (não da definição do nó) — usado
     * como chave pra buscar variáveis locais dela em {@link #getLocalVariablesForActivity}. */
    record ActivityHistoryEntry(String id, String activityId, String activityName, String activityType,
                                 String startTime, String endTime, Long durationInMillis) {
    }

    /** {@code type} no formato do motor ("String"/"Boolean"/"Double"/"Integer"...) — só usado pra
     * exibir/editar na aba Variáveis; a leitura interna (resolução de tela, trilha) usa {@link
     * #getProcessVariables}, sem tipo, porque não precisa dele. */
    record TypedVariable(Object value, String type) {
    }

    /** {@code versionNumber} nulo inicia a versão mais recente implantada (comportamento de sempre);
     * um valor explícito mira o deployment daquela versão de negócio via versionTag ("v"+N),
     * REQ-05.07.007 — precisa ter sido publicada (deployment de verdade existe no motor). */
    String startProcessInstance(String processDefinitionKey, Map<String, Object> variables, String businessKey,
                                 Integer versionNumber);

    Optional<ProcessInstance> getProcessInstance(String processInstanceId);

    /** Tag de versão de jornada gravada no processo implantado (REQ-02.09.005), ex.: "v3". */
    String getVersionTag(String processDefinitionId);

    List<ActiveTask> findActiveUserTasks(String processInstanceId);

    Optional<LeafActivity> findLeafActivity(String processInstanceId);

    Map<String, Object> getProcessVariables(String processInstanceId);

    void completeTask(String taskId, Map<String, Object> variables);

    /** Correlaciona uma mensagem síncrona (sem publicar nada em tópico nenhum) — usado só por
     * "Pular etapa" num RECEIVE_TASK, fabricando a mensagem em vez de esperar uma real. */
    void correlateMessage(String messageName, String processInstanceId, Map<String, Object> variables);

    /** Atividades concluídas desde {@code since} — usado pra montar a trilha do que o motor
     * atravessou sozinho (SERVICE_TASK/GATEWAY) entre uma ação e a próxima. */
    List<ActivityHistoryEntry> getActivityHistorySince(String processInstanceId, Instant since);

    /** Variáveis com escopo local a uma activity instance específica — usado pra ler
     * url/method/headers/payload/response que o conector REST grava por nó (nunca colide entre
     * SERVICE_TASKs diferentes, ao contrário de uma variável de processo). */
    Map<String, Object> getLocalVariablesForActivity(String activityInstanceId);

    /** Mesmas variáveis de {@link #getProcessVariables}, com o tipo do motor — aba Variáveis da
     * tela de Execução (visualizar e editar manualmente, pra forçar caminho de decisão em teste). */
    Map<String, TypedVariable> getTypedProcessVariables(String processInstanceId);

    void setProcessVariable(String processInstanceId, String name, Object value, String type);

    /** Entrada de {@code /history/process-instance} — existe pra qualquer instância, ativa ou já
     * terminada, ao contrário de {@link ProcessInstance} (só instâncias ainda em execução). Base do
     * Diagnóstico (busca e detalhe). */
    record HistoricInstance(String id, String businessKey, String processDefinitionId, String processDefinitionKey,
                             String processDefinitionName, Integer processDefinitionVersion, String startTime,
                             String endTime, Long durationInMillis, String state) {
    }

    List<HistoricInstance> searchHistoricInstances(String processDefinitionKey, String businessKey,
                                                     Instant startedFrom, Instant startedTo, Boolean finished, int maxResults);

    Optional<HistoricInstance> getHistoricProcessInstance(String processInstanceId);

    /** Canal (variável de processo {@code channel}) de cada instância da lista, numa única consulta
     * em lote. */
    Map<String, String> getChannelsForInstances(Collection<String> processInstanceIds);

    /** Trilha completa de atividades de uma instância, do início ao fim — mesma consulta de {@link
     * #getActivityHistorySince}, sem filtro de data, pra cobrir a instância inteira (viva ou já
     * terminada), não só o que rodou desde a última ação. */
    List<ActivityHistoryEntry> getFullActivityHistory(String processInstanceId);

    /** Valores efetivamente submetidos numa User Task (o que o usuário respondeu no form) —
     * diferente de {@link #getLocalVariablesForActivity} (último valor gravado, pensado pro output
     * de Service Task): aqui interessa a atualização de variável ocorrida NAQUELA activity
     * instance, que é a resposta submetida naquele passo específico. */
    Map<String, Object> getSubmittedFormValues(String activityInstanceId);

    /** Trava e completa (fetchAndLock + complete, num só passo) o external task pendente de um
     * SERVICE_TASK Kafka em controle manual — usado pelo envio manual de mensagem de teste, depois
     * de já ter publicado de verdade no broker. */
    void completeExternalTask(String processInstanceId, String activityId, Map<String, Object> variables);

    /** Publica de verdade num tópico — só o mecânico de mandar pro broker; resolução de template e
     * montagem do envelope são responsabilidade de quem chama ({@code SendKafkaMessage}). */
    void publishKafkaMessage(String topic, String key, String payloadJson, Map<String, String> headers);

    /** Instância mais recente de uma definição de processo iniciada depois de {@code since} — usado
     * pelo polling do front depois de enviar uma mensagem de teste pra um MESSAGE_START_EVENT (não
     * existe processInstanceId nenhum antes disso pra consultar diretamente). */
    Optional<String> findMostRecentInstanceStartedAfter(String processDefinitionKey, Instant since);
}
