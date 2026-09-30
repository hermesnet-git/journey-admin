package com.jouney.admin.domain.datasource;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DataSourceRepository {

    DataSource save(DataSource dataSource);

    Optional<DataSource> findById(UUID id);

    Optional<DataSource> findByName(String name);

    List<DataSource> findAll();

    void deleteById(UUID id);
}
