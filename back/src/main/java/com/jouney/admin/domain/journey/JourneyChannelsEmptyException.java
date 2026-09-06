package com.jouney.admin.domain.journey;

public class JourneyChannelsEmptyException extends RuntimeException {

    public JourneyChannelsEmptyException() {
        super("A journey must have at least one channel");
    }
}
