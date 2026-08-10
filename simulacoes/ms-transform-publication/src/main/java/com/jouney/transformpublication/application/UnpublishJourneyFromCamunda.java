package com.jouney.transformpublication.application;

import com.jouney.transformpublication.bpmn.ProcessIds;
import com.jouney.transformpublication.camunda.CamundaRestClient;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UnpublishJourneyFromCamunda {

    private final CamundaRestClient camundaRestClient;

    public UnpublishJourneyFromCamunda(CamundaRestClient camundaRestClient) {
        this.camundaRestClient = camundaRestClient;
    }

    // The process definition key is a deterministic function of journeyId (see ProcessIds),
    // so unpublishing doesn't need any stored deployment lookup.
    public void execute(UUID journeyId) {
        camundaRestClient.deleteAllDeploymentsForKey(ProcessIds.forJourney(journeyId));
    }
}
