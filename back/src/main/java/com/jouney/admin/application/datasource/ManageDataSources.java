package com.jouney.admin.application.datasource;

import com.jouney.admin.application.audit.RecordAuditEvent;
import com.jouney.admin.domain.audit.AuditResult;
import com.jouney.admin.domain.datasource.DataSource;
import com.jouney.admin.domain.datasource.DataSourceItems;
import com.jouney.admin.domain.datasource.DataSourceNameAlreadyExistsException;
import com.jouney.admin.domain.datasource.DataSourceNotFoundException;
import com.jouney.admin.domain.datasource.DataSourceRepository;
import com.jouney.admin.domain.datasource.InvalidDataSourceException;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;

/**
 * Catálogo de fontes de dados de referência (FT-14). Uma tela publicada leva uma cópia da
 * configuração da fonte (congelada na publicação), então alterar ou excluir uma fonte aqui só afeta
 * as próximas publicações.
 */
@Service
public class ManageDataSources {

    private final DataSourceRepository repository;
    private final RecordAuditEvent recordAuditEvent;

    public ManageDataSources(DataSourceRepository repository, RecordAuditEvent recordAuditEvent) {
        this.repository = repository;
        this.recordAuditEvent = recordAuditEvent;
    }

    public List<DataSource> list() {
        return repository.findAll();
    }

    public DataSource get(UUID id) {
        return repository.findById(id).orElseThrow(() -> new DataSourceNotFoundException(id.toString()));
    }

    public DataSource create(DataSourceData data) {
        DataSourceData normalized = validate(data, null);
        DataSource saved = repository.save(DataSource.create(normalized.name(), normalized.description(),
                normalized.url(), normalized.timeoutMs(), normalized.itemsPath(), normalized.exposedFields(),
                normalized.credentialRef()));
        recordAuditEvent.record("DATA_SOURCE_CREATE", "DATA_SOURCE", saved.getId(), AuditResult.SUCCESS);
        return saved;
    }

    public DataSource update(UUID id, DataSourceData data) {
        DataSource dataSource = get(id);
        DataSourceData normalized = validate(data, id);
        dataSource.update(normalized.name(), normalized.description(), normalized.url(), normalized.timeoutMs(),
                normalized.itemsPath(), normalized.exposedFields(), normalized.credentialRef());
        DataSource saved = repository.save(dataSource);
        recordAuditEvent.record("DATA_SOURCE_UPDATE", "DATA_SOURCE", saved.getId(), AuditResult.SUCCESS);
        return saved;
    }

    public void delete(UUID id) {
        get(id);
        repository.deleteById(id);
        recordAuditEvent.record("DATA_SOURCE_DELETE", "DATA_SOURCE", id, AuditResult.SUCCESS);
    }

    private DataSourceData validate(DataSourceData data, UUID currentId) {
        String name = data.name().trim();
        repository.findByName(name).filter(existing -> !existing.getId().equals(currentId)).ifPresent(existing -> {
            throw new DataSourceNameAlreadyExistsException(name);
        });
        String url = data.url().trim();
        if (!url.startsWith("http://") && !url.startsWith("https://")) {
            throw new InvalidDataSourceException("A URL da fonte precisa começar com http:// ou https://");
        }
        if (!DataSourceItems.isValidPath(data.itemsPath())) {
            throw new InvalidDataSourceException("O caminho da lista precisa ser $ (a resposta já é a lista) ou $.campo, por exemplo $.horarios");
        }
        List<String> fields = DataSourceItems.normalizeFields(data.exposedFields());
        if (fields.isEmpty()) {
            throw new InvalidDataSourceException("Informe ao menos um campo exposto — só esses campos de cada item chegam à tela");
        }
        String credentialRef = data.credentialRef() == null || data.credentialRef().isBlank() ? null : data.credentialRef().trim();
        return new DataSourceData(name, data.description(), url, data.timeoutMs(), data.itemsPath().trim(), fields,
                credentialRef);
    }

    public record DataSourceData(String name, String description, String url, int timeoutMs, String itemsPath,
                                 List<String> exposedFields, String credentialRef) {
    }
}
