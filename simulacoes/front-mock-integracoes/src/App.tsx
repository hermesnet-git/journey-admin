import { useState } from 'react'

const API_BASE = 'http://localhost:8084'

type Metodo = 'GET' | 'POST'

type Endpoint = {
  metodo: Metodo
  path: string
  descricao: string
  nota: string
  bodyExemplo?: object
  queryExemplo?: string
}

const ENDPOINTS: Endpoint[] = [
  {
    metodo: 'GET',
    path: '/v1/testdatasource/lista',
    descricao: 'Datasource de teste (paginado)',
    nota:
      'Fonte de dados de teste para popular campos SINGLE_SELECT/MULTI_SELECT de um formulário SDUI ' +
      'com um volume grande de opções (100 itens, texto pseudo-aleatório com seed fixa). Paginação por ' +
      'cursor opaco: cada resposta traz "items" no formato {label, value} — igual ao FormFieldOption do ' +
      'admin — e "nextCursor"; repasse esse valor no parâmetro "cursor" da próxima chamada para seguir ' +
      'a listagem, até vir null. "limit" é opcional (padrão 20, máximo 100).',
    queryExemplo: 'limit=20',
  },
  {
    metodo: 'POST',
    path: '/v1/elegibilidade',
    descricao: 'Consulta elegibilidade',
    nota:
      'Valida a elegibilidade cadastral do cliente logo após a etapa de coleta de dados da jornada ' +
      'de alteração cadastral. Simula uma checagem síncrona no sistema de crédito/cadastro: quando ' +
      '"elegivel" vem true, a jornada segue direto para a conclusão; quando vem false, o fluxo desvia ' +
      'para o registro de uma pendência tratada manualmente depois. O campo "protocolo" é só um ' +
      'identificador de rastreio da consulta, sem efeito nas decisões do processo. O mock devolve ' +
      'elegivel=true por padrão (caminho feliz) — edite o valor pra forçar o caminho de pendência.',
    bodyExemplo: {},
  },
  {
    metodo: 'GET',
    path: '/v1/portabilidade/consulta',
    descricao: 'Consulta portabilidade',
    nota:
      'Consulta a operadora de origem para saber em quantos dias a portabilidade numérica pode ser ' +
      'efetivada, logo após o cliente informar operadora atual, número a portar e data preferencial. ' +
      'O valor de "prazoEstimadoDias" decide o gateway seguinte: menor que 3 dias, a jornada segue ' +
      'para portabilidade imediata (que aguarda confirmação assíncrona da operadora via Kafka); 3 ' +
      'dias ou mais, o cliente só é informado do prazo estendido e o fluxo encerra ali. O mock devolve ' +
      '5 dias por padrão, ou seja, o caminho de prazo estendido é o exercitado.',
  },
  {
    metodo: 'GET',
    path: '/v1/retencao/score',
    descricao: 'Score de retenção',
    nota:
      'Calcula a propensão de retenção do cliente logo após ele registrar o motivo do cancelamento ' +
      '(preço alto, mudança de operadora, insatisfação, mudança de endereço etc.). É o coração da ' +
      'jornada de cancelamento assistido: score acima de 70 direciona o fluxo para a oferta de ' +
      'retenção; 70 ou menos leva direto ao cancelamento efetivo. O mock devolve 50 por padrão — o ' +
      'cliente NÃO é retido por default; suba o valor pra testar o ramo de retenção.',
  },
  {
    metodo: 'POST',
    path: '/v1/retencao/oferta',
    descricao: 'Aplica oferta de retenção',
    nota:
      'Aplica o desconto/benefício de retenção quando o score indicou chance real de reter o cliente ' +
      '(ramo "score > 70" da consulta anterior). Recebe o score calculado e devolve um status de ' +
      'confirmação que não alimenta nenhuma variável de processo nem gateway — serve só pra ' +
      'log/auditoria da execução. Depois dela a jornada encerra como "cliente retido".',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/cancelamento',
    descricao: 'Cancelamento',
    nota:
      'Efetiva o cancelamento do serviço quando a oferta de retenção não se aplica (score de retenção ' +
      '≤ 70). Assim como a oferta de retenção, o status devolvido não é usado em nenhuma decisão ' +
      'posterior — é o passo final do ramo "cliente não retido", e a jornada encerra como cancelada.',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/suporte/chamados',
    descricao: 'Abre chamado de suporte',
    nota:
      'Abre o chamado técnico no sistema de field service, no fim de uma cadeia de integrações que ' +
      'começa por um evento externo (mensagem de abertura de chamado), passa por um diagnóstico ' +
      'automático via Kafka e só então o cliente detalha o problema em formulário (categoria, ' +
      'descrição, evidência opcional). Recebe o id do ticket e o resultado do diagnóstico automático, ' +
      'e devolve "numeroChamado" — um identificador final exibido ao cliente/atendente, sem efeito em ' +
      'decisões: o fluxo é linear até aqui.',
    bodyExemplo: {},
  },
  {
    metodo: 'GET',
    path: '/v1/planos/elegibilidade-upgrade',
    descricao: 'Elegibilidade de upgrade de plano',
    nota:
      'Verifica se o cliente pode migrar pro plano escolhido, logo após ele selecionar o novo plano ' +
      '(Básico/Intermediário/Premium/Ilimitado) e o motivo da troca. Quando "elegivel" vem true, a ' +
      'jornada segue pra aplicação da troca; quando vem false, o cliente recebe uma oferta de plano ' +
      'alternativo compatível. O mock devolve true por padrão (caminho de upgrade aplicado).',
  },
  {
    metodo: 'POST',
    path: '/v1/planos/trocar',
    descricao: 'Troca de plano',
    nota:
      'Efetiva a troca de plano no sistema de billing, no ramo em que o cliente foi considerado ' +
      'elegível pro upgrade. Assim como as outras chamadas "terminais" de ramo, o status devolvido ' +
      'não alimenta nenhuma decisão — é só o fechamento da jornada como "upgrade aplicado".',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/linhas/ativar',
    descricao: 'Ativação de linha',
    nota:
      'Envia o comando de ativação da linha ao HLR (registro de localização da rede móvel), logo após ' +
      'a coleta dos dados da linha (ICCID do chip, tipo físico ou eSIM, DDD preferencial). É um fluxo ' +
      'linear, sem gateway: o status retornado aqui é só a confirmação de que o comando foi aceito no ' +
      'billing/HLR — a confirmação definitiva de que a linha "pegou" na rede de rádio vem depois, de ' +
      'forma assíncrona, via evento Kafka aguardado na etapa seguinte.',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/iot/provisionar',
    descricao: 'Provisionamento IoT',
    nota:
      'Provisiona os chips M2M dos dispositivos IoT (sensores, rastreadores, câmeras, medidores de ' +
      'consumo) na jornada de IoT corporativo, logo após o cliente informar quantidade, tipo de ' +
      'dispositivo e plano de dados. "quantidadeProvisionada" maior que zero leva a jornada a notificar ' +
      'a conclusão via evento Kafka pra sistemas downstream; zero (ou ausência do campo) leva ao ' +
      'registro manual de uma falha de provisionamento. O mock devolve 10 por padrão (caminho de ' +
      'sucesso).',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/credito/score',
    descricao: 'Consulta de crédito/elegibilidade',
    nota:
      'Simula a análise de crédito do CPF na jornada "Vivo Fibra + Total", logo após a etapa de ' +
      'identificação (CPF, nome, data de nascimento). "aprovado" decide o gateway "Cliente elegível?": ' +
      'true segue para a escolha de plano e a contratação completa; false leva à oferta alternativa ' +
      '(pré-pago ou revisão manual). "score" e "limiteSugerido" só ficam disponíveis como variáveis ' +
      'para as telas seguintes, sem efeito na decisão. O mock devolve aprovado=true por padrão (caminho ' +
      'de contratação aprovada) — troque para false para testar o ramo alternativo.',
    bodyExemplo: { cpf: '12345678900', nomeCompleto: 'Nome Exemplo', dataNascimento: '1990-01-01' },
  },
  {
    metodo: 'POST',
    path: '/v1/pedidos',
    descricao: 'Ativação do pedido',
    nota:
      'Envia o pedido para ativação nos sistemas da Vivo, no ramo aprovado da jornada "Vivo Fibra + ' +
      'Total", logo após o cliente escolher o plano, informar o endereço e a forma de pagamento. ' +
      '"numeroPedido" e "dataAtivacaoPrevista" são exibidos na tela final de confirmação; a jornada só ' +
      'segue depois de aguardar (via Kafka) a confirmação real de ativação. Fluxo linear, sem gateway ' +
      'aqui — o status devolvido não alimenta nenhuma decisão.',
    bodyExemplo: { cpf: '12345678900', plano: 'fibra_500_pos_total', velocidade: '500', cep: '01310-100', formaPagamento: 'cartao' },
  },
  {
    metodo: 'GET',
    path: '/v1/clientes/45537128000127/bilhetes-defeito',
    descricao: 'Consultar bilhete de defeito em atendimento',
    nota: 'CNPJ (só dígitos) faz parte da URL. Só "45537128000127" tem bilhete em aberto (dados fabricados a cada chamada); troque o CNPJ no path pra testar outro cliente — qualquer outro devolve 404.',
  },
  {
    metodo: 'GET',
    path: '/v1/clientes/45537128000127/pendencias-financeiras',
    descricao: 'Consultar pendência financeira',
    nota: 'CNPJ (só dígitos) faz parte da URL. Só "45537128000127" tem pendência (dados fabricados a cada chamada); troque o CNPJ no path pra testar outro cliente — qualquer outro devolve 404.',
  },
  {
    metodo: 'GET',
    path: '/v1/clientes/45537128000127/manutencoes-massivas',
    descricao: 'Consultar manutenção massiva na região',
    nota: 'CNPJ (só dígitos) faz parte da URL. Só "45537128000127" tem manutenção em andamento (dados fabricados a cada chamada); troque o CNPJ no path pra testar outro cliente — qualquer outro devolve 404.',
  },
  {
    metodo: 'GET',
    path: '/v1/clientes/45537128000127/bilhetes',
    descricao: 'Listar bilhetes de defeito do cliente',
    nota:
      'Lista os bilhetes de defeito em aberto do CNPJ, usada pela lista de seleção da jornada "Gestão de BDs" ' +
      '(produto VE). Cada bilhete traz "podeReagendar" e "podeCancelar" — a regra de negócio vem daqui, e a ' +
      'tela só libera a ação quando o bilhete permite — e "motivoBloqueio" quando alguma ação está bloqueada. ' +
      'Só "45537128000127" tem bilhetes (4, sempre os mesmos); qualquer outro CNPJ recebe a lista vazia.',
  },
  {
    metodo: 'GET',
    path: '/v1/bilhetes/BD-2026-480000/horarios-disponiveis',
    descricao: 'Horários disponíveis para reagendar',
    nota:
      'Horários livres da agenda técnica para reagendar a visita de um bilhete. É dado de referência: a tela ' +
      'de reagendamento busca esta lista ao abrir, pela fonte de dados "Agenda técnica", sem passar pelo ' +
      'fluxo. Cada item já vem no formato {label, value}. O número do bilhete no path é livre.',
  },
  {
    metodo: 'POST',
    path: '/v1/bilhetes/BD-2026-480000/reagendamento',
    descricao: 'Reagendar visita do bilhete',
    nota: 'Confirma o reagendamento da visita técnica do bilhete para o horário escolhido. Devolve 200 com "protocolo" e "status" REAGENDADO.',
    bodyExemplo: { horario: '2026-10-01-MANHA' },
  },
  {
    metodo: 'POST',
    path: '/v1/bilhetes/BD-2026-480000/cancelamento',
    descricao: 'Cancelar bilhete',
    nota: 'Cancela o bilhete de defeito. Devolve 200 com "protocolo" e "status" CANCELADO.',
    bodyExemplo: { motivo: 'Problema resolvido' },
  },
  {
    metodo: 'POST',
    path: '/v1/diagnosticos/solicitacoes',
    descricao: 'Solicitar avaliação de diagnóstico',
    nota:
      'Pede a avaliação de conectividade e saúde do sinal do cliente na jornada "Consulta BD" (produto VE), ' +
      'quando o CNPJ não tem bilhete de defeito aberto, pendência aguardando pagamento nem manutenção massiva ' +
      'programada. Só confirma o recebimento: devolve 200 com "protocolo", "status" RECEBIDA e ' +
      '"previsaoRetorno" para qualquer CNPJ. O resultado do diagnóstico chega depois, pelo Kafka, na etapa ' +
      'seguinte da jornada.',
    bodyExemplo: { cnpj: '45537128000127', tipoAvaliacao: 'CONECTIVIDADE_E_SINAL' },
  },
  {
    metodo: 'GET',
    path: '/v1/planos/ofertas',
    descricao: 'Catálogo de planos',
    nota:
      'Planos à venda, usados pelos templates de escolha de plano (lista vinda de API, contratação e upgrade). ' +
      'Cada plano traz "disponivel" — a ação de contratar só é liberada nos planos disponíveis (o Família 4 linhas ' +
      'vem esgotado de propósito).',
  },
  {
    metodo: 'GET',
    path: '/v1/clientes/12345678909/faturas',
    descricao: 'Faturas em aberto do cliente',
    nota:
      'CPF (só dígitos) faz parte da URL. Qualquer CPF tem três faturas — duas vencidas, que podem ser negociadas, ' +
      'e uma em aberto, só com 2ª via —, sempre as mesmas para o mesmo CPF. CPFs terminados em "00" estão em dia e ' +
      'recebem a lista vazia.',
  },
  {
    metodo: 'POST',
    path: '/v1/faturas/FAT-202609-1234/segunda-via',
    descricao: 'Gerar 2ª via da fatura',
    nota: 'Devolve linha digitável, Pix copia e cola e validade da 2ª via. O id da fatura no path é livre.',
    bodyExemplo: {},
  },
  {
    metodo: 'POST',
    path: '/v1/acordos',
    descricao: 'Negociar fatura vencida',
    nota: 'Parcela a fatura em "parcelas" (2 a 12; padrão 3). Devolve protocolo, valor da parcela e primeiro vencimento.',
    bodyExemplo: { faturaId: 'FAT-202609-1234', parcelas: 3 },
  },
  {
    metodo: 'POST',
    path: '/v1/clientes/cadastro',
    descricao: 'Cadastrar cliente (com falhas simuladas)',
    nota:
      'Usado pelo template de tratamento de falha. CPF sem 11 dígitos devolve 422 com "mensagem"; CPF começando ' +
      'com "000" devolve 503 na primeira tentativa e 201 na seguinte (sistema instável); os demais devolvem 201 ' +
      'com "idCliente". Como todo POST deste mock, respeita o header Idempotency-Key: a mesma chave devolve a ' +
      'resposta de sucesso já dada (o header Idempotent-Replayed indica a repetição); falhas não ficam guardadas.',
    bodyExemplo: { nome: 'Nome Exemplo', cpf: '00012345678', email: 'cliente@exemplo.com' },
  },
  {
    metodo: 'POST',
    path: '/v1/ouvidoria/reclamacoes',
    descricao: 'Registrar e triar reclamação',
    nota:
      'Faz a triagem da reclamação: reincidente ("reincidente": true) ou categoria "cobranca_indevida" vai para o ' +
      'nível OUVIDORIA; o resto fica no N1, com uma compensação sugerida de R$ 30.',
    bodyExemplo: { cpf: '12345678909', categoria: 'atendimento', reincidente: false },
  },
  {
    metodo: 'POST',
    path: '/v1/ouvidoria/compensacoes',
    descricao: 'Aplicar compensação ao cliente',
    nota: 'Credita a compensação aceita pelo cliente. Devolve protocolo, valor creditado e status CREDITADO.',
    bodyExemplo: { protocoloReclamacao: 'RC-123456', valor: 30 },
  },
  {
    metodo: 'POST',
    path: '/v1/portabilidade/solicitacoes',
    descricao: 'Solicitar portabilidade',
    nota:
      'Registra o pedido de portabilidade e devolve protocolo e a janela agendada. A confirmação da operadora de ' +
      'origem chega depois, pelo Kafka.',
    bodyExemplo: { numero: '11999998888', operadoraAtual: 'outra', cpf: '12345678909' },
  },
  {
    metodo: 'GET',
    path: '/v1/ordens-servico/OS-2026-0001',
    descricao: 'Consultar ordem de serviço de reparo',
    nota: 'Dados da ordem de serviço para o técnico em campo: cliente, endereço, defeito, equipamento e potência esperada. Qualquer número devolve uma OS.',
  },
  {
    metodo: 'POST',
    path: '/v1/ordens-servico/OS-2026-0001/encerramento',
    descricao: 'Encerrar ordem de serviço',
    nota: 'Encerra a OS com a solução aplicada pelo técnico. Devolve protocolo, status ENCERRADA e se a pesquisa de satisfação foi enviada.',
    bodyExemplo: { solucao: 'troca_conector', observacoes: 'Conector oxidado substituído.' },
  },
  {
    metodo: 'GET',
    path: '/v1/instalacoes/horarios-disponiveis',
    descricao: 'Horários livres para instalação',
    nota:
      'Dado de referência para uma fonte de dados de tela: cada item já vem no formato {label, value}, em ' +
      '"horarios". Cadastre uma fonte de dados apontando para esta URL com o parâmetro "cep".',
    queryExemplo: 'cep=01310100',
  },
  {
    metodo: 'POST',
    path: '/v1/instalacoes/agendamentos',
    descricao: 'Agendar instalação',
    nota: 'Confirma o horário escolhido para a instalação. Devolve protocolo, horário e status AGENDADO.',
    bodyExemplo: { cep: '01310100', horario: '2026-10-02-MANHA' },
  },
]

