package com.jouney.admin.application.form;

import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormNotFoundException;
import com.jouney.admin.domain.form.FormRepository;
import java.util.UUID;
import org.springframework.stereotype.Service;

@Service
public class GetForm {

    private final FormRepository formRepository;

    public GetForm(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public Form execute(UUID id) {
        return formRepository.findById(id)
                .orElseThrow(() -> new FormNotFoundException(id));
    }
}
