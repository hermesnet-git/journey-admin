# Levantamento do Form Builder — estado atual

Data do levantamento: 2026-09-08.

## 1. Objetivo desta frente

Registrar como o Form Builder de telas SDUI funciona hoje, quais responsabilidades já estão implementadas e quais lacunas devem ser discutidas antes de alterar a experiência de autoria.

Este documento é um diagnóstico. Ele não define ainda a solução das próximas frentes.

## 2. Onde o Form Builder está localizado

O Form Builder não é uma aplicação isolada. Ele é o painel inferior do editor de jornadas e edita a tela embutida de uma Tarefa de Usuário.

| Área | Responsabilidade atual |
| --- | --- |
| `JourneyDesignerPage` | Mantém o fluxo, seleção do nó, histórico, salvamento e validação. |
| `FormPreviewDock` | Hospeda os modos Build e Preview, seletor de alvo e navegação entre Tarefas de Usuário. |
| `SduiScreenEditor` | Coordena paleta, árvore, camadas, propriedades e drag-and-drop. |
| `SduiComponentPalette` | Lista componentes do Component Registry por categoria. |
| `SduiTreeCanvas` | Edita a árvore normalizada e exibe uma prévia simplificada dos componentes folha. |
| `SduiLayersPanel` | Exibe a hierarquia e permite mover irmãos para cima ou para baixo. |
| `SduiPropertiesPanel` | Edita propriedades, vínculo, eventos, visibilidade e estado ativo. |

## 3. Modelo de autoria atual

- Cada Tarefa de Usuário possui no máximo uma árvore `embeddedScreenRoot`.
- A raiz obrigatória é `ui.screen`.
- Durante a autoria a árvore usa objetos normalizados com `id`, `type`, `version`, `props`, `bindings`, `events`, `visibility`, `active` e `children`.
- A conversão para o envelope canônico e para tuplas Hiccup ocorre somente durante a publicação.
- Alterações estruturais entram no mesmo histórico de desfazer/refazer do fluxo.
- Alterações de propriedades não criam atualmente um marco próprio de histórico.

## 4. Catálogo e criação de componentes

- As definições são carregadas de `GET /component-definitions` ao montar o editor.
- A paleta é orientada por dados do Component Registry; categorias, versão, propriedades e eventos não são mantidos em uma lista paralela no Form Builder.
- Definições com status `REMOVED` e `ui.screen` não aparecem na paleta.
- Um novo componente recebe os valores padrão declarados em `propsSchema`.
- A criação de uma tela escolhe a primeira definição `ui.screen` devolvida pela API; não há seleção explícita da versão mais adequada.
- Componentes podem ser adicionados por clique ou drag-and-drop.
- O editor verifica se o destino aceita filhos, mas não aplica `allowedChildTypes` durante a inserção.
- O drag-and-drop sempre insere no final do container. A ordenação precisa é feita posteriormente pelo painel de camadas.

## 5. Propriedades e comportamento

O painel apresenta sempre cinco abas:

1. Propriedades;
2. Vínculo;
3. Eventos;
4. Visibilidade;
5. Ativo.

### Propriedades

- Os controles são gerados conforme `PropDescriptor.kind`: texto, número, booleano, enum, token, lista de opções e lista de validações.
- Valores obrigatórios são validados no backend, mas não têm indicação visual nem bloqueio imediato específico no editor.
- O editor não diferencia propriedades por canal ou alvo de renderização.

### Vínculos

- A interface autora somente `$bindings.value`.
- Os namespaces disponíveis são `form`, `data`, `session`, `route` e `computed`.
- O usuário pode selecionar `oneWay` ou `twoWay` para qualquer componente, embora componentes de entrada exijam `form.*` e `twoWay` na validação de publicação.
- A aba também aparece para componentes que não coletam valor.

### Eventos

- Os eventos disponíveis vêm da definição do componente.
- As ações são escolhidas entre as seis ações do catálogo.
- Os parâmetros são editados como pares genéricos chave/valor.
- Há dicas textuais, mas não há formulário tipado ou validação imediata específica para os parâmetros de cada ação.

### Visibilidade e estado ativo

- `$visibility` e `$active` usam atualmente o mesmo editor e o mesmo formato declarativo.
- Há suporte a `equals`, `notEquals`, `in` e `notIn`.
- Em jornadas multicanal existe o atalho “visível nestes canais”, baseado em `session.channel`.
- O texto explicativo do editor é de visibilidade mesmo quando reutilizado na aba Ativo.
- A cobertura de conteúdo visível por canal é validada no backend antes da publicação.

## 6. Prévia atual

O usuário alterna manualmente entre Web, Mobile e WhatsApp, mesmo quando o alvo não pertence aos canais da jornada.

| Alvo | Comportamento atual |
| --- | --- |
| Web | Usa o renderer React do Admin em largura limitada. |
| Mobile | Usa o mesmo renderer React em largura de 360 px e informa que a prévia é aproximada. Não executa React Native nem Flutter. |
| WhatsApp | Achata a árvore numa sequência de bolhas por meio de um mapeamento próprio do Admin. |

A prévia usa valores sintéticos para campos sem binding. Essa alteração existe apenas durante a renderização e não é gravada na árvore.

## 7. Compatibilidade por canal já implementada

Este ponto deve ser obrigatoriamente revisitado antes de decidir a frente “Exibir somente componentes e propriedades compatíveis com o canal selecionado”. Já existe comportamento implementado e a decisão futura não deve partir da premissa de que nada existe.

