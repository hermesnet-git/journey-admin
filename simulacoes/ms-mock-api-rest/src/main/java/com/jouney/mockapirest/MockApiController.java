package com.jouney.mockapirest;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Random;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@CrossOrigin(origins = "*")
public class MockApiController {

    private final MockEndpointConfigRepository configs;
    private final ObjectMapper mapper;

    public MockApiController(MockEndpointConfigRepository configs, ObjectMapper mapper) {
        this.configs = configs;
        this.mapper = mapper;
    }

    @PostMapping("/v1/elegibilidade")
    public Map<String, Object> elegibilidade(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/elegibilidade");
    }

    @GetMapping("/v1/portabilidade/consulta")
    public Map<String, Object> portabilidadeConsulta() {
        return respond("/v1/portabilidade/consulta");
    }

    @GetMapping("/v1/retencao/score")
    public Map<String, Object> retencaoScore() {
        return respond("/v1/retencao/score");
    }

    @PostMapping("/v1/retencao/oferta")
    public Map<String, Object> retencaoOferta(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/retencao/oferta");
    }

    @PostMapping("/v1/cancelamento")
    public Map<String, Object> cancelamento(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/cancelamento");
    }

    @PostMapping("/v1/suporte/chamados")
    public Map<String, Object> suporteChamados(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/suporte/chamados");
    }

    @GetMapping("/v1/planos/elegibilidade-upgrade")
    public Map<String, Object> planosElegibilidadeUpgrade() {
        return respond("/v1/planos/elegibilidade-upgrade");
    }

