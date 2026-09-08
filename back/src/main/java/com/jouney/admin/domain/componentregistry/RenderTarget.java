package com.jouney.admin.domain.componentregistry;

import java.util.List;

/** Os 5 alvos de renderização do catálogo (seção 4) — identificadores estáveis usados como chave
 * de {@code supportedTargets}/{@code adapterKeys}. Não é enum: as chaves já são o próprio contrato
 * (ex.: {@code "react.web"}), então validar contra esta lista fixa é suficiente sem amarrar o Map a
 * um tipo Java específico de chave.
 *
 * {@code WHATSAPP}: diferente dos outros 4 (frameworks de UI livre), é um canal de mensageria sem
 * layout arbitrário — a árvore SDUI é achatada numa sequência de mensagens (texto/botões/lista/
 * mídia) em vez de renderizada como componentes aninhados. Mesmo assim usa o mesmo mecanismo de
 * {@code supportedTargets}/{@code TargetStatus} dos outros: "SUPPORTED" aqui significa "esse tipo
 * de componente tem uma representação válida em mensagem de WhatsApp", não "renderiza pixel a
 * pixel igual aos demais alvos". */
public final class RenderTarget {

    public static final String REACT_WEB = "react.web";
    public static final String REACT_MOBILE = "react.mobile";
    public static final String FLUTTER_WEB = "flutter.web";
    public static final String FLUTTER_MOBILE = "flutter.mobile";
    public static final String WHATSAPP = "whatsapp";

    public static final List<String> ALL = List.of(REACT_WEB, REACT_MOBILE, FLUTTER_WEB, FLUTTER_MOBILE, WHATSAPP);

    private RenderTarget() {
    }
}
