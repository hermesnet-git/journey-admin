package com.jouney.mockapirest;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * Sistema de bilhetes de defeito (BD) simulado, com estado em memória, para a jornada de gestão de
 * solicitação técnica v2. Separado das rotas /v1 (aleatórias e sem estado) de propósito: reagendar,
 * cancelar e adicionar informação alteram o bilhete, e a lista e o detalhe passam a refletir a mudança.
 * Só "45537128000127" tem solicitações; o estado volta ao inicial quando o mock reinicia.
 */
@RestController
@CrossOrigin(origins = "*")
public class SolicitacaoTecnicaController {

    private static final String CNPJ_COM_SOLICITACOES = "45537128000127";
    private static final String[] PERIODOS = {"08h às 10h", "10h às 12h", "14h às 16h", "16h às 18h"};
    private static final DateTimeFormatter BR = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    // ponytail: memória sem expiração nem concorrência fina — mock local reiniciado a cada subida.
    private final Map<String, Map<String, Object>> solicitacoes = new ConcurrentHashMap<>();

    public SolicitacaoTecnicaController() {
        LocalDate hoje = LocalDate.now();
        semear("SR-2026-48001", "Sem sinal de internet", "Rua das Palmeiras, 120 — São Paulo/SP", "Visita agendada", hoje.minusDays(1), hoje.plusDays(2), "08h às 10h");
        semear("SR-2026-48002", "Instabilidade de conexão", "Av. Paulista, 1500 — São Paulo/SP", "Técnico a caminho", hoje.minusDays(2), hoje, "14h às 16h");
        semear("SR-2026-48003", "Falha no roteador fornecido", "Rua XV de Novembro, 88 — Curitiba/PR", "Aguardando peça", hoje.minusDays(3), hoje.plusDays(3), "10h às 12h");
        semear("SR-2026-48004", "Lentidão na conexão", "Rua da Bahia, 410 — Belo Horizonte/MG", "Em análise", hoje.minusDays(1), hoje.plusDays(1), "16h às 18h");
        semear("SR-2026-47110", "Queda de sinal de TV por assinatura", "Rua das Palmeiras, 120 — São Paulo/SP", "Concluída", hoje.minusDays(20), hoje.minusDays(17), "08h às 10h");
        semear("SR-2026-47095", "Ruído na linha telefônica", "Av. Paulista, 1500 — São Paulo/SP", "Cancelada", hoje.minusDays(25), hoje.minusDays(22), "14h às 16h");
    }

