package com.jouney.admin.domain.journey;

import java.util.List;
import java.util.Optional;

public interface JourneyTemplateCatalog {

    List<JourneyTemplate> findAll();

    Optional<JourneyTemplate> findById(String id);
}
