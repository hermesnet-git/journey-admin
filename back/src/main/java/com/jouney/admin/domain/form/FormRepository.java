package com.jouney.admin.domain.form;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FormRepository {

    Form save(Form form);

    Optional<Form> findById(UUID id);

    List<Form> search(String query);

    void deleteById(UUID id);
}
