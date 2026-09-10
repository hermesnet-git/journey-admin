# Refatoração do Form Builder — versão 1

Data do levantamento: 2026-09-08.

## 1. Premissas arquiteturais

O Portal Administrativo opera exclusivamente em tempo de design. Ele permite desenhar jornadas e telas SDUI, validar o contrato e publicar uma especificação independente de tecnologia.

No Portal Administrativo:

- não existe emulador de canal;
- não são executados aplicativos React Native, Flutter ou integrações de WhatsApp;
- não devem ser reutilizados código, renderizadores, adapters, serviços ou decisões de infraestrutura do emulador de canais;
- existe um simulador visual em React para ajudar o autor a compreender a projeção provável da tela;
- o simulador trabalha somente com os canais funcionais `WEB`, `MOBILE` e `WHATSAPP`;
- a simulação não garante fidelidade visual ou comportamental com uma tecnologia consumidora específica;
- o contrato SDUI e o Component Registry são os únicos pontos de integração conceitual entre o Portal e os futuros consumidores.

O emulador de canais é uma aplicação externa ao Portal, criada para validar se a proposta do Elastic Journey pode ser consumida por tecnologias reais. Ele não faz parte do Form Builder e não deve se tornar sua dependência.

## 2. Objetivo do Form Builder

O Form Builder deve permitir que um usuário de negócio ou designer:

1. desenhe uma tela associada a uma Tarefa de Usuário;
2. escolha componentes do catálogo SDUI;
3. configure propriedades, vínculos, eventos, visibilidade e estado ativo;
4. visualize uma simulação coerente para Web, Mobile e WhatsApp;
5. identifique incompatibilidades antes da publicação;
6. publique uma especificação canônica, sem conhecimento da tecnologia que irá renderizá-la.

## 3. Estrutura atual

O Form Builder é o painel inferior do editor de jornadas.

| Área | Responsabilidade atual |
| --- | --- |
| `JourneyDesignerPage` | Mantém fluxo, seleção, histórico, salvamento e validação. |
| `FormPreviewDock` | Hospeda Build, Preview, seleção de canal e navegação entre Tarefas de Usuário. |
| `form-builder/FormBuilder` | Coordena a construção visual da tela, incluindo paleta, canvas, camadas, propriedades e drag-and-drop. |
| `form-builder/ComponentPalette` | Consulta o catálogo e oferece os componentes disponíveis para inclusão. |
| `form-builder/FormCanvas` | Edita a árvore da tela e mostra uma representação visual dos componentes. |
| `form-builder/LayerPanel` | Mostra a hierarquia da tela e permite ordenar componentes. |
| `form-builder/PropertyInspector` | Edita propriedades, valores, ações, visibilidade e estado ativo. |
| `form-preview/FormDesignPreview` | Coordena os previews funcionais de Web, Mobile e WhatsApp. |

O diretório `sdui` não contém o Form Builder. Ele concentra o catálogo, seus contratos, metadados e regras compartilhadas. O diretório `flow-designer/form-builder` contém exclusivamente a experiência de construção em tempo de design e depende do catálogo SDUI sem fazer parte dele. O preview possui ciclo próprio em `flow-designer/form-preview`.

Cada Tarefa de Usuário possui no máximo uma árvore `embeddedScreenRoot`, cuja raiz obrigatória é `ui.screen`.

Durante a autoria, a árvore é normalizada em objetos. A conversão para o envelope canônico e para as tuplas SDUI ocorre na publicação. Essa transformação é responsabilidade do Admin Backend, não do simulador visual.

## 4. Catálogo e criação de componentes

Comportamento atual:

- as definições são carregadas do Component Registry;
- categoria, versão, propriedades e eventos vêm do catálogo;
- componentes `REMOVED` não aparecem na paleta;
- `ui.screen` é criado como raiz e não aparece como item arrastável;
- novos componentes recebem os valores padrão de `propsSchema`;
- componentes podem ser adicionados por clique ou drag-and-drop;
- o editor verifica apenas se o destino aceita filhos;
- `allowedChildTypes` não é aplicado na inserção nem validado pelo backend;
- a criação da raiz seleciona a primeira definição `ui.screen` recebida, sem uma regra determinística para escolher a versão vigente.

## 5. Propriedades e comportamentos

