// Conteúdo estático gerado a partir de requisitos/admin/progresso.md e ej-admin-requisitos.md.
// Painel temporário — não reflete progresso ao vivo do projeto, é um retrato da versão 1.0.0.

export type ReqStatus = 'done' | 'partial' | 'todo' | 'na';

export interface Requirement {
  code: string;
  description: string;
  status: ReqStatus;
  notes?: string;
}

export interface Feature {
  code: string;
  name: string;
  requirements: Requirement[];
}

export interface Epic {
  code: string;
  name: string;
  features: Feature[];
}

function d(code: string, description: string): Requirement {
  return { code, description, status: 'done' };
}
function na(code: string, description: string): Requirement {
  return { code, description, status: 'na' };
}
function todo(code: string, description: string): Requirement {
  return { code, description, status: 'todo' };
}
// Requisito cujo comportamento é atendido apenas por um mock/simulação na versão 1.0.0: não conta como
// entregue, mas o código de suporte existe — a nota deixa essa distinção explícita.
function mock(code: string, description: string): Requirement {
  return { code, description, status: 'todo', notes: 'Implementado, porém mockado — não é uma integração real.' };
}
// Requisito com uma parte concreta pendente (equivalente a `in_progress` em progresso.md) — a
// nota deve dizer exatamente o que falta.
function partial(code: string, description: string, notes: string): Requirement {
  return { code, description, status: 'partial', notes };
}

