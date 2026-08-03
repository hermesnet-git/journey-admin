package com.jouney.admin.application.form;

import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormField;
import com.jouney.admin.domain.form.FormRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class CreateForm {

    private final FormRepository formRepository;

    public CreateForm(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public Form execute(String name, String description, List<FormField> fields) {
        return formRepository.save(Form.create(name, description, fields));
    }
}
