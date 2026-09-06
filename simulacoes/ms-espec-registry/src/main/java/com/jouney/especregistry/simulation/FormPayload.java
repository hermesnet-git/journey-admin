package com.jouney.especregistry.simulation;

import com.jouney.especregistry.sdui.SduiNode;
import java.util.UUID;

public record FormPayload(UUID id, String name, String description, SduiNode sdui) {
}