export const EPICS: Epic[] = [
  {
    code: 'FT-01',
    name: 'Gestão de Produtos e Canais',
    features: [
      {
        code: 'US-01.01',
        name: 'Gestão de produtos',
        requirements: [
          d('REQ-01.01.001', 'O sistema deve permitir cadastrar produtos.'),
          d('REQ-01.01.002', 'O sistema deve permitir editar produtos.'),
          d('REQ-01.01.003', 'O sistema deve permitir consultar produtos.'),
          d('REQ-01.01.004', 'O sistema deve permitir desativar produtos.'),
          d('REQ-01.01.005', 'Cada produto deve possuir identificador único (productId), nome, descrição opcional e status.'),
        ],
      },
      {
        code: 'US-01.02',
        name: 'Gestão de canais',
        requirements: [
          d('REQ-01.02.001', 'O sistema deve permitir cadastrar canais dentro de um produto.'),
          d('REQ-01.02.002', 'O sistema deve permitir editar canais.'),
          d('REQ-01.02.003', 'O sistema deve permitir consultar canais.'),
          d('REQ-01.02.004', 'O sistema deve permitir desativar canais.'),
          d('REQ-01.02.005', 'Todo canal deve pertencer a exatamente um produto.'),
          d('REQ-01.02.006', 'Cada canal deve possuir identificador único (channelId), nome, descrição opcional, tipo e status.'),
          d('REQ-01.02.007', 'O sistema deve suportar os tipos de canal WEB, MOBILE, WHATSAPP, URA, CONTACT_CENTER e OTHER.'),
        ],
      },
      {
        code: 'US-01.03',
        name: 'Catálogo e descoberta',
        requirements: [
          d('REQ-01.03.001', 'O sistema deve permitir pesquisar produtos por nome.'),
          d('REQ-01.03.002', 'O sistema deve permitir filtrar produtos por status.'),
          d('REQ-01.03.003', 'O sistema deve permitir listar os canais de um produto.'),
          d('REQ-01.03.004', 'O sistema deve permitir pesquisar canais por nome.'),
          d('REQ-01.03.005', 'O sistema deve permitir filtrar canais por produto, tipo e status.'),
          d('REQ-01.03.006', 'O sistema deve exibir a quantidade de canais associados a cada produto.'),
          d('REQ-01.03.007', 'O sistema deve exibir a quantidade de jornadas associadas a cada canal.'),
        ],
      },
      {
        code: 'US-01.04',
        name: 'Integridade e ciclo de vida',
        requirements: [
          d('REQ-01.04.001', 'A desativação de um produto não deve remover seus canais, jornadas ou publicações existentes.'),
          d('REQ-01.04.002', 'A desativação de um canal não deve remover suas jornadas ou publicações existentes.'),
          d('REQ-01.04.003', 'O sistema deve impedir a criação e a publicação de jornadas quando o produto ou o canal estiver inativo.'),
          d('REQ-01.04.004', 'O sistema deve impedir a desativação de um produto enquanto qualquer jornada de seus canais possuir publicação ativa.'),
          d('REQ-01.04.005', 'O sistema deve impedir a desativação de um canal enquanto qualquer uma de suas jornadas possuir publicação ativa.'),
        ],
      },
    ],
  },
  {
    code: 'FT-02',
    name: 'Gestão de Jornadas',
    features: [
      {
        code: 'US-02.01',
        name: 'Cadastro de jornadas',
        requirements: [
          d('REQ-02.01.001', 'O sistema deve permitir criar jornadas.'),
          d('REQ-02.01.002', 'O sistema deve permitir editar jornadas.'),
          d('REQ-02.01.003', 'O sistema deve permitir consultar jornadas.'),
          d('REQ-02.01.004', 'O sistema deve permitir remover fisicamente somente jornadas que nunca tenham sido publicadas.'),
          d(
            'REQ-02.01.005',
            'Uma jornada que possua ou tenha possuído publicação não deve poder ser removida fisicamente; ao ser excluída, o sistema deve desativá-la automaticamente (em vez de bloquear a operação), preservando o registro de publicação.',
          ),
          d(
            'REQ-02.01.006',
            'O sistema deve impedir a exclusão de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes.',
          ),
          d(
            'REQ-02.01.008',
            'Ao excluir uma jornada que já foi publicada (REQ-02.01.005), o sistema deve marcar todas as suas versões (journey_version) como INACTIVE, junto com a desativação da jornada.',
          ),
          d(
            'REQ-02.01.009',
            'Uma jornada INACTIVE não deve poder ser editada (nem seus dados nem seu fluxo) nem excluída novamente; as ações "Editar" e "Excluir" devem ficar desabilitadas para essas jornadas.',
          ),
        ],
      },
      {
        code: 'US-02.02',
        name: 'Identificação e metadados',
        requirements: [
          d('REQ-02.02.001', 'O sistema deve permitir definir nome para a jornada.'),
          d('REQ-02.02.002', 'O sistema deve permitir definir descrição para a jornada.'),
          d('REQ-02.02.003', 'Cada jornada deve possuir identificador único (journeyId).'),
          d('REQ-02.02.004', 'O identificador da jornada é gerado pelo sistema e não é editável pelo usuário.'),
          d('REQ-02.02.005', 'Toda jornada deve estar associada a exatamente um canal.'),
          d('REQ-02.02.006', 'O sistema deve identificar o produto da jornada a partir do canal associado.'),
        ],
      },
      {
        code: 'US-02.03',
        name: 'Pesquisa',
        requirements: [
          d('REQ-02.03.001', 'O sistema deve permitir pesquisar jornadas por nome.'),
          d('REQ-02.03.002', 'O sistema deve permitir filtrar jornadas por produto.'),
          d('REQ-02.03.003', 'O sistema deve permitir filtrar jornadas por canal.'),
          d('REQ-02.03.004', 'O sistema deve permitir ordenar jornadas por data de criação.'),
          d('REQ-02.03.005', 'O sistema deve permitir ordenar jornadas por data de alteração.'),
          partial(
            'REQ-02.03.006',
            'O sistema deve permitir agrupar a listagem de jornadas por produto, por produto e canal, por canal, ou sem agrupamento algum.',
            'Agrupamento por produto implementado (cabeçalho de grupo com contagem); falta o seletor de modo (produto+canal, só canal, sem agrupar).',
          ),
          todo(
            'REQ-02.03.007',
            'O sistema deve permitir ordenar a listagem de jornadas, em ordem crescente ou decrescente, pelos campos jornada (nome), canal, status ou data de atualização.',
          ),
        ],
      },
      {
        code: 'US-02.05',
        name: 'Jornadas específicas por canal',
        requirements: [
          d('REQ-02.05.001', 'O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.'),
          d('REQ-02.05.002', 'Cada jornada deve possuir definição independente de fluxo e formulários.'),
          d('REQ-02.05.003', 'Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais.'),
          d('REQ-02.05.004', 'O sistema deve exibir o produto e o canal durante toda a edição da jornada.'),
        ],
      },
      {
        code: 'US-02.06',
        name: 'Publicação de jornadas',
        requirements: [
          d('REQ-02.06.001', 'O sistema deve permitir publicar jornadas.'),
          d('REQ-02.06.002', 'O sistema deve permitir despublicar jornadas por meio da API do runtime.'),
          d('REQ-02.06.003', 'O sistema deve permitir consultar jornadas publicadas.'),
          d(
            'REQ-02.06.004',
            'Cada jornada deve possuir no máximo uma publicação ativa, associada a uma versão imutável. Alterações após a publicação não modificam o snapshot publicado; é preciso publicar uma nova versão.',
          ),
        ],
      },
      {
        code: 'US-02.07',
        name: 'Estado da publicação',
        requirements: [
          d('REQ-02.07.001', 'O sistema deve indicar se uma jornada está publicada.'),
          d('REQ-02.07.002', 'O sistema deve indicar a data da publicação.'),
          d('REQ-02.07.003', 'O sistema deve indicar o produto associado à publicação.'),
          d('REQ-02.07.004', 'O sistema deve indicar o canal associado à publicação.'),
        ],
      },
      {
        code: 'US-02.08',
        name: 'Catálogo de publicações',
        requirements: [
          d('REQ-02.08.001', 'O sistema deve permitir listar jornadas publicadas.'),
          d('REQ-02.08.002', 'O sistema deve permitir pesquisar jornadas publicadas.'),
          d('REQ-02.08.003', 'O sistema deve permitir filtrar jornadas publicadas por produto.'),
          d('REQ-02.08.004', 'O sistema deve permitir filtrar jornadas publicadas por canal.'),
        ],
      },
      {
        code: 'US-02.09',
        name: 'Publicação no runtime',
        requirements: [
          d('REQ-02.09.001', 'O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime.'),
          d('REQ-02.09.002', 'A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários.'),
          d(
            'REQ-02.09.003',
            'O Admin Portal deve realizar uma chamada de saída real (HTTP) para a API de publicação do runtime. Após sucesso, substitui o snapshot anterior e altera o estado da jornada para PUBLISHED; em falha, o erro propaga e nenhum estado é alterado.',
          ),
          d(
            'REQ-02.09.004',
            'Ao despublicar, o Admin Portal deve chamar a API de publicação do runtime para remover/desfazer a publicação. Após sucesso, jornada e publicação assumem UNPUBLISHED; em falha, os estados atuais são preservados.',
          ),
        ],
      },
      {
        code: 'US-02.10',
        name: 'Inspeção da publicação',
        requirements: [
          d(
            'REQ-02.10.001',
            'Para uma jornada com publicação ativa (PUBLISHED), o sistema deve permitir visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários, incluindo a árvore SDUI de cada formulário), por meio de uma ação na listagem de jornadas ao lado de "Editar" e "Excluir".',
          ),
        ],
      },
    ],
  },
  {
    code: 'FT-03',
    name: 'Modelagem Visual',
    features: [
      {
        code: 'US-03.01',
        name: 'Flow designer',
        requirements: [
          d('REQ-03.01.001', 'O sistema deve suportar eventos de início.'),
          d('REQ-03.01.002', 'O sistema deve suportar eventos de término.'),
          d('REQ-03.01.003', 'O sistema deve suportar User Tasks.'),
          d('REQ-03.01.004', 'Cada fluxo deve possuir exatamente um elemento inicial (START ou MESSAGE_START_EVENT) e ao menos um nó END.'),
          d(
            'REQ-03.01.005',
            'Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o nó START, cabendo ao usuário adicionar o nó END e os demais elementos antes de salvar.',
          ),
        ],
      },
      {
        code: 'US-03.02',
        name: 'Conexões',
        requirements: [
          d('REQ-03.02.001', 'O sistema deve permitir criar conexões entre elementos.'),
          d('REQ-03.02.002', 'O sistema deve permitir remover conexões.'),
          d('REQ-03.02.003', 'O sistema deve permitir editar conexões.'),
          d(
            'REQ-03.02.004',
            'O nó START não deve possuir entrada e deve possuir exatamente uma saída; cada USER_TASK deve possuir ao menos uma entrada e exatamente uma saída; o nó END deve possuir ao menos uma entrada e nenhuma saída.',
          ),
          d('REQ-03.02.005', 'Todos os nós devem pertencer a um caminho contínuo e alcançável entre o elemento inicial e algum END.'),
          d(
            'REQ-03.02.006',
            'O editor deve impedir ações incompatíveis, e o backend deve rejeitar com 422 qualquer tentativa de persistir um fluxo que viole as restrições estruturais.',
          ),
          d(
            'REQ-03.02.007',
            'Uma USER_TASK deve possuir no máximo um caminho de saída; o editor não deve permitir a criação de uma segunda conexão partindo de uma USER_TASK que já possua saída.',
          ),
        ],
      },
      {
        code: 'US-03.03',
        name: 'Navegação',
        requirements: [
          d('REQ-03.03.001', 'O usuário deve visualizar o fluxo completo da jornada.'),
          d('REQ-03.03.002', 'O usuário deve navegar livremente pelo fluxo.'),
          d('REQ-03.03.003', 'O sistema deve destacar o elemento selecionado.'),
        ],
      },
      {
        code: 'US-03.04',
        name: 'Experiência de edição',
        requirements: [
          d('REQ-03.04.001', 'O sistema deve suportar drag-and-drop de elementos.'),
          d('REQ-03.04.002', 'O usuário deve poder reposicionar elementos livremente.'),
          d('REQ-03.04.003', 'O usuário deve poder remover elementos do fluxo.'),
          d('REQ-03.04.004', 'O usuário deve poder copiar elementos.'),
          d('REQ-03.04.005', 'O usuário deve poder duplicar elementos.'),
        ],
      },
      {
        code: 'US-03.05',
        name: 'Canvas',
        requirements: [
          d('REQ-03.05.001', 'O sistema deve permitir zoom in.'),
          d('REQ-03.05.002', 'O sistema deve permitir zoom out.'),
          d('REQ-03.05.003', 'O sistema deve permitir mover-se livremente pelo canvas.'),
          d('REQ-03.05.004', 'O sistema deve permitir centralizar o fluxo na área visível.'),
        ],
      },
      {
        code: 'US-03.06',
        name: 'Produtividade',
        requirements: [
          d('REQ-03.06.001', 'O sistema deve permitir desfazer ações.'),
          d('REQ-03.06.002', 'O sistema deve permitir refazer ações.'),
        ],
      },
      {
        code: 'US-03.07',
        name: 'Elementos de integração',
        requirements: [
          d('REQ-03.07.001', 'O sistema deve suportar nós de integração SERVICE_TASK, RECEIVE_TASK e MESSAGE_START_EVENT.'),
          d('REQ-03.07.002', 'Uma SERVICE_TASK deve representar a execução de uma integração externa durante a jornada.'),
          d('REQ-03.07.003', 'Uma RECEIVE_TASK deve representar a espera por uma mensagem externa em uma instância de jornada já iniciada.'),
          d('REQ-03.07.004', 'Uma MESSAGE_START_EVENT deve permitir iniciar uma nova instância de jornada a partir de uma mensagem externa.'),
          d('REQ-03.07.005', 'O fluxo deve possuir exatamente um elemento inicial, que pode ser START ou MESSAGE_START_EVENT.'),
          d(
            'REQ-03.07.006',
            'O sistema deve permitir editar, mover, remover, copiar e duplicar elementos de integração, respeitando as regras de unicidade do elemento inicial.',
          ),
        ],
      },
      {
        code: 'US-03.08',
        name: 'Framework de conectores',
        requirements: [
          d('REQ-03.08.001', 'O sistema deve representar a integração por meio de um framework conceitual de conectores.'),
          d('REQ-03.08.002', 'O framework deve permitir associar um conector a uma SERVICE_TASK, RECEIVE_TASK ou MESSAGE_START_EVENT.'),
          d('REQ-03.08.003', 'O catálogo deve possuir os conectores REST e KAFKA habilitados para uso na versão 1.0.0.'),
          d('REQ-03.08.004', 'O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos.'),
          d('REQ-03.08.005', 'O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível.'),
        ],
      },
      {
        code: 'US-03.09',
        name: 'Configuração REST e Kafka',
        requirements: [
          d('REQ-03.09.001', 'O sistema deve permitir configurar REST em SERVICE_TASK e RECEIVE_TASK.'),
          {
            code: 'REQ-03.09.002',
            description: 'A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body e mapeamento de saída.',
            status: 'done',
            notes: 'Mapeamento de entrada foi retirado da UI (painel e assistente, US-03.14) — nunca influenciou a execução real.',
          },
          d('REQ-03.09.003', 'O sistema deve permitir configurar KAFKA em SERVICE_TASK, RECEIVE_TASK e MESSAGE_START_EVENT.'),
          {
            code: 'REQ-03.09.004',
            description: 'A configuração Kafka deve suportar tópico, operação, headers, payload e mapeamento de saída.',
            status: 'done',
            notes: 'Mapeamento de entrada retirado da UI pelo mesmo motivo do REQ-03.09.002.',
          },
          d(
            'REQ-03.09.005',
            'Configurações de integração devem suportar referência de credencial sem armazenar secrets diretamente no fluxo ou no snapshot.',
          ),
          d(
            'REQ-03.09.006',
            'O snapshot publicado deve incluir o tipo do elemento, o conector, a configuração declarativa e os mapeamentos necessários para execução pelo runtime.',
          ),
          d('REQ-03.09.007', 'REST não é um conector válido para MESSAGE_START_EVENT; deve suportar apenas KAFKA.'),
          d(
            'REQ-03.09.008',
            'A operação Kafka é determinada pelo tipo de nó: SERVICE_TASK = PRODUCE; RECEIVE_TASK/MESSAGE_START_EVENT = CONSUME.',
          ),
          d(
            'REQ-03.09.009',
            'Headers devem ser editados como lista de pares nome/valor, não como texto declarativo livre; params/body (REST) seguem o mesmo padrão por padrão, com modo avançado de JSON livre como alternativa; payload (Kafka) permanece declarativo; mapeamento de saída tem formato estruturado.',
          ),
          d(
            'REQ-03.09.010',
            'O mapeamento de saída de uma integração (REST ou Kafka) deve ser declarado como uma lista de regras nome da variável ← expressão JSONPath, em vez de configuração JSON livre.',
          ),
          d(
            'REQ-03.09.011',
            'O nome de cada variável de saída deve ser único no escopo da jornada e seguir a mesma regra de nome técnico dos campos de formulário (REQ-04.01.007).',
          ),
          d(
            'REQ-03.09.012',
            'O sistema deve permitir referenciar, nos campos de entrada de URL, headers e body/payload de uma integração, variáveis de passos anteriores usando a sintaxe {{nomeDaVariavel}}.',
          ),
          {
            code: 'REQ-03.09.013',
            description:
              'O editor deve exibir, para cada SERVICE_TASK/RECEIVE_TASK, a lista de variáveis disponíveis naquele ponto do fluxo, calculada a partir dos nós alcançáveis entre o elemento inicial e o nó selecionado.',
            status: 'done',
            notes: 'Mecanismo estendido por US-03.13: agora agrupado por origem, num painel dedicado em vez de chips.',
          },
          d(
            'REQ-03.09.014',
            'O backend deve rejeitar (422), ao salvar o fluxo, a configuração de conector que referencie {{variavel}} inexistente no contexto do nó.',
          ),
        ],
      },
      {
        code: 'US-03.10',
        name: 'Teste de conectores',
        requirements: [
          d(
            'REQ-03.10.001',
            'O sistema deve permitir, durante a edição de um SERVICE_TASK/RECEIVE_TASK com conector REST, disparar uma chamada de teste com os valores atualmente configurados e exibir a resposta bruta.',
          ),
          d('REQ-03.10.002', 'A chamada de teste deve ser executada pelo backend, nunca diretamente do navegador.'),
          d(
            'REQ-03.10.003',
            'O backend deve recusar chamadas de teste para URLs que resolvam a endereços privados, de loopback ou reservados (proteção contra SSRF).',
          ),
          d(
            'REQ-03.10.004',
            'A chamada de teste deve ter timeout curto e limite de tamanho de resposta, e não deve ser registrada como transação de negócio.',
          ),
          d(
            'REQ-03.10.005',
            'Campos {{variavel}} presentes na configuração testada devem ser substituídos por um valor de exemplo informado manualmente pelo usuário no momento do teste.',
          ),
          {
            code: 'REQ-03.10.006',
            description:
              'A chamada de teste deve seguir corretamente redirecionamentos HTTP (301, 302, 303, 307 e 308), preservando o método original quando o status exigir.',
            status: 'done',
            notes: 'SimpleClientHttpRequestFactory (HttpURLConnection) não seguia 307/308 — limitação da JDK; trocado por JdkClientHttpRequestFactory.',
          },
          {
            code: 'REQ-03.10.007',
            description:
              'Uma falha HTTP na chamada de teste deve ser resumida ao usuário como status e motivo, incluindo o corpo só quando curto e não parecer HTML.',
            status: 'done',
            notes: 'Antes despejava a exceção inteira do Spring, incluindo o corpo completo de páginas de erro HTML.',
          },
        ],
      },
      {
        code: 'US-03.11',
        name: 'Bifurcação condicional (Gateway)',
        requirements: [
          d(
            'REQ-03.11.001',
            'O sistema deve suportar um nó de gateway de decisão (exclusivo) no fluxo, com exatamente duas saídas na versão 1.0.0: caminho A e caminho B.',
          ),
          d(
            'REQ-03.11.002',
            'Uma das duas saídas do gateway deve ser marcada como saída padrão (sem condição própria), usada quando a condição da outra saída não for satisfeita.',
          ),
          d(
            'REQ-03.11.003',
            'A saída não padrão do gateway deve possuir uma condição composta por variável, operador de comparação (igual, diferente, maior que, menor que) e um valor de referência informado pelo usuário, editados como combos/campo tipado.',
          ),
          d(
            'REQ-03.11.004',
            'A condição deve poder referenciar tanto uma variável de saída de um Service Task/Receive Task quanto um campo de resposta de um User Task, desde que alcançável a partir do gateway.',
          ),
          d(
            'REQ-03.11.005',
            'O editor deve exibir, ao configurar a condição da saída do gateway, a lista de variáveis disponíveis naquele ponto do fluxo.',
          ),
          d(
            'REQ-03.11.006',
            'O gateway deve possuir ao menos uma entrada e exatamente duas saídas na versão 1.0.0; o backend deve rejeitar (422) um gateway sem exatamente uma saída padrão, ou cuja saída não padrão esteja sem condição.',
          ),
          d(
            'REQ-03.11.007',
            'Na publicação, o gateway deve ser traduzido para um exclusiveGateway BPMN nativo, com cada sequenceFlow de saída carregando a expressão de condição correspondente (ou marcado como fluxo padrão), avaliado pelo próprio motor do runtime.',
          ),
          d(
            'REQ-03.11.008',
            'Cada variável de saída deve possuir um tipo declarado (texto, número, booleano, data ou data e hora), inferido automaticamente ao gerar o mapeamento a partir de uma resposta real ou escolhido manualmente. O editor da condição do gateway deve oferecer só os operadores compatíveis com o tipo e um campo de valor no formato correspondente.',
          ),
        ],
      },
      {
        code: 'US-03.12',
        name: 'Variáveis de entrada da jornada',
        requirements: [
          d(
            'REQ-03.12.001',
            'O sistema deve permitir declarar, no nó START de um fluxo, uma lista de variáveis de entrada da jornada (nome e tipo) que a aplicação cliente (canal digital/BFF) deve fornecer ao iniciar uma instância.',
          ),
          d(
            'REQ-03.12.002',
            'O nome de cada variável de entrada deve ser único no escopo da jornada, compartilhando o mesmo espaço de nomes das variáveis de saída.',
          ),
          d(
            'REQ-03.12.003',
            'As variáveis de entrada declaradas no nó START tornam-se disponíveis para referência {{nome}} em qualquer conector ou condição de gateway do fluxo.',
          ),
          d(
            'REQ-03.12.004',
            'O endpoint de início de instância deve aceitar um mapa de valores no corpo da requisição e recusar a chamada, com mensagem indicando os nomes faltantes, se alguma variável declarada não vier preenchida.',
          ),
          d('REQ-03.12.005', 'Valores extras informados pelo chamador que não correspondam a nenhuma variável declarada são aceitos e repassados sem erro.'),
        ],
      },
      {
        code: 'US-03.13',
        name: 'Assistência de variáveis na configuração de conector',
        requirements: [
          d(
            'REQ-03.13.001',
            'O painel de propriedades de um conector deve exibir uma seção "Variáveis" com as variáveis disponíveis naquele ponto do fluxo, agrupadas por origem.',
          ),
          d(
            'REQ-03.13.002',
            'Os campos de URL, cada valor de header, e cada campo de valor de Body/Params devem oferecer um seletor que insere a referência {{nome}} na posição do cursor do campo.',
          ),
          d(
            'REQ-03.13.003',
            'Body e Params (REST) devem ser editados, por padrão, como uma lista de campos nome→valor, com um "modo avançado" de JSON livre disponível para corpos que não sejam um objeto plano.',
          ),
        ],
      },
      {
        code: 'US-03.14',
        name: 'Assistente de configuração de conector',
        requirements: [
          d(
            'REQ-03.14.001',
            'O sistema deve oferecer um assistente (wizard) em etapas como forma adicional — não substituta — de configurar um conector REST ou Kafka.',
          ),
          d(
            'REQ-03.14.002',
            'Para REST, o assistente deve ter 4 etapas: Conexão, Headers, Parâmetros & Corpo, e Testar e Mapear. Para Kafka, 3 etapas: Conexão, Payload, e Mapear saída.',
          ),
          d('REQ-03.14.003', 'A navegação entre as etapas do assistente deve ser livre.'),
          d(
            'REQ-03.14.004',
            'As alterações feitas no assistente devem ficar num rascunho local, aplicado à configuração real somente ao concluir; fechar de qualquer outra forma deve confirmar a perda de alterações pendentes.',
          ),
          d(
            'REQ-03.14.005',
            'A etapa "Testar e Mapear" deve executar a chamada de teste diretamente na tela do assistente, gerar o mapeamento de saída automaticamente em caso de sucesso, e permitir mapeamento manual independentemente do resultado do teste.',
          ),
        ],
      },
    ],
  },
  {
    code: 'FT-04',
    name: 'Formulários (SDUI)',
    features: [
      {
        code: 'US-04.01',
        name: 'Form builder',
        requirements: [
          d('REQ-04.01.001', 'O sistema deve permitir criar formulários.'),
          d('REQ-04.01.002', 'O sistema deve permitir editar formulários.'),
          d('REQ-04.01.003', 'O sistema deve permitir remover formulários.'),
          d('REQ-04.01.004', 'O sistema deve permitir associar formulários a User Tasks.'),
          d('REQ-04.01.005', 'O sistema deve permitir manter uma User Task sem formulário associado.'),
          d(
            'REQ-04.01.006',
            'Ao associar formulário a uma User Task, o editor deve permitir criar um novo formulário sem sair do editor de fluxo e atualizar a lista de formulários disponíveis.',
          ),
          d(
            'REQ-04.01.007',
            'Cada campo de formulário deve possuir um name técnico, único no formulário e imutável após criado, substituindo o identificador interno atual como chave de referência do campo.',
          ),
        ],
      },
      {
        code: 'US-04.02',
        name: 'Componentes',
        requirements: [
          d('REQ-04.02.001', 'O sistema deve suportar componente de texto (absorve o antigo tipo de conteúdo estático).'),
          d('REQ-04.02.002', 'O sistema deve suportar campo de entrada.'),
          d('REQ-04.02.003', 'O sistema deve suportar seleção simples.'),
          d('REQ-04.02.004', 'O sistema deve suportar seleção múltipla.'),
          d('REQ-04.02.005', 'O sistema deve suportar upload de arquivo.'),
          d('REQ-04.02.007', 'O campo INPUT deve suportar subtipos: texto, número, e-mail e data.'),
          d(
            'REQ-04.02.008',
            'O sistema deve permitir validação de formato por subtipo de INPUT (min/max para número; regex/máscara para texto).',
          ),
          d(
            'REQ-04.02.009',
            'As opções de seleção simples/múltipla devem ser pares rótulo/valor, não apenas rótulo.',
          ),
          d('REQ-04.02.010', 'O upload de arquivo deve permitir configurar extensões aceitas e tamanho máximo.'),
        ],
      },
      {
        code: 'US-04.03',
        name: 'Reutilização',
        requirements: [
          d('REQ-04.03.001', 'O sistema deve permitir reutilizar formulários em múltiplas jornadas.'),
          d('REQ-04.03.002', 'O sistema deve permitir reutilizar formulários em múltiplas User Tasks.'),
        ],
      },
      {
        code: 'US-04.04',
        name: 'Configuração',
        requirements: [
          d('REQ-04.04.001', 'O usuário deve poder definir campos obrigatórios.'),
          d('REQ-04.04.002', 'O usuário deve poder definir valores padrão.'),
          d('REQ-04.04.003', 'O usuário deve poder definir textos de ajuda.'),
        ],
      },
      {
        code: 'US-04.05',
        name: 'Preview',
        requirements: [
          d('REQ-04.05.001', 'O sistema deve permitir visualizar o formulário durante a edição.'),
          d('REQ-04.05.002', 'O preview deve refletir alterações em tempo real.'),
        ],
      },
      {
        code: 'US-04.06',
        name: 'Imutabilidade e serialização para publicação',
        requirements: [
          d(
            'REQ-04.06.001',
            'Ao publicar uma jornada, o conteúdo de cada formulário referenciado pelas User Tasks deve ser copiado integralmente para o snapshot da publicação, tornando-se imutável a alterações futuras no formulário original.',
          ),
          d(
            'REQ-04.06.002',
            'O snapshot de publicação deve conter, para cada formulário, uma representação em árvore [tag, props, children] (SDUI), derivada do conteúdo congelado do formulário.',
          ),
        ],
      },
    ],
  },
  {
    code: 'FT-05',
    name: 'Execução',
    features: [
      {
        code: 'US-05.01',
        name: 'Execução',
        requirements: [
          d('REQ-05.01.001', 'O sistema deve permitir executar jornadas.'),
          d('REQ-05.01.002', 'O sistema deve permitir informar dados de entrada para os formulários durante a execução.'),
          d('REQ-05.01.003', 'O sistema deve permitir reiniciar a execução.'),
          {
            code: 'REQ-05.01.004',
            description:
              'Antes de registrar um passo da execução, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução.',
            status: 'done',
            notes:
              'Satisfeito por arquitetura, não por checagem dedicada: o front nunca envia um nó/id arbitrário — o passo atual é sempre resolvido no servidor a partir do processo real do motor de runtime.',
          },
        ],
      },
      {
        code: 'US-05.02',
        name: 'Resultado',
        requirements: [
          d('REQ-05.02.001', 'O sistema deve apresentar o caminho percorrido.'),
          d('REQ-05.02.002', 'O sistema deve apresentar as User Tasks executadas.'),
          d('REQ-05.02.003', 'O sistema deve apresentar os formulários exibidos.'),
          d('REQ-05.02.004', 'O sistema deve apresentar o resultado final da execução.'),
        ],
      },
      {
        code: 'US-05.03',
        name: 'Visualização da execução',
        requirements: [
          d('REQ-05.03.001', 'O sistema deve destacar o caminho percorrido durante a execução.'),
          d('REQ-05.03.002', 'O sistema deve destacar as User Tasks e os formulários executados.'),
          {
            code: 'REQ-05.03.003',
            description:
              'O sistema não deve reposicionar ou reiniciar o zoom do diagrama do fluxo ao alternar entre as abas do painel de observabilidade.',
            status: 'done',
            notes:
              'O visualizador do fluxo fica sempre montado (visibilidade alternada via CSS), preservando o zoom/posição entre trocas de aba — antes, desmontar/remontar a cada troca destruía esse estado.',
          },
        ],
      },
      {
        code: 'US-05.04',
        name: 'Arquitetura de execução',
        requirements: [
          {
            code: 'REQ-05.04.001',
            description:
              'O sistema deve executar a jornada publicada contra o motor de runtime real, não um motor simplificado interno ao Admin Portal.',
            status: 'done',
            notes: 'Exige jornada publicada — o objetivo original da feature ("sem publicá-la") foi ajustado.',
          },
          d(
            'REQ-05.04.002',
            'Na versão 1.0.0, as integrações REST externas referenciadas pelas jornadas devem ser emuladas por um serviço de mock dedicado, já que não há sistemas de terceiros reais disponíveis.',
          ),
          d(
            'REQ-05.04.003',
            'As integrações Kafka referenciadas pelas jornadas devem executar contra um broker Kafka real, com publicação e consumo de mensagens efetivos.',
          ),
        ],
      },
      {
        code: 'US-05.05',
        name: 'Etapas de integração',
        requirements: [
          d(
            'REQ-05.05.001',
            'O sistema deve permitir avançar manualmente uma etapa de integração (Service Task ou Receive Task) que dependeria de um evento assíncrono externo, pulando sua conclusão.',
          ),
          d(
            'REQ-05.05.002',
            'O sistema deve indicar claramente quando a execução está aguardando uma etapa de integração, distinguindo-a de uma User Task aguardando preenchimento.',
          ),
        ],
      },
      {
        code: 'US-05.06',
        name: 'Observabilidade da execução',
        requirements: [
          {
            code: 'REQ-05.06.001',
            description: 'O sistema deve apresentar as variáveis do processo em execução, com seus valores atuais.',
            status: 'done',
            notes:
              'Variáveis de escopo do processo e de etapa aparecem na mesma tabela — nossos fluxos nunca têm mais de uma execução viva ao mesmo tempo, então essa distinção não existe na prática.',
          },
          d(
            'REQ-05.06.002',
            'O sistema deve permitir alterar manualmente o valor de uma variável do processo em execução, para forçar caminhos alternativos de decisão durante o teste.',
          ),
          d(
            'REQ-05.06.003',
            'O sistema deve apresentar o resultado das integrações já executadas (dados retornados/mapeados por Service/Receive Tasks).',
          ),
          d('REQ-05.06.004', 'O sistema deve apresentar um log cronológico dos passos executados durante a execução.'),
          d(
            'REQ-05.06.005',
            'O log cronológico deve apresentar os dados efetivamente submetidos em cada User Task respondida, não apenas a indicação de que foi respondida.',
          ),
        ],
      },
      {
        code: 'US-05.07',
        name: 'Seleção e apresentação',
        requirements: [
          {
            code: 'REQ-05.07.001',
            description:
              'O sistema deve permitir localizar uma jornada publicada por busca, listando as jornadas disponíveis e filtrando a lista conforme o texto digitado.',
            status: 'done',
            notes:
              'Comportamento revisado a pedido do usuário: a versão anterior deste requisito ("sem exigir listar todas de uma vez") foi trocada por listar tudo por padrão e filtrar ao digitar.',
          },
          d('REQ-05.07.002', 'A execução deve ocorrer na mesma tela de seleção da jornada, sem navegação entre telas.'),
          {
            code: 'REQ-05.07.003',
            description:
              'A pré-visualização da execução deve se adaptar ao canal da jornada (Web ou App), incluindo uma representação visual compatível com o canal (ex.: layout de dispositivo móvel para jornadas de canal App).',
            status: 'done',
            notes: 'Mística não tem componente de moldura de dispositivo pronto; construído à mão.',
          },
        ],
      },
      {
        code: 'US-05.08',
        name: 'Tratamento de falhas de integração',
        requirements: [
          {
            code: 'REQ-05.08.001',
            description:
              'O sistema deve detectar quando uma etapa de integração (Service Task ou Receive Task) falha durante a execução (ex.: conector REST inacessível) e identificar qual nó do fluxo causou a falha, mesmo quando o motor não expõe isso diretamente (a transação dá rollback antes de qualquer histórico ser gravado).',
            status: 'done',
            notes:
              'A engine dá rollback na transação inteira quando um conector falha, então o nó que realmente falhou nunca aparece no histórico — o backend segue as conexões do fluxo a partir do passo atual até o próximo nó com conector pra identificá-lo corretamente.',
          },
          d(
            'REQ-05.08.002',
            'O sistema deve destacar visualmente, no diagrama do fluxo, o nó que causou a falha, de forma distinta dos demais estados (concluído, atual, pendente).',
          ),
          d('REQ-05.08.003', 'O sistema deve registrar a falha no log cronológico da execução.'),
          d(
            'REQ-05.08.004',
            'O sistema deve permitir consultar a mensagem de erro completa da falha sob demanda, sem exibi-la de forma intrusiva na tela principal de execução.',
          ),
        ],
      },
      {
        code: 'US-05.09',
        name: 'Mensageria Kafka real',
        requirements: [
          d(
            'REQ-05.09.001',
            'Cada execução deve possuir um identificador de correlação (business key) próprio, gerado automaticamente ao iniciar a instância.',
          ),
          d(
            'REQ-05.09.002',
            'Uma Service Task com conector Kafka deve publicar a mensagem de verdade num broker Kafka real, automaticamente, sem exigir ação manual.',
          ),
          d(
            'REQ-05.09.003',
            'O sistema deve indicar visualmente que uma Service Task Kafka está aguardando a publicação automática, sem oferecer um botão de ação como principal.',
          ),
          d(
            'REQ-05.09.004',
            'O sistema deve detectar e processar automaticamente uma mensagem Kafka publicada no tópico de uma Receive Task ou de um início por mensagem (Message Start Event) em execução, avançando a instância correspondente sem exigir ação do usuário — inclusive quando a mensagem é publicada por um produtor externo ao Admin Portal, não só pelo painel de teste.',
          ),
          d(
            'REQ-05.09.005',
            'O sistema deve permitir publicar uma mensagem de teste real, com tópico (somente leitura) e payload editável em JSON, diretamente na tela de execução, para uma Receive Task que dependa de mensagem Kafka.',
          ),
          d(
            'REQ-05.09.006',
            'O payload da mensagem de teste de uma Receive Task deve vir pré-preenchido com o identificador de correlação (business key) da instância em execução.',
          ),
          d(
            'REQ-05.09.007',
            'Uma jornada cujo início é por mensagem (Message Start Event) deve oferecer, na tela de busca de jornada, o painel de envio de mensagem de teste para iniciar uma instância nova, sem pré-preencher a business key.',
          ),
          d(
            'REQ-05.09.008',
            'Depois de enviar a mensagem de teste que inicia uma jornada por mensagem, o sistema deve aguardar automaticamente até a instância nova aparecer e prosseguir para a tela de execução, sem ação adicional do usuário.',
          ),
          {
            code: 'REQ-05.09.009',
            description:
              'O sistema deve permitir, como alternativa manual secundária à publicação ou ao consumo Kafka real, pular qualquer etapa Kafka em espera (Service Task, Receive Task ou início por mensagem), fabricando o resultado a partir do mapeamento de saída configurado.',
            status: 'done',
            notes:
              'Reexpõe, como link discreto ("Pular etapa"/"Iniciar sem mensagem"), o mecanismo de fabricar resultado que existia desde antes do broker Kafka real — nunca foi removido do backend, só deixou de ter botão na tela para nós Kafka.',
          },
        ],
      },
    ],
  },
  {
    code: 'FT-06',
    name: 'Versionamento de Jornadas',
    features: [
      {
        code: 'US-06.01',
        name: 'Modelo de versões',
        requirements: [
          d('REQ-06.01.001', 'O sistema deve permitir que uma jornada possua múltiplas versões.'),
          d('REQ-06.01.002', 'Cada versão deve possuir identificador único (versionId).'),
          d('REQ-06.01.003', 'Cada versão deve possuir número sequencial iniciado em 1 dentro da jornada.'),
          d('REQ-06.01.004', 'Cada versão deve estar associada a exatamente uma jornada.'),
          d('REQ-06.01.005', 'Cada versão deve possuir status DRAFT, PUBLISHED, UNPUBLISHED ou INACTIVE.'),
          d('REQ-06.01.006', 'Uma jornada deve possuir no máximo uma versão PUBLISHED.'),
          d('REQ-06.01.007', 'Cada versão deve registrar criação e publicação, quando aplicável.'),
          d('REQ-06.01.008', 'Cada versão deve permitir observação opcional.'),
        ],
      },
      {
        code: 'US-06.02',
        name: 'Criação e edição de versões',
        requirements: [
          d('REQ-06.02.001', 'Ao criar uma jornada, o sistema deve criar sua primeira versão em DRAFT.'),
          d('REQ-06.02.002', 'O sistema deve permitir criar uma nova versão a partir da versão atual.'),
          d('REQ-06.02.003', 'O sistema deve criar a nova versão a partir da versão atualmente selecionada para edição.'),
          d('REQ-06.02.004', 'A nova versão deve possuir cópia independente do fluxo, conexões e referências aos formulários.'),
          d('REQ-06.02.005', 'Alterações em uma versão DRAFT não devem modificar outras versões.'),
          d('REQ-06.02.006', 'Uma versão PUBLISHED deve ser imutável.'),
          d('REQ-06.02.007', 'O sistema deve indicar claramente qual versão está sendo editada.'),
          d('REQ-06.02.008', 'O sistema deve impedir números de versão duplicados dentro da mesma jornada.'),
          d(
            'REQ-06.02.009',
            'Ao salvar o fluxo de uma jornada, o sistema deve manter a versão DRAFT atual sincronizada com o conteúdo salvo: se já existir uma DRAFT, seu conteúdo é substituído; caso não exista, uma nova DRAFT é criada. Outras versões nunca são alteradas.',
          ),
          d(
            'REQ-06.02.010',
            'Antes de salvar a edição de uma jornada PUBLISHED, o sistema deve avisar o usuário de que a alteração será registrada em uma versão em rascunho separada da publicada.',
          ),
        ],
      },
      {
        code: 'US-06.03',
        name: 'Histórico e consulta',
        requirements: [
          d('REQ-06.03.001', 'O sistema deve permitir listar todas as versões de uma jornada.'),
          d('REQ-06.03.002', 'O sistema deve permitir consultar o conteúdo completo de uma versão.'),
          d('REQ-06.03.003', 'O histórico deve exibir número, status, datas e autor da versão.'),
          d('REQ-06.03.004', 'O sistema deve permitir ordenar versões por número ou data.'),
          d('REQ-06.03.005', 'O sistema deve diferenciar versões em edição, publicadas, arquivadas e despublicadas.'),
        ],
      },
      {
        code: 'US-06.04',
        name: 'Publicação de versões',
        requirements: [
          d('REQ-06.04.001', 'O sistema deve permitir publicar uma versão DRAFT.'),
          d('REQ-06.04.002', 'Antes da publicação, o sistema deve validar a versão completa da jornada.'),
          d('REQ-06.04.003', 'A publicação deve enviar ao runtime o snapshot completo da versão selecionada.'),
          d('REQ-06.04.004', 'Ao publicar uma nova versão, a versão anteriormente publicada deve ser marcada como UNPUBLISHED.'),
          d('REQ-06.04.005', 'O sistema deve preservar o snapshot da versão anteriormente publicada.'),
          d('REQ-06.04.006', 'A publicação deve registrar qual versão foi enviada ao runtime.'),
          d('REQ-06.04.007', 'A jornada deve indicar sua versão atualmente publicada.'),
          d('REQ-06.04.008', 'Alterações em DRAFT não devem modificar o snapshot publicado.'),
          d(
            'REQ-06.04.009',
            'Ao despublicar uma jornada, a versão PUBLISHED correspondente deve ser marcada como UNPUBLISHED, preservando seu snapshot; a jornada deixa de indicar uma versão atualmente publicada.',
          ),
          d(
            'REQ-06.04.010',
            'O sistema deve permitir despublicar a versão atualmente PUBLISHED de uma jornada diretamente pela versão; a despublicação de uma versão deve refletir no status da jornada, que passa a UNPUBLISHED.',
          ),
          d(
            'REQ-06.04.011',
            'O sistema deve permitir republicar qualquer versão UNPUBLISHED de uma jornada (não apenas a mais recente), sem alterar seu conteúdo/snapshot, retornando-a a PUBLISHED e refletindo no status da jornada, que volta a PUBLISHED. Se já existir uma versão PUBLISHED na jornada no momento da republicação, essa versão deve ser marcada como UNPUBLISHED antes. Versões INACTIVE (jornada excluída) permanecem fora de alcance.',
          ),
          d(
            'REQ-06.04.012',
            'Antes de republicar uma versão, se já existir uma versão PUBLISHED na jornada, o sistema deve informar ao usuário que a versão publicada atual será substituída e solicitar confirmação antes de prosseguir.',
          ),
        ],
      },
      {
        code: 'US-06.05',
        name: 'Compatibilidade e limites da versão 1.0.0',
        requirements: [
          d('REQ-06.05.001', 'O sistema deve preservar versões de jornadas desativadas.'),
          d('REQ-06.05.002', 'Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual.'),
          d('REQ-06.05.003', 'O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação.'),
          d('REQ-06.05.004', 'O sistema não deve permitir restauração ou rollback de versão na versão 1.0.0.'),
          d('REQ-06.05.005', 'O sistema deve registrar a versão associada a cada publicação.'),
        ],
      },
    ],
  },
  {
    code: 'FT-07',
    name: 'Autenticação e Autorização',
    features: [
      {
        code: 'US-07.01',
        name: 'Autenticação mockada por provedor externo',
        requirements: [
          d('REQ-07.01.001', 'O sistema deve representar a autenticação por meio de um provedor externo.'),
          mock('REQ-07.01.002', 'Na versão 1.0.0, a integração com o provedor externo deve ser mockada.'),
          d('REQ-07.01.003', 'O sistema deve disponibilizar uma tela de login padrão.'),
          d('REQ-07.01.004', 'A tela de login deve permitir informar usuário e senha.'),
          mock('REQ-07.01.005', 'A versão 1.0.0 deve disponibilizar o usuário mockado admin, com senha admin e perfil ADMIN.'),
          d('REQ-07.01.006', 'O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas.'),
          d(
            'REQ-07.01.007',
            'O sistema deve indicar que a autenticação utilizada na versão 1.0.0 é mockada e não representa integração real com um provedor.',
          ),
        ],
      },
      {
        code: 'US-07.02',
        name: 'Sessão e proteção de acesso',
        requirements: [
          d('REQ-07.02.001', 'O sistema deve criar uma sessão autenticada após login bem-sucedido.'),
          d('REQ-07.02.002', 'O sistema deve permitir encerrar a sessão.'),
          d('REQ-07.02.003', 'O sistema deve expirar sessões após período configurável de inatividade.'),
          d('REQ-07.02.004', 'O sistema deve rejeitar requisições com sessão expirada ou inválida.'),
          d('REQ-07.02.005', 'As rotas administrativas devem ser protegidas contra acesso anônimo.'),
          d('REQ-07.02.006', 'O sistema deve preservar a identificação do usuário autenticado nas operações realizadas.'),
        ],
      },
      {
        code: 'US-07.03',
        name: 'Papéis e permissões',
        requirements: [
          d('REQ-07.03.001', 'O sistema deve suportar os papéis ADMIN, EDITOR e VIEWER.'),
          d('REQ-07.03.002', 'O sistema deve permitir associar um papel a cada usuário.'),
          d('REQ-07.03.003', 'O sistema deve impedir operações não autorizadas pelo papel do usuário.'),
          d('REQ-07.03.004', 'VIEWER deve permitir consulta sem permitir alterações.'),
          d('REQ-07.03.005', 'EDITOR deve permitir criar e editar jornadas e versões.'),
          d('REQ-07.03.006', 'EDITOR deve permitir publicar versões.'),
          d('REQ-07.03.007', 'ADMIN deve possuir acesso administrativo aos recursos do portal.'),
          d('REQ-07.03.008', 'A autorização deve ser validada no backend, independentemente da interface.'),
        ],
      },
      {
        code: 'US-07.04',
        name: 'Administração de usuários mockados',
        requirements: [
          mock('REQ-07.04.001', 'O sistema deve representar na versão 1.0.0 o usuário admin como usuário administrativo mockado.'),
          na('REQ-07.04.002', 'O sistema deve impedir a remoção do último usuário com papel ADMIN.'),
          d('REQ-07.04.003', 'O sistema deve permitir consultar o usuário autenticado e seu papel.'),
          d('REQ-07.04.004', 'O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora da versão 1.0.0.'),
        ],
      },
    ],
  },
  {
    code: 'FT-08',
    name: 'Auditoria',
    features: [
      {
        code: 'US-08.01',
        name: 'Registro de eventos',
        requirements: [
          d('REQ-08.01.001', 'O sistema deve registrar eventos relevantes de autenticação, autorização e negócio.'),
          d('REQ-08.01.002', 'Cada evento deve possuir identificador único (auditEventId).'),
          d('REQ-08.01.003', 'Cada evento deve registrar data e hora, ação, resultado e recurso afetado.'),
          d('REQ-08.01.004', 'Cada evento deve registrar o usuário responsável ou indicar que foi anônimo.'),
          d('REQ-08.01.005', 'Cada evento deve registrar identificador de correlação da requisição, quando disponível.'),
          d('REQ-08.01.006', 'O sistema deve registrar eventos de sucesso, falha e acesso negado.'),
        ],
      },
      {
        code: 'US-08.02',
        name: 'Eventos auditáveis',
        requirements: [
          d('REQ-08.02.001', 'O sistema deve auditar login bem-sucedido e malsucedido.'),
          d('REQ-08.02.002', 'O sistema deve auditar logout, expiração e bloqueio de sessão.'),
          d('REQ-08.02.003', 'O sistema deve auditar criação, alteração e desativação de produtos, canais e jornadas.'),
          d('REQ-08.02.004', 'O sistema deve auditar criação e alteração de versões.'),
          d('REQ-08.02.005', 'O sistema deve auditar publicação, republicação e despublicação de jornadas.'),
          d('REQ-08.02.006', 'O sistema deve auditar tentativas de acesso negadas por falta de permissão.'),
          na('REQ-08.02.007', 'O sistema deve auditar alterações de papéis e configurações de acesso mockadas.'),
        ],
      },
      {
        code: 'US-08.03',
        name: 'Proteção dos registros',
        requirements: [
          d('REQ-08.03.001', 'Os registros de auditoria não devem ser editáveis por usuários comuns.'),
          d('REQ-08.03.002', 'Os registros de auditoria não devem ser removidos por operações normais do sistema.'),
          d('REQ-08.03.003', 'O sistema não deve armazenar senhas, tokens, segredos ou credenciais sensíveis nos registros.'),
          d('REQ-08.03.004', 'O sistema deve evitar o armazenamento de dados sensíveis nos valores anterior e posterior.'),
          d('REQ-08.03.005', 'Falhas de auditoria não podem ser ignoradas silenciosamente.'),
        ],
      },
      {
        code: 'US-08.04',
        name: 'Consulta de auditoria',
        requirements: [
          d('REQ-08.04.001', 'Usuários autorizados devem poder consultar eventos de auditoria.'),
          d('REQ-08.04.002', 'O sistema deve permitir filtrar eventos por usuário, ação, recurso, resultado e período.'),
          d('REQ-08.04.003', 'O sistema deve permitir pesquisar eventos por recurso ou correlação.'),
          d('REQ-08.04.004', 'O sistema deve apresentar os eventos em ordem cronológica e com paginação.'),
        ],
      },
    ],
  },
  {
    code: 'FT-09',
    name: 'Ajuda e Suporte',
    features: [
      {
        code: 'US-09.01',
        name: 'Central de ajuda',
        requirements: [
          d('REQ-09.01.001', 'O sistema deve disponibilizar uma tela de ajuda acessível a partir do menu do Admin Portal.'),
          d('REQ-09.01.002', 'A tela de ajuda deve apresentar um conjunto de perguntas frequentes (FAQ) organizadas por tema.'),
          d('REQ-09.01.003', 'O sistema deve permitir pesquisar textualmente o conteúdo do FAQ.'),
          d('REQ-09.01.004', 'O conteúdo do FAQ deve ser mantido como conteúdo estático versionado com o sistema.'),
          d(
            'REQ-09.01.005',
            'A tela de ajuda deve exibir o contato do time de sustentação (sustentacao@telefonica.com) como link mailto, abrindo o cliente de e-mail padrão do usuário.',
          ),
        ],
      },
    ],
  },
  {
    code: 'FT-10',
    name: 'Observabilidade',
    features: [
      {
        code: 'US-10.01',
        name: 'Log de requisições de API',
        requirements: [
          d('REQ-10.01.001', 'O sistema deve registrar em log a entrada de toda requisição HTTP recebida pela API, incluindo método e caminho.'),
          d('REQ-10.01.002', 'O sistema deve registrar em log a saída de toda requisição HTTP, incluindo status de resposta e duração do processamento.'),
          d(
            'REQ-10.01.003',
            'O log de requisição e resposta não deve registrar o corpo (body) da requisição por padrão, para evitar exposição de dados sensíveis.',
          ),
        ],
      },
      {
        code: 'US-10.02',
        name: 'Log de transações de persistência',
        requirements: [
          d(
            'REQ-10.02.001',
            'O sistema deve registrar em log o início de toda transação da camada de aplicação que represente uma operação de persistência em banco de dados.',
          ),
          d('REQ-10.02.002', 'O sistema deve registrar em log a conclusão de uma transação bem-sucedida, incluindo sua duração.'),
          d(
            'REQ-10.02.003',
            'O sistema deve registrar em log a falha de uma transação, incluindo a causa do erro, sem interromper a propagação da exceção original.',
          ),
        ],
      },
      {
        code: 'US-10.03',
        name: 'Correlação de logs',
        requirements: [
          d('REQ-10.03.001', 'Toda requisição de API deve ser associada a um identificador de correlação.'),
          d(
            'REQ-10.03.002',
            'O identificador de correlação deve ser reaproveitado do cabeçalho X-Correlation-Id da requisição quando presente, ou gerado pelo sistema quando ausente.',
          ),
          d(
            'REQ-10.03.003',
            'O identificador de correlação deve estar presente em todas as linhas de log emitidas durante o processamento da requisição, incluindo as de transação de persistência.',
          ),
          d('REQ-10.03.004', 'O identificador de correlação deve ser retornado ao cliente no cabeçalho de resposta.'),
        ],
      },
      {
        code: 'US-10.04',
        name: 'Preparação para integração com ELK',
        requirements: [
          partial(
            'REQ-10.04.001',
            'O sistema deve estar tecnicamente preparado para o envio dos logs de aplicação a uma stack ELK (Elasticsearch/Logstash/Kibana), permanecendo essa integração desativada na versão 1.0.0 por não haver ambiente ELK disponível.',
            'Pendente apenas a configuração/conexão com um ambiente ELK real, ainda não disponível — o restante (log centralizado, ponto de extensão para appender Logstash) já está pronto.',
          ),
          d('REQ-10.04.002', 'O sistema deve documentar o procedimento (how-to) para habilitar a integração com o ELK quando um ambiente estiver disponível.'),
        ],
      },
    ],
  },
  {
    code: 'FT-11',
    name: 'Testes',
    features: [
      {
        code: 'US-11.01',
        name: 'Testes unitários de domínio (back)',
        requirements: [
          todo(
            'REQ-11.01.001',
            'O sistema deve possuir testes unitários para as regras estruturais do fluxo (FlowValidator): cardinalidade de START/END, caminho contínuo entre início e fim, elemento inicial único.',
          ),
          todo(
            'REQ-11.01.002',
            'O sistema deve possuir testes unitários para as regras de versionamento de jornada: criação de DRAFT, publicação, despublicação, republicação, imutabilidade de versão PUBLISHED.',
          ),
          todo(
            'REQ-11.01.003',
            'O sistema deve possuir testes unitários para as regras de formulário: nome de campo único, tipos/subtipos de campo, geração da árvore SDUI.',
          ),
          todo(
            'REQ-11.01.004',
            'O sistema deve possuir testes unitários para as regras de integridade entre produto/canal/jornada (bloqueio de desativação com publicação ativa).',
          ),
        ],
      },
      {
        code: 'US-11.02',
        name: 'Testes de integração de API (back)',
        requirements: [
          todo('REQ-11.02.001', 'O sistema deve possuir testes de integração cobrindo o CRUD completo de produtos, canais e jornadas via API.'),
          todo(
            'REQ-11.02.002',
            'O sistema deve possuir testes de integração cobrindo o ciclo de publicação/despublicação/republicação de versões, incluindo o registro de auditoria de sucesso e falha.',
          ),
          todo(
            'REQ-11.02.003',
            'O sistema deve possuir testes de integração cobrindo autenticação e autorização por papel (ADMIN/EDITOR/VIEWER) nos principais endpoints.',
          ),
          todo('REQ-11.02.004', 'O sistema deve possuir testes de integração cobrindo o CRUD de formulários e a associação a User Tasks.'),
        ],
      },
      {
        code: 'US-11.03',
        name: 'Testes de frontend',
        requirements: [
          todo(
            'REQ-11.03.001',
            'O sistema deve possuir testes automatizados para o form builder (adicionar/remover campo, validação de nome técnico único, subtipos de INPUT).',
          ),
          todo('REQ-11.03.002', 'O sistema deve possuir testes automatizados para a validação estrutural do editor de fluxo (bloqueio de ações inválidas).'),
        ],
      },
      {
        code: 'US-11.04',
        name: 'Cenários end-to-end',
        requirements: [
          todo(
            'REQ-11.04.001',
            'O sistema deve possuir um cenário end-to-end cobrindo o fluxo completo: criar produto → canal → jornada → formulário → fluxo → publicar → despublicar.',
          ),
          todo(
            'REQ-11.04.002',
            'O sistema deve possuir um cenário end-to-end cobrindo criação, publicação e republicação de múltiplas versões de uma mesma jornada.',
          ),
        ],
      },
    ],
  },
  {
    code: 'FT-12',
    name: 'Infraestrutura',
    features: [
      {
        code: 'US-12.01',
        name: 'Identidade da solução',
        requirements: [
          partial(
            'REQ-12.01.001',
            'Definição da sigla sistêmica e disponibilização de ambiente na Azure.',
            'Sigla ELJY já criada; falta a disponibilização do ambiente na Azure.',
          ),
        ],
      },
      {
        code: 'US-12.02',
        name: 'Containerização (Docker)',
        requirements: [
          todo('REQ-12.02.001', 'Criar Dockerfile para o admin-back.'),
          todo('REQ-12.02.002', 'Criar Dockerfile para o admin-front (build estático servido por um servidor web).'),
          todo('REQ-12.02.003', 'Criar docker-compose para ambiente de desenvolvimento local (back + front + banco de dados).'),
        ],
      },
      {
        code: 'US-12.03',
        name: 'Orquestração (Kubernetes)',
        requirements: [
          todo('REQ-12.03.001', 'Criar manifests/Helm chart para deploy do admin-back no cluster.'),
          todo('REQ-12.03.002', 'Criar manifests/Helm chart para deploy do admin-front no cluster.'),
          todo('REQ-12.03.003', 'Configurar ConfigMap/Secret para variáveis de ambiente e credenciais por ambiente.'),
          todo('REQ-12.03.004', 'Definir requests/limits de recursos e health checks (liveness/readiness) para os workloads.'),
          todo('REQ-12.03.005', 'Configurar ingress/roteamento externo para os serviços expostos.'),
        ],
      },
      {
        code: 'US-12.04',
        name: 'Esteira CI/CD',
        requirements: [
          todo('REQ-12.04.001', 'Pipeline de build e testes automatizados a cada push/PR (integrado ao FT-11 Testes).'),
          todo('REQ-12.04.002', 'Pipeline de build e publicação de imagem Docker em um registry.'),
          todo(
            'REQ-12.04.003',
            'Pipeline de deploy automatizado por ambiente (dev/qa/prod), com aprovação manual obrigatória para produção.',
          ),
          todo('REQ-12.04.004', 'Versionamento semântico e tagueamento de releases.'),
        ],
      },
      {
        code: 'US-12.05',
        name: 'Ambientes e configuração',
        requirements: [
          todo('REQ-12.05.001', 'Formalizar a configuração dos perfis dev/qa/prod, com variáveis de ambiente próprias por ambiente.'),
          todo('REQ-12.05.002', 'Documentar o procedimento de subida de cada ambiente (how-to).'),
        ],
      },
      {
        code: 'US-12.06',
        name: 'Banco de dados',
        requirements: [todo('REQ-12.06.001', 'Indicar a necessidade de criação da base de dados por ambiente.')],
      },
    ],
  },
  {
    code: 'FT-13',
    name: 'Dashboard',
    features: [
      {
        code: 'US-13.01',
        name: 'Indicadores em tempo real',
        requirements: [
          d('REQ-13.01.001', 'O sistema deve apresentar a quantidade de instâncias ativas no motor de runtime.'),
          d('REQ-13.01.002', 'O sistema deve apresentar a quantidade de tarefas pendentes no motor de runtime.'),
          d('REQ-13.01.003', 'O sistema deve apresentar a quantidade de incidentes abertos no motor de runtime.'),
          d('REQ-13.01.004', 'O sistema deve apresentar a quantidade de jornadas distintas implantadas no motor de runtime.'),
          d('REQ-13.01.005', 'O sistema deve apresentar a quantidade de instâncias concluídas no dia corrente.'),
        ],
      },
      {
        code: 'US-13.02',
        name: 'Tendência de execução',
        requirements: [
          d('REQ-13.02.001', 'O sistema deve apresentar um gráfico de instâncias iniciadas versus concluídas ao longo do tempo.'),
          {
            code: 'REQ-13.02.002',
            description:
              'O gráfico deve permitir alternar a granularidade entre últimas 24 horas (por hora), últimos 7 dias (por dia) e últimos 30 dias (por dia), com últimas 24 horas como visão padrão.',
            status: 'done',
            notes: 'Verificado ao vivo via curl (endpoint) e checagem de tipos; sem verificação visual em navegador nesta sessão.',
          },
        ],
      },
      {
        code: 'US-13.03',
        name: 'Processos por volume',
        requirements: [
          d('REQ-13.03.001', 'O sistema deve apresentar um gráfico com a quantidade de instâncias por jornada, somando todas as versões implantadas.'),
          d('REQ-13.03.002', 'O gráfico deve indicar quando uma jornada possui incidentes associados.'),
        ],
      },
      {
        code: 'US-13.04',
        name: 'Incidentes ativos',
        requirements: [
          d('REQ-13.04.001', 'O sistema deve listar os incidentes ativos, com jornada, tipo e mensagem.'),
          d('REQ-13.04.002', 'O sistema deve indicar visualmente quando não há incidentes ativos.'),
        ],
      },
      {
        code: 'US-13.05',
        name: 'Instâncias pendentes e encerramento manual',
        requirements: [
          d('REQ-13.05.001', 'O sistema deve listar as instâncias ativas há mais tempo, como candidatas a abandonadas.'),
          d('REQ-13.05.002', 'O sistema deve permitir encerrar manualmente uma instância.'),
          d('REQ-13.05.003', 'O sistema deve permitir selecionar e encerrar múltiplas instâncias de uma vez.'),
          d('REQ-13.05.004', 'O sistema deve exigir confirmação do usuário antes de encerrar uma ou mais instâncias.'),
          d('REQ-13.05.005', 'O encerramento manual de instâncias deve ser restrito aos papéis EDITOR e ADMIN.'),
        ],
      },
      {
        code: 'US-13.06',
        name: 'Execução recente',
        requirements: [
          d('REQ-13.06.001', 'O sistema deve listar as instâncias iniciadas mais recentemente, com jornada, identificador e tempo em execução.'),
        ],
      },
      {
        code: 'US-13.07',
        name: 'Atualização dos dados',
        requirements: [
          d('REQ-13.07.001', 'O sistema deve permitir atualizar manualmente os dados do dashboard.'),
          d('REQ-13.07.002', 'O sistema deve permitir ligar e desligar a atualização automática periódica.'),
          d('REQ-13.07.003', 'O sistema deve indicar o horário da última atualização.'),
        ],
      },
      {
        code: 'US-13.08',
        name: 'Acesso',
        requirements: [
          d('REQ-13.08.001', 'O dashboard deve ser a primeira tela apresentada ao acessar o portal.'),
          d('REQ-13.08.002', 'O sistema deve disponibilizar um item de menu dedicado ao dashboard.'),
        ],
      },
      {
        code: 'US-13.09',
        name: 'Auditoria de ações administrativas',
        requirements: [
          d('REQ-13.09.001', 'O encerramento manual de uma instância deve ser registrado na auditoria do portal.'),
          d('REQ-13.09.002', 'O início de uma execução deve ser registrado na auditoria do portal.'),
        ],
      },
    ],
  },
];