O painel atual sempre apresenta cinco abas: Propriedades, Vínculo, Eventos, Visibilidade e Ativo.

### 5.1 Propriedades

- Os campos são gerados por `PropDescriptor.kind`.
- Há controles para texto, número, booleano, enum, token, opções e validações.
- Propriedades obrigatórias são verificadas no backend, mas não recebem tratamento suficiente durante a edição.
- O catálogo atual declara propriedades por componente, não por canal.

### 5.2 Vínculos

- A interface autora somente `$bindings.value`.
- São aceitos `form`, `data`, `session`, `route` e `computed`.
- O editor oferece `oneWay` e `twoWay` sem considerar o tipo do componente.
- Componentes de entrada são rejeitados posteriormente caso não usem `form.*` e `twoWay`.
- A aba aparece inclusive para componentes em que vínculo de valor não faz sentido.

### 5.3 Eventos

- Os eventos possíveis vêm do Component Registry.
- O usuário escolhe uma ação do Action Registry.
- Parâmetros são pares livres de chave e valor.
- Existem dicas, mas não formulários e validações específicos por ação.

### 5.4 Visibilidade e estado ativo

- `$visibility` e `$active` usam o mesmo formato declarativo.
- São suportados `equals`, `notEquals`, `in` e `notIn`.
- Jornadas multicanal recebem um atalho baseado em `session.channel`.
- A aba Ativo reutiliza textos escritos para Visibilidade, o que prejudica a compreensão.
- O backend verifica se resta conteúdo visível em cada canal declarado pela jornada.

## 6. Simulação atual

O seletor atual apresenta Web, Mobile e WhatsApp, mas internamente ainda usa nomes e decisões relacionadas a tecnologias específicas. Isso deve ser removido da camada de design.

| Canal funcional | Comportamento atual | Interpretação correta |
| --- | --- | --- |
| Web | Simulação React em largura de navegador. | Representação funcional aproximada de uma experiência Web. |
| Mobile | Simulação React em largura reduzida. | Representação funcional aproximada de uma experiência Mobile, sem afirmar React Native ou Flutter. |
| WhatsApp | Árvore achatada em bolhas, listas e ações. | Projeção conversacional aproximada do contrato SDUI. |

A simulação deve responder à pergunta “como esta tela se comporta neste canal?”, não “como esta tecnologia específica irá renderizar a tela?”.

## 7. Compatibilidade por canal já implementada

Este ponto deve ser revisitado antes da frente “Exibir somente componentes e propriedades compatíveis com o canal selecionado”. Já existe uma implementação e precisamos decidir o que preservar ou substituir.

Hoje:

- a seleção funcional de Web, Mobile ou WhatsApp é convertida internamente para um alvo tecnológico representativo;
- a paleta mantém todos os componentes visíveis e sinaliza os incompatíveis;
- o canvas e o painel de propriedades repetem o alerta;
- o usuário ainda pode adicionar e configurar o componente sinalizado;
- `$visibility` permite criar variações por `session.channel` numa única árvore;
- o backend calcula `supportedTargets` do envelope com base no catálogo e nos canais da jornada.

O problema não é a existência de `supportedTargets` no catálogo. Essa informação continua necessária para publicação e governança. O problema é usá-la diretamente no designer como se o usuário estivesse escolhendo uma tecnologia concreta.

## 8. Modelo recomendado para design-time

### 8.1 Canal de autoria

O Form Builder deve trabalhar com um `DesignChannel` de domínio:

- `WEB`;
- `MOBILE`;
- `WHATSAPP`.

Somente canais pertencentes à jornada devem aparecer no seletor. Em jornada com um único canal, ele deve aparecer como contexto fixo; em jornada multicanal, o usuário pode alternar a simulação.

### 8.2 Compatibilidade agregada

O Admin Backend deve traduzir os detalhes tecnológicos do Component Registry para uma situação funcional por canal adequada ao designer.

Sugestão de estados:

- `COMPATIBLE`: existe representação válida para o canal;
- `PARTIAL`: o canal preserva a função, mas descarta ou adapta parte da apresentação;
- `INCOMPATIBLE`: não existe representação funcional aceitável;
- `PENDING`: compatibilidade ainda não homologada.

