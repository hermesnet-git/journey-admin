package com.jouney.admin.application.version;

import com.jouney.admin.domain.flow.Flow;
import com.jouney.admin.domain.flow.FlowNode;
import com.jouney.admin.domain.form.Form;
import com.jouney.admin.domain.form.FormRepository;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import org.springframework.stereotype.Component;

/**
 * Resolves the forms referenced by a flow's nodes — shared by every use case that snapshots a
 * journey's current live state into a {@link com.jouney.admin.domain.version.JourneyVersion}.
 */
@Component
class JourneySnapshotFactory {

    private final FormRepository formRepository;

    JourneySnapshotFactory(FormRepository formRepository) {
        this.formRepository = formRepository;
    }

    List<Form> resolveForms(Flow flow) {
        return flow.getNodes().stream()
                .map(FlowNode::getFormId)
                .filter(Objects::nonNull)
                .distinct()
                .map(formRepository::findById)
                .flatMap(Optional::stream)
                .toList();
    }
}
