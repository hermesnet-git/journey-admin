package com.jouney.admin.infrastructure.persistence.publication;

import com.jouney.admin.infrastructure.persistence.form.FormFieldRecord;
import java.util.List;
import java.util.UUID;

public record SnapshotFormRecord(UUID id, String name, String description, List<FormFieldRecord> fields) {
}
