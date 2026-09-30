package com.jouney.admin.infrastructure.persistence.datasource;

import com.jouney.admin.domain.datasource.DataSource;
import com.jouney.admin.domain.datasource.DataSourceRepository;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.stereotype.Component;

@Component
public class DataSourceRepositoryAdapter implements DataSourceRepository {

    private final DataSourceJpaRepository jpaRepository;

    public DataSourceRepositoryAdapter(DataSourceJpaRepository jpaRepository) {
        this.jpaRepository = jpaRepository;
    }

    @Override
    public DataSource save(DataSource d) {
        return toDomain(jpaRepository.saveAndFlush(new DataSourceJpaEntity(d.getId(), d.getName(), d.getDescription(),
                d.getUrl(), d.getTimeoutMs(), d.getItemsPath(), d.getExposedFields(), d.getCredentialRef(),
                d.getCreatedAt(), d.getUpdatedAt())));
    }

    @Override
    public Optional<DataSource> findById(UUID id) {
        return jpaRepository.findById(id).map(DataSourceRepositoryAdapter::toDomain);
    }

    @Override
    public Optional<DataSource> findByName(String name) {
        return jpaRepository.findByName(name).map(DataSourceRepositoryAdapter::toDomain);
    }

    @Override
    public List<DataSource> findAll() {
        return jpaRepository.findAll().stream().map(DataSourceRepositoryAdapter::toDomain)
                .sorted(Comparator.comparing(DataSource::getName, String.CASE_INSENSITIVE_ORDER)).toList();
    }

    @Override
    public void deleteById(UUID id) {
        jpaRepository.deleteById(id);
    }

    private static DataSource toDomain(DataSourceJpaEntity e) {
        return new DataSource(e.getId(), e.getName(), e.getDescription(), e.getUrl(), e.getTimeoutMs(),
                e.getItemsPath(), e.getExposedFields() != null ? e.getExposedFields() : List.of(),
                e.getCredentialRef(), e.getCreatedAt(), e.getUpdatedAt());
    }
}
