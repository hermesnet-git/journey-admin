package com.jouney.bffcanalweb;

import com.jouney.bffcanalweb.config.MsJourneyProperties;
import java.util.Map;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

/** Proxy fino pro ms-journey — todo retorno é Object cru (o BFF nunca inspeciona campo nenhum, só
 * fixa o channelType na chamada de listagem e repassa o resto tal como veio). */
@Component
public class JourneyClient {

    private final RestClient restClient = RestClient.create();
    private final MsJourneyProperties properties;

    public JourneyClient(MsJourneyProperties properties) {
        this.properties = properties;
    }

    public Object listJourneys(String channelType) {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys?channelType={channelType}", channelType)
                .retrieve().body(Object.class);
    }

    public Object getFlow(String journeyId) {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/journeys/{id}/flow", journeyId)
                .retrieve().body(Object.class);
    }

    public Object startInstance(String journeyId, Map<String, Object> variables) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/journeys/{id}/instances", journeyId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(variables != null ? variables : Map.of())
                .retrieve().body(Object.class);
    }

    public Object getCurrentStep(String processInstanceId) {
        return restClient.get()
                .uri(properties.baseUrl() + "/api/v1/instances/{id}/current-step", processInstanceId)
                .retrieve().body(Object.class);
    }

    public Object completeTask(String processInstanceId, String taskId, Map<String, Object> body) {
        return restClient.post()
                .uri(properties.baseUrl() + "/api/v1/instances/{pid}/tasks/{tid}/complete", processInstanceId, taskId)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body != null ? body : Map.of())
                .retrieve().body(Object.class);
    }

    public void stopInstance(String processInstanceId) {
        restClient.delete()
                .uri(properties.baseUrl() + "/api/v1/instances/{id}", processInstanceId)
                .retrieve().toBodilessEntity();
    }
}
