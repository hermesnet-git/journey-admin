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
     * como chave pra buscar variáveis locais dela em {@link #getLocalVariablesForActivity}.
     * {@code canceled} (activity-instance, sempre disponível pra qualquer tipo de nó, nunca
     * consultado até então): {@code true} quando o nó não terminou por conclusão normal — foi
     * interrompido por um evento de contorno ou a instância foi encerrada enquanto ele ainda
     * estava ativo. */
    record ActivityHistoryEntry(String id, String activityId, String activityName, String activityType,
                                 String startTime, String endTime, Long durationInMillis, boolean canceled) {
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

    /** Valor atual/final de cada variável de PROCESSO (escopo global) de qualquer instância, ativa ou
     * já terminada — via história, ao contrário de {@link #getTypedProcessVariables} (runtime, só
     * instância viva). Filtrado a {@code activityInstanceId == processInstanceId} (convenção do motor
     * pra variável dona do escopo raiz do processo): sem isso viriam junto variáveis LOCAIS de nó
     * específico (url/method/headers/payload/response do conector REST, ver
     * {@link #getLocalVariablesForActivity}), que têm o mesmo endpoint de história mas
     * activityInstanceId do próprio nó. Base do Diagnóstico (nunca presume instância viva). */
    Map<String, TypedVariable> getHistoricProcessVariables(String processInstanceId);

    /** Uma mudança de valor de variável, na ordem em que aconteceu — {@code activityInstanceId} aqui é
     * "em qual atividade a mudança ocorreu" (semântica de auditoria), diferente do campo de mesmo nome
     * em {@link #getHistoricProcessVariables} (que é "dono do escopo"); por isso o filtro global-vs-
     * local dessa lista é feito por quem chama, cruzando os nomes já resolvidos por
     * {@link #getHistoricProcessVariables}. */
    record VariableUpdate(String name, Object value, String type, String activityInstanceId, String time) {
    }

    /** Todas as mudanças de todas as variáveis de uma instância, do início ao fim, em ordem
     * cronológica — timeline completa usada pela aba Variáveis do Diagnóstico. */
    List<VariableUpdate> getVariableUpdateHistory(String processInstanceId);

    /** Um incidente (erro) de uma instância — {@code nodeId} é o id do nó no BPMN (bate direto com
     * {@code FlowNode.getId()}, sem precisar de resolução por activityInstanceId). Via história: existe
     * pra incidente já resolvido ou instância já terminada, ao contrário do {@code /incident} runtime
     * (usado no Dashboard, só incidente ainda aberto). */
    record IncidentEntry(String nodeId, String incidentType, String message, String createTime, String endTime,
                          boolean open) {
    }

    List<IncidentEntry> getHistoricIncidents(String processInstanceId);

    /** Metadados de uma User Task via {@code /history/task}, nunca consultado até então.
     * {@code deleteReason} vem {@code null} pra uma tarefa concluída normalmente — o motor grava
     * literalmente "completed" nesse caso, já normalizado pra {@code null} por quem implementa
     * este método — ou preenchido (ex.: "deleted") quando ela foi descartada/cancelada em vez de
     * respondida — sinal que o Diagnóstico não tinha como mostrar antes. {@code description} é
     * texto livre da tela, quando
     * configurado. Assignee/owner/priority/dueDate/followUpDate/parentTaskId existem no motor mas
     * ficam de fora de propósito: este app nunca usa atribuição de tarefa do Camunda (sem
     * candidate group, delegação ou SLA), então vieram sempre vazios — não valia adicionar campo
     * que nunca teria dado real. {@code taskId} é o identificador da User Task no motor (diferente
     * de {@code activityInstanceId}, a chave usada pra buscar este registro) — útil pra correlacionar
     * com log do motor fora do app. */
    record TaskDetail(String taskId, String description, String deleteReason) {
    }

    Optional<TaskDetail> getHistoricTaskDetail(String activityInstanceId);

    /** Uma tentativa do log de um external task ({@code /history/external-task-log}) — só existe
     * pra Service/Receive Task Kafka (via external task; REST é síncrono, não tem retry). Mostra
     * falhas anteriores ao resultado final, informação que um incidente sozinho não dá (o
     * incidente só aparece depois que os retries acabam). */
    record ExternalTaskAttempt(String time, String errorMessage, boolean failed, boolean succeeded) {
    }

    List<ExternalTaskAttempt> getExternalTaskAttempts(String activityInstanceId);
}
