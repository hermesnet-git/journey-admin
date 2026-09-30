package com.jouney.especregistry.interfaces.journey;

import java.util.Map;

// processInstanceId: opcional, só pra registrar as consultas às fontes de dados da tela (Diagnóstico).
public record ResolveFormRequest(Map<String, Object> variables, String processInstanceId) {
}
