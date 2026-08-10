package com.jouney.transformpublication.application;

import com.jouney.transformpublication.bpmn.BpmnTransformer;
import com.jouney.transformpublication.camunda.CamundaRestClient;
import com.jouney.transformpublication.interfaces.publication.PublicationSnapshotRequest;
import org.springframework.stereotype.Service;

@Service
public class PublishJourneyToCamunda {

    public record Result(String processDefinitionKey, String deploymentId, String processDefinitionId) {
    }

    private final BpmnTransformer bpmnTransformer;
    private final CamundaRestClient camundaRestClient;

    public PublishJourneyToCamunda(BpmnTransformer bpmnTransformer, CamundaRestClient camundaRestClient) {
        this.bpmnTransformer = bpmnTransformer;
        this.camundaRestClient = camundaRestClient;
    }

    public Result execute(PublicationSnapshotRequest request) {
        BpmnTransformer.Result transformed = bpmnTransformer.transform(request);
        CamundaRestClient.DeploymentResult deployment = camundaRestClient.deploy(transformed.processId(),
                transformed.bpmnXml());
        return new Result(transformed.processId(), deployment.deploymentId(), deployment.processDefinitionId());
    }
}
