package com.jouney.admin.application.form;

import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormNotFoundException;
import com.jouney.admin.domain.form.FormRepository;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class UpdateForm {

    private final FormRepository formRepository;

    public UpdateForm(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public Form execute(UUID id, String name, String description, List<FormField> fields) {
        Form form = formRepository.findById(id)
                .orElseThrow(() -> new FormNotFoundException(id));

        form.update(name, description, fields);
        return formRepository.save(form);
    }
}
