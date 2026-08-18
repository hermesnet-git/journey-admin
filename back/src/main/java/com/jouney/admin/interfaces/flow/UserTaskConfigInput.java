package com.jouney.admin.interfaces.flow;

import java.util.UUID;

// formId is nullable here (unlike the old form-only shape): a USER_TASK with no form is valid
// (REQ-04.01.005) and may instead carry a display-only messageText — the front only omits
// userTaskConfig entirely once both are empty (see FlowNodeInput.toDomain).
public record UserTaskConfigInput(UUID formId, String messageText) {
}