type Resultado =
  | { tipo: 'ok'; status: number; corpo: unknown }
  | { tipo: 'erro'; mensagem: string }

export default function App() {
  const [selecionado, setSelecionado] = useState<Endpoint>(ENDPOINTS[0])
  const [bodyTexto, setBodyTexto] = useState(() => textoInicial(ENDPOINTS[0]))
  const [queryTexto, setQueryTexto] = useState(ENDPOINTS[0].queryExemplo ?? '')
  const [carregando, setCarregando] = useState(false)
  const [resultado, setResultado] = useState<Resultado | null>(null)
  const [urlCopiada, setUrlCopiada] = useState(false)

  function selecionar(ep: Endpoint) {
    setSelecionado(ep)
    setBodyTexto(textoInicial(ep))
    setQueryTexto(ep.queryExemplo ?? '')
    setResultado(null)
  }

  function copiarUrl(url: string) {
    navigator.clipboard.writeText(url)
    setUrlCopiada(true)
    setTimeout(() => setUrlCopiada(false), 1500)
  }

  function urlAtual() {
    const query = queryTexto.trim()
    return API_BASE + selecionado.path + (selecionado.queryExemplo !== undefined && query !== '' ? `?${query}` : '')
  }

  async function executar() {
    setCarregando(true)
    setResultado(null)
    try {
      const init: RequestInit = { method: selecionado.metodo }
      if (selecionado.metodo === 'POST') {
        init.headers = { 'Content-Type': 'application/json' }
        init.body = bodyTexto.trim() === '' ? '{}' : bodyTexto
      }
      const res = await fetch(urlAtual(), init)
      const texto = await res.text()
      let corpo: unknown = texto
      try {
        corpo = JSON.parse(texto)
      } catch {
        // resposta não-JSON, mantém como texto
      }
      setResultado({ tipo: 'ok', status: res.status, corpo })
    } catch (e) {
      setResultado({ tipo: 'erro', mensagem: e instanceof Error ? e.message : String(e) })
    } finally {
      setCarregando(false)
    }
  }

  return (
    <div className="layout">
      <aside className="lista">
        <h1>Mock Integrações</h1>
        <p className="subtitulo">ms-mock-api-rest · {API_BASE}</p>
        <ul>
          {ENDPOINTS.map((ep) => (
            <li key={ep.path}>
              <button
                className={ep.path === selecionado.path ? 'item ativo' : 'item'}
                onClick={() => selecionar(ep)}
              >
                <span className={`metodo ${ep.metodo}`}>{ep.metodo}</span>
                <span className="path">{ep.path}</span>
                <span className="descricao">{ep.descricao}</span>
              </button>
            </li>
          ))}
        </ul>
      </aside>

      <main className="painel">
        <h2>
          <span className={`metodo ${selecionado.metodo}`}>{selecionado.metodo}</span>
          {selecionado.path}
        </h2>
        <p className="subtitulo">{selecionado.descricao}</p>

        <div className="url-box">
          <code>{urlAtual()}</code>
          <button className="link" onClick={() => copiarUrl(urlAtual())}>
            {urlCopiada ? 'copiado!' : 'copiar'}
          </button>
        </div>

        <p className="nota">{selecionado.nota}</p>

        {selecionado.metodo === 'POST' && (
          <>
            <label htmlFor="body">Corpo da requisição (JSON)</label>
            <textarea
              id="body"
              value={bodyTexto}
              onChange={(e) => setBodyTexto(e.target.value)}
              spellCheck={false}
              rows={8}
            />
          </>
        )}

        {selecionado.queryExemplo !== undefined && (
          <>
            <label htmlFor="query">Query string</label>
            <textarea
              id="query"
              value={queryTexto}
              onChange={(e) => setQueryTexto(e.target.value)}
              spellCheck={false}
              rows={1}
            />
          </>
        )}

        <button className="executar" onClick={executar} disabled={carregando}>
          {carregando ? 'Executando…' : 'Executar'}
        </button>

        {resultado && (
          <div className="resultado">
            {resultado.tipo === 'ok' ? (
              <>
                <div className={resultado.status < 400 ? 'status ok' : 'status erro'}>
                  HTTP {resultado.status}
                </div>
                <pre>{JSON.stringify(resultado.corpo, null, 2)}</pre>
              </>
            ) : (
              <div className="status erro">Falha ao chamar a API: {resultado.mensagem}</div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

function textoInicial(ep: Endpoint): string {
  return ep.bodyExemplo ? JSON.stringify(ep.bodyExemplo, null, 2) : ''
}
