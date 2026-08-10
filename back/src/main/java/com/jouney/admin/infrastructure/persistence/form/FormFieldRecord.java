package com.jouney.admin.infrastructure.persistence.form;

import com.jouney.admin.domain.form.FormFieldOption;
import com.jouney.admin.domain.form.FormFieldType;
import com.jouney.admin.domain.form.InputSubtype;
import java.util.List;

public record FormFieldRecord(String name, FormFieldType type, InputSubtype inputSubtype, String label,
                               boolean required, String defaultValue, String helpText,
                               List<FormFieldOption> options, Double minValue, Double maxValue,
                               String validationPattern, List<String> acceptedExtensions, Long maxFileSizeBytes) {
}