Hoje:

- o seletor de prévia define um alvo lógico `web`, `mobile` ou `whatsapp`;
- esse alvo é convertido respectivamente em `react.web`, `react.mobile` ou `whatsapp`;
- a paleta consulta `supportedTargets` e mantém o componente visível, acrescentando um alerta quando o status não é `SUPPORTED`;
- a árvore e o painel de propriedades repetem o alerta de incompatibilidade;
- o editor não impede adicionar ou configurar o componente incompatível;
- a filtragem considera apenas um renderer representativo para Web e Mobile; `flutter.web` e `flutter.mobile` não participam da indicação no editor;
- propriedades não possuem metadados de compatibilidade por alvo no contrato operacional atual;
- o backend calcula os alvos publicáveis pela interseção dos componentes utilizados e restringe o resultado aos canais declarados pela jornada;
- o backend não rejeita diretamente um componente apenas por ele ser incompatível com um alvo, mas uma publicação pode resultar sem determinado alvo suportado;
- regras de `$visibility` por `session.channel` permitem manter variações de conteúdo numa mesma árvore multicanal.

### Decisão pendente para a frente 3

Antes de ocultar qualquer item, devemos decidir:

1. se a paleta deve ocultar, desabilitar ou apenas sinalizar componentes incompatíveis;
2. se a decisão considera o canal da jornada, o alvo de prévia ou todos os renderizadores exigidos pelo canal;
3. como tratar uma jornada multicanal e componentes intencionalmente condicionados por `$visibility`;
4. se propriedades precisam ganhar compatibilidade por alvo no catálogo ou se a adaptação continuará sendo responsabilidade integral do adapter;
5. se incompatibilidade significa erro de publicação, aviso ou perda consciente de um alvo em `supportedTargets`;
6. como apresentar componentes semanticamente suportados, mas visualmente projetados de forma diferente no WhatsApp.

## 8. Validação atual

O salvamento aceita rascunhos incompletos. A validação explícita e a publicação verificam, entre outros pontos:

- raiz `ui.screen`;
- identificadores únicos;
- versão SemVer completa;
- existência e status do componente no catálogo;
- propriedades desconhecidas e obrigatórias;
- presença de filhos apenas em componentes que os aceitam;
- namespaces de binding;
- ações conhecidas;
- binding `form.*` em modo `twoWay` para entradas;
- ausência de eventos em componentes de entrada;
- `onPress` para botão e link;
- formato de `$visibility` e `$active`;
- existência de conteúdo visível para cada canal da jornada.

Não foi encontrada validação de `allowedChildTypes`. Também não há validação completa do tipo do valor de cada propriedade, dos valores de enum, dos tokens ou dos parâmetros específicos das ações.

## 9. Pontos fortes encontrados

- Catálogo central já orienta a paleta e os campos de propriedades.
- Modelo recursivo suporta aninhamento arbitrário.
- Autoria e contrato publicado estão corretamente separados.
- Há editores estruturados para os principais metadados, sem exigir JSON bruto.
- Compatibilidade por alvo já é consultada e comunicada.
- WhatsApp já possui prévia sem tentar reproduzir layout inexistente no canal.
- Validação de publicação protege várias invariantes importantes do contrato.

## 10. Lacunas e riscos para discussão

| Prioridade | Ponto encontrado | Consequência |
| --- | --- | --- |
| Alta | Seleção de versão de `ui.screen` usa a primeira ocorrência da API. | Pode criar tela com versão antiga ou não determinística se o catálogo tiver várias versões ativas. |
| Alta | Não há validação de `allowedChildTypes`. | Estruturas proibidas pelo catálogo podem ser montadas e publicadas. |
| Alta | A UX permite configurações que o backend rejeita depois. | Erro aparece tarde, principalmente para bindings e eventos obrigatórios. |
| Alta | Compatibilidade Web/Mobile considera somente React na edição. | Uma jornada pode parecer compatível no editor e não estar homologada no renderer Flutter. |
| Média | Todos os alvos de prévia aparecem para qualquer jornada. | O usuário pode editar observando um canal que não faz parte da jornada. |
| Média | Todas as cinco abas aparecem para todos os componentes. | Há ruído e possibilidade de criar metadados sem significado para o componente. |
| Média | Prévia Mobile não usa o renderer real. | Diferenças de layout e comportamento só aparecem no emulador. |
| Média | Mapeamento WhatsApp do Admin é uma implementação paralela ao adapter do emulador. | Os dois podem divergir com a evolução do catálogo. |
| Média | Parâmetros de eventos são livres. | Erros de ação são descobertos apenas em execução ou validações futuras. |
| Média | Mensagens internas da área “Sobre” ainda descrevem árvore publicada igual à árvore editada e uso da última revisão. | A documentação embutida pode contradizer o contrato canônico e a resolução exata por versão. |
| Baixa | Edição de propriedades não cria marco de histórico explícito. | Desfazer/refazer pode não ter a granularidade esperada pelo usuário. |

## 11. Ordem sugerida para as próximas discussões

1. Definir o contexto de canal/alvo da autoria.
2. Corrigir seleção de versão e regras estruturais do catálogo.
3. Decidir a política de compatibilidade da frente 3 com base no comportamento já existente.
4. Tornar o painel de propriedades contextual ao componente e ao canal.
5. Aproximar as prévias dos renderizadores reais sem transformar o Admin em executor de jornadas.
6. Melhorar validações antecipadas e mensagens de erro.
7. Revisar a documentação embutida no Admin.