    @PostMapping("/v1/planos/trocar")
    public Map<String, Object> planosTrocar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/planos/trocar");
    }

    @PostMapping("/v1/linhas/ativar")
    public Map<String, Object> linhasAtivar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/linhas/ativar");
    }

    @PostMapping("/v1/iot/provisionar")
    public Map<String, Object> iotProvisionar(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/iot/provisionar");
    }

    @PostMapping("/v1/credito/score")
    public Map<String, Object> creditoScore(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/credito/score");
    }

    @PostMapping("/v1/pedidos")
    public Map<String, Object> pedidos(@RequestBody(required = false) Map<String, Object> body) {
        return respond("/v1/pedidos");
    }

    private static final String CNPJ_COM_BILHETE_DEFEITO = "45537128000127";

    @GetMapping("/v1/clientes/{cnpj}/bilhetes-defeito")
    public ResponseEntity<Map<String, Object>> bilhetesDefeito(@PathVariable String cnpj) {
        if (!CNPJ_COM_BILHETE_DEFEITO.equals(cnpj)) {
            return notFound("Nenhum bilhete de defeito em atendimento encontrado para o CNPJ informado.");
        }
        return ResponseEntity.ok(bilheteDefeitoEncontrado(cnpj));
    }

    private static final String[] TIPOS_DEFEITO = {
        "Sem sinal de internet", "Instabilidade de conexão", "Falha no roteador fornecido",
        "Queda de sinal de TV por assinatura", "Ruído na linha telefônica", "Lentidão na conexão",
    };
    private static final String[] PRIORIDADES = {"Baixa", "Média", "Alta", "Crítica"};
    private static final String[] CANAIS_ABERTURA = {"Telefone", "Aplicativo", "Chat", "Loja física"};
    private static final String[] TECNICOS = {
        "Carlos Eduardo Ramos", "Fernanda Lima Souza", "João Pedro Alves", "Mariana Costa Rocha",
    };
    private static final String[] CIDADES_UF = {"São Paulo|SP", "Rio de Janeiro|RJ", "Belo Horizonte|MG", "Curitiba|PR"};

    private Map<String, Object> bilheteDefeitoEncontrado(String cnpj) {
        Random random = new Random();
        String[] cidadeUf = CIDADES_UF[random.nextInt(CIDADES_UF.length)].split("\\|");
        String tipoDefeito = TIPOS_DEFEITO[random.nextInt(TIPOS_DEFEITO.length)];
        OffsetDateTime dataAbertura = OffsetDateTime.now().minusHours(6 + random.nextInt(72));
        OffsetDateTime previsaoConclusao = OffsetDateTime.now().plusHours(4 + random.nextInt(48));

        Map<String, Object> enderecoInstalacao = new LinkedHashMap<>();
        enderecoInstalacao.put("logradouro", "Rua das Palmeiras, " + (100 + random.nextInt(900)));
        enderecoInstalacao.put("bairro", "Jardim das Acácias");
        enderecoInstalacao.put("cidade", cidadeUf[0]);
        enderecoInstalacao.put("uf", cidadeUf[1]);
        enderecoInstalacao.put("cep", String.format("%05d-%03d", random.nextInt(100000), random.nextInt(1000)));

        Map<String, Object> equipamento = new LinkedHashMap<>();
        equipamento.put("tipo", "Roteador");
        equipamento.put("modelo", "ONT-" + (1000 + random.nextInt(9000)));
        equipamento.put("numeroSerie", "SN" + (10000000 + random.nextInt(90000000)));

        Map<String, Object> bilhete = new LinkedHashMap<>();
        bilhete.put("cnpjCliente", cnpj);
        bilhete.put("numeroBilhete", "BD-" + dataAbertura.getYear() + "-" + (100000 + random.nextInt(900000)));
        bilhete.put("status", "Em atendimento");
        bilhete.put("tipoDefeito", tipoDefeito);
        bilhete.put("descricao", "Cliente reportou: " + tipoDefeito.toLowerCase() + ". Equipe técnica acionada e a caminho do endereço de instalação.");
        bilhete.put("prioridade", PRIORIDADES[random.nextInt(PRIORIDADES.length)]);
        bilhete.put("canalAbertura", CANAIS_ABERTURA[random.nextInt(CANAIS_ABERTURA.length)]);
        bilhete.put("protocoloAtendimento", "PA-" + (100000 + random.nextInt(900000)));
        bilhete.put("dataAbertura", dataAbertura.toString());
        bilhete.put("previsaoConclusao", previsaoConclusao.toString());
        bilhete.put("tecnicoResponsavel", TECNICOS[random.nextInt(TECNICOS.length)]);
        bilhete.put("enderecoInstalacao", enderecoInstalacao);
        bilhete.put("equipamento", equipamento);
        return bilhete;
    }

    private static final String CNPJ_COM_PENDENCIA_FINANCEIRA = "45537128000127";

    @GetMapping("/v1/clientes/{cnpj}/pendencias-financeiras")
    public ResponseEntity<Map<String, Object>> pendenciasFinanceiras(@PathVariable String cnpj) {
        if (!CNPJ_COM_PENDENCIA_FINANCEIRA.equals(cnpj)) {
            return notFound("Nenhuma pendência financeira encontrada para o CNPJ informado.");
        }
        return ResponseEntity.ok(pendenciaFinanceiraEncontrada(cnpj));
    }

    private static final String[] STATUS_COBRANCA = {"Em cobrança", "Aguardando pagamento", "Negativado"};
    private static final String[] FORMAS_PAGAMENTO = {"Boleto", "Pix", "Cartão de crédito"};

    private Map<String, Object> pendenciaFinanceiraEncontrada(String cnpj) {
        Random random = new Random();
        int diasEmAtraso = 5 + random.nextInt(90);
        double valorPendente = (50 + random.nextInt(95000)) / 100.0;
        OffsetDateTime dataVencimento = OffsetDateTime.now().minusDays(diasEmAtraso);

        int quantidadeFaturas = 1 + random.nextInt(3);
        List<Map<String, Object>> faturasPendentes = new ArrayList<>();
        for (int i = 0; i < quantidadeFaturas; i++) {
            OffsetDateTime vencimentoFatura = dataVencimento.minusMonths(i);
            Map<String, Object> fatura = new LinkedHashMap<>();
            fatura.put("referencia", String.format("%02d/%d", vencimentoFatura.getMonthValue(), vencimentoFatura.getYear()));
            fatura.put("valor", Math.round(((20 + random.nextInt(30000)) / 100.0) * 100) / 100.0);
            fatura.put("vencimento", vencimentoFatura.toLocalDate().toString());
            faturasPendentes.add(fatura);
        }

        Map<String, Object> pendencia = new LinkedHashMap<>();
        pendencia.put("cnpjCliente", cnpj);
        pendencia.put("numeroPendencia", "PF-" + dataVencimento.getYear() + "-" + (100000 + random.nextInt(900000)));
        pendencia.put("statusCobranca", STATUS_COBRANCA[random.nextInt(STATUS_COBRANCA.length)]);
        pendencia.put("valorPendente", Math.round(valorPendente * 100) / 100.0);
        pendencia.put("dataVencimento", dataVencimento.toLocalDate().toString());
        pendencia.put("diasEmAtraso", diasEmAtraso);
        pendencia.put("formaPagamentoDisponivel", FORMAS_PAGAMENTO[random.nextInt(FORMAS_PAGAMENTO.length)]);
        pendencia.put("linhaDigitavel", gerarLinhaDigitavel(random));
        pendencia.put("faturasPendentes", faturasPendentes);
        return pendencia;
    }

    private String gerarLinhaDigitavel(Random random) {
        StringBuilder sb = new StringBuilder();
        for (int grupo = 0; grupo < 5; grupo++) {
            if (grupo > 0) sb.append(' ');
            int digitos = grupo == 4 ? 14 : 11;
            for (int i = 0; i < digitos; i++) {
                sb.append(random.nextInt(10));
            }
        }
        return sb.toString();
    }

    private static final String CNPJ_COM_MANUTENCAO_MASSIVA = "45537128000127";

    @GetMapping("/v1/clientes/{cnpj}/manutencoes-massivas")
    public ResponseEntity<Map<String, Object>> manutencoesMassivas(@PathVariable String cnpj) {
        if (!CNPJ_COM_MANUTENCAO_MASSIVA.equals(cnpj)) {
            return notFound("Nenhuma manutenção massiva em andamento na região do CNPJ informado.");
        }
        return ResponseEntity.ok(manutencaoMassivaEncontrada(cnpj));
    }

    private static final String[] TIPOS_MANUTENCAO = {
        "Manutenção preventiva de rede", "Reparo emergencial de fibra óptica",
        "Atualização de equipamento de backbone", "Substituição de cabeamento aéreo",
    };
    private static final String[] STATUS_MANUTENCAO = {"Em andamento", "Programada"};
    private static final String[] IMPACTOS_MANUTENCAO = {
        "Instabilidade intermitente na conexão", "Indisponibilidade total temporária", "Lentidão na navegação",
    };
    private static final String[] BAIRROS_REGIAO = {"Jardim das Acácias", "Vila Nova Esperança", "Centro", "Parque Industrial"};

    private Map<String, Object> manutencaoMassivaEncontrada(String cnpj) {
        Random random = new Random();
        String[] cidadeUf = CIDADES_UF[random.nextInt(CIDADES_UF.length)].split("\\|");
        OffsetDateTime dataInicio = OffsetDateTime.now().minusHours(1 + random.nextInt(24));
        OffsetDateTime previsaoConclusao = OffsetDateTime.now().plusHours(2 + random.nextInt(36));

        Map<String, Object> manutencao = new LinkedHashMap<>();
        manutencao.put("cnpjCliente", cnpj);
        manutencao.put("protocoloManutencao", "MM-" + dataInicio.getYear() + "-" + (100000 + random.nextInt(900000)));
        manutencao.put("tipoManutencao", TIPOS_MANUTENCAO[random.nextInt(TIPOS_MANUTENCAO.length)]);
        manutencao.put("statusManutencao", STATUS_MANUTENCAO[random.nextInt(STATUS_MANUTENCAO.length)]);
        manutencao.put("regiaoAfetada", BAIRROS_REGIAO[random.nextInt(BAIRROS_REGIAO.length)] + ", " + cidadeUf[0] + "/" + cidadeUf[1]);
        manutencao.put("impacto", IMPACTOS_MANUTENCAO[random.nextInt(IMPACTOS_MANUTENCAO.length)]);
        manutencao.put("dataInicio", dataInicio.toString());
        manutencao.put("previsaoConclusao", previsaoConclusao.toString());
        manutencao.put("quantidadeClientesAfetados", 50 + random.nextInt(4950));
        return manutencao;
    }

    /**
     * Lista os bilhetes de defeito em aberto do CNPJ, cada um dizendo se pode ser reagendado ou
     * cancelado (a regra de negócio é deste sistema, não da tela). Só "45537128000127" tem bilhetes;
     * qualquer outro CNPJ recebe a lista vazia. Seed fixa por CNPJ: a lista é a mesma a cada chamada.
     */
    @GetMapping("/v1/clientes/{cnpj}/bilhetes")
    public Map<String, Object> listarBilhetes(@PathVariable String cnpj) {
        List<Map<String, Object>> bilhetes = new ArrayList<>();
        if (CNPJ_COM_BILHETE_DEFEITO.equals(cnpj)) {
            Random random = new Random(cnpj.hashCode());
            String[] status = {"Em atendimento", "Técnico a caminho", "Aguardando peça", "Agendado"};
            for (int i = 0; i < 4; i++) {
                OffsetDateTime abertura = OffsetDateTime.now().minusDays(1 + i).withNano(0);
                boolean tecnicoACaminho = "Técnico a caminho".equals(status[i]);
                boolean aguardandoPeca = "Aguardando peça".equals(status[i]);
                Map<String, Object> bilhete = new LinkedHashMap<>();
                bilhete.put("numeroBilhete", "BD-" + abertura.getYear() + "-" + (480000 + i * 7311 + random.nextInt(900)));
                bilhete.put("tipoDefeito", TIPOS_DEFEITO[i % TIPOS_DEFEITO.length]);
                bilhete.put("status", status[i]);
                bilhete.put("prioridade", PRIORIDADES[(i + 2) % PRIORIDADES.length]);
                bilhete.put("dataAbertura", abertura.toLocalDate().toString());
                bilhete.put("previsaoConclusao", abertura.plusDays(3).toLocalDate().toString());
                bilhete.put("podeReagendar", !tecnicoACaminho);
                bilhete.put("podeCancelar", !aguardandoPeca);
                bilhete.put("motivoBloqueio", tecnicoACaminho
                        ? "O técnico já está a caminho, não é possível reagendar."
                        : aguardandoPeca ? "A peça já foi solicitada, não é possível cancelar." : null);
                bilhetes.add(bilhete);
            }
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("cnpjCliente", cnpj);
        resposta.put("quantidade", bilhetes.size());
        resposta.put("bilhetes", bilhetes);
        return resposta;
    }

    /** Horários livres da agenda técnica para reagendar a visita de um bilhete (dado de referência). */
    @GetMapping("/v1/bilhetes/{numeroBilhete}/horarios-disponiveis")
    public Map<String, Object> horariosDisponiveis(@PathVariable String numeroBilhete) {
        String[] periodos = {"Manhã (8h às 12h)", "Tarde (13h às 18h)"};
        List<Map<String, Object>> horarios = new ArrayList<>();
        java.time.LocalDate dia = java.time.LocalDate.now().plusDays(1);
        for (int i = 0; i < 6; i++) {
            java.time.LocalDate data = dia.plusDays(i / 2);
            Map<String, Object> horario = new LinkedHashMap<>();
            horario.put("value", data + (i % 2 == 0 ? "-MANHA" : "-TARDE"));
            horario.put("label", data.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")) + " — " + periodos[i % 2]);
            horarios.add(horario);
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("numeroBilhete", numeroBilhete);
        resposta.put("horarios", horarios);
        return resposta;
    }

    @PostMapping("/v1/bilhetes/{numeroBilhete}/reagendamento")
    public Map<String, Object> reagendarBilhete(@PathVariable String numeroBilhete,
                                                 @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("numeroBilhete", numeroBilhete);
        resposta.put("protocolo", "RG-" + (100000 + new Random().nextInt(900000)));
        resposta.put("status", "REAGENDADO");
        resposta.put("novoHorario", body != null ? body.get("horario") : null);
        return resposta;
    }

    @PostMapping("/v1/bilhetes/{numeroBilhete}/cancelamento")
    public Map<String, Object> cancelarBilhete(@PathVariable String numeroBilhete,
                                                @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("numeroBilhete", numeroBilhete);
        resposta.put("protocolo", "CN-" + (100000 + new Random().nextInt(900000)));
        resposta.put("status", "CANCELADO");
        return resposta;
    }

    /**
     * Recebe a solicitação de avaliação de diagnóstico de conectividade. Só confirma o recebimento —
     * o resultado do diagnóstico chega depois, de forma assíncrona, pelo Kafka.
     */
    @PostMapping("/v1/diagnosticos/solicitacoes")
    public Map<String, Object> solicitarDiagnostico(@RequestBody(required = false) Map<String, Object> body) {
        Random random = new Random();
        OffsetDateTime agora = OffsetDateTime.now();
        Map<String, Object> solicitacao = new LinkedHashMap<>();
        solicitacao.put("cnpjCliente", body != null ? body.get("cnpj") : null);
        solicitacao.put("protocolo", "DG-" + agora.getYear() + "-" + (100000 + random.nextInt(900000)));
        solicitacao.put("status", "RECEBIDA");
        solicitacao.put("dataSolicitacao", agora.toString());
        solicitacao.put("previsaoRetorno", agora.plusMinutes(15).toString());
        return solicitacao;
    }

    // --- APIs dos templates de jornada (aba Template em "Nova jornada") -----------------------------

    /** Catálogo comercial de planos — saída do tipo lista para escolha de plano. */
    @GetMapping("/v1/planos/ofertas")
    public Map<String, Object> planosOfertas() {
        List<Map<String, Object>> planos = List.of(
                plano("CTRL-15", "Vivo Controle 15GB", "15GB + apps ilimitados", 54.99, "Mais vendido", true),
                plano("POS-40", "Vivo Pós 40GB", "40GB + streaming incluso", 129.99, "Inclui streaming", true),
                plano("POS-100", "Vivo Pós 100GB", "100GB + roaming nas Américas", 219.99, "Para quem viaja", true),
                plano("FAMILIA-4", "Vivo Família 4 linhas", "200GB compartilhados", 349.99, "Esgotado na sua região", false));
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("quantidade", planos.size());
        resposta.put("planos", planos);
        return resposta;
    }

    private static Map<String, Object> plano(String codigo, String nome, String franquia, double preco, String destaque,
                                             boolean disponivel) {
        Map<String, Object> plano = new LinkedHashMap<>();
        plano.put("codigo", codigo);
        plano.put("nome", nome);
        plano.put("franquia", franquia);
        plano.put("preco", preco);
        plano.put("destaque", destaque);
        plano.put("disponivel", disponivel);
        return plano;
    }

    /**
     * Faturas em aberto do CPF. Qualquer CPF tem três faturas (sempre as mesmas para o mesmo CPF), exceto
     * os que terminam em "00" — cliente em dia, lista vazia.
     */
    @GetMapping("/v1/clientes/{cpf}/faturas")
    public Map<String, Object> faturas(@PathVariable String cpf) {
        List<Map<String, Object>> faturas = new ArrayList<>();
        if (!cpf.endsWith("00")) {
            Random random = new Random(cpf.hashCode());
            java.time.LocalDate hoje = java.time.LocalDate.now();
            String[] status = {"Vencida", "Vencida", "Em aberto"};
            for (int i = 0; i < 3; i++) {
                java.time.LocalDate vencimento = hoje.minusMonths(2 - i).withDayOfMonth(10);
                boolean vencida = "Vencida".equals(status[i]);
                Map<String, Object> fatura = new LinkedHashMap<>();
                fatura.put("id", "FAT-" + vencimento.getYear() + String.format("%02d", vencimento.getMonthValue()) + "-" + (1000 + random.nextInt(9000)));
                fatura.put("referencia", String.format("%02d/%d", vencimento.getMonthValue(), vencimento.getYear()));
                fatura.put("valor", Math.round((89 + random.nextInt(200) + random.nextInt(100) / 100.0) * 100) / 100.0);
                fatura.put("vencimento", vencimento.toString());
                fatura.put("status", status[i]);
                fatura.put("podeSegundaVia", true);
                fatura.put("podeNegociar", vencida);
                fatura.put("motivoBloqueio", vencida ? null : "Só faturas vencidas podem ser negociadas.");
                faturas.add(fatura);
            }
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("cpf", cpf);
        resposta.put("quantidade", faturas.size());
        resposta.put("faturas", faturas);
        return resposta;
    }

    @PostMapping("/v1/faturas/{faturaId}/segunda-via")
    public Map<String, Object> segundaVia(@PathVariable String faturaId) {
        Random random = new Random();
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("faturaId", faturaId);
        resposta.put("linhaDigitavel", gerarLinhaDigitavel(random));
        resposta.put("pixCopiaECola", "00020126580014BR.GOV.BCB.PIX0136" + java.util.UUID.randomUUID() + "5204000053039865802BR");
        resposta.put("validade", java.time.LocalDate.now().plusDays(3).toString());
        return resposta;
    }

    /** Parcelamento de uma fatura vencida: divide o valor em "parcelas" (2 a 12; padrão 3). */
    @PostMapping("/v1/acordos")
    public Map<String, Object> acordos(@RequestBody(required = false) Map<String, Object> body) {
        int parcelas = 3;
        if (body != null && body.get("parcelas") != null) {
            try {
                parcelas = Math.max(2, Math.min(12, Integer.parseInt(String.valueOf(body.get("parcelas")))));
            } catch (NumberFormatException ignored) {
                // mantém o padrão
            }
        }
        double valorTotal = 389.70;
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", "AC-" + (100000 + new Random().nextInt(900000)));
        resposta.put("faturaId", body != null ? body.get("faturaId") : null);
        resposta.put("parcelas", parcelas);
        resposta.put("valorParcela", Math.round(valorTotal / parcelas * 100) / 100.0);
        resposta.put("primeiroVencimento", java.time.LocalDate.now().plusDays(5).toString());
        return resposta;
    }

    // CPFs que começam com "000" já falharam uma vez: a próxima tentativa passa (simula instabilidade).
    private final java.util.Set<String> cadastrosComFalhaSimulada = java.util.concurrent.ConcurrentHashMap.newKeySet();

    /**
     * Cadastro de cliente com falhas previsíveis: CPF sem 11 dígitos → 422 com "mensagem"; CPF começando
     * com "000" → 503 na primeira tentativa e 201 na seguinte (sistema instável); demais → 201.
     */
    @PostMapping("/v1/clientes/cadastro")
    public ResponseEntity<Map<String, Object>> cadastroCliente(@RequestBody(required = false) Map<String, Object> body) {
        String cpf = body != null && body.get("cpf") != null ? String.valueOf(body.get("cpf")).replaceAll("\\D", "") : "";
        if (cpf.length() != 11) {
            return ResponseEntity.status(422)
                    .body(Map.of("mensagem", "O CPF precisa ter 11 dígitos. Confira o número e tente de novo."));
        }
        if (cpf.startsWith("000") && cadastrosComFalhaSimulada.add(cpf)) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                    .body(Map.of("mensagem", "O sistema de cadastro está instável no momento."));
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("idCliente", "CLI-" + (100000 + new Random().nextInt(900000)));
        resposta.put("status", "ATIVO");
        resposta.put("mensagem", "Cadastro concluído.");
        return ResponseEntity.status(HttpStatus.CREATED).body(resposta);
    }

    /**
     * Triagem de reclamação: reincidente (body.reincidente = true) ou categoria "cobranca_indevida" vai
     * para a OUVIDORIA; o resto fica no N1, com uma compensação sugerida.
     */
    @PostMapping("/v1/ouvidoria/reclamacoes")
    public Map<String, Object> reclamacoes(@RequestBody(required = false) Map<String, Object> body) {
        boolean reincidente = body != null && Boolean.parseBoolean(String.valueOf(body.get("reincidente")));
        boolean cobranca = body != null && "cobranca_indevida".equals(body.get("categoria"));
        boolean ouvidoria = reincidente || cobranca;
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", "RC-" + (100000 + new Random().nextInt(900000)));
        resposta.put("nivel", ouvidoria ? "OUVIDORIA" : "N1");
        resposta.put("prazoRespostaDias", ouvidoria ? 10 : 2);
        resposta.put("compensacaoSugerida", ouvidoria ? 0 : 30.0);
        return resposta;
    }

    @PostMapping("/v1/ouvidoria/compensacoes")
    public Map<String, Object> compensacoes(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", "CP-" + (100000 + new Random().nextInt(900000)));
        resposta.put("valorCreditado", body != null && body.get("valor") != null ? body.get("valor") : 30.0);
        resposta.put("status", "CREDITADO");
        return resposta;
    }

    @PostMapping("/v1/portabilidade/solicitacoes")
    public Map<String, Object> portabilidadeSolicitacoes(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", "PT-" + (100000 + new Random().nextInt(900000)));
        resposta.put("janelaPortabilidade", java.time.LocalDate.now().plusDays(2) + " das 0h às 6h");
        resposta.put("status", "AGENDADA");
        return resposta;
    }

    private static final String[] CLIENTES_OS = {"Ana Paula Mendes", "Roberto Nascimento", "Juliana Ferreira", "Marcos Vinícius Teixeira"};

    /** Ordem de serviço de reparo de fibra — qualquer número devolve uma OS (dados fabricados). */
    @GetMapping("/v1/ordens-servico/{numero}")
    public Map<String, Object> ordemServico(@PathVariable String numero) {
        Random random = new Random(numero.hashCode());
        String[] cidadeUf = CIDADES_UF[random.nextInt(CIDADES_UF.length)].split("\\|");
        Map<String, Object> os = new LinkedHashMap<>();
        os.put("numero", numero);
        os.put("clienteNome", CLIENTES_OS[random.nextInt(CLIENTES_OS.length)]);
        os.put("endereco", "Rua das Palmeiras, " + (100 + random.nextInt(900)) + " — " + cidadeUf[0] + "/" + cidadeUf[1]);
        os.put("defeitoRelatado", TIPOS_DEFEITO[random.nextInt(TIPOS_DEFEITO.length)]);
        os.put("equipamentoModelo", "ONT-" + (1000 + random.nextInt(9000)));
        os.put("potenciaEsperadaDbm", -18.5);
        os.put("janelaAtendimento", "Hoje, 13h às 18h");
        return os;
    }

    @PostMapping("/v1/ordens-servico/{numero}/encerramento")
    public Map<String, Object> encerrarOrdemServico(@PathVariable String numero,
                                                    @RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("numero", numero);
        resposta.put("protocolo", "EN-" + (100000 + new Random().nextInt(900000)));
        resposta.put("status", "ENCERRADA");
        resposta.put("pesquisaEnviada", true);
        return resposta;
    }

    /** Horários livres para instalação no CEP (dado de referência, formato {label, value}). */
    @GetMapping("/v1/instalacoes/horarios-disponiveis")
    public Map<String, Object> horariosInstalacao(@RequestParam(required = false) String cep) {
        String[] periodos = {"Manhã (8h às 12h)", "Tarde (13h às 18h)"};
        List<Map<String, Object>> horarios = new ArrayList<>();
        java.time.LocalDate dia = java.time.LocalDate.now().plusDays(2);
        for (int i = 0; i < 6; i++) {
            java.time.LocalDate data = dia.plusDays(i / 2);
            Map<String, Object> horario = new LinkedHashMap<>();
            horario.put("value", data + (i % 2 == 0 ? "-MANHA" : "-TARDE"));
            horario.put("label", data.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM")) + " — " + periodos[i % 2]);
            horarios.add(horario);
        }
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("cep", cep);
        resposta.put("horarios", horarios);
        return resposta;
    }

    @PostMapping("/v1/instalacoes/agendamentos")
    public Map<String, Object> agendarInstalacao(@RequestBody(required = false) Map<String, Object> body) {
        Map<String, Object> resposta = new LinkedHashMap<>();
        resposta.put("protocolo", "AG-" + (100000 + new Random().nextInt(900000)));
        resposta.put("horario", body != null ? body.get("horario") : null);
        resposta.put("status", "AGENDADO");
        return resposta;
    }

    /**
     * Fonte de dados de teste para datasource SDUI (REQ fora do escopo v1.0.0, mas útil para
     * prototipar campos SINGLE_SELECT/MULTI_SELECT com muitas opções). Formato {label, value}
     * espelha {@link com.jouney.admin.domain.form.FormFieldOption} do admin. Gerada uma única vez
     * com seed fixa (não no H2, como as demais rotas) para a lista ficar estável entre restarts.
     * Paginada por cursor opaco (offset em Base64) — este mock representa o sistema externo real,
     * então é ele quem deve dono da paginação; quem chamar apenas repassa o cursor recebido.
     */
    @GetMapping("/v1/testdatasource/lista")
    public Map<String, Object> listaTestDataSource(
            @RequestParam(required = false) String cursor,
            @RequestParam(defaultValue = "20") int limit) {
        int offset = Math.min(decodeCursor(cursor), TEST_DATASOURCE_OPTIONS.size());
        int pageSize = Math.max(1, Math.min(limit, 100));
        int end = Math.min(offset + pageSize, TEST_DATASOURCE_OPTIONS.size());

        Map<String, Object> response = new LinkedHashMap<>();
        response.put("items", TEST_DATASOURCE_OPTIONS.subList(offset, end));
        response.put("nextCursor", end < TEST_DATASOURCE_OPTIONS.size() ? encodeCursor(end) : null);
        return response;
    }

    private static int decodeCursor(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8));
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "cursor invalido");
        }
    }

    private static String encodeCursor(int offset) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(Integer.toString(offset).getBytes(StandardCharsets.UTF_8));
    }

    private static final List<Map<String, Object>> TEST_DATASOURCE_OPTIONS = buildTestDataSourceOptions();

    private static List<Map<String, Object>> buildTestDataSourceOptions() {
        String[] words = {"Azul", "Verde", "Rapido", "Nordeste", "Plano", "Sinal", "Torre", "Fibra",
                "Roteador", "Chip", "Sudeste", "Prime", "Turbo", "Smart", "Cloud", "Base", "Linha", "Pacote",
                "App", "Dados"};
        Random random = new Random(42);
        List<Map<String, Object>> options = new ArrayList<>(100);
        for (int i = 1; i <= 100; i++) {
            String label = words[random.nextInt(words.length)] + " " + words[random.nextInt(words.length)] + " " + i;
            options.add(Map.of("label", label, "value", "OPT-" + i));
        }
        return options;
    }

    private static ResponseEntity<Map<String, Object>> notFound(String message) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", message));
    }

    private Map<String, Object> respond(String endpoint) {
        String json = configs.findById(endpoint)
                .orElseThrow(() -> new IllegalStateException("Sem mock configurado para " + endpoint))
                .getResponseJson();
        return mapper.readValue(json, new TypeReference<Map<String, Object>>() {
        });
    }
}