Essa projeção deve ser derivada do contrato do catálogo, e não do emulador. O frontend não deve escolher arbitrariamente `react.web` para representar Web ou `react.mobile` para representar Mobile.

Para Web e Mobile, precisamos discutir a regra de agregação quando os targets tecnológicos do catálogo têm estados diferentes. Exemplos:

Decisão tomada: o componente é funcionalmente compatível com o canal quando pelo menos um target tecnológico associado a esse canal estiver com status `SUPPORTED`.

| Canal de design | Regra de compatibilidade funcional |
| --- | --- |
| `WEB` | Compatível quando `react.web` ou `flutter.web` estiver `SUPPORTED`. |
| `MOBILE` | Compatível quando `react.mobile` ou `flutter.mobile` estiver `SUPPORTED`. |
| `WHATSAPP` | Compatível quando `whatsapp` estiver `SUPPORTED`. |

Precedência recomendada quando nenhum target estiver suportado:

1. se algum target estiver `PLANNED`, o estado funcional é `PENDING`;
2. se todos os targets estiverem `UNSUPPORTED` ou ausentes, o estado funcional é `INCOMPATIBLE`.

O Portal não exige paridade entre React e Flutter para permitir a autoria. Os renderers concretos e a governança do Component Registry são responsáveis por garantir o suporte declarado. A simulação do Admin permanece tecnologicamente e visualmente neutra.

### 8.3 Simuladores independentes

O Admin Front deve possuir simuladores próprios e deliberadamente simples:

- `WebDesignSimulator`;
- `MobileDesignSimulator`;
- `WhatsAppDesignSimulator`.

Eles podem compartilhar primitivas internas do próprio Admin, mas não devem importar pacotes do emulador ou SDKs dos canais reais.

Cada simulador interpreta o mesmo modelo de autoria e deve:

- demonstrar hierarquia, conteúdo, entrada e ações;
- aplicar tokens de design suficientes para orientar o autor;
- aplicar `$visibility` e `$active` com contexto fictício controlado;
- evidenciar adaptações e perdas semânticas;
- informar claramente que se trata de simulação de design.

## 9. Estado atual da refatoração

### 9.1 Entregas concluídas

- adoção dos canais funcionais `WEB`, `MOBILE` e `WHATSAPP` no tempo de design, sem acoplamento do Form Builder a React, Flutter ou ao emulador de canais;
- seletor de preview limitado aos canais declarados pela jornada, com contexto fixo quando existe apenas um canal;
- regra de compatibilidade funcional agregada: Web ou Mobile é compatível quando ao menos um renderer tecnológico correspondente está `SUPPORTED`;
- separação de responsabilidades entre o domínio SDUI e os previews pertencentes ao Flow Designer;
- previews independentes para Web, Mobile e WhatsApp, todos implementados internamente no Admin Front;
- exibição das áreas Valor, Ações, Visibilidade e Estado conforme `allowedReservedFields` do catálogo;
- configuração orientada de bindings, exigindo `form.*` e `twoWay` para componentes de entrada;
- exigência de `onPress` para botão e link, com validação final no Admin Backend;
- indicação de propriedades obrigatórias durante a autoria;
- aplicação de `allowedChildTypes` no clique, no drag-and-drop e na validação do Admin Backend;
- diferenciação entre componentes sistêmicos e customizados, impedindo a exclusão dos sistêmicos;
- catálogo sistêmico de fábrica com 19 componentes estáveis;
- jornada “Laboratório Multicanal de Componentes” para validar todos os componentes nos três canais;
- seleção determinística da versão vigente de cada componente: maior versão `STABLE`, usando a maior `EXPERIMENTAL` apenas quando não existe versão estável;
- separação entre catálogo de inclusão e catálogo de resolução: novos componentes usam a versão vigente, enquanto componentes existentes são resolvidos por `type@version` exatos;
- preservação de componentes cuja definição não seja encontrada, acompanhada de diagnóstico explícito no editor e sem migração silenciosa.
- correção da fronteira física do frontend: catálogo e contrato permanecem em `sdui`, construção em `flow-designer/form-builder` e previews em `flow-designer/form-preview`;
- primeira camada do redesenho estrutural, com canvas prioritário, paleta e inspetor recolhíveis, estrutura da tela obrigatória, seletor textual de canal e modo Preview livre das ferramentas de design.
- paleta de componentes aprimorada com busca por nome, tipo e finalidade, categorias recolhíveis, contadores, descrições funcionais, versão discreta, identificação de itens experimentais e estados vazios orientativos.
- canvas de construção aprimorado com blocos funcionais, resumo do conteúdo configurado, seleção destacada, hierarquia visual e áreas de soltura mais evidentes; a reordenação posicional direta permanece como evolução separada.
- navegação contextual entre Tarefas de Usuário com acesso direto por lista, posição atual, estado da tela e limites não circulares; canal e modo permanecem preservados durante a navegação.
- toda Tarefa de Usuário nasce com uma raiz `ui.screen` obtida do catálogo; o Form Builder fica disponível imediatamente e o backend impede salvar tarefas sem tela.
- modos Design e Preview preservam o contexto de autoria. O canal selecionado é um contexto comum: no Design orienta compatibilidade e composição; no Preview escolhe a representação funcional, sem transformar o preview em simulador.
- painel de propriedades reorganizado com cabeçalho contextual, nomes funcionais em português, agrupamentos, controles apropriados e metadados de autoria em três níveis: específico, genérico e fallback automático para novidades do catálogo.

