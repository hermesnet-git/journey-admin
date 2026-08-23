package com.jouney.admin.application.messaging;

import java.util.List;

public record TopicListingResult(boolean ok, String message, List<String> topics) {
}
