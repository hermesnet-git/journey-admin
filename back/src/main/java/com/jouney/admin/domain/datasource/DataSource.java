package com.jouney.admin.domain.datasource;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Fonte de dados de referência do catálogo de integrações (FT-14): uma consulta REST GET que uma
 * tela declara em {@code dataSources} e o ms-espec-registry executa ao montar a tela. Só dado que
 * apoia a tela (horários, motivos) — dado que decide caminho vem de integração no fluxo.
 *
 * Os parâmetros são os marcadores {@code {nome}} da URL (ex.: {@code /bilhetes/{bilhete}/horarios});
 * a tela informa o valor de cada um. {@code itemsPath} diz onde está a lista na resposta ({@code $}
 * quando a resposta já é a lista) e {@code exposedFields} são os únicos campos de cada item que
 * saem do servidor.
 */
public class DataSource {

    private static final Pattern URL_PARAM = Pattern.compile("\\{([A-Za-z_][A-Za-z0-9_]*)\\}");

    private final UUID id;
    private String name;
    private String description;
    private String url;
    private int timeoutMs;
    private String itemsPath;
    private List<String> exposedFields;
    private String credentialRef;
    private final OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;

    public DataSource(UUID id, String name, String description, String url, int timeoutMs, String itemsPath,
                      List<String> exposedFields, String credentialRef, OffsetDateTime createdAt,
                      OffsetDateTime updatedAt) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.url = url;
        this.timeoutMs = timeoutMs;
        this.itemsPath = itemsPath;
        this.exposedFields = List.copyOf(exposedFields);
        this.credentialRef = credentialRef;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    public static DataSource create(String name, String description, String url, int timeoutMs, String itemsPath,
                                    List<String> exposedFields, String credentialRef) {
        OffsetDateTime now = OffsetDateTime.now();
        return new DataSource(UUID.randomUUID(), name, description, url, timeoutMs, itemsPath, exposedFields,
                credentialRef, now, now);
    }

    public void update(String name, String description, String url, int timeoutMs, String itemsPath,
                       List<String> exposedFields, String credentialRef) {
        this.name = name;
        this.description = description;
        this.url = url;
        this.timeoutMs = timeoutMs;
        this.itemsPath = itemsPath;
        this.exposedFields = List.copyOf(exposedFields);
        this.credentialRef = credentialRef;
        this.updatedAt = OffsetDateTime.now();
    }

    /** Nomes dos parâmetros da URL, na ordem em que aparecem. */
    public List<String> getParams() {
        return paramsOf(url);
    }

    public static List<String> paramsOf(String url) {
        LinkedHashSet<String> params = new LinkedHashSet<>();
        Matcher matcher = URL_PARAM.matcher(url == null ? "" : url);
        while (matcher.find()) {
            params.add(matcher.group(1));
        }
        return new ArrayList<>(params);
    }

    public UUID getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public String getUrl() {
        return url;
    }

    public int getTimeoutMs() {
        return timeoutMs;
    }

    public String getItemsPath() {
        return itemsPath;
    }

    public List<String> getExposedFields() {
        return exposedFields;
    }

    public String getCredentialRef() {
        return credentialRef;
    }

    public OffsetDateTime getCreatedAt() {
        return createdAt;
    }

    public OffsetDateTime getUpdatedAt() {
        return updatedAt;
    }
}
