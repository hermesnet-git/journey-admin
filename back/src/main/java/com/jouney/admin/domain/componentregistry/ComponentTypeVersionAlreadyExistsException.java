package com.jouney.admin.domain.componentregistry;

public class ComponentTypeVersionAlreadyExistsException extends RuntimeException {

    public ComponentTypeVersionAlreadyExistsException(String type, String version) {
        super("Já existe um componente \"" + type + "\" na versão \"" + version + "\".");
    }
}
