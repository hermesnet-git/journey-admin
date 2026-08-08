package com.jouney.admin.interfaces.form;

import com.jouney.admin.application.form.CreateForm;
import com.jouney.admin.application.form.DeleteForm;
import com.jouney.admin.application.form.FindForms;
import com.jouney.admin.application.form.GetForm;
import com.jouney.admin.application.form.UpdateForm;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/forms")
public class FormController {

    private final CreateForm createForm;
    private final UpdateForm updateForm;
    private final GetForm getForm;
    private final FindForms findForms;
    private final DeleteForm deleteForm;

    public FormController(CreateForm createForm, UpdateForm updateForm, GetForm getForm, FindForms findForms,
                           DeleteForm deleteForm) {
        this.createForm = createForm;
        this.updateForm = updateForm;
        this.getForm = getForm;
        this.findForms = findForms;
        this.deleteForm = deleteForm;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<FormResponse> list(@RequestParam(required = false) String q) {
        return findForms.execute(q).stream().map(FormResponse::from).toList();
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping
    public ResponseEntity<FormResponse> create(@Valid @RequestBody FormInput input) {
        var form = createForm.execute(input.name(), input.description(),
                input.fields().stream().map(FormFieldInput::toDomain).toList());
        return ResponseEntity.status(HttpStatus.CREATED).body(FormResponse.from(form));
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{formId}")
    public FormResponse get(@PathVariable UUID formId) {
        return FormResponse.from(getForm.execute(formId));
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PutMapping("/{formId}")
    public FormResponse update(@PathVariable UUID formId, @Valid @RequestBody FormInput input) {
        var form = updateForm.execute(formId, input.name(), input.description(),
                input.fields().stream().map(FormFieldInput::toDomain).toList());
        return FormResponse.from(form);
    }

    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @DeleteMapping("/{formId}")
    public ResponseEntity<Void> delete(@PathVariable UUID formId) {
        deleteForm.execute(formId);
        return ResponseEntity.noContent().build();
    }
}
