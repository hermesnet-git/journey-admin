package com.jouney.admin.application.form;

import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class FindForms {

    private final FormRepository formRepository;

    public FindForms(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    public List<Form> execute(String query) {
        return formRepository.search(query);
    }
}
