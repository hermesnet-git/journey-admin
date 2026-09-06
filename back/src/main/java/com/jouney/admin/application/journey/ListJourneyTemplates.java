package com.jouney.admin.application.journey;

import com.jouney.admin.domain.journey.JourneyTemplate;
import com.jouney.admin.domain.journey.JourneyTemplateCatalog;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class ListJourneyTemplates {

    private final JourneyTemplateCatalog catalog;

    public ListJourneyTemplates(JourneyTemplateCatalog catalog) {
        this.catalog = catalog;
    }

    public List<JourneyTemplate> execute() {
        return catalog.findAll();
    }
}