export interface OutOfScopeGroup {
  title: string;
  items: string[];
}

export const OUT_OF_SCOPE: OutOfScopeGroup[] = [
  {
    title: 'Evolução de Plataforma',
    items: [
      'Workflow de aprovação',
      'Publicação agendada',
      'Rollback',
      'Promotion entre ambientes',
      'Analytics',
      'IA assistida',
      'Gestão de tenants',
      'Governança corporativa',
    ],
  },
  {
    title: 'Modelagem Visual',
    items: [
      'Criação rápida de elementos',
      'Seleção múltipla',
      'Duplicação em massa',
      'Criação automática de próximos passos',
      'Gateway com mais de duas saídas (múltiplas condições em cascata/"senão se")',
      'Gateway inclusivo (múltiplos caminhos simultâneos)',
      'Gateway paralelo (fork/join)',
      'Combinação de condições com operadores lógicos (E/OU) numa mesma saída',
      'Edição visual de expressões compostas (grupos de condições aninhados)',
    ],
  },
  {
    title: 'Jornadas e Versionamento',
    items: [
      'Clonagem de jornadas entre canais',
      'Templates de jornadas',
      'Biblioteca de componentes de formulário',
      'Comparação (diff) visual entre versões de uma jornada',
    ],
  },
  {
    title: 'Formulários Avançados (SDUI)',
    items: [
      'Seções',
      'Exibição condicional',
      'Organização dinâmica de campos',
      'Formulários multi-etapas (wizard)',
      'Fontes de dados dinâmicas - $dataSource e estratégia de prefetch no servidor ou no cliente',
      'Paginação de opções carregadas dinamicamente',
    ],
  },
];

