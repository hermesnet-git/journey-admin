package com.jouney.admin.domain.datasource;

public class DataSourceNameAlreadyExistsException extends RuntimeException {

    public DataSourceNameAlreadyExistsException(String name) {
        super("Já existe uma fonte de dados chamada \"" + name + "\".");
    }
}
