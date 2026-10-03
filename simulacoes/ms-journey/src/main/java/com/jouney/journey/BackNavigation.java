package com.jouney.journey;

import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

/**
 * "Voltar à tela anterior" (botão com action.navigate e destino "voltar"): decide, só a partir do
 * histórico do motor, para qual tela a instância volta. Sem nada desenhado no fluxo — nem variável,
 * nem Decisão, nem ligação de retorno.
 *
 * <p>A tela anterior é a última atividade de usuário concluída antes de a tela atual abrir. Uma tela
 * que já serviu de destino de um "voltar" não serve de novo (ids em {@code consumed}): sem isso,
 * voltar duas vezes seguidas reabriria a mesma tela. Não volta por cima de uma integração de
 * escrita concluída com sucesso entre as duas telas (o que já foi registrado no sistema de origem
 * não se desfaz); uma integração que falhou e seguiu por "Se falhar" termina cancelada no histórico,
 * então não bloqueia — é o caso de "Tentar novamente" depois de uma indisponibilidade.
 *
 * <p>Mesma regra em admin/back ({@code GoBackExecution}): lá serve a tela de Execução, aqui os canais.
 */
public final class BackNavigation {

    private static final DateTimeFormatter ENGINE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss.SSSZ");

    /** Recorte de uma atividade do histórico do motor. */
    public record Activity(String id, String activityId, String activityType, String startTime, String endTime,
                           boolean canceled) {
    }

    /** {@code target} preenchido quando dá para voltar; senão, {@code refusal} explica por quê. */
    public record Decision(Activity target, String refusal) {
    }

    private BackNavigation() {
    }

    /**
     * @param history         atividades da instância (qualquer ordem)
     * @param currentActivity id do nó da tela aberta agora
     * @param consumed        ids de atividades que já foram destino de um "voltar"
     * @param writeNodes      ids dos nós de integração que gravam no sistema de origem
     */
    public static Decision decide(List<Activity> history, String currentActivity, Set<String> consumed,
                                  Set<String> writeNodes) {
        Activity current = history.stream()
                .filter(a -> "userTask".equals(a.activityType()) && a.activityId().equals(currentActivity) && a.endTime() == null)
                .findFirst()
                .orElse(null);
        if (current == null) {
            return new Decision(null, "A tela atual não está aberta.");
        }
        OffsetDateTime openedAt = time(current.startTime());
        Activity target = history.stream()
                .filter(a -> "userTask".equals(a.activityType()) && a.endTime() != null && !a.canceled())
                .filter(a -> !consumed.contains(a.id()))
                .filter(a -> !time(a.endTime()).isAfter(openedAt))
                .max(Comparator.comparing((Activity a) -> time(a.endTime())))
                .orElse(null);
        if (target == null) {
            return new Decision(null, "Não há tela anterior para voltar.");
        }
        OffsetDateTime leftAt = time(target.endTime());
        boolean wroteSince = history.stream()
                .anyMatch(a -> writeNodes.contains(a.activityId()) && a.endTime() != null && !a.canceled()
                        && !time(a.startTime()).isBefore(leftAt) && !time(a.startTime()).isAfter(openedAt));
        if (wroteSince) {
            return new Decision(null, "Não é possível voltar: a operação desta etapa já foi registrada.");
        }
        return new Decision(target, null);
    }

    private static OffsetDateTime time(String engineTime) {
        return OffsetDateTime.parse(engineTime, ENGINE_TIME);
    }
}