export type ChangelogSource = 'git' | 'progresso';

export interface ChangelogEntry {
  date: string;
  summary: string;
  source: ChangelogSource;
  epics?: string[];
}

// Copiado verbatim da seção "## Changelog deste arquivo" de requisitos/admin/progresso.md.
// Ordem: mais recente primeiro (mesma ordem da tabela fonte). Ao ressincronizar, apenas
// acrescente no topo as linhas novas dessa tabela — não edite as existentes.
const CHANGELOG_PROGRESSO: ChangelogEntry[] = [
  {
    date: '2026-08-18 01:04',
    source: 'progresso',
    summary:
      'Duas user stories novas em FT-03: US-03.13 Assistência de variáveis na configuração de conector (REQ-03.13.001 a 003) e US-03.14 Assistente de configuração de conector (REQ-03.14.001 a 005), mais 2 REQs novos em US-03.10 (REQ-03.10.006/007) e ajuste em REQ-03.09.002/004/009/013 — formalizando o que foi construído nesta sessão. US-03.13: painel "Variáveis" agrupado por origem (VariableOriginsPanel/availableVariableOriginsAt, rótulo genérico via NODE_META+tipo de conector, sem switch por combinação); botão de inserir variável (VariablePickerButton, ícone Braces, cor accent) reaproveitado em URL/Headers/Body/Params, insere {{nome}} no cursor (insertTokenAtCursor); Body/Params (REST) passam a editor estruturado nome→valor por padrão (StructuredJsonEditor), com "Modo avançado" (JSON livre) pra corpos aninhados. US-03.14: ConnectorWizard.tsx novo — assistente adicional (não substitui o painel inline), 4 etapas pra REST (Conexão, Headers, Parâmetros & Corpo, Testar e Mapear) e 3 pra Kafka (Conexão, Payload, Mapear saída), navegação livre entre etapas, edição em rascunho local só aplicada ao "Concluir" (fechar de outra forma — X/Cancelar/fora/Esc — confirma descarte via ConfirmDialog se houver alteração pendente), e teste inline na última etapa (sem reaproveitar o modal "Testar API" do painel) com mapeamento automático em sucesso e manual sempre disponível. De quebra, 2 bugs achados testando: SimpleClientHttpRequestFactory não seguia redirecionamentos 307/308 (limitação da JDK) — trocado por JdkClientHttpRequestFactory/java.net.http.HttpClient (REQ-03.10.006); e uma falha HTTP no teste despejava a exceção inteira do Spring, incluindo o corpo completo de uma página de erro HTML — resumido pra "status + motivo" (REQ-03.10.007). Também corrigido: seleção de texto (drag) iniciada dentro de um modal e solta fora fechava o modal indevidamente (useBackdropClose, PropertyGrid.tsx, aplicado ao Modal compartilhado e ao backdrop próprio do wizard) — bug de UX, sem REQ dedicado. Mapeamento de entrada (inputMapping) retirado da UI (painel e assistente) — nunca influenciou a execução real, só documentava que {{nome}} podia ser usado nos campos de texto; REQ-03.09.002/004/009 ajustados pra refletir. FT-03 vai de 69/69 para 79/79 (100%, 10 REQs novos). Progresso geral de 317/353 (90%) para 327/363 (90%).',
  },
  {
    date: '2026-08-17 22:15',
    source: 'progresso',
    summary:
      'Nova user story US-03.12 Variáveis de entrada da jornada (REQ-03.12.001 a 005, todos done): o nó START passa a poder declarar uma lista {name, type} de variáveis que a aplicação cliente (canal digital/BFF) precisa fornecer ao iniciar uma instância — motivado por um caso real desta sessão (conector REST referenciando {{cpf}}, sem nenhuma fonte de variável de entrada declarável até então). Back (admin/back): campo novo FlowNode.startVariables, rosqueado por FlowNodeInput/FlowResponse/FlowNodeRecord/PublicationSnapshotRecord e os adapters de persistência/publicação/versionamento — sem migration, flow.nodes já é coluna JSON; FlowValidator valida que só o START declara isso, nomes únicos (mesmo espaço de REQ-03.09.011) e passam a alimentar o availableVars dos checks de conector e gateway. Runtime (ms-espec-registry): POST /journeys/{id}/instances agora aceita Map<String,Object> no corpo; VariableConversion.fromDeclaredVariables valida presença de cada variável declarada (409 com os nomes faltantes se não vier) e coerciona pelo tipo, aceitando e repassando chaves extras não-declaradas sem erro. Front: seção "Variáveis de Entrada" no nó START (StartVariablesEditor, mesmo padrão do OutputMappingEditor sem a coluna de jsonPath); availableVariablesAt/availableVariableRulesAt somam as variáveis do START; tela Execuções (JourneySearch.tsx) ganha um formulário simples (um input por variável, tipado) antes do botão "Executar" quando a jornada selecionada declara alguma. ms-transform-publication não precisou mudar — o BPMN do Camunda já aceita qualquer variável no start independente de declaração; o contrato é só design-time (FlowValidator) + runtime (ms-espec-registry). FT-03 vai de 64/64 para 69/69 (100%, 5 REQs novos). Progresso geral de 312/348 (90%) para 317/353 (90%).',
  },
  {
    date: '2026-08-17 01:22',
    source: 'progresso',
    summary:
      'FT-05 renomeada de "Simulação" para "Execução" (feature, user stories, requisitos, evidências) — a feature deixou de ser uma simulação simplificada desde que passou a rodar contra o motor de runtime real e, mais recentemente, mensageria Kafka real também de verdade; "Simulação" não descrevia mais o que a tela faz. Junto, todo texto de requisito/arquitetura que citava "Camunda" explicitamente foi generalizado para "motor de runtime"/"Runtime Engine" — o Admin Portal deve se apresentar como agnóstico à engine, mesmo princípio já usado nos nomes dos ports (RuntimeMonitoringPort, RuntimePublicationPort). Código: front/src/simulation/ → front/src/execution/ (SimulationWorkspace→ExecutionWorkspace, SimulationsPage→ExecutionsPage, simulateStep()→skipStep(), aba "Simulações"→"Execuções", botão "Simular conclusão"→"Pular etapa"); admin/back: pacote simulationaudit→executionaudit (SIMULATION_START→EXECUTION_START, rota /simulation-audit→/execution-audit), CamundaMonitoringAdapter→RuntimeEngineMonitoringAdapter, config app.camunda.base-url/CAMUNDA_BASE_URL→app.runtime-engine.base-url/RUNTIME_ENGINE_BASE_URL. Fora de escopo por pedido explícito: nada dentro de admin/simulacoes/ foi tocado (ms-espec-registry continua com SimulationController, CamundaClient e o endpoint /simulate-step exatamente como estavam — são detalhes internos de um serviço que já existe, não a apresentação do portal). Nenhum REQ novo ou removido nesta rodada, só renomeação — FT-05 continua 37/37 (100%).',
  },
  {
    date: '2026-08-17 00:34',
    source: 'progresso',
    summary:
      'FT-05 Simulação ganhou mais uma rodada: REQ-05.04.003 (novo) registra que integrações Kafka agora rodam contra um broker real, ao contrário das REST (que continuam mockadas). Nova user story US-05.09 Mensageria Kafka real (REQ-05.09.001 a 009): identificador de correlação (business key) próprio por instância, publicação automática de Service Task Kafka sem ação manual (KafkaBridgeScheduler), indicador visual distinto para essa espera, consumo/correlação automática de mensagem real para Receive Task e início por mensagem — inclusive vinda de um produtor externo ao Admin Portal (kafka-console-producer, testado ao vivo) —, painel de envio de mensagem de teste com tópico somente-leitura e business key pré-preenchida, início de jornada por mensagem direto na tela de busca com espera automática pela instância nova, e um "bypass" manual (REQ-05.09.009) que reexpõe o mecanismo de fabricar resultado (idêntico ao antigo "Simular conclusão", nunca removido do backend) como alternativa secundária discreta, tanto para etapas Kafka em espera (DevicePreview.tsx, link "Pular etapa") quanto para o início por mensagem (JourneySearch.tsx, link "Iniciar sem mensagem"). REQ-05.05.001 não precisou de ajuste de texto: com o bypass valendo também para Kafka, o texto original continua verdadeiro. FT-05 vai de 27/27 para 37/37 (100%, 10 REQs novos). Progresso geral de 302/338 (89%) para 312/348 (90%).',
  },
  {
    date: '2026-08-16 05:33',
    source: 'progresso',
    summary:
      'Nova feature FT-13 Dashboard (9 user stories, 24 REQs, todos done), cobrindo o dashboard operacional implementado nesta sessão: indicadores em tempo real (US-13.01), tendência de execução com gráfico iniciadas/concluídas e granularidade ajustável — últimas 24h por hora (padrão), últimos 7 ou 30 dias por dia (US-13.02), processos por volume com indicação de incidentes (US-13.03), lista de incidentes ativos (US-13.04), instâncias pendentes com encerramento manual individual/em lote restrito a EDITOR/ADMIN e sempre com confirmação (US-13.05), execução recente (US-13.06), atualização manual/automática dos dados (US-13.07), acesso como primeira tela do portal com item de menu dedicado (US-13.08) e auditoria de encerramento de instância e início de simulação (US-13.09). Progresso geral de 278/314 (89%) para 302/338 (89%, 13 features).',
  },
  {
    date: '2026-08-16 05:33',
    source: 'progresso',
    summary:
      'Renomeação de terminologia em todo o diretório requisitos/: "MVP" → "versão 1.0.0" (com concordância de gênero/contração revisada caso a caso — "do/no/o MVP" → "da/na/a versão 1.0.0"), "Épico" (nível EP-) → "Feature" (nível FT-), "Feature" (nível FT-xx.xx) → "User Story"/US (nível US-xx.xx). Aplicado a todos os arquivos de requisitos/admin/ (incluindo ej-admin-openapi.yaml e o comentário SQL de bd/massa_de_dados_journeys.sql) via script mecânico com verificação manual de concordância verbal/nominal; ej-admin-index.md §5 (Fora do Escopo) teve a entrada "Dashboard Administrativo de Jornadas" removida (item implementado nesta sessão, ver FT-13 acima). Corrigida também uma mojibake pré-existente (dupla codificação UTF-8) em um parágrafo de ej-admin-requisitos.md, sem relação com a renomeação. Nenhum REQ mudou de conteúdo ou status nesta rodada — apenas prefixos/rótulos.',
  },
  {
    date: '2026-08-16 05:33',
    source: 'progresso',
    summary:
      'FT-02 Gestão de Jornadas ganhou 2 REQs novos em US-02.03 Pesquisa: REQ-02.03.006 (agrupar a listagem de jornadas por produto, por produto+canal, por canal, ou sem agrupamento) e REQ-02.03.007 (ordenar a listagem, crescente ou decrescente, pelos campos jornada/canal/status/data de atualização). Estado atual: REQ-02.03.006 in_progress — JourneysPage.tsx já agrupa por produto (pedido do usuário numa rodada anterior), mas ainda falta o seletor pra escolher o modo de agrupamento (produto+canal, só canal, sem agrupar); REQ-02.03.007 todo — não existe UI de ordenação por coluna hoje. De quebra, corrigida uma divergência de contagem pré-existente do FT-02: o resumo geral registrava 39/39, mas a seção detalhada sempre teve 40 linhas. FT-02 vai de 40/40 (100%) para 40/42 (95%, 1 in_progress). Progresso geral de 277/311 (89%) para 278/314 (89%).',
  },
  {
    date: '2026-08-16 02:47',
    source: 'progresso',
    summary:
      'FT-05 Simulação ganhou uma nova user story, US-05.08 Tratamento de falhas de integração (REQ-05.08.001 a 004): quando um conector REST falha durante a simulação (ex.: ms-mock-api-rest fora do ar), o ms-espec-registry agora identifica corretamente qual nó de serviço causou a falha — antes, como a transação da engine dá rollback e não deixa rastro no histórico, o simulador acabava culpando a User Task anterior em vez do Service Task real (PublicationSnapshot.nextConnectorNodeAfter() segue as conexões do fluxo até o próximo nó com conector). O nó com erro é destacado no diagrama, a falha entra no log cronológico, e a mensagem completa fica disponível sob demanda por um ícone que abre um modal (copiar erro, fechar, tecla Esc) — sem mais o aviso de erro inline que existia na tela de execução. Dois REQs novos adicionais: REQ-05.03.003 (o diagrama não deve perder zoom/posição ao trocar de aba — corrigido mantendo o FlowDiagramViewer sempre montado) e REQ-05.06.005 (o log deve mostrar os dados submetidos em cada User Task respondida). REQ-05.07.001 revisado: a busca de jornada passou a listar todas por padrão e filtrar conforme o texto digitado (comportamento anterior era nunca listar todas de uma vez). FT-05 vai de 21/21 para 27/27 (100%, 6 REQs novos). Progresso geral de 271/305 (89%) para 277/311 (89%).',
  },
  {
    date: '2026-08-16 02:47',
    source: 'progresso',
    summary:
      'FT-05 Simulação implementado por completo (0% → 100%, 21/21 REQs). Objetivo da feature ajustado: a simulação exige jornada publicada e roda contra o motor de runtime real (Camunda), não um simulador simplificado interno. Arquitetura: ms-espec-registry (wrapper fino da REST API do Camunda — iniciar/consultar/completar tarefas, fetchAndLock+complete de external task Kafka, correlação de mensagem para RECEIVE_TASK, leitura/escrita de variáveis do processo) e ms-mock-api-rest (10 endpoints estáticos emulando as integrações REST reais da massa de dados), ambos em simulacoes/. Front: aba "Simulações" do admin/front redesenhada em tela única — JourneySearch (combobox de busca instantânea, sem listar todas as jornadas) → SimulationWorkspace, que mostra em cima o passo atual (DevicePreview, com moldura de celular pra canal App via PhoneFrame ou card largo pra canal Web) e embaixo um painel de observabilidade com 4 abas: Workflow (FlowDiagramViewer, visualizador somente-leitura em @xyflow/react reaproveitando cores/ícones/metadados do designer de fluxo real, com o caminho percorrido destacado ao vivo), Variáveis (ver e alterar manualmente o valor de qualquer variável do processo em execução, pra forçar caminhos de decisão em teste), Integrações (resultado de cada Service/Receive Task já executada, derivado cruzando outputMapping com as variáveis atuais) e Log (histórico cronológico 100% client-side). Formulários agora renderizados com a stack Mística completa (Form/TextField/EmailField/DecimalField/DateField/Select/Checkbox/FileUpload), sem a restrição de "só botões/tags" que vale pro resto do portal — essa tela simula o que um cliente real veria via SDUI. De quebra, a aba "Execuções" do menu virou "Simulações", e o portal ganhou um seletor de skin da Mística (Blau/Movistar/Vivo/Vivo Evolution/O2/Telefónica/Esimflag) ao lado do toggle claro/escuro. O simulador-front standalone (protótipo anterior a este redesign) foi apagado — nunca chegou a ser commitado. Progresso geral de 250/294 (85%) para 271/305 (89%, 11 REQs novos no FT-05 além dos 10 originais).',
  },
  {
    date: '2026-08-15 02:53',
    source: 'progresso',
    summary:
      'REQ-03.11.003 corrigido (removidos os operadores "maior ou igual"/"menor ou igual" que nunca foram implementados; ficou igual/diferente/maior que/menor que) e passou de texto livre para 3 campos estruturados (combo de variável + combo de operador + valor). Novo REQ-03.11.008: cada variável de saída ganhou um tipo declarado (texto, número, booleano, data, data e hora) — inferido automaticamente ao gerar o mapeamento via "Testar API" (incluindo detecção de datas ISO 8601 por regex) ou escolhido manualmente; o editor da condição do gateway agora filtra os operadores pelo tipo da variável escolhida (texto/booleano: igual/diferente; número/data/data e hora: também maior/menor) e troca o campo de valor (numérico, seletor verdadeiro/falso, seletor de data ou data e hora). Chips de "variáveis disponíveis" removidos do painel Decisão — a própria combo de variável cumpre esse papel. Variáveis salvas antes dessa mudança (sem tipo) continuam funcionando como string. FT-03 vai de 63/63 para 64/64 (100%, 1 REQ novo). Progresso geral de 249/293 (85%) para 250/294 (85%).',
  },
  {
    date: '2026-08-15 02:53',
    source: 'progresso',
    summary:
      'US-03.11 Bifurcação condicional (Gateway) implementada por completo, REQ-03.11.001 a 007. Back: FlowNodeType.GATEWAY, FlowConnection.condition/isDefault, FlowValidator (gateway com 2 saídas, exatamente uma padrão, não padrão com condição, validação de {{variavel}} contra ancestrais). Front: tipo gateway no editor (ícone, paleta, canvas), GatewayFields (checkbox de saída padrão + condição de texto por saída, com painel de variáveis disponíveis), outgoingLimitFor generalizando o limite de saídas por tipo de nó, validation.ts espelhando a regra do back. ms-transform-publication: BpmnTransformer reescrito de uma caminhada linear para construção de grafo via API de baixo nível do camunda-bpmn-model (necessário para suportar ramificação), gerando exclusiveGateway/sequenceFlow com conditionExpression JUEL e fluxo padrão nativos do Camunda — sem worker. Testado ponta a ponta: publicação real + execução no Camunda confirmando os dois caminhos (condição verdadeira → Tarefa A; condição falsa → saída padrão → Tarefa B). Fora de escopo da versão 1.0.0 (já registrado em ej-admin-requisitos.md §5): gateway com mais de duas saídas, gateway inclusivo, gateway paralelo, combinação de condições com E/OU. FT-03 volta a 100% (63/63). Progresso geral de 242/293 (83%) para 249/293 (85%).',
  },
  {
    date: '2026-08-15 02:53',
    source: 'progresso',
    summary:
      'Nova user story US-03.11 Bifurcação condicional (Gateway), REQ-03.11.001 a 007, todos todo: gateway de decisão exclusivo com exatamente duas saídas na versão 1.0.0 (caminho A/caminho B), uma marcada como padrão (sem condição); a condição da saída não padrão é variável + operador de comparação + valor de referência, podendo referenciar tanto uma variável de saída de Service Task/Receive Task (REQ-03.09.010) quanto um campo de resposta de User Task (REQ-04.01.007); painel de variáveis disponíveis reaproveita REQ-03.09.013, estendido a campos de formulário. Na publicação, vira exclusiveGateway BPMN nativo com sequenceFlow condicional, avaliado pelo motor do runtime, sem worker — mesmo princípio do conector REST nativo (US-03.09). Gateway com mais de duas saídas, gateway inclusivo, gateway paralelo e combinação de condições com E/OU registrados fora de escopo da versão 1.0.0 em nova seção "Evolução do Gateway de Decisão" (ej-admin-requisitos.md §5). FT-03 vai de 56/56 (100%) para 56/63 (89%, 7 novos todo). Progresso geral de 242/286 (85%) para 242/293 (83%).',
  },
  {
    date: '2026-08-15 02:53',
    source: 'progresso',
    summary:
      'REQ-03.01.004/03.02.005 ajustados: a cardinalidade de END passou de "exatamente um" para "ao menos um", já que um GATEWAY (US-03.11) pode ramificar o fluxo em dois caminhos que terminam em ENDs distintos, sem precisar reconvergir antes do fim. Back: FlowValidator — checagem de ends.isEmpty() no lugar de ends.size() != 1, e a alcançabilidade reversa (BFS) agora une o alcance de todos os ENDs em vez de partir de um único. Front: validation.ts espelha a mesma mudança. ms-transform-publication não precisou de ajuste — o BpmnTransformer já constrói o grafo de forma genérica, sem assumir quantidade de END. Documentação sincronizada em ej-admin-modelo-dados-fisico.md, ej-admin-modelo-dados-conceitual.md, ej-admin-dicionario-dados.md e ej-admin-arquitetura-logica.md. Sem mudança de contagem de REQs (ambos continuam done), só de redação/comportamento.',
  },
  {
    date: '2026-08-15 02:53',
    source: 'progresso',
    summary:
      'US-03.09 evoluído e nova US-03.10 (Teste de conectores) implementadas: mapeamento de saída de conectores REST/Kafka deixou de ser JSON livre e passou a lista estruturada nome ← JSONPath (REQ-03.09.010/011), com suporte a referenciar essas variáveis via {{nome}} nos campos de entrada de passos seguintes (REQ-03.09.012), painel de variáveis disponíveis por nó no editor (REQ-03.09.013) e validação 422 no backend para {{variavel}} não declarada ou nome de saída duplicado (REQ-03.09.014). REQ-03.09.002/004/009 tiveram a descrição/nota ajustada para refletir que mapeamento de saída não é mais livre. Nova US-03.10 (REQ-03.10.001 a 005): botão "Testar chamada" no editor dispara, via backend (POST /journeys/{id}/flow/nodes/{id}/connector-test), uma chamada REST de teste com proteção contra SSRF (bloqueio de IP privado/loopback/reservado), timeout de 5s e limite de corpo de 1MB; valores de exemplo para variáveis coletados no momento do teste. FT-03 mantém 100% (56/56 REQs, 10 novos). Progresso geral de 232/276 (84%) para 242/286 (85%).',
  },
  {
    date: '2026-08-10 03:06',
    source: 'progresso',
    summary:
      'FT-11 Testes e FT-12 Infraestrutura novos, aprovados pelo usuário. FT-11: 4 USs / 12 REQs (todo) cobrindo testes unitários de domínio, testes de integração de API, testes de frontend e cenários end-to-end — hoje o projeto não tem nenhum teste automatizado. FT-12: 6 USs / 16 REQs cobrindo identidade da solução, containerização (Docker), orquestração (Kubernetes), esteira CI/CD, configuração de ambientes e banco de dados; REQ-12.01.001 (sigla + ambiente Azure) já nasce in_progress — a sigla ELJY já foi criada, falta a disponibilização do ambiente. Nenhuma sugestão fora de escopo foi registrada para essas duas features, por pedido do usuário. Totais: de 10 FTs/49 USs/248 REQs (94%) para 12 FTs/59 USs/276 REQs (84% — a queda no percentual reflete só a base maior de requisitos, nada foi desfeito).',
  },
  {
    date: '2026-08-10 02:34',
    source: 'progresso',
    summary:
      'REQ-10.04.001 reclassificado de done para in_progress: a preparação técnica (log centralizado, ponto de extensão reservado para appender Logstash) está pronta, mas falta a configuração/conexão de fato com um ambiente ELK real, ainda não disponível. FT-10 vai de 12/12 (100%) para 11/12 (92%, 1 in_progress); progresso geral de 94% (233/248) para 94% (232/248, 1 in_progress).',
  },
  {
    date: '2026-08-10 02:34',
    source: 'progresso',
    summary:
      'Corrigida lacuna de auditoria (REQ-08.01.006/REQ-08.02.005): UnpublishJourney.execute e PublishJourneyVersion.goLive só registravam AuditResult.SUCCESS, nunca FAILURE — quando a chamada ao runtime (RuntimePublicationPort) falhava, a exceção interrompia o método antes da linha de auditoria, e a falha não deixava nenhum rastro. Agora a chamada ao runtime é envolvida em try/catch: em caso de exceção, grava AuditResult.FAILURE com a mensagem de erro antes de relançá-la (o response HTTP 502 RUNTIME_UNAVAILABLE continua igual). Testado via curl: derrubei o ms-transform-publication de propósito, tentei despublicar uma jornada (502 como esperado) e confirmei o evento FAILURE em GET /audit-events.',
  },
  {
    date: '2026-08-10 01:38',
    source: 'progresso',
    summary:
      'REQ-02.10.001 novo e implementado (US-02.10 Inspeção da publicação): para uma jornada PUBLISHED, visualizar o JSON completo enviado à API de publicação do runtime (produto, canal, fluxo e formulários com a árvore SDUI), via ação na listagem de jornadas ao lado de "Editar"/"Excluir". Back: GET /api/v1/journeys/{id}/publication (GetPublicationSnapshot, 409 se não publicada) + PublicationSnapshotRecord.from(Publication) extraído como factory compartilhada entre esse endpoint e PublicationAdapter (mesma serialização, uma só fonte). Front: ícone "Ver publicação" em JourneyActions, PublicationSnapshotModal novo (JSON formatado + copiar). Escopo mais restrito que o REQ-06.03.006 removido anteriormente: só a publicação ativa da jornada, não qualquer versão histórica. Testado via curl (200 com JSON completo / 409 sem publicação). FT-02 fecha em 39/39 (100%).',
  },
  {
    date: '2026-08-10 01:07',
    source: 'progresso',
    summary:
      'REQ-02.09.003/004 deixaram de ser mock: MockRuntimePublicationAdapter removido, substituído por PublicationAdapter (infrastructure/publication), que faz uma chamada HTTP real (POST/DELETE via RestClient) para a API de publicação do runtime — o Admin Portal não conhece nem depende de qual engine implementa essa API do outro lado. Endereço do serviço configurável por ambiente em app.transform-publication.base-url (perfil dev, com override via variável de ambiente TRANSFORM_PUBLICATION_BASE_URL; qa/prod ainda pendentes de valor próprio). Falhas de rede/HTTP agora propagam como RuntimePublicationException, mapeada para 502 RUNTIME_UNAVAILABLE no GlobalExceptionHandler, em vez de sempre "suceder" como o mock fazia — PublishJourney/UnpublishJourney só persistem o novo estado se a chamada não lançar. Testado via curl ponta a ponta publicando e despublicando de fato contra o serviço configurado localmente. FT-02 fecha em 38/38 (100%).',
  },
  {
    date: '2026-08-09 23:00',
    source: 'progresso',
    summary:
      'FT-04 (Formulários/SDUI) implementado: FormField.id→name (chave técnica única, imutável após criada, validada em Form.create via DuplicateFieldNameException, 422); options migrado de List<String> para FormFieldOption(label,value); InputSubtype (TEXT/NUMBER/EMAIL/DATE) com minValue/maxValue/validationPattern; FILE_UPLOAD com acceptedExtensions/maxFileSizeBytes; novo FormSduiSerializer gera a árvore [tag,props,children] (ui.form/ui.text/ui.input/ui.select/ui.multiselect/ui.upload), persistida no campo sdui de SnapshotFormRecord em PublicationRepositoryAdapter/JourneyVersionRepositoryAdapter. Sem migration — os campos do formulário já eram um blob JSON, não colunas relacionais. Compatibilidade retroativa: FormFieldOption.LegacyDeserializer aceita o formato antigo (string simples) e FormFieldType.fromJson mapeia o extinto STATIC_CONTENT para TEXT, para publicações/versões já existentes no banco continuarem legíveis (a validação de nome único também não roda na reidratação a partir de snapshot, só na criação/edição pelo usuário). Front (FormBuilderPage.tsx): campo "Nome técnico" (travado para campos pré-existentes), seletor de subtipo com min/max ou regex condicionais, editor de opções rótulo+valor, configuração de extensões/tamanho em upload. Testado via curl ponta a ponta (criação com os novos campos, rejeição de nome duplicado, publicação de jornada com inspeção direta do snapshot no Postgres confirmando a árvore SDUI) e build de produção do front (tsc -b && vite build).',
  },
  {
    date: '2026-08-09 22:11',
    source: 'progresso',
    summary:
      'FT-04 (Formulários/SDUI) refinado com foco em compatibilidade com o formato de renderização SDUI ([tag, props, children]) usado pelas ferramentas de renderização React/Flutter. REQ-04.02.006 (STATIC_CONTENT) removido/colapsado em TEXT — mesmo modelo de dados, diferença só visual. Adicionados REQ-04.01.007 (name técnico do campo, único e imutável, substituindo o id interno), REQ-04.02.007-REQ-04.02.010 (subtipo/validação de INPUT, opções como pares rótulo/valor, regras de extensão/tamanho em FILE_UPLOAD) e a nova US-04.06 (REQ-04.06.001, já implementado pelo PublicationRepositoryAdapter — imutabilidade do formulário no snapshot de publicação; REQ-04.06.002, novo — serialização do formulário para árvore SDUI no momento da publicação). Nenhum código alterado nesta rodada, só documentação (ej-admin-requisitos.md, progresso.md, modelo conceitual/físico, dicionário de dados, arquitetura lógica, OpenAPI e nota de aviso na massa de dados de seed). Itens fora da versão 1.0.0 (fontes de dados dinâmicas para opções, $dataSource, prefetch, paginação de opções, formulários multi-etapas) registrados em §5 Fora do Escopo da versão 1.0.0 → Formulários Avançados. Nomenclatura dos documentos de modelo de dados alinhada de FormComponent/component_id para FormField/name, batendo com o domínio já implementado no back.',
  },
  {
    date: '2026-08-09 03:13',
    source: 'progresso',
    summary:
      '"Desativar jornada" removido: com "Excluir" já cobrindo o caso (soft-delete para INACTIVE quando a jornada já foi publicada, exclusão física quando não), manter um botão de desativação manual separado — que virava a jornada INACTIVE sem tocar nas versões, resultado diferente e inconsistente com o significado que INACTIVE passou a ter (jornada excluída) — não fazia mais sentido. Removidos DeactivateJourney (back), POST /journeys/{id}/deactivate, deactivateJourney (front), estado deactivatingJourney, seu ConfirmDialog e o botão (ícone PowerOff) do grid de jornadas. REQ-02.01.006 reformulado para falar só de bloqueio de exclusão; REQ-06.05.001 com evidência atualizada para DeleteJourney. Journey.deactivate() (método de domínio) continua existindo — é o que DeleteJourney chama internamente no caminho de soft-delete.',
  },
  {
    date: '2026-08-09 03:04',
    source: 'progresso',
    summary:
      'REQ-02.01.009 estendido: além de editar, uma jornada INACTIVE também não pode ser excluída de novo. DeleteJourney passou a checar journey.status == INACTIVE logo no início e lançar JourneyInactiveException (409), mesma exceção do bloqueio de edição — mensagem generalizada de "Cannot edit" para "Cannot modify an inactive journey" para cobrir os dois casos. Front: botão "Excluir" também desabilitado (cinza, sem clique) para jornadas INACTIVE em JourneysPage, ao lado do "Editar" já desabilitado.',
  },
  {
    date: '2026-08-09 03:04',
    source: 'progresso',
    summary:
      'REQ-02.01.007 removido: reativar uma jornada INACTIVE deixou de fazer sentido, já que INACTIVE agora significa "jornada excluída" (REQ-02.01.005/008), não mais um estado reversível de "pausada". Removidos ActivateJourney (back), POST /journeys/{id}/activate, Journey.activate(), activateJourney (front) e o botão "Ativar" do grid de jornadas. REQ-02.01.009 novo em seu lugar: jornada INACTIVE não pode mais ser editada — UpdateJourney e UpdateFlow passam a checar journey.status == INACTIVE e lançam a nova JourneyInactiveException (409); front desabilita visualmente o botão "Editar" (IconAction ganhou suporte a disabled) para essas jornadas.',
  },
  {
    date: '2026-08-09 03:04',
    source: 'progresso',
    summary:
      'REQ-02.01.005/006/008 revisados e VersionStatus.ARCHIVED aposentado, virando INACTIVE com significado novo. Antes, DeleteJourney bloqueava (409, JourneyDeletionBlockedException, removida) a exclusão de qualquer jornada que já tivesse sido publicada, mesmo há muito despublicada — bug relatado (jornada "Troca de titularidade 15", só com versões despublicadas/arquivadas, não podia ser excluída). Agora: se a jornada está PUBLISHED no momento, bloqueia (409, mesma guarda ActivePublicationPort.existsForJourney de DeactivateJourney); senão, se já foi publicada alguma vez, faz soft-delete — journey.deactivate() + JourneyVersion.deactivate() (novo status INACTIVE) em cada versão, tudo dentro de um @Transactional novo no método; senão (nunca publicada), exclusão física como antes. Migration V2__replace_archived_version_status_with_inactive.sql: converte as ARCHIVED existentes (só dado sintético de seed) para UNPUBLISHED, e a CHECK constraint passa a aceitar (DRAFT, PUBLISHED, UNPUBLISHED, INACTIVE). De quebra, corrigido bug latente: excluir fisicamente uma jornada nunca publicada falhava por violação de FK (suas journey_version/flow não eram apagadas antes) — DeleteJourney agora apaga essas dependências primeiro. Front: VersionStatus e o badge de status de versão trocam ARCHIVED/"Arquivada" por INACTIVE/"Inativa"; diálogo e toast de exclusão de jornada diferenciam exclusão física de soft-delete.',
  },
  {
    date: '2026-08-09 03:04',
    source: 'progresso',
    summary:
      'REQ-06.04.011 revisado: qualquer versão UNPUBLISHED de uma jornada pode ser republicada agora, não só a mais recente. RepublishJourneyVersion simplificado — removida a checagem isLatestUnpublished e a exceção VersionNotLatestUnpublishedException (409, também removida do GlobalExceptionHandler); passou a só validar que a versão é UNPUBLISHED antes de delegar em PublishJourneyVersion.goLive. Front: botão "Republicar" agora aparece em toda versão UNPUBLISHED da lista, não só na mais recente.',
  },
  {
    date: '2026-08-09 03:04',
    source: 'progresso',
    summary:
      'REQ-06.04.004/011 corrigidos: ao publicar uma nova versão (inclusive via republicação), a versão anteriormente PUBLISHED agora é marcada como UNPUBLISHED, não mais ARCHIVED — ARCHIVED fica reservado a versões legadas, sem uso em nenhum fluxo atual. PublishJourneyVersion.goLive passou a chamar previous.unpublish() em vez de previous.archive(); textos de requisito, comentários e o diálogo de confirmação de republicação (JourneysPage) atualizados de "arquivada" para "despublicada". Sem mudança de contagem de REQs (ambos continuam done), só de comportamento/redação.',
  },
  {
    date: '2026-08-09 01:12',
    source: 'progresso',
    summary:
      'REQ-06.03.006 removido: a opção "Ver" (abria o snapshot JSON de uma versão em modal somente-leitura) foi tirada do grid de jornadas — decisão de produto, sem substituto na versão 1.0.0. Registrada como fora de escopo, em nova seção "Evolução da Gestão de Jornadas" em ej-admin-requisitos.md §5, a comparação (diff) visual entre versões de uma jornada — não havia nada equivalente registrado até então.',
  },
  {
    date: '2026-08-09 01:12',
    source: 'progresso',
    summary:
      'REQ-06.04.011/012 implementados: republicar a versão UNPUBLISHED mais recente de uma jornada. Backend: PublishJourneyVersion refatorado — extraído goLive(journeyId, version, previousStatus, auditAction) (validação de canal/produto ativos, checagem de flow, publicação no runtime, arquivamento da PUBLISHED atual) do antigo execute(), agora reaproveitado por execute() (DRAFT) e pelo novo RepublishJourneyVersion (UNPUBLISHED). RepublishJourneyVersion valida que a versão é UNPUBLISHED e que é a mais recente entre as UNPUBLISHED da jornada antes de delegar. Endpoint POST /journeys/{id}/versions/{versionId}/republish. Front: botão "Republicar" só na versão UNPUBLISHED mais recente, com ConfirmDialog cuja mensagem muda se já existe uma PUBLISHED que será substituída/arquivada. De quebra, corrigido texto desatualizado no diálogo de despublicar que ainda dizia "passa a arquivada".',
  },
  {
    date: '2026-08-09 01:12',
    source: 'progresso',
    summary:
      'REQ-06.04.011/012 novos (ainda não implementados): republicar a versão UNPUBLISHED mais recente de uma jornada, voltando-a a PUBLISHED sem alterar seu snapshot. Se já houver uma versão PUBLISHED na jornada (possível: publicar um DRAFT novo depois de despublicar deixa a versão antiga UNPUBLISHED coexistindo com a nova PUBLISHED), essa versão deve ser arquivada e o usuário avisado/consultado antes de confirmar a substituição — mesmo padrão de REQ-06.02.009/010. Republicar não é rollback: só a UNPUBLISHED mais recente pode ser republicada, ARCHIVED continua fora de alcance (REQ-06.05.004).',
  },
  {
    date: '2026-08-09 00:35',
    source: 'progresso',
    summary:
      'Migrations Flyway resetadas: as antigas V1...V9/V11 foram substituídas por uma única V1__baseline.sql com o schema final resultante de todas elas (motivo: um arquivo de migration antigo — V10__adjust_journey_versioning.sql, nunca commitado — havia rodado contra o banco local e ficado órfão no target/ após ser apagado, quebrando a inicialização do Flyway). Banco local journey_admin recriado do zero; histórico de flyway_schema_history reiniciado. Nenhuma mudança de comportamento da aplicação — é só reorganização das migrations.',
  },
  {
    date: '2026-08-09 00:35',
    source: 'progresso',
    summary:
      'REQ-06.01.005/06.04.009 corrigidos: versão despublicada agora vira UNPUBLISHED, não ARCHIVED. Novo status UNPUBLISHED em VersionStatus (ARCHIVED continua reservado ao caso de a versão ser substituída por uma nova publicação); migration V11__add_unpublished_version_status.sql estende a CHECK constraint de journey_version.version_status; JourneyVersion ganhou unpublish() ao lado de archive(); UnpublishJourney passou a chamar unpublish() na versão PUBLISHED da jornada. Front: badge "Despublicada" para o novo status em JourneysPage. REQ-06.03.005 atualizado para citar o novo status.',
  },
  {
    date: '2026-08-09 00:35',
    source: 'progresso',
    summary:
      'REQ-06.02.009 redefinido: sincronização automática do DRAFT com o fluxo salvo, em vez de só criar uma versão nova quando a jornada estava PUBLISHED. JourneyVersion ganhou replaceContent(...) (permitido só em DRAFT); CreateJourneyVersion.execute agora decide entre atualizar a DRAFT existente in place (mesmo id/versionNumber) ou criar uma nova quando não há nenhuma; UpdateFlow chama isso incondicionalmente a cada salvamento de fluxo; PublishJourney (atalho legado) simplificado pelo mesmo motivo. Corrige o caso relatado: jornada nunca publicada, com fluxo desenhado no designer, cuja v1 (criada vazia junto com a jornada) nunca refletia o fluxo editado — o botão "Publicar" da versão ficava desabilitado (snapshot vazio) mesmo com o fluxo pronto.',
  },
  {
    date: '2026-08-08 00:35',
    source: 'progresso',
    summary:
      'REQ-06.04.010 novo: despublicação por versão. Endpoint POST /journeys/{id}/versions/{versionId}/unpublish + UnpublishJourneyVersion (valida que versionId é a versão PUBLISHED da jornada, senão 409 via nova VersionNotPublishedException; delega em UnpublishJourney para reaproveitar runtime-unpublish + arquivamento de versão + journey.unpublish(), em vez de duplicar a regra). Front: botão "Publicar" removido do nível de jornada no grid (JourneysPage) — publicação passa a existir só por versão; nova ação "Despublicar" na linha da versão PUBLISHED, que ao concluir recarrega tanto a lista de versões quanto a jornada (status e "vN publicada" ficam consistentes de imediato). FT-06 avança de 38/38 para 39/39 REQs; progresso geral de 93% (221/238) para 93% (222/239).',
  },
  {
    date: '2026-08-08 00:35',
    source: 'progresso',
    summary:
      'REQ-06.04.009 novo: ao despublicar uma jornada (UnpublishJourney), a journey_version PUBLISHED correspondente agora é arquivada (ARCHIVED) antes de gravar journey.unpublish(), preservando o snapshot. Corrige inconsistência em que a versão continuava reportada como PUBLISHED (e o grid de jornadas continuava exibindo "vN publicada") mesmo depois da jornada ser despublicada. FT-06 avança de 37/37 para 38/38 REQs; progresso geral de 93% (220/237) para 93% (221/238).',
  },
  {
    date: '2026-08-08 18:46',
    source: 'progresso',
    summary:
      'FT-10 (Observabilidade) novo e implementado por completo: 12/12 REQs. Log técnico de aplicação (distinto da auditoria de negócio do FT-08): HttpRequestLoggingFilter (entrada/saída de toda API, sem log de body, registrado no SecurityConfig antes do filtro de autenticação) e TransactionLoggingAspect (@Around sobre todo @Service de application.*, logando início/commit/rollback de cada transação de persistência). Correlação via X-Correlation-Id (reaproveitado do header ou gerado) propagada por MDC e incluída no pattern do novo logback-spring.xml, cobrindo tanto os logs de API quanto os de transação da mesma requisição/thread. Integração com ELK preparada mas desativada (sem ambiente ELK neste momento) — ver seção "HOW TO — habilitar integração com ELK" no FT-10 para o procedimento de ativação (dependência logstash-logback-encoder + appender TCP + variáveis de ambiente de destino). Build: no Spring Boot 4.1 o starter de AOP foi renomeado de spring-boot-starter-aop para spring-boot-starter-aspectj — usado o novo nome no pom.xml. Progresso geral de 95% (212/224) para 95% (224/236).',
  },
  {
    date: '2026-08-08 15:45',
    source: 'progresso',
    summary:
      'FT-09 (Ajuda e Suporte) novo e implementado por completo: 5/5 REQs. Tela de ajuda estática (front/src/shell/HelpPage.tsx) com FAQ agrupado por tema, busca textual e link mailto:sustentacao@telefonica.com; acessível pelo item "Ajuda e suporte" da sidebar (antes um placeholder genérico). Simplificação deliberada: sem ajuda contextual por tela, sem canal de suporte com registro/consulta de solicitações e sem tela de diagnóstico — cortados do escopo por decisão de produto antes da implementação, não fazem parte do backlog. Progresso geral de 95% (207/219) para 95% (212/224).',
  },
  {
    date: '2026-08-08 05:59',
    source: 'progresso',
    summary:
      'FT-06 (Versionamento de jornadas), FT-07 (Autenticação e autorização) e FT-08 (Auditoria) implementados, na ordem FT-07 → FT-06 → FT-08 (dependência: versão precisa de usuário autenticado; auditoria precisa de ambos). FT-06: tabela journey_version (V7) + backfill de jornadas existentes (V8), criação automática de versão DRAFT ao criar jornada, publicação de versão arquiva a anterior, snapshot imutável, painel de versões no designer de fluxo — 35/35 REQs. FT-07: token opaco em memória (Authorization: Bearer, expiração por inatividade configurável), usuário mockado admin/admin/ADMIN, papéis ADMIN/EDITOR/VIEWER aplicados via @PreAuthorize em todos os controllers, tela de login com aviso de autenticação mockada — 24/25 REQs (REQ-07.04.002 n/a, sem CRUD de usuário na versão 1.0.0). FT-08: tabela audit_event (V9), gravação em login/logout/sessão, CRUD de produto/canal/jornada, versões, publicações e acessos negados, consulta com filtros e paginação restrita a ADMIN — 21/22 REQs (REQ-08.02.007 n/a, sem CRUD de papéis na versão 1.0.0). De quebra, REQ-02.06.004 (que dependia do FT-06) passou de todo para done. Simplificações deliberadas: sem rollback/restauração de versão (REQ-06.05.004, fora de escopo); flow-designer continua editando o estado "vivo" da jornada, versionar tira um snapshot desse estado; ocultação de botões por papel na UI não foi replicada em todas as telas (enforcement real é no backend). Progresso geral de 57% para 95% (207/219; 2 n/a; restam apenas os 10 REQs do FT-05 Simulação).',
  },
  {
    date: '2026-08-08 02:37',
    source: 'progresso',
    summary:
      'Escopo da versão 1.0.0 evoluído com FT-06 Versionamento de jornadas, FT-07 Autenticação e autorização e FT-08 Auditoria. A autenticação será representada por provedor externo mockado, com tela de login e usuário admin/admin no perfil ADMIN; os papéis ADMIN, EDITOR e VIEWER foram incluídos. Versões publicadas são imutáveis; restauração/rollback permanece fora da versão 1.0.0; auditoria não armazena dados sensíveis. Total: 8 EPs, 42 FTs e 220 REQs; 126 concluídos e 94 todo (57%).',
  },
  {
    date: '2026-08-08 01:50',
    source: 'progresso',
    summary:
      'REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop onOpenNewForm propagada de App.tsx → JourneysPage → JourneyDesignerPage → PropertiesDock → PropertiesPanel) e "Atualizar" (recarrega listForms() sem sair do editor de fluxo, via refreshForms). FormsPage.tsx ganhou suporte a abrir direto em modo \'new\' (props openNew/onOpenNewHandled), espelhando o padrão já existente de openFormId. Progresso geral de 93% para 93% (arredondamento; 127/137).',
  },
  {
    date: '2026-08-08 01:50',
    source: 'progresso',
    summary:
      'REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (HeadersEditor em PropertiesPanel.tsx) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136).',
  },
  {
    date: '2026-08-08 01:50',
    source: 'progresso',
    summary:
      'Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) REST deixou de ser oferecido para MESSAGE_START_EVENT — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só KAFKA continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (SERVICE_TASK → PRODUCE, RECEIVE_TASK/MESSAGE_START_EVENT → CONSUME), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em model.ts (CONNECTOR_TYPES_BY_NODE, KAFKA_OPERATION_BY_NODE) e FlowValidator (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em PropertiesDock.tsx (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam findFreeSpot para não empilhar. Progresso geral de 92% para 93%.',
  },
  {
    date: '2026-08-08 01:50',
    source: 'progresso',
    summary:
      'FT-03 (Modelagem Visual) fechado a 100%: US-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: FlowNodeType ganhou SERVICE_TASK/RECEIVE_TASK/MESSAGE_START_EVENT; novos ConnectorType (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e ConnectorConfig (tipo + config declarativa Map<String,Object> + credentialRef, sem secret) associáveis a esses 3 tipos; FlowValidator estendido (elemento inicial = START ou MESSAGE_START_EVENT, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga connectorConfig automaticamente (reaproveita FlowNode/FlowNodeRecord). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no PropertiesPanel (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: Flow.initial criava START+END já conectados na criação da jornada; agora só cria o START, como o requisito manda. Progresso geral de 80% para 92% (só falta FT-05 Simulação).',
  },
  {
    date: '2026-08-03 03:05',
    source: 'progresso',
    summary:
      'FT-06 (Publicação) + FT-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (domain/application/infrastructure/interfaces para publication, migration V6__create_journey_publication.sql, endpoints POST /journeys/{id}/publish|unpublish, filtro ?status= em GET /journeys) e mock do runtime (MockRuntimePublicationAdapter, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (ActivePublicationPort/HasEverBeenPublishedPort, antes sempre false), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram in_progress) e REQ-02.05.002/003 (eram blocked, já satisfeitos desde FT-03/FT-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (JourneysPage), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os in_progress/blocked restantes.',
  },
  {
    date: '2026-08-03 02:06',
    source: 'progresso',
    summary:
      'FT-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (domain/application/infrastructure/interfaces/form, migration V5__create_form.sql, CRUD /api/v1/forms) e frontend novo (front/src/forms/FormsPage.tsx + FormBuilderPage.tsx, api/forms.ts, item "Formulários" na sidebar). FlowNode.formId (já existente no backend) agora é editável de fato: PropertiesPanel ganhou o seletor "Formulário associado" para nós User Task e JourneyDesignerPage para de mandar formId: null fixo. FT-04 avança de 0% para 100%; progresso geral de 55% para 69%.',
  },
  {
    date: '2026-08-02 00:39',
    source: 'progresso',
    summary:
      'Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos Ctrl+C/Ctrl+V/Ctrl+D e botão "Duplicar nó" no NodePropertiesPanel, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como n/a: decisão de produto de não implementar na versão 1.0.0, salvamento permanece manual. FT-03 avança para 25/26 (96%).',
  },
  {
    date: '2026-08-02 22:12',
    source: 'progresso',
    summary:
      'Atualização do FT-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam todo: copiar elementos, duplicar elementos e salvamento automático.',
  },
  {
    date: '2026-08-02 03:56',
    source: 'progresso',
    summary: 'Sincronização com ej-admin-requisitos.md: 122 REQs em 8 EPs / 28 FTs, todos como todo.',
  },
];

