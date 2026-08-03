package com.jouney.admin.infrastructure.persistence.form;

import com.jouney.admin.domain.form.FormFieldType;
import java.util.List;

public record FormFieldRecord(String id, FormFieldType type, String label, boolean required, String defaultValue,
                               String helpText, List<String> options) {
}