    private void semear(String protocolo, String servico, String endereco, String status, LocalDate abertura,
                        LocalDate visitaData, String visitaPeriodo) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("protocolo", protocolo);
        s.put("servico", servico);
        s.put("endereco", endereco);
        s.put("status", status);
        s.put("data", abertura.toString());
        s.put("visita", visita(visitaData, visitaPeriodo));
        s.put("comentarios", "Chamado aberto pelo cliente.");
        solicitacoes.put(protocolo, s);
    }

    private static Map<String, Object> visita(LocalDate data, String periodo) {
        Map<String, Object> v = new LinkedHashMap<>();
        v.put("data", data.toString());
        v.put("periodo", periodo);
        return v;
    }

    /** Status que o sistema de origem considera fechado: nada mais pode ser feito na solicitação. */
    private static boolean encerrada(Map<String, Object> s) {
        return "Concluída".equals(s.get("status")) || "Cancelada".equals(s.get("status"));
    }

    /** Regras de negócio do sistema de origem — a tela só obedece. */
    private static Map<String, Object> comPermissoes(Map<String, Object> s) {
        String status = (String) s.get("status");
        boolean fechada = encerrada(s);
        boolean aCaminho = "Técnico a caminho".equals(status);
        boolean aguardandoPeca = "Aguardando peça".equals(status);
        Map<String, Object> r = new LinkedHashMap<>(s);
        @SuppressWarnings("unchecked")
        Map<String, Object> visita = (Map<String, Object>) s.get("visita");
        r.put("dataTexto", LocalDate.parse((String) s.get("data")).format(BR));
        r.put("visitaTexto", LocalDate.parse((String) visita.get("data")).format(BR) + " · " + visita.get("periodo"));
        r.put("podeReagendar", !fechada && !aCaminho);
        r.put("podeCancelar", !fechada && !aguardandoPeca);
        r.put("podeAdicionarInformacao", !fechada);
        return r;
    }

    @GetMapping("/v2/clientes/{cnpj}/solicitacoes")
    public Map<String, Object> listar(@PathVariable String cnpj, @RequestParam(defaultValue = "andamento") String situacao) {
        boolean historico = "historico".equals(situacao);
        List<Map<String, Object>> itens = new ArrayList<>();
        if (CNPJ_COM_SOLICITACOES.equals(cnpj)) {
            solicitacoes.values().stream()
                    .filter(s -> encerrada(s) == historico)
                    .sorted((a, b) -> ((String) b.get("data")).compareTo((String) a.get("data")))
                    .forEach(s -> itens.add(comPermissoes(s)));
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("cnpjCliente", cnpj);
        resposta.put("situacao", historico ? "historico" : "andamento");
        resposta.put("quantidade", itens.size());
        resposta.put("solicitacoes", itens);
        return resposta;
    }

    @GetMapping("/v2/solicitacoes/{protocolo}")
    public ResponseEntity<Map<String, Object>> detalhe(@PathVariable String protocolo) {
        Map<String, Object> s = solicitacoes.get(protocolo);
        return s == null ? naoEncontrada() : ResponseEntity.ok(comPermissoes(s));
    }

    /** Períodos do dia; "14h às 16h" fica indisponível em dias pares (desabilita um rádio na tela). */
    @GetMapping("/v2/solicitacoes/{protocolo}/horarios-disponiveis")
    public ResponseEntity<Map<String, Object>> horarios(@PathVariable String protocolo, @RequestParam String data) {
        if (!solicitacoes.containsKey(protocolo)) return naoEncontrada();
        LocalDate dia;
        try {
            dia = LocalDate.parse(data);
        } catch (RuntimeException e) {
            return erro(HttpStatus.BAD_REQUEST, "Data inválida. Use o formato AAAA-MM-DD.");
        }
        List<Map<String, Object>> periodos = new ArrayList<>();
        for (String p : PERIODOS) {
            // A tela só recebe label/value, então período ocupado simplesmente não é oferecido.
            if (p.equals("14h às 16h") && dia.getDayOfMonth() % 2 == 0) continue;
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("value", p);
            item.put("label", p);
            periodos.add(item);
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", protocolo);
        resposta.put("data", dia.toString());
        resposta.put("horarios", periodos);
        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/v2/solicitacoes/{protocolo}/reagendamento")
    public ResponseEntity<Map<String, Object>> reagendar(@PathVariable String protocolo,
                                                         @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> s = solicitacoes.get(protocolo);
        if (s == null) return naoEncontrada();
        if (!Boolean.TRUE.equals(comPermissoes(s).get("podeReagendar"))) {
            return erro(HttpStatus.CONFLICT, "Esta solicitação não pode ser reagendada no status atual.");
        }
        String data = body != null ? String.valueOf(body.get("data")) : "null";
        String periodo = body != null ? String.valueOf(body.get("periodo")) : "null";
        LocalDate dia;
        try {
            dia = LocalDate.parse(data);
        } catch (RuntimeException e) {
            return erro(HttpStatus.UNPROCESSABLE_ENTITY, "Informe a nova data da visita.");
        }
        if (!dia.isAfter(LocalDate.now()) || !List.of(PERIODOS).contains(periodo)
                || (periodo.equals("14h às 16h") && dia.getDayOfMonth() % 2 == 0)) {
            return erro(HttpStatus.UNPROCESSABLE_ENTITY, "Esse horário não está disponível. Escolha outro.");
        }
        s.put("visita", visita(dia, periodo));
        anotar(s, "Visita reagendada para " + dia.format(BR) + ", " + periodo + ".");
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", protocolo);
        resposta.put("status", "REAGENDADO");
        resposta.put("visita", s.get("visita"));
        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/v2/solicitacoes/{protocolo}/cancelamento")
    public ResponseEntity<Map<String, Object>> cancelar(@PathVariable String protocolo,
                                                        @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> s = solicitacoes.get(protocolo);
        if (s == null) return naoEncontrada();
        if (!Boolean.TRUE.equals(comPermissoes(s).get("podeCancelar"))) {
            return erro(HttpStatus.CONFLICT, "Esta solicitação não pode ser cancelada no status atual.");
        }
        Object motivo = body != null ? body.get("motivo") : null;
        s.put("status", "Cancelada");
        anotar(s, "Solicitação cancelada pelo cliente" + (motivo != null ? ": " + motivo + "." : "."));
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", protocolo);
        resposta.put("status", "Cancelada");
        return ResponseEntity.ok(resposta);
    }

    @PostMapping("/v2/solicitacoes/{protocolo}/informacoes")
    public ResponseEntity<Map<String, Object>> adicionarInformacao(@PathVariable String protocolo,
                                                                   @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> s = solicitacoes.get(protocolo);
        if (s == null) return naoEncontrada();
        if (encerrada(s)) return erro(HttpStatus.CONFLICT, "A solicitação já foi encerrada.");
        String texto = body != null && body.get("informacao") != null ? String.valueOf(body.get("informacao")).trim() : "";
        if (texto.isEmpty()) return erro(HttpStatus.UNPROCESSABLE_ENTITY, "Escreva a informação que deseja adicionar.");
        anotar(s, texto);
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", protocolo);
        resposta.put("status", "INFORMACAO_ADICIONADA");
        return ResponseEntity.ok(resposta);
    }

    private static void anotar(Map<String, Object> s, String linha) {
        s.put("comentarios", s.get("comentarios") + "\n" + linha);
    }

    private static ResponseEntity<Map<String, Object>> naoEncontrada() {
        return erro(HttpStatus.NOT_FOUND, "Solicitação não encontrada.");
    }

    private static ResponseEntity<Map<String, Object>> erro(HttpStatus status, String mensagem) {
        return ResponseEntity.status(status).body(Map.of("message", mensagem));
    }
}
