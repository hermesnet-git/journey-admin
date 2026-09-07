package com.jouney.transformpublication.application;

import com.jouney.transformpublication.camunda.CamundaRestClient;
import org.springframework.stereotype.Service;

@Service
public class UnpublishJourneyFromCamunda {

    private final CamundaRestClient camundaRestClient;

    public UnpublishJourneyFromCamunda(CamundaRestClient camundaRestClient) {
        this.camundaRestClient = camundaRestClient;
    }

    // Despublica só a versão específica (o deployment que ela gerou ao publicar) — uma jornada
    // pode ter mais de uma versão PUBLISHED ao mesmo tempo, então despublicar uma não pode
    // derrubar o deployment de outra.
    public void executeDeployment(String deploymentId) {
        camundaRestClient.deleteDeployment(deploymentId);
    }
}
