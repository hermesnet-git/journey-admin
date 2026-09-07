package com.jouney.transformpublication.camunda;

/** Lançada por {@link CamundaRestClient#deleteAllDeploymentsForKey} quando existe pelo menos uma
 * instância de processo ativa (em execução) pra esse processDefinitionKey — despublicar deletaria
 * os deployments com {@code cascade=true}, que apaga runtime e histórico junto, matando essas
 * instâncias silenciosamente. Bloqueado de propósito: quem já começou uma jornada não pode ser
 * interrompido só porque alguém despublicou a versão dela. */
public class ActiveInstancesExistException extends RuntimeException {

    public ActiveInstancesExistException(String message) {
        super(message);
    }
}
