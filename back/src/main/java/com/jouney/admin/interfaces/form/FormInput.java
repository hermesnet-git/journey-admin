package com.jouney.admin.interfaces.form;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.util.List;

public record FormInput(
        @NotBlank @Size(max = 150) String name,
        String description,
        @NotEmpty @Valid List<FormFieldInput> fields) {
}