// Gerado a partir de `git log --reverse --pretty=format:'%ad|%s' --date=short` na branch main.
// Ordem: mais recente primeiro. Ao ressincronizar, apenas acrescente os commits novos no topo.
const CHANGELOG_GIT: ChangelogEntry[] = [
  {
    date: '2026-08-17 22:11',
    source: 'git',
    summary:
      'Ajustes pontuais: toggle de bloqueio SSRF do teste de conector desligado em dev, refetch da lista de jornadas ao reabrir a aba Execuções já aberta, e 3 novos endpoints mock (consultarbd/consultarpendencia/consultarmassiva) no ms-mock-api-rest.',
    epics: ['FT-03', 'FT-05'],
  },
  {
    date: '2026-08-17 21:09',
    source: 'git',
    summary: 'Scripts start-all/stop-all (Windows e macOS) para subir e derrubar front, back e os serviços de simulação em sequência.',
  },
  {
    date: '2026-08-17 05:40',
    source: 'git',
    summary: 'Atualização da página Sobre (sincronização com progresso.md).',
  },
  {
    date: '2026-08-17 05:30',
    source: 'git',
    summary: 'Inicialização do front-mock-integracoes (React + Vite), app para listar e testar as rotas do ms-mock-api-rest.',
  },
  {
    date: '2026-08-17 05:30',
    source: 'git',
    summary:
      'Renomeação de "Simulação" para "Execução" em todo o portal; ajustes na massa de dados de jornadas e nos conectores REST/Kafka.',
    epics: ['FT-05'],
  },
  {
    date: '2026-08-16 21:20',
    source: 'git',
    summary: 'Tratamento de erro quando o motor de runtime está fora do ar, na tela do Dashboard.',
    epics: ['FT-13'],
  },
  {
    date: '2026-08-16 05:56',
    source: 'git',
    summary: 'Correção da página Sobre e de progresso.md.',
  },
  {
    date: '2026-08-16 05:33',
    source: 'git',
    summary:
      'Dashboard (FT-13) incorporado aos requisitos e implementado; renumeração e renomeação de épicos para features e de features para user stories; ajustes em jornadas e simulações.',
    epics: ['FT-13'],
  },
  {
    date: '2026-08-16 02:47',
    source: 'git',
    summary: 'Implementação completa do FT-05 Simulação.',
    epics: ['FT-05'],
  },
  {
    date: '2026-08-15 19:40',
    source: 'git',
    summary: 'Ajustes no simulador (ms-espec-registry/ms-mock-api-rest e primeira versão da aba Simulações com componentes Mística).',
  },
  {
    date: '2026-08-15 19:13',
    source: 'git',
    summary: 'Geração de massa de dados de teste (produtos, canais, formulários e jornadas de uma operadora de telecom fictícia).',
  },
  {
    date: '2026-08-14 20:26',
    source: 'git',
    summary: 'Gestão de Jornadas: painel de versão nas jornadas.',
    epics: ['FT-06'],
  },
  {
    date: '2026-08-10 04:00',
    source: 'git',
    summary: 'Inclusão de busca na página Sobre.',
  },
  {
    date: '2026-08-10 03:24',
    source: 'git',
    summary: 'Refresh da página Sobre.',
  },
  {
    date: '2026-08-10 03:19',
    source: 'git',
    summary: 'Skill para o GitHub Copilot para atualização da página Sobre.',
  },
  { date: '2026-08-10 03:06', source: 'git', summary: 'Inclusão dos FT-11 (Testes) e FT-12 (Infraestrutura).', epics: ['FT-11', 'FT-12'] },
  {
    date: '2026-08-10 02:34',
    source: 'git',
    summary: 'Correção de auditoria ao falhar o serviço de publicação, e ajustes na skill da página Sobre.',
    epics: ['FT-08'],
  },
  { date: '2026-08-10 01:38', source: 'git', summary: 'Visualizador de snapshots de jornadas publicadas.', epics: ['FT-02'] },
  {
    date: '2026-08-10 01:07',
    source: 'git',
    summary: 'Publicação e despublicação da jornada sem mock, através de serviço simulado de publicação.',
    epics: ['FT-02'],
  },
  { date: '2026-08-09 23:00', source: 'git', summary: 'Implementação do FT-04 refinado (SDUI).', epics: ['FT-04'] },
  { date: '2026-08-09 18:18', source: 'git', summary: 'Ajuste de configuração de logs e portas.' },
  { date: '2026-08-09 00:35', source: 'git', summary: 'FT-06 (Versionamento de jornadas) refinado e reimplementado.', epics: ['FT-06'] },
  { date: '2026-08-08 20:11', source: 'git', summary: 'SKILL de sincronização e página estática "Sobre" com o progresso da versão 1.0.0.' },
  {
    date: '2026-08-08 18:46',
    source: 'git',
    summary: 'Implementação do FT-10 Observabilidade (logs de requisição, transação e correlação).',
    epics: ['FT-10'],
  },
  { date: '2026-08-08 15:45', source: 'git', summary: 'Implementação do FT-09 Ajuda e suporte.', epics: ['FT-09'] },
  {
    date: '2026-08-08 05:59',
    source: 'git',
    summary: 'Remoção do evento de auditoria log_audit para operações de consulta e tratamento de restart de sessão.',
    epics: ['FT-08'],
  },
  {
    date: '2026-08-08 03:42',
    source: 'git',
    summary: 'Implementação de Versionamento, autenticação, autorização e auditoria (FT-06/07/08).',
    epics: ['FT-06', 'FT-07', 'FT-08'],
  },
  { date: '2026-08-08 02:37', source: 'git', summary: 'Inclusão de novas features no escopo da versão 1.0.0.' },
  { date: '2026-08-08 02:01', source: 'git', summary: 'Ajuste do formato dos requisitos.' },
  {
    date: '2026-08-08 01:50',
    source: 'git',
    summary: 'FT-03 Modelagem Visual: inclusão de conectores e novos tipos de componentes; enriquecimento de requisitos.',
    epics: ['FT-03'],
  },
  {
    date: '2026-08-08 00:01',
    source: 'git',
    summary: 'Inclusão do componente Service Task e refinamentos na modelagem visual.',
    epics: ['FT-03'],
  },
  { date: '2026-08-03 04:12', source: 'git', summary: 'Melhorias na gestão de produtos e canais.', epics: ['FT-01'] },
  { date: '2026-08-03 03:13', source: 'git', summary: 'Remoção do FT-08 do escopo (posteriormente reintroduzido).' },
  {
    date: '2026-08-03 03:05',
    source: 'git',
    summary: 'Implementação inicial dos FT-06 e FT-07 (versionamento e autenticação/autorização).',
    epics: ['FT-06', 'FT-07'],
  },
  { date: '2026-08-03 02:22', source: 'git', summary: 'Refinamentos do FT-04 Formulários (SDUI).', epics: ['FT-04'] },
  {
    date: '2026-08-03 02:06',
    source: 'git',
    summary: 'Implementação inicial do FT-04 Formulários (SDUI).',
    epics: ['FT-04'],
  },
  { date: '2026-08-03 01:38', source: 'git', summary: 'Ajustes e refinamentos de requisitos do FT-03.', epics: ['FT-03'] },
  { date: '2026-08-03 01:12', source: 'git', summary: 'Exclusão do requisito de auto-save do FT-03.', epics: ['FT-03'] },
  { date: '2026-08-03 00:47', source: 'git', summary: 'Configuração da estruturação de skills para front e back.' },
  {
    date: '2026-08-03 00:39',
    source: 'git',
    summary: 'Ajustes de temas e layouts (light/dark) e refinamentos no FT-03.',
    epics: ['FT-03'],
  },
  { date: '2026-08-02 22:12', source: 'git', summary: 'Refinamentos no FT-03 Modelagem Visual.', epics: ['FT-03'] },
  { date: '2026-08-02 14:33', source: 'git', summary: 'Implementação inicial do FT-03 Modelagem Visual.', epics: ['FT-03'] },
  {
    date: '2026-08-02 03:56',
    source: 'git',
    summary: 'Commit inicial: estrutura do Admin Portal (front, back) e implementação das features iniciais.',
  },
];

