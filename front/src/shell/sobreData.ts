// Conteúdo estático gerado a partir de requisitos/admin/progresso.md e ej-admin-requisitos.md.
// Painel temporário — não reflete progresso ao vivo do projeto, é um retrato do MVP.

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
// Requisito cujo comportamento é atendido apenas por um mock/simulação no MVP: não conta como
// entregue, mas o código de suporte existe — a nota deixa essa distinção explícita.
function mock(code: string, description: string): Requirement {
  return { code, description, status: 'todo', notes: 'Implementado, porém mockado — não é uma integração real.' };
}

export const EPICS: Epic[] = [
  {
    code: 'EP-01',
    name: 'Gestão de Produtos e Canais',
    features: [
      {
        code: 'FT-01.01',
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
        code: 'FT-01.02',
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
        code: 'FT-01.03',
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
        code: 'FT-01.04',
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
    code: 'EP-02',
    name: 'Gestão de Jornadas',
    features: [
      {
        code: 'FT-02.01',
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
            'O sistema deve impedir a desativação ou a exclusão de uma jornada enquanto sua publicação estiver ativa; o usuário deve despublicá-la antes.',
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
        code: 'FT-02.02',
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
        code: 'FT-02.03',
        name: 'Pesquisa',
        requirements: [
          d('REQ-02.03.001', 'O sistema deve permitir pesquisar jornadas por nome.'),
          d('REQ-02.03.002', 'O sistema deve permitir filtrar jornadas por produto.'),
          d('REQ-02.03.003', 'O sistema deve permitir filtrar jornadas por canal.'),
          d('REQ-02.03.004', 'O sistema deve permitir ordenar jornadas por data de criação.'),
          d('REQ-02.03.005', 'O sistema deve permitir ordenar jornadas por data de alteração.'),
        ],
      },
      {
        code: 'FT-02.05',
        name: 'Jornadas específicas por canal',
        requirements: [
          d('REQ-02.05.001', 'O sistema deve permitir criar jornadas distintas para diferentes canais do mesmo produto.'),
          d('REQ-02.05.002', 'Cada jornada deve possuir definição independente de fluxo e formulários.'),
          d('REQ-02.05.003', 'Alterações realizadas em uma jornada não devem modificar automaticamente jornadas de outros canais.'),
          d('REQ-02.05.004', 'O sistema deve exibir o produto e o canal durante toda a edição da jornada.'),
        ],
      },
      {
        code: 'FT-02.06',
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
        code: 'FT-02.07',
        name: 'Estado da publicação',
        requirements: [
          d('REQ-02.07.001', 'O sistema deve indicar se uma jornada está publicada.'),
          d('REQ-02.07.002', 'O sistema deve indicar a data da publicação.'),
          d('REQ-02.07.003', 'O sistema deve indicar o produto associado à publicação.'),
          d('REQ-02.07.004', 'O sistema deve indicar o canal associado à publicação.'),
        ],
      },
      {
        code: 'FT-02.08',
        name: 'Catálogo de publicações',
        requirements: [
          d('REQ-02.08.001', 'O sistema deve permitir listar jornadas publicadas.'),
          d('REQ-02.08.002', 'O sistema deve permitir pesquisar jornadas publicadas.'),
          d('REQ-02.08.003', 'O sistema deve permitir filtrar jornadas publicadas por produto.'),
          d('REQ-02.08.004', 'O sistema deve permitir filtrar jornadas publicadas por canal.'),
        ],
      },
      {
        code: 'FT-02.09',
        name: 'Publicação no runtime',
        requirements: [
          d('REQ-02.09.001', 'O Admin Portal deve iniciar a publicação por meio de uma chamada de saída para a API de publicação do runtime.'),
          d('REQ-02.09.002', 'A chamada deve enviar a definição completa da jornada, incluindo produto, canal, fluxo e formulários.'),
          mock(
            'REQ-02.09.003',
            'No MVP, a API de publicação do runtime deve ser representada por um mock. Após sucesso, o Admin Portal substitui o snapshot anterior e altera o estado da jornada para PUBLISHED.',
          ),
          mock(
            'REQ-02.09.004',
            'Ao despublicar no MVP, o Admin Portal deve chamar a API mockada do runtime. Após sucesso, jornada e publicação assumem UNPUBLISHED; em falha, os estados atuais são preservados.',
          ),
        ],
      },
    ],
  },
  {
    code: 'EP-03',
    name: 'Modelagem Visual',
    features: [
      {
        code: 'FT-03.01',
        name: 'Flow designer',
        requirements: [
          d('REQ-03.01.001', 'O sistema deve suportar eventos de início.'),
          d('REQ-03.01.002', 'O sistema deve suportar eventos de término.'),
          d('REQ-03.01.003', 'O sistema deve suportar User Tasks.'),
          d('REQ-03.01.004', 'Cada fluxo deve possuir exatamente um nó START e exatamente um nó END.'),
          d(
            'REQ-03.01.005',
            'Ao criar uma jornada, o sistema deve iniciar seu fluxo apenas com o nó START, cabendo ao usuário adicionar o nó END e os demais elementos antes de salvar.',
          ),
        ],
      },
      {
        code: 'FT-03.02',
        name: 'Conexões',
        requirements: [
          d('REQ-03.02.001', 'O sistema deve permitir criar conexões entre elementos.'),
          d('REQ-03.02.002', 'O sistema deve permitir remover conexões.'),
          d('REQ-03.02.003', 'O sistema deve permitir editar conexões.'),
          d(
            'REQ-03.02.004',
            'O nó START não deve possuir entrada e deve possuir exatamente uma saída; cada USER_TASK deve possuir ao menos uma entrada e exatamente uma saída; o nó END deve possuir ao menos uma entrada e nenhuma saída.',
          ),
          d('REQ-03.02.005', 'Todos os nós devem pertencer a um caminho contínuo e alcançável entre START e END.'),
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
        code: 'FT-03.03',
        name: 'Navegação',
        requirements: [
          d('REQ-03.03.001', 'O usuário deve visualizar o fluxo completo da jornada.'),
          d('REQ-03.03.002', 'O usuário deve navegar livremente pelo fluxo.'),
          d('REQ-03.03.003', 'O sistema deve destacar o elemento selecionado.'),
        ],
      },
      {
        code: 'FT-03.04',
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
        code: 'FT-03.05',
        name: 'Canvas',
        requirements: [
          d('REQ-03.05.001', 'O sistema deve permitir zoom in.'),
          d('REQ-03.05.002', 'O sistema deve permitir zoom out.'),
          d('REQ-03.05.003', 'O sistema deve permitir mover-se livremente pelo canvas.'),
          d('REQ-03.05.004', 'O sistema deve permitir centralizar o fluxo na área visível.'),
        ],
      },
      {
        code: 'FT-03.06',
        name: 'Produtividade',
        requirements: [
          d('REQ-03.06.001', 'O sistema deve permitir desfazer ações.'),
          d('REQ-03.06.002', 'O sistema deve permitir refazer ações.'),
        ],
      },
      {
        code: 'FT-03.07',
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
        code: 'FT-03.08',
        name: 'Framework de conectores',
        requirements: [
          d('REQ-03.08.001', 'O sistema deve representar a integração por meio de um framework conceitual de conectores.'),
          d('REQ-03.08.002', 'O framework deve permitir associar um conector a uma SERVICE_TASK, RECEIVE_TASK ou MESSAGE_START_EVENT.'),
          d('REQ-03.08.003', 'O catálogo deve possuir os conectores REST e KAFKA habilitados para uso no MVP.'),
          d('REQ-03.08.004', 'O catálogo deve possuir conectores adicionais registrados como desabilitados, sem permitir seu uso em fluxos.'),
          d('REQ-03.08.005', 'O sistema deve persistir o tipo do conector e sua configuração específica de forma extensível.'),
        ],
      },
      {
        code: 'FT-03.09',
        name: 'Configuração REST e Kafka',
        requirements: [
          d('REQ-03.09.001', 'O sistema deve permitir configurar REST em SERVICE_TASK e RECEIVE_TASK.'),
          d(
            'REQ-03.09.002',
            'A configuração REST deve suportar método HTTP, URL, headers, parâmetros, body, mapeamento de entrada e mapeamento de saída.',
          ),
          d('REQ-03.09.003', 'O sistema deve permitir configurar KAFKA em SERVICE_TASK, RECEIVE_TASK e MESSAGE_START_EVENT.'),
          d('REQ-03.09.004', 'A configuração Kafka deve suportar tópico, operação, headers, payload, mapeamento de entrada e mapeamento de saída.'),
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
            'Headers devem ser editados como lista de pares nome/valor, não como texto declarativo livre; params/body/payload/mapeamentos permanecem declarativos.',
          ),
        ],
      },
    ],
  },
  {
    code: 'EP-04',
    name: 'Formulários (SDUI)',
    features: [
      {
        code: 'FT-04.01',
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
        ],
      },
      {
        code: 'FT-04.02',
        name: 'Componentes',
        requirements: [
          d('REQ-04.02.001', 'O sistema deve suportar componente de texto.'),
          d('REQ-04.02.002', 'O sistema deve suportar campo de entrada.'),
          d('REQ-04.02.003', 'O sistema deve suportar seleção simples.'),
          d('REQ-04.02.004', 'O sistema deve suportar seleção múltipla.'),
          d('REQ-04.02.005', 'O sistema deve suportar upload de arquivo.'),
          d('REQ-04.02.006', 'O sistema deve suportar conteúdo estático.'),
        ],
      },
      {
        code: 'FT-04.03',
        name: 'Reutilização',
        requirements: [
          d('REQ-04.03.001', 'O sistema deve permitir reutilizar formulários em múltiplas jornadas.'),
          d('REQ-04.03.002', 'O sistema deve permitir reutilizar formulários em múltiplas User Tasks.'),
        ],
      },
      {
        code: 'FT-04.04',
        name: 'Configuração',
        requirements: [
          d('REQ-04.04.001', 'O usuário deve poder definir campos obrigatórios.'),
          d('REQ-04.04.002', 'O usuário deve poder definir valores padrão.'),
          d('REQ-04.04.003', 'O usuário deve poder definir textos de ajuda.'),
        ],
      },
      {
        code: 'FT-04.05',
        name: 'Preview',
        requirements: [
          d('REQ-04.05.001', 'O sistema deve permitir visualizar o formulário durante a edição.'),
          d('REQ-04.05.002', 'O preview deve refletir alterações em tempo real.'),
        ],
      },
    ],
  },
  {
    code: 'EP-05',
    name: 'Simulação',
    features: [
      {
        code: 'FT-05.01',
        name: 'Execução',
        requirements: [
          todo('REQ-05.01.001', 'O sistema deve permitir executar simulações.'),
          todo('REQ-05.01.002', 'O sistema deve permitir informar dados de entrada para os formulários simulados.'),
          todo('REQ-05.01.003', 'O sistema deve permitir reiniciar simulações.'),
          todo(
            'REQ-05.01.004',
            'Antes de registrar um passo da simulação, o backend deve garantir que o nó executado pertença ao fluxo da mesma jornada associada à execução.',
          ),
        ],
      },
      {
        code: 'FT-05.02',
        name: 'Resultado',
        requirements: [
          todo('REQ-05.02.001', 'O sistema deve apresentar o caminho percorrido.'),
          todo('REQ-05.02.002', 'O sistema deve apresentar as User Tasks executadas.'),
          todo('REQ-05.02.003', 'O sistema deve apresentar os formulários exibidos.'),
          todo('REQ-05.02.004', 'O sistema deve apresentar o resultado final da simulação.'),
        ],
      },
      {
        code: 'FT-05.03',
        name: 'Visualização da execução',
        requirements: [
          todo('REQ-05.03.001', 'O sistema deve destacar o caminho percorrido durante a simulação.'),
          todo('REQ-05.03.002', 'O sistema deve destacar as User Tasks e os formulários executados.'),
        ],
      },
    ],
  },
  {
    code: 'EP-06',
    name: 'Versionamento de Jornadas',
    features: [
      {
        code: 'FT-06.01',
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
        code: 'FT-06.02',
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
        code: 'FT-06.03',
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
        code: 'FT-06.04',
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
        code: 'FT-06.05',
        name: 'Compatibilidade e limites do MVP',
        requirements: [
          d('REQ-06.05.001', 'O sistema deve preservar versões de jornadas desativadas.'),
          d('REQ-06.05.002', 'Jornadas existentes devem receber uma versão inicial durante a migração do modelo atual.'),
          d('REQ-06.05.003', 'O sistema deve preservar a compatibilidade das operações atuais de consulta e publicação.'),
          d('REQ-06.05.004', 'O sistema não deve permitir restauração ou rollback de versão no MVP.'),
          d('REQ-06.05.005', 'O sistema deve registrar a versão associada a cada publicação.'),
        ],
      },
    ],
  },
  {
    code: 'EP-07',
    name: 'Autenticação e Autorização',
    features: [
      {
        code: 'FT-07.01',
        name: 'Autenticação mockada por provedor externo',
        requirements: [
          d('REQ-07.01.001', 'O sistema deve representar a autenticação por meio de um provedor externo.'),
          mock('REQ-07.01.002', 'No MVP, a integração com o provedor externo deve ser mockada.'),
          d('REQ-07.01.003', 'O sistema deve disponibilizar uma tela de login padrão.'),
          d('REQ-07.01.004', 'A tela de login deve permitir informar usuário e senha.'),
          mock('REQ-07.01.005', 'O MVP deve disponibilizar o usuário mockado admin, com senha admin e perfil ADMIN.'),
          d('REQ-07.01.006', 'O sistema deve rejeitar credenciais diferentes das credenciais mockadas configuradas.'),
          d(
            'REQ-07.01.007',
            'O sistema deve indicar que a autenticação utilizada no MVP é mockada e não representa integração real com um provedor.',
          ),
        ],
      },
      {
        code: 'FT-07.02',
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
        code: 'FT-07.03',
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
        code: 'FT-07.04',
        name: 'Administração de usuários mockados',
        requirements: [
          mock('REQ-07.04.001', 'O sistema deve representar no MVP o usuário admin como usuário administrativo mockado.'),
          na('REQ-07.04.002', 'O sistema deve impedir a remoção do último usuário com papel ADMIN.'),
          d('REQ-07.04.003', 'O sistema deve permitir consultar o usuário autenticado e seu papel.'),
          d('REQ-07.04.004', 'O sistema deve deixar explícito que cadastro, alteração e persistência de usuários reais estão fora do MVP.'),
        ],
      },
    ],
  },
  {
    code: 'EP-08',
    name: 'Auditoria',
    features: [
      {
        code: 'FT-08.01',
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
        code: 'FT-08.02',
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
        code: 'FT-08.03',
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
        code: 'FT-08.04',
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
    code: 'EP-09',
    name: 'Ajuda e Suporte',
    features: [
      {
        code: 'FT-09.01',
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
    code: 'EP-10',
    name: 'Observabilidade',
    features: [
      {
        code: 'FT-10.01',
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
        code: 'FT-10.02',
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
        code: 'FT-10.03',
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
        code: 'FT-10.04',
        name: 'Preparação para integração com ELK',
        requirements: [
          d(
            'REQ-10.04.001',
            'O sistema deve estar tecnicamente preparado para o envio dos logs de aplicação a uma stack ELK (Elasticsearch/Logstash/Kibana), permanecendo essa integração desativada no MVP por não haver ambiente ELK disponível.',
          ),
          d('REQ-10.04.002', 'O sistema deve documentar o procedimento (how-to) para habilitar a integração com o ELK quando um ambiente estiver disponível.'),
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
    title: 'Produtividade Avançada',
    items: [
      'Criação rápida de elementos',
      'Seleção múltipla',
      'Duplicação em massa',
      'Criação automática de próximos passos',
    ],
  },
  {
    title: 'Reutilização',
    items: ['Clonagem de jornadas entre canais', 'Templates de jornadas', 'Biblioteca de componentes de formulário'],
  },
  {
    title: 'Simulação Avançada',
    items: ['Debug completo por etapa', 'Visualização dos dados de formulário por etapa'],
  },
  {
    title: 'Formulários Avançados',
    items: ['Seções', 'Exibição condicional', 'Organização dinâmica de campos'],
  },
  {
    title: 'Evolução da Gestão de Jornadas',
    items: ['Comparação (diff) visual entre versões de uma jornada'],
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
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-02.01.009 estendido: além de editar, uma jornada INACTIVE também não pode ser excluída de novo. DeleteJourney passou a checar journey.status == INACTIVE logo no início e lançar JourneyInactiveException (409), mesma exceção do bloqueio de edição — mensagem generalizada de "Cannot edit" para "Cannot modify an inactive journey" para cobrir os dois casos. Front: botão "Excluir" também desabilitado (cinza, sem clique) para jornadas INACTIVE em JourneysPage, ao lado do "Editar" já desabilitado.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-02.01.007 removido: reativar uma jornada INACTIVE deixou de fazer sentido, já que INACTIVE agora significa "jornada excluída" (REQ-02.01.005/008), não mais um estado reversível de "pausada". Removidos ActivateJourney (back), POST /journeys/{id}/activate, Journey.activate(), activateJourney (front) e o botão "Ativar" do grid de jornadas. REQ-02.01.009 novo em seu lugar: jornada INACTIVE não pode mais ser editada — UpdateJourney e UpdateFlow passam a checar journey.status == INACTIVE e lançam a nova JourneyInactiveException (409); front desabilita visualmente o botão "Editar" (IconAction ganhou suporte a disabled) para essas jornadas.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-02.01.005/006/008 revisados e VersionStatus.ARCHIVED aposentado, virando INACTIVE com significado novo. Antes, DeleteJourney bloqueava (409, JourneyDeletionBlockedException, removida) a exclusão de qualquer jornada que já tivesse sido publicada, mesmo há muito despublicada — bug relatado (jornada "Troca de titularidade 15", só com versões despublicadas/arquivadas, não podia ser excluída). Agora: se a jornada está PUBLISHED no momento, bloqueia (409, mesma guarda ActivePublicationPort.existsForJourney de DeactivateJourney); senão, se já foi publicada alguma vez, faz soft-delete — journey.deactivate() + JourneyVersion.deactivate() (novo status INACTIVE) em cada versão, tudo dentro de um @Transactional novo no método; senão (nunca publicada), exclusão física como antes. Migration V2__replace_archived_version_status_with_inactive.sql: converte as ARCHIVED existentes (só dado sintético de seed) para UNPUBLISHED, e a CHECK constraint passa a aceitar (DRAFT, PUBLISHED, UNPUBLISHED, INACTIVE). De quebra, corrigido bug latente: excluir fisicamente uma jornada nunca publicada falhava por violação de FK (suas journey_version/flow não eram apagadas antes) — DeleteJourney agora apaga essas dependências primeiro. Front: VersionStatus e o badge de status de versão trocam ARCHIVED/"Arquivada" por INACTIVE/"Inativa"; diálogo e toast de exclusão de jornada diferenciam exclusão física de soft-delete.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.04.011 revisado: qualquer versão UNPUBLISHED de uma jornada pode ser republicada agora, não só a mais recente. RepublishJourneyVersion simplificado — removida a checagem isLatestUnpublished e a exceção VersionNotLatestUnpublishedException (409, também removida do GlobalExceptionHandler); passou a só validar que a versão é UNPUBLISHED antes de delegar em PublishJourneyVersion.goLive. Front: botão "Republicar" agora aparece em toda versão UNPUBLISHED da lista, não só na mais recente.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.04.004/011 corrigidos: ao publicar uma nova versão (inclusive via republicação), a versão anteriormente PUBLISHED agora é marcada como UNPUBLISHED, não mais ARCHIVED — ARCHIVED fica reservado a versões legadas, sem uso em nenhum fluxo atual. PublishJourneyVersion.goLive passou a chamar previous.unpublish() em vez de previous.archive(); textos de requisito, comentários e o diálogo de confirmação de republicação (JourneysPage) atualizados de "arquivada" para "despublicada". Sem mudança de contagem de REQs (ambos continuam done), só de comportamento/redação.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.03.006 removido: a opção "Ver" (abria o snapshot JSON de uma versão em modal somente-leitura) foi tirada do grid de jornadas — decisão de produto, sem substituto no MVP. Registrada como fora de escopo, em nova seção "Evolução da Gestão de Jornadas" em ej-admin-requisitos.md §5, a comparação (diff) visual entre versões de uma jornada — não havia nada equivalente registrado até então.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.04.011/012 implementados: republicar a versão UNPUBLISHED mais recente de uma jornada. Backend: PublishJourneyVersion refatorado — extraído goLive(journeyId, version, previousStatus, auditAction) (validação de canal/produto ativos, checagem de flow, publicação no runtime, arquivamento da PUBLISHED atual) do antigo execute(), agora reaproveitado por execute() (DRAFT) e pelo novo RepublishJourneyVersion (UNPUBLISHED). RepublishJourneyVersion valida que a versão é UNPUBLISHED e que é a mais recente entre as UNPUBLISHED da jornada antes de delegar. Endpoint POST /journeys/{id}/versions/{versionId}/republish. Front: botão "Republicar" só na versão UNPUBLISHED mais recente, com ConfirmDialog cuja mensagem muda se já existe uma PUBLISHED que será substituída/arquivada. De quebra, corrigido texto desatualizado no diálogo de despublicar que ainda dizia "passa a arquivada".',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.04.011/012 novos (ainda não implementados): republicar a versão UNPUBLISHED mais recente de uma jornada, voltando-a a PUBLISHED sem alterar seu snapshot. Se já houver uma versão PUBLISHED na jornada (possível: publicar um DRAFT novo depois de despublicar deixa a versão antiga UNPUBLISHED coexistindo com a nova PUBLISHED), essa versão deve ser arquivada e o usuário avisado/consultado antes de confirmar a substituição — mesmo padrão de REQ-06.02.009/010. Republicar não é rollback: só a UNPUBLISHED mais recente pode ser republicada, ARCHIVED continua fora de alcance (REQ-06.05.004).',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'Migrations Flyway resetadas: as antigas V1...V9/V11 foram substituídas por uma única V1__baseline.sql com o schema final resultante de todas elas (motivo: um arquivo de migration antigo — V10__adjust_journey_versioning.sql, nunca commitado — havia rodado contra o banco local e ficado órfão no target/ após ser apagado, quebrando a inicialização do Flyway). Banco local journey_admin recriado do zero; histórico de flyway_schema_history reiniciado. Nenhuma mudança de comportamento da aplicação — é só reorganização das migrations.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.01.005/06.04.009 corrigidos: versão despublicada agora vira UNPUBLISHED, não ARCHIVED. Novo status UNPUBLISHED em VersionStatus (ARCHIVED continua reservado ao caso de a versão ser substituída por uma nova publicação); migration V11__add_unpublished_version_status.sql estende a CHECK constraint de journey_version.version_status; JourneyVersion ganhou unpublish() ao lado de archive(); UnpublishJourney passou a chamar unpublish() na versão PUBLISHED da jornada. Front: badge "Despublicada" para o novo status em JourneysPage. REQ-06.03.005 atualizado para citar o novo status.',
  },
  {
    date: '2026-08-09',
    source: 'progresso',
    summary:
      'REQ-06.02.009 redefinido: sincronização automática do DRAFT com o fluxo salvo, em vez de só criar uma versão nova quando a jornada estava PUBLISHED. JourneyVersion ganhou replaceContent(...) (permitido só em DRAFT); CreateJourneyVersion.execute agora decide entre atualizar a DRAFT existente in place (mesmo id/versionNumber) ou criar uma nova quando não há nenhuma; UpdateFlow chama isso incondicionalmente a cada salvamento de fluxo; PublishJourney (atalho legado) simplificado pelo mesmo motivo. Corrige o caso relatado: jornada nunca publicada, com fluxo desenhado no designer, cuja v1 (criada vazia junto com a jornada) nunca refletia o fluxo editado — o botão "Publicar" da versão ficava desabilitado (snapshot vazio) mesmo com o fluxo pronto.',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'REQ-06.04.010 novo: despublicação por versão. Endpoint POST /journeys/{id}/versions/{versionId}/unpublish + UnpublishJourneyVersion (valida que versionId é a versão PUBLISHED da jornada, senão 409 via nova VersionNotPublishedException; delega em UnpublishJourney para reaproveitar runtime-unpublish + arquivamento de versão + journey.unpublish(), em vez de duplicar a regra). Front: botão "Publicar" removido do nível de jornada no grid (JourneysPage) — publicação passa a existir só por versão; nova ação "Despublicar" na linha da versão PUBLISHED, que ao concluir recarrega tanto a lista de versões quanto a jornada (status e "vN publicada" ficam consistentes de imediato). EP-06 avança de 38/38 para 39/39 REQs; progresso geral de 93% (221/238) para 93% (222/239).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'REQ-06.04.009 novo: ao despublicar uma jornada (UnpublishJourney), a journey_version PUBLISHED correspondente agora é arquivada (ARCHIVED) antes de gravar journey.unpublish(), preservando o snapshot. Corrige inconsistência em que a versão continuava reportada como PUBLISHED (e o grid de jornadas continuava exibindo "vN publicada") mesmo depois da jornada ser despublicada. EP-06 avança de 37/37 para 38/38 REQs; progresso geral de 93% (220/237) para 93% (221/238).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'EP-10 (Observabilidade) novo e implementado por completo: 12/12 REQs. Log técnico de aplicação (distinto da auditoria de negócio do EP-08): HttpRequestLoggingFilter (entrada/saída de toda API, sem log de body, registrado no SecurityConfig antes do filtro de autenticação) e TransactionLoggingAspect (@Around sobre todo @Service de application.*, logando início/commit/rollback de cada transação de persistência). Correlação via X-Correlation-Id (reaproveitado do header ou gerado) propagada por MDC e incluída no pattern do novo logback-spring.xml, cobrindo tanto os logs de API quanto os de transação da mesma requisição/thread. Integração com ELK preparada mas desativada (sem ambiente ELK neste momento) — ver seção "HOW TO — habilitar integração com ELK" no EP-10 para o procedimento de ativação (dependência logstash-logback-encoder + appender TCP + variáveis de ambiente de destino). Build: no Spring Boot 4.1 o starter de AOP foi renomeado de spring-boot-starter-aop para spring-boot-starter-aspectj — usado o novo nome no pom.xml. Progresso geral de 95% (212/224) para 95% (224/236).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'EP-09 (Ajuda e Suporte) novo e implementado por completo: 5/5 REQs. Tela de ajuda estática (front/src/shell/HelpPage.tsx) com FAQ agrupado por tema, busca textual e link mailto:sustentacao@telefonica.com; acessível pelo item "Ajuda e suporte" da sidebar (antes um placeholder genérico). Simplificação deliberada: sem ajuda contextual por tela, sem canal de suporte com registro/consulta de solicitações e sem tela de diagnóstico — cortados do escopo por decisão de produto antes da implementação, não fazem parte do backlog. Progresso geral de 95% (207/219) para 95% (212/224).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'EP-06 (Versionamento de jornadas), EP-07 (Autenticação e autorização) e EP-08 (Auditoria) implementados, na ordem EP-07 → EP-06 → EP-08 (dependência: versão precisa de usuário autenticado; auditoria precisa de ambos). EP-06: tabela journey_version (V7) + backfill de jornadas existentes (V8), criação automática de versão DRAFT ao criar jornada, publicação de versão arquiva a anterior, snapshot imutável, painel de versões no designer de fluxo — 35/35 REQs. EP-07: token opaco em memória (Authorization: Bearer, expiração por inatividade configurável), usuário mockado admin/admin/ADMIN, papéis ADMIN/EDITOR/VIEWER aplicados via @PreAuthorize em todos os controllers, tela de login com aviso de autenticação mockada — 24/25 REQs (REQ-07.04.002 n/a, sem CRUD de usuário no MVP). EP-08: tabela audit_event (V9), gravação em login/logout/sessão, CRUD de produto/canal/jornada, versões, publicações e acessos negados, consulta com filtros e paginação restrita a ADMIN — 21/22 REQs (REQ-08.02.007 n/a, sem CRUD de papéis no MVP). De quebra, REQ-02.06.004 (que dependia do EP-06) passou de todo para done. Simplificações deliberadas: sem rollback/restauração de versão (REQ-06.05.004, fora de escopo); flow-designer continua editando o estado "vivo" da jornada, versionar tira um snapshot desse estado; ocultação de botões por papel na UI não foi replicada em todas as telas (enforcement real é no backend). Progresso geral de 57% para 95% (207/219; 2 n/a; restam apenas os 10 REQs do EP-05 Simulação).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'Escopo do MVP evoluído com EP-06 Versionamento de jornadas, EP-07 Autenticação e autorização e EP-08 Auditoria. A autenticação será representada por provedor externo mockado, com tela de login e usuário admin/admin no perfil ADMIN; os papéis ADMIN, EDITOR e VIEWER foram incluídos. Versões publicadas são imutáveis; restauração/rollback permanece fora do MVP; auditoria não armazena dados sensíveis. Total: 8 EPs, 42 FTs e 220 REQs; 126 concluídos e 94 todo (57%).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'REQ-04.01.006 novo: na seção "Formulário" do painel de propriedades (User Task), dois botões de ícone — "Novo formulário" (abre a aba Formulários já em modo de criação, via nova prop onOpenNewForm propagada de App.tsx → JourneysPage → JourneyDesignerPage → PropertiesDock → PropertiesPanel) e "Atualizar" (recarrega listForms() sem sair do editor de fluxo, via refreshForms). FormsPage.tsx ganhou suporte a abrir direto em modo \'new\' (props openNew/onOpenNewHandled), espelhando o padrão já existente de openFormId. Progresso geral de 93% para 93% (arredondamento; 127/137).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'REQ-03.09.009 novo: headers (REST e Kafka) ganharam editor dedicado de lista nome/valor (HeadersEditor em PropertiesPanel.tsx) em vez de ficarem dentro do bloco JSON "Configuração adicional". Params/body/payload/mapeamentos de entrada/saída continuam como JSON declarativo — decisão deliberada, já que o formato desses campos (ex.: linguagem de mapeamento) ainda não foi definido em nenhum requisito, então estruturar UI em cima de um contrato não fechado seria prematuro; headers, ao contrário, são sempre par chave/valor simples e universal. Progresso geral de 93% para 93% (arredondamento; 126/136).',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'Refinamento de conectores após revisão de domínio, com 2 REQs novos (REQ-03.09.007/008): (1) REST deixou de ser oferecido para MESSAGE_START_EVENT — sua config representa uma chamada de saída (método+URL), o que não bate com "iniciar o fluxo a partir de uma mensagem recebida"; só KAFKA continua disponível para esse tipo. (2) A operação Kafka deixou de ser uma escolha livre: agora é implícita pelo tipo de nó (SERVICE_TASK → PRODUCE, RECEIVE_TASK/MESSAGE_START_EVENT → CONSUME), com o campo virando somente-leitura no front. (3) Removida a menção a "fila" na config Kafka (REQ-03.09.004) — Kafka só tem tópico. Implementado em model.ts (CONNECTOR_TYPES_BY_NODE, KAFKA_OPERATION_BY_NODE) e FlowValidator (rejeita REST em MESSAGE_START_EVENT e operação divergente do tipo, ambos 422). Também: painel de propriedades reorganizado em PropertiesDock.tsx (sempre visível, colapsável, redimensionável só na largura, sem botão de fechar), sincronizado com a seleção no canvas; multi-seleção não desenha mais a caixa de agrupamento; novos nós usam findFreeSpot para não empilhar. Progresso geral de 92% para 93%.',
  },
  {
    date: '2026-08-08',
    source: 'progresso',
    summary:
      'EP-03 (Modelagem Visual) fechado a 100%: FT-03.07/08/09 (18 REQs, incluindo o REQ-03.02.007 que já estava implementado mas não rastreado aqui) implementados por completo. Backend: FlowNodeType ganhou SERVICE_TASK/RECEIVE_TASK/MESSAGE_START_EVENT; novos ConnectorType (REST/KAFKA habilitados, SOAP desabilitado como placeholder) e ConnectorConfig (tipo + config declarativa Map<String,Object> + credentialRef, sem secret) associáveis a esses 3 tipos; FlowValidator estendido (elemento inicial = START ou MESSAGE_START_EVENT, grau de entrada/saída dos novos tipos, conector desabilitado vira violação 422); persistência via JSONB já existente, sem migration nova; snapshot de publicação propaga connectorConfig automaticamente (reaproveita FlowNode/FlowNodeRecord). Frontend: novos tipos no canvas (paleta lateral, ícone, cor, quick-add) e formulário de conector no PropertiesPanel (campos dedicados de método/URL para REST e tópico/operação para Kafka, mais um bloco JSON para headers/params/body/payload/mapeamentos). Corrigido de quebra o REQ-03.01.005: Flow.initial criava START+END já conectados na criação da jornada; agora só cria o START, como o requisito manda. Progresso geral de 80% para 92% (só falta EP-05 Simulação).',
  },
  {
    date: '2026-08-03',
    source: 'progresso',
    summary:
      'EP-06 (Publicação) + EP-07 (Publicação no Runtime) implementados por completo: 16/16 REQs. Backend novo (domain/application/infrastructure/interfaces para publication, migration V6__create_journey_publication.sql, endpoints POST /journeys/{id}/publish|unpublish, filtro ?status= em GET /journeys) e mock do runtime (MockRuntimePublicationAdapter, sempre "sucede"). Isso também deu implementação real aos guard-rails que ficaram stubados até aqui (ActivePublicationPort/HasEverBeenPublishedPort, antes sempre false), fechando de quebra REQ-01.04.003/004/005 e REQ-02.01.006 (eram in_progress) e REQ-02.05.002/003 (eram blocked, já satisfeitos desde EP-03/EP-04). Sem menu novo: publicar/despublicar vive na listagem de Jornadas (JourneysPage), reaproveitando filtros de produto/canal/busca já existentes para o "catálogo de publicações" (basta filtrar por status "Publicadas"). Progresso geral de 69% para 88%, zerando os in_progress/blocked restantes.',
  },
  {
    date: '2026-08-03',
    source: 'progresso',
    summary:
      'EP-04 (Formulários/SDUI) implementado por completo: 18/18 REQs. Backend novo (domain/application/infrastructure/interfaces/form, migration V5__create_form.sql, CRUD /api/v1/forms) e frontend novo (front/src/forms/FormsPage.tsx + FormBuilderPage.tsx, api/forms.ts, item "Formulários" na sidebar). FlowNode.formId (já existente no backend) agora é editável de fato: PropertiesPanel ganhou o seletor "Formulário associado" para nós User Task e JourneyDesignerPage para de mandar formId: null fixo. EP-04 avança de 0% para 100%; progresso geral de 55% para 69%.',
  },
  {
    date: '2026-08-02',
    source: 'progresso',
    summary:
      'Implementados REQ-03.04.004 (copiar) e REQ-03.04.005 (duplicar) via atalhos Ctrl+C/Ctrl+V/Ctrl+D e botão "Duplicar nó" no NodePropertiesPanel, restritos a User Tasks (START/END mantêm regra de unicidade). REQ-03.06.001 (autosave) marcado como n/a: decisão de produto de não implementar no MVP, salvamento permanece manual. EP-03 avança para 25/26 (96%).',
  },
  {
    date: '2026-08-02',
    source: 'progresso',
    summary:
      'Atualização do EP-03 (Modelagem Visual) com base na implementação do Flow Designer: 23/26 REQs concluídos (nós START/END/USER_TASK, conexões, validação estrutural client+server com 422, navegação, drag-and-drop, zoom/pan/fit, undo/redo). Restam todo: copiar elementos, duplicar elementos e salvamento automático.',
  },
  {
    date: '2026-08-02',
    source: 'progresso',
    summary: 'Sincronização com ej-admin-requisitos.md: 122 REQs em 8 EPs / 28 FTs, todos como todo.',
  },
];

// Gerado a partir de `git log --reverse --pretty=format:'%ad|%s' --date=short` na branch main.
// Ordem: mais recente primeiro. Ao ressincronizar, apenas acrescente os commits novos no topo.
const CHANGELOG_GIT: ChangelogEntry[] = [
  { date: '2026-08-09', source: 'git', summary: 'EP-06 (Versionamento de jornadas) refinado e reimplementado.', epics: ['EP-06'] },
  { date: '2026-08-08', source: 'git', summary: 'SKILL de sincronização e página estática "Sobre" com o progresso do MVP.' },
  {
    date: '2026-08-08',
    source: 'git',
    summary: 'Implementação do EP-10 Observabilidade (logs de requisição, transação e correlação).',
    epics: ['EP-10'],
  },
  { date: '2026-08-08', source: 'git', summary: 'Implementação do EP-09 Ajuda e suporte.', epics: ['EP-09'] },
  {
    date: '2026-08-08',
    source: 'git',
    summary: 'Remoção do evento de auditoria log_audit para operações de consulta e tratamento de restart de sessão.',
    epics: ['EP-08'],
  },
  {
    date: '2026-08-08',
    source: 'git',
    summary: 'Implementação de Versionamento, autenticação, autorização e auditoria (EP-06/07/08).',
    epics: ['EP-06', 'EP-07', 'EP-08'],
  },
  { date: '2026-08-08', source: 'git', summary: 'Inclusão de novos épicos no escopo do MVP.' },
  { date: '2026-08-08', source: 'git', summary: 'Ajuste do formato dos requisitos.' },
  {
    date: '2026-08-08',
    source: 'git',
    summary: 'EP-03 Modelagem Visual: inclusão de conectores e novos tipos de componentes; enriquecimento de requisitos.',
    epics: ['EP-03'],
  },
  {
    date: '2026-08-08',
    source: 'git',
    summary: 'Inclusão do componente Service Task e refinamentos na modelagem visual.',
    epics: ['EP-03'],
  },
  { date: '2026-08-03', source: 'git', summary: 'Melhorias na gestão de produtos e canais.', epics: ['EP-01'] },
  { date: '2026-08-03', source: 'git', summary: 'Remoção do EP-08 do escopo (posteriormente reintroduzido).' },
  {
    date: '2026-08-03',
    source: 'git',
    summary: 'Implementação inicial dos EP-06 e EP-07 (versionamento e autenticação/autorização).',
    epics: ['EP-06', 'EP-07'],
  },
  { date: '2026-08-03', source: 'git', summary: 'Refinamentos do EP-04 Formulários (SDUI).', epics: ['EP-04'] },
  {
    date: '2026-08-03',
    source: 'git',
    summary: 'Implementação inicial do EP-04 Formulários (SDUI).',
    epics: ['EP-04'],
  },
  { date: '2026-08-03', source: 'git', summary: 'Ajustes e refinamentos de requisitos do EP-03.', epics: ['EP-03'] },
  { date: '2026-08-03', source: 'git', summary: 'Exclusão do requisito de auto-save do EP-03.', epics: ['EP-03'] },
  { date: '2026-08-03', source: 'git', summary: 'Configuração da estruturação de skills para front e back.' },
  {
    date: '2026-08-03',
    source: 'git',
    summary: 'Ajustes de temas e layouts (light/dark) e refinamentos no EP-03.',
    epics: ['EP-03'],
  },
  { date: '2026-08-02', source: 'git', summary: 'Refinamentos no EP-03 Modelagem Visual.', epics: ['EP-03'] },
  { date: '2026-08-02', source: 'git', summary: 'Implementação inicial do EP-03 Modelagem Visual.', epics: ['EP-03'] },
  {
    date: '2026-08-02',
    source: 'git',
    summary: 'Commit inicial: estrutura do Admin Portal (front, back) e implementação dos épicos iniciais.',
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