### 9.2 Plano organizado em 15 passos

| Passo | Trabalho | Situação |
| ---: | --- | --- |
| 1 | Selecionar deterministicamente a versão vigente do catálogo e preservar a resolução das versões já utilizadas. | Concluído |
| 2 | Redesenhar estruturalmente o Form Designer, melhorando a distribuição do canvas, paleta, camadas e propriedades. | Em validação visual |
| 3 | Aprimorar a paleta com busca, categorias, descrições funcionais, status e compatibilidade mais claros. | Em validação visual |
| 4 | Tornar o canvas de construção mais próximo da tela resultante, com seleção, hierarquia e áreas de drop mais evidentes. | Em validação visual |
| 5 | Reorganizar o painel de propriedades com nomes funcionais em português, agrupamentos e controles apropriados. | Em validação visual |
| 6 | Melhorar a navegação entre Tarefas de Usuário e canais, preservando o contexto de autoria. | Em validação visual |
| 7 | Refinar a separação entre os modos Design e Preview, mantendo o canal como contexto comum aos dois. | Em validação visual |
| 8 | Evoluir os previews de Web, Mobile e WhatsApp mantendo sua natureza funcional e independente de frameworks. | Próximo |
| 9 | Criar contexto fictício editável para `form`, `data`, `session`, `route` e `computed`. | Pendente |
| 10 | Criar editores orientados para os parâmetros de cada ação normativa, eliminando pares livres onde houver contrato conhecido. | Pendente |
| 11 | Antecipar no frontend as validações de propriedades, enums, tokens, bindings, ações e composição. | Pendente |
| 12 | Oferecer experiência guiada para telas novas, incluindo estado vazio e modelos iniciais. | Pendente |
| 13 | Melhorar o feedback operacional de salvamento, pendências, erros por componente, confirmações e histórico. | Pendente |
| 14 | Revisar os textos do portal para remover linguagem técnica, referências desatualizadas e detalhes de implementação. | Pendente |
| 15 | Validar designer e preview com a jornada Laboratório Multicanal em Web, Mobile e WhatsApp. | Pendente |

### 9.3 Refinamentos do catálogo identificados durante o Form Builder

Os pontos abaixo devem ser retomados em uma frente própria, pois afetam o contrato do catálogo, a massa de fábrica e os renderizadores:

1. apresentar design tokens por nomes funcionais no Form Builder, mantendo o valor canônico em informação secundária; por exemplo, exibir “Médio” para `spacing.md`;
2. revisar propriedades cadastradas como `TEXT` que representam conjuntos fechados de valores e deveriam ser `ENUM`;
3. começar essa revisão por `ui.button.variant` e `ui.button.size`, atualmente livres no catálogo;
4. homologar os valores canônicos de estilo e tamanho antes de transformá-los em seletores, garantindo equivalência entre os canais;
5. revisar sistematicamente as demais propriedades `TEXT` com comportamento enumerável, sem inferir restrições apenas no Form Builder;
6. preservar a diferença funcional entre `$visibility`, que remove o componente da apresentação, e `$active`, que mantém o componente visível, porém sem interação quando a condição resultar em falso;
7. manter `disabled` como desativação estática, com precedência sobre a condição declarada em `$active`.

