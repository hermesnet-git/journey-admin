package com.jouney.bffcanalweb;

import java.util.Map;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Canal WEB: mesmo contrato do ms-journey, só que /journeys já vem filtrado pro canal fixo deste
 * BFF — o front nem sabe que existe um parâmetro channelType. */
@RestController
@RequestMapping("/api/v1")
public class JourneyController {

    private static final String CHANNEL_TYPE = "WEB";

    private final JourneyClient client;

    public JourneyController(JourneyClient client) {
        this.client = client;
    }

    @GetMapping("/journeys")
    public Object journeys() {
        return client.listJourneys(CHANNEL_TYPE);
    }

    @GetMapping("/journeys/{journeyId}/flow")
    public Object flow(@PathVariable String journeyId) {
        return client.getFlow(journeyId);
    }

    @PostMapping("/journeys/{journeyId}/instances")
    public Object start(@PathVariable String journeyId, @RequestBody(required = false) Map<String, Object> variables) {
        return client.startInstance(journeyId, variables);
    }

    @GetMapping("/instances/{processInstanceId}/current-step")
    public Object currentStep(@PathVariable String processInstanceId) {
        return client.getCurrentStep(processInstanceId);
    }

    @PostMapping("/instances/{processInstanceId}/tasks/{taskId}/complete")
    public Object completeTask(@PathVariable String processInstanceId, @PathVariable String taskId,
                                @RequestBody(required = false) Map<String, Object> body) {
        return client.completeTask(processInstanceId, taskId, body);
    }

    @DeleteMapping("/instances/{processInstanceId}")
    public void stop(@PathVariable String processInstanceId) {
        client.stopInstance(processInstanceId);
    }
}
