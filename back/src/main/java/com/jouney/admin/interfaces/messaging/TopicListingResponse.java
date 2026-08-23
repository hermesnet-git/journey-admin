package com.jouney.admin.interfaces.messaging;

import com.jouney.admin.application.messaging.TopicListingResult;
import java.util.List;

public record TopicListingResponse(boolean ok, String message, List<String> topics) {

    public static TopicListingResponse from(TopicListingResult result) {
        return new TopicListingResponse(result.ok(), result.message(), result.topics());
    }
}
