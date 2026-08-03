package com.jouney.admin.application.form;

import com.jouney.admin.domain.form.FormNotFoundException;
import com.jouney.admin.domain.form.FormRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class DeleteForm {

    private final FormRepository formRepository;

    public DeleteForm(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public void execute(UUID id) {
        formRepository.findById(id)
                .orElseThrow(() -> new FormNotFoundException(id));
        formRepository.deleteById(id);
    }
}
