package com.jouney.admin.interfaces.form;

import com.jouney.admin.domain.form.Form;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record FormResponse(UUID formId, String name, String description, List<FormFieldResponse> fields,
                            OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static FormResponse from(Form form) {
        return new FormResponse(form.getId(), form.getName(), form.getDescription(),
                form.getFields().stream().map(FormFieldResponse::from).toList(),
                form.getCreatedAt(), form.getUpdatedAt());
    }
}
