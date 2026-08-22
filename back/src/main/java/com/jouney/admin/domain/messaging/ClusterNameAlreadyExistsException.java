package com.jouney.admin.domain.messaging;

public class ClusterNameAlreadyExistsException extends RuntimeException {

    public ClusterNameAlreadyExistsException(String name) {
        super("Já existe um cluster cadastrado com o nome \"" + name + "\".");
    }
}
