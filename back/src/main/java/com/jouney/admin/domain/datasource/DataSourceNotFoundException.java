package com.jouney.admin.domain.datasource;

public class DataSourceNotFoundException extends RuntimeException {

    public DataSourceNotFoundException(String reference) {
        super("Fonte de dados não encontrada: " + reference);
    }
}
