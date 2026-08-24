package com.jouney.admin.domain.form;

import java.time.OffsetDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class Form {

    // Mesma sintaxe {{nome}} da condição de Gateway (US-03.11) e dos campos de conector — visibleIf
    // não é parseado além disso aqui; a estrutura operador/valor só é validada na UI do form
    // builder, mesma divisão de responsabilidade já usada pra condição de Gateway.
    private static final Pattern VARIABLE_TOKEN = Pattern.compile("\\{\\{\\s*([A-Za-z_][A-Za-z0-9_]*)\\s*\\}\\}");

    private final UUID id;
    private String name;
    private String description;
    private List<FormField> fields;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    // Intentionally does not validate field names: also used to rehydrate forms from persistence
    // (including old, already-published snapshots that predate the name-based field identity).
    public Form(UUID id, String name, String description, List<FormField> fields,
                OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.fields = fields;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static Form create(String name, String description, List<FormField> fields) {
        validateFields(fields);
        OffsetDateTime now = OffsetDateTime.now();
        return new Form(UUID.randomUUID(), name, description, fields, now, now);
    }

    public void update(String name, String description, List<FormField> fields) {
        validateFields(fields);
        this.name = name;
        this.description = description;
        this.fields = fields;
        this.updatedAt = OffsetDateTime.now();
    }

    private static void validateFields(List<FormField> fields) {
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < fields.size(); i++) {
            FormField field = fields.get(i);
            if (!seen.add(field.getName())) {
                throw new DuplicateFieldNameException(field.getName());
            }
            validateColumns(field);
            validateDataSource(field);
            validateVisibleIf(field, fields.subList(0, i));
        }
    }

    private static void validateColumns(FormField field) {
        if (field.getColumns() != null && field.getType() != FormFieldType.SECTION) {
            throw new InvalidFormFieldException("columns só é aplicável a campos SECTION: " + field.getName());
        }
    }

    private static void validateDataSource(FormField field) {
        if (field.getDataSource() == null) {
            return;
        }
        if (field.getType() != FormFieldType.SINGLE_SELECT && field.getType() != FormFieldType.MULTI_SELECT) {
            throw new InvalidFormFieldException(
                    "dataSource só é aplicável a SINGLE_SELECT/MULTI_SELECT: " + field.getName());
        }
        if (field.getOptions() != null && !field.getOptions().isEmpty()) {
            throw new InvalidFormFieldException(
                    "dataSource e options estático são mutuamente exclusivos: " + field.getName());
        }
    }

    // Escopo simples de propósito: visibleIf só pode apontar pra um campo QUE JÁ APARECE ANTES no
    // array (mesma convenção de "ordem = posição no array" do resto do form) e que colete valor
    // (não SECTION/TEXT/FILE_UPLOAD) — mesmo filtro que userTaskFormVariables já aplica no front.
    private static void validateVisibleIf(FormField field, List<FormField> priorFields) {
        String visibleIf = field.getVisibleIf();
        if (visibleIf == null || visibleIf.isBlank()) {
            return;
        }
        Matcher matcher = VARIABLE_TOKEN.matcher(visibleIf);
        if (!matcher.find()) {
            throw new InvalidFormFieldException(
                    "visibleIf deve referenciar um campo com {{nome}}: " + field.getName());
        }
        String referencedName = matcher.group(1);
        boolean eligible = priorFields.stream()
                .anyMatch(f -> f.getName().equals(referencedName) && f.getType().collectsValue());
        if (!eligible) {
            throw new InvalidFormFieldException(
                    "visibleIf em " + field.getName() + " referencia um campo inexistente ou não elegível: " + referencedName);
        }
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public List<FormField> getFields() {
        return fields;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
