package com.jouney.admin.interfaces.datasource;

import com.jouney.admin.application.datasource.ManageDataSources;
import com.jouney.admin.application.datasource.ManageDataSources.DataSourceData;
import com.jouney.admin.application.datasource.TestDataSource;
import com.jouney.admin.domain.datasource.DataSource;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
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
import org.springframework.web.bind.annotation.RestController;
import tools.jackson.databind.node.ArrayNode;

/**
 * Catálogo de fontes de dados de referência (FT-14). Leitura liberada pra qualquer papel
 * autenticado (o editor de telas escolhe uma fonte já cadastrada); escrita e teste restritos a ADMIN,
 * como os demais catálogos (REQ-14.03.001).
 */
@RestController
@RequestMapping("/api/v1/data-sources")
public class DataSourceController {

    private final ManageDataSources manageDataSources;
    private final TestDataSource testDataSource;

    public DataSourceController(ManageDataSources manageDataSources, TestDataSource testDataSource) {
        this.manageDataSources = manageDataSources;
        this.testDataSource = testDataSource;
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping
    public List<DataSourceResponse> list() {
        return manageDataSources.list().stream().map(DataSourceResponse::from).toList();
    }

    @PreAuthorize("hasAnyRole('VIEWER','EDITOR','ADMIN')")
    @GetMapping("/{id}")
    public DataSourceResponse get(@PathVariable UUID id) {
        return DataSourceResponse.from(manageDataSources.get(id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<DataSourceResponse> create(@Valid @RequestBody DataSourceInput input) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(DataSourceResponse.from(manageDataSources.create(input.toData())));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public DataSourceResponse update(@PathVariable UUID id, @Valid @RequestBody DataSourceInput input) {
        return DataSourceResponse.from(manageDataSources.update(id, input.toData()));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        manageDataSources.delete(id);
        return ResponseEntity.noContent().build();
    }

    // Leitura liberada pro EDITOR também: o preview do editor de telas usa esta resposta como exemplo.
    @PreAuthorize("hasAnyRole('EDITOR','ADMIN')")
    @PostMapping("/{id}/test")
    public TestResponse test(@PathVariable UUID id, @RequestBody(required = false) TestInput input) {
        var result = testDataSource.execute(id, input != null ? input.params() : Map.of());
        return new TestResponse(result.status(), result.durationMs(), result.items(), result.message());
    }

    public record DataSourceInput(
            @NotBlank @Size(max = 150) String name,
            @Size(max = 500) String description,
            @NotBlank @Size(max = 500) String url,
            @NotNull @Min(100) @Max(30000) Integer timeoutMs,
            @NotBlank @Size(max = 200) String itemsPath,
            @NotNull List<String> exposedFields,
            @Size(max = 150) String credentialRef) {

        DataSourceData toData() {
            return new DataSourceData(name, description, url, timeoutMs, itemsPath, exposedFields, credentialRef);
        }
    }

    public record DataSourceResponse(UUID dataSourceId, String name, String description, String url,
                                     List<String> params, int timeoutMs, String itemsPath,
                                     List<String> exposedFields, String credentialRef,
                                     OffsetDateTime createdAt, OffsetDateTime updatedAt) {

        static DataSourceResponse from(DataSource d) {
            return new DataSourceResponse(d.getId(), d.getName(), d.getDescription(), d.getUrl(), d.getParams(),
                    d.getTimeoutMs(), d.getItemsPath(), d.getExposedFields(), d.getCredentialRef(),
                    d.getCreatedAt(), d.getUpdatedAt());
        }
    }

    public record TestInput(Map<String, String> params) {
    }

    public record TestResponse(int status, long durationMs, ArrayNode items, String message) {
    }
}
