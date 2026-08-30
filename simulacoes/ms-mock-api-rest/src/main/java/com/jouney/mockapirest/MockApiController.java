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