// Merge cronológico (mais recente primeiro) dos dois changelogs, preservando a origem de cada
// entrada (`source: 'git' | 'progresso'`) para a UI diferenciar. Em caso de mesma data, os commits
// git aparecem antes das entradas narrativas de progresso.md daquele dia (ordem estável do sort).
export const CHANGELOG: ChangelogEntry[] = [...CHANGELOG_GIT, ...CHANGELOG_PROGRESSO].sort((a, b) =>
  a.date < b.date ? 1 : a.date > b.date ? -1 : 0,
);

function reqCounts(reqs: Requirement[]) {
  const total = reqs.length;
  const naCount = reqs.filter((r) => r.status === 'na').length;
  const done = reqs.filter((r) => r.status === 'done').length;
  return { total, done, naCount };
}

export function featureCounts(feature: Feature) {
  return reqCounts(feature.requirements);
}

export function epicCounts(epic: Epic) {
  const all = epic.features.flatMap((f) => f.requirements);
  return reqCounts(all);
}

export const TOTAL_EPICS = EPICS.length;
export const TOTAL_FEATURES = EPICS.reduce((sum, e) => sum + e.features.length, 0);
export const TOTAL_REQS = EPICS.reduce((sum, e) => sum + epicCounts(e).total, 0);
export const TOTAL_REQS_DONE = EPICS.reduce((sum, e) => sum + epicCounts(e).done, 0);
export const TOTAL_REQS_NA = EPICS.reduce((sum, e) => sum + epicCounts(e).naCount, 0);
export const OVERALL_PERCENT = Math.round((TOTAL_REQS_DONE / (TOTAL_REQS - TOTAL_REQS_NA)) * 100);
