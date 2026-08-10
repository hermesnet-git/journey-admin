package com.jouney.transformpublication.bpmn;

import java.util.UUID;

public final class ProcessIds {

    private ProcessIds() {
    }

    public static String forJourney(UUID journeyId) {
        return "Journey_" + journeyId.toString().replace("-", "");
    }
}
