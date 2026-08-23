package com.jouney.especregistry.kafka;

import java.util.List;

public record TopicListingResponse(boolean ok, String message, List<String> topics) {
}
