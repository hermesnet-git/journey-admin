package com.jouney.admin.interfaces.flow;

import com.jouney.admin.interfaces.form.FormFieldInput;
import java.util.List;

// messageText só é usado numa USER_TASK sem tela desenhada (REQ-04.01.005) — um passo somente-
// leitura, ex.: canal URA. embeddedScreen é a tela desenhada no editor embutido do dock: campos
// copiados de um formulário do catálogo (só como ponto de partida) ou desenhados do zero — nunca
// uma referência viva a um Form.
public record UserTaskConfigInput(String messageText, List<FormFieldInput> embeddedScreen) {
}
