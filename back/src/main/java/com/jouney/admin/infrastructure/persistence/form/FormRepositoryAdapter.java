package com.jouney.admin.infrastructure.persistence.form;

import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

@Component
public class FormRepositoryAdapter implements FormRepository {

    private final FormJpaRepository jpaRepository;
    private final ObjectMapper objectMapper;

    public FormRepositoryAdapter(FormJpaRepository jpaRepository, ObjectMapper objectMapper) {
        this.jpaRepository = jpaRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    public Form save(Form form) {
        String fieldsJson = writeJson(form.getFields().stream()
                .map(f -> new FormFieldRecord(f.getId(), f.getType(), f.getLabel(), f.isRequired(),
                        f.getDefaultValue(), f.getHelpText(), f.getOptions()))
                .toList());
        FormJpaEntity entity = new FormJpaEntity(form.getId(), form.getName(), form.getDescription(), fieldsJson,
                form.getCreatedAt(), form.getUpdatedAt());
        return toDomain(jpaRepository.save(entity));
    }

    @Override
    public Optional<Form> findById(UUID id) {
        return jpaRepository.findById(id).map(this::toDomain);
    }

    @Override
    public List<Form> search(String query) {
        List<FormJpaEntity> entities = jpaRepository.findAll();
        return entities.stream()
                .filter(e -> query == null || query.isBlank() || e.getName().toLowerCase().contains(query.toLowerCase()))
                .map(this::toDomain)
                .toList();
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    private Form toDomain(FormJpaEntity entity) {
        List<FormFieldRecord> fieldRecords = readJson(entity.getFields(), new TypeReference<List<FormFieldRecord>>() {
        });
        List<FormField> fields = fieldRecords.stream()
                .map(f -> new FormField(f.id(), f.type(), f.label(), f.required(), f.defaultValue(), f.helpText(),
                        f.options()))
                .toList();
        return new Form(entity.getId(), entity.getName(), entity.getDescription(), fields, entity.getCreatedAt(),
                entity.getUpdatedAt());
    }

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to serialize form", e);
        }
    }

    private <T> T readJson(String json, TypeReference<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to deserialize form", e);
        }
    }
}