Até esse refinamento ser homologado no catálogo, o Form Builder deve respeitar o `kind` efetivamente registrado e não limitar valores por conta própria.

O passo 2 deve ser discutido visualmente antes da implementação, pois sua estrutura condiciona as melhorias dos passos 3 a 8.

## Apêndice A — Melhorias identificadas no levantamento inicial

### Prioridade 1 — corrigir o domínio do designer

1. Substituir `PreviewTarget` por um conceito como `DesignChannel`.
2. Remover do Form Builder referências a React, Flutter, adapters ou implementações do emulador.
3. Limitar o seletor aos canais declarados pela jornada.
4. Definir automaticamente o canal inicial de forma determinística.
5. Manter a seleção ao navegar entre Tarefas de Usuário.

### Prioridade 2 — tornar o catálogo determinístico

1. Selecionar explicitamente a versão vigente de `ui.screen`.
2. Não depender da ordem da resposta da API.
3. Aplicar `allowedChildTypes` durante clique, drag-and-drop e validação no backend.
4. Indicar componentes `EXPERIMENTAL`, `DEPRECATED` e `REMOVED` de maneira coerente.

### Prioridade 3 — decidir a experiência de compatibilidade

Antes de implementar, avaliar o comportamento existente e responder:

1. componente incompatível deve ser ocultado, desabilitado ou apenas sinalizado?
2. componentes parcialmente representáveis devem continuar disponíveis?
3. como explicar adaptações do WhatsApp sem expor detalhes de adapter?
4. como tratar uma única árvore multicanal com `$visibility`?
5. incompatibilidade deve bloquear publicação ou apenas retirar o canal dos alvos publicados?

Recomendação inicial: não ocultar componentes. Exibi-los com estados claros preserva a compreensão do catálogo e evita esconder componentes já usados em outra variação da mesma árvore. A decisão final depende das respostas acima.

### Prioridade 4 — contextualizar o painel de propriedades

1. Mostrar Vínculo somente quando o componente admitir binding.
2. Restringir campos de entrada a `form.*` e `twoWay` já durante a edição.
3. Mostrar Eventos somente quando houver eventos declarados.
4. Exigir `onPress` durante a configuração de botão e link.
5. Diferenciar os textos e a semântica das abas Visibilidade e Ativo.
6. Indicar propriedades obrigatórias e erros junto ao campo.
7. Não filtrar propriedades por canal enquanto isso não estiver modelado formalmente no catálogo.

### Prioridade 5 — melhorar os simuladores

1. Tornar Web e Mobile visualmente distintos sem associá-los a frameworks.
2. Manter a projeção conversacional própria do Admin para WhatsApp.
3. Centralizar no Admin as regras usadas pelos três simuladores para evitar divergência interna.
4. Criar um contexto fictício editável para testar bindings, `$visibility` e `$active` em design-time.
5. Exibir no simulador avisos de adaptação, conteúdo omitido e comportamento parcial.

### Prioridade 6 — antecipar validações

1. Executar validações locais durante a edição.
2. Manter o backend como autoridade final.
3. Apresentar erros por componente e propriedade, além da lista geral da jornada.
4. Validar tipos, enums, tokens, parâmetros de ações e restrições de filhos.
5. Diferenciar erro impeditivo, alerta de compatibilidade e informação de adaptação.

### Prioridade 7 — alinhar documentação interna

Revisar textos da área “Sobre” que ainda afirmam que a árvore editada é publicada sem transformação ou que a execução usa a última revisão. O comportamento vigente publica o envelope canônico e resolve snapshots pela versão exata da jornada.

## Apêndice B — Sequência originalmente recomendada

1. Formalizar `DesignChannel` e a regra de seleção de canal no Form Builder.
2. Implementar a agregação aprovada: qualquer target `SUPPORTED` torna o componente compatível com o canal.
3. Corrigir versão vigente e restrições estruturais do catálogo.
4. Implementar a política aprovada para paleta e propriedades.
5. separar e aprimorar os três simuladores internos do Admin.
6. antecipar validações e melhorar a apresentação dos erros.
7. revisar a documentação embutida.
