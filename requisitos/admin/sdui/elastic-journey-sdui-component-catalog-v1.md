# Elastic Journey — SDUI Component Catalog v1

**Status:** Proposta para adoção corporativa  
**Escopo:** Elastic Journey, React Web, React Mobile, Flutter Web, Flutter Mobile e WhatsApp
**Design system:** Mística  
**Versão do catálogo:** 1.0.0

## 1. Resumo executivo

Este documento define o catálogo inicial de componentes Server-Driven UI (SDUI) do **Elastic Journey**. O objetivo é permitir que telas e formulários sejam compostos no Form Builder próprio e projetados de forma consistente em cinco alvos: **React Web**, **React Mobile**, **Flutter Web**, **Flutter Mobile** e **WhatsApp**. Os quatro alvos visuais respeitam o design system **Mística**; o WhatsApp preserva a semântica do contrato por meio de uma representação conversacional compatível com as capacidades do canal.

O contrato SDUI é corporativo e pertence ao **Elastic Journey**. Ele deve ser independente de frameworks, bibliotecas visuais, canais conversacionais e mecanismos de persistência. React, Flutter, Mística e WhatsApp são implementações ou meios de projeção do contrato; não fazem parte de sua definição.

O **Strapi não é o proprietário do contrato SDUI**. Seu papel é armazenar e distribuir **snapshots imutáveis publicados pelo Elastic Journey após o fluxo de aprovação**. Rascunhos, validações, versionamento do catálogo, compatibilidade e governança permanecem sob responsabilidade do Elastic Journey.

## 2. Objetivo

O catálogo v1 estabelece:

- uma linguagem comum de componentes com nomenclatura `ui.*`;
- uma árvore de nós portável entre Web, Mobile e canais conversacionais e entre React, Flutter e WhatsApp;
- propriedades, bindings, ações e eventos independentes de framework e canal;
- o de/para entre o contrato corporativo e os cinco alvos de renderização ou projeção;
- regras mínimas de compatibilidade, validação, versionamento e publicação;
- uma base pequena e extensível para o Component Registry.

Ficam fora do v1: componentes exclusivos de um canal, navegação complexa, tabelas avançadas, editores rich text, upload múltiplo, assinatura, biometria e componentes de domínio. Esses itens devem entrar apenas após comprovação de uso e análise de compatibilidade.

## 3. Princípios arquiteturais

1. **Contrato independente de tecnologia.** A árvore utiliza nomes semânticos, como `ui.textInput`, e nunca nomes como `MisticaTextField`, `ReactNode` ou `FlutterWidget`.
2. **Paridade funcional antes da paridade visual absoluta.** O comportamento e a semântica devem ser equivalentes entre frameworks e canais; pequenas diferenças nativas de interação são aceitáveis.
3. **Mística e canais por meio de adapters.** Cada alvo visual traduz propriedades e tokens corporativos para os componentes disponíveis em sua implementação do Mística. O alvo conversacional traduz conteúdo, entradas e ações para recursos suportados pelo WhatsApp, sem tentar reproduzir layout ou aparência visual inexistentes no canal.
4. **Catálogo mínimo e composável.** Novas necessidades devem ser resolvidas primeiro por composição dos componentes existentes.
5. **Node Tree declarativa.** Layout, conteúdo e interação são representados por tuplas Hiccup recursivas; lógica de negócio permanece fora da camada visual.
6. **Bindings explícitos e seguros.** Dados dinâmicos são referenciados por caminhos conhecidos, sem avaliação arbitrária de código.
7. **Tokens semânticos.** Cor, tipografia, espaçamento e forma são expressos por intenção, não por valores físicos.
8. **Falha previsível.** Componentes, propriedades ou ações não suportados devem ser detectados antes da publicação e tratados de forma controlada em runtime.
9. **Evolução compatível.** Mudanças aditivas são preferidas; mudanças incompatíveis exigem nova versão principal do contrato.
10. **Publicação governada.** Somente snapshots validados e aprovados são enviados ao Strapi.

## 4. Modelo de responsabilidade

| Camada | Responsabilidade |
|---|---|
| Elastic Journey Form Builder | Autoria visual, configuração, preview, validação e fluxo de aprovação |
| Contrato SDUI corporativo | Tipos `ui.*`, schema dos nós, propriedades, bindings, ações, tokens e regras de compatibilidade |
| Component Registry | Metadados, schemas, versões, capacidades por alvo e vínculo com adapters |
| React Web/Mística Renderer | Converter nós SDUI em componentes React para navegadores, aderentes ao Mística Web |
| React Mobile/Mística Adapter | Converter nós SDUI em componentes da implementação React Mobile, preservando a semântica do Mística |
| Flutter Web/Mística Adapter | Converter nós SDUI em widgets Flutter Web, com comportamento e aparência equivalentes ao Mística |
| Flutter Mobile/Mística Adapter | Converter nós SDUI em widgets Flutter Mobile, com comportamento e aparência equivalentes ao Mística |
| WhatsApp Adapter | Converter nós SDUI compatíveis em interações conversacionais do WhatsApp, preservando conteúdo, ordem, captura de respostas e ações suportadas, e registrando diagnóstico ou fallback para recursos sem representação no canal |
| Strapi | Persistir e entregar snapshots publicados; não definir nem transformar o contrato |
| Aplicações de canal | Resolver dados, executar ações permitidas, aplicar telemetria e renderizar ou projetar a árvore conforme o canal |

Fluxo recomendado:

```text
Form Builder → validação pelo Component Registry → aprovação → snapshot publicado no Strapi
                                                            ↓
                 React Web / React Mobile / Flutter Web / Flutter Mobile / WhatsApp
```

Neste documento, **alvo de renderização ou projeção** é a combinação de tecnologia e canal. São identificadores distintos: `react.web`, `react.mobile`, `flutter.web`, `flutter.mobile` e `whatsapp`. Mesmo quando dois alvos compartilham código, eles mantêm entradas de compatibilidade separadas no Registry. Para `whatsapp`, renderizar significa projetar a árvore como uma sequência conversacional, e não produzir uma interface visual equivalente.

## 5. Níveis e categorias de componentes

### Nível 0 — Primitivos visuais

Elementos sem estado de negócio, usados para conteúdo e separação: texto, imagem, ícone, divisor e espaçamento.

### Nível 1 — Layout e composição

Organizam outras tuplas por meio da lista de filhos na terceira posição: tela, container, pilha vertical/horizontal e card.

### Nível 2 — Entrada de dados

Capturam valores e integram-se ao estado do formulário: campo de texto, seleção, checkbox e seletor de data.

### Nível 3 — Ação e feedback

Disparam eventos ou comunicam estado ao usuário: botão, link, alerta, indicador de progresso e carregamento.

### Nível 4 — Componentes de domínio

Composições governadas para casos corporativos específicos, como endereço, identificação ou consentimento. Não fazem parte do catálogo v1; devem ser introduzidas em versões posteriores com semântica de domínio explícita.

## 6. Estrutura padrão de um nó

Todo componente é representado por uma tupla JSON no formato Hiccup. A posição possui significado estrutural e não pode ser reinterpretada pelo renderer.

Componente folha:

```json
[
  "ui.textInput",
  {
    "id": "customer-name",
    "version": "1.0.0",
    "label": "Nome completo",
    "$bindings": {
      "value": {
        "path": "form.customer.name",
        "mode": "twoWay"
      }
    }
  }
]
```

Componente contêiner:

```json
[
  "ui.container",
  {
    "id": "customer-container",
    "version": "1.0.0"
  },
  [
    [
      "ui.text",
      {
        "id": "customer-title",
        "version": "1.0.0",
        "text": "Dados do cliente"
      }
    ]
  ]
]
```

| Posição | Obrigatória | Descrição |
|---:|---:|---|
| 1 | Sim | Tipo corporativo registrado no padrão `ui.*` |
| 2 | Sim | Objeto de atributos planos, incluindo `id`, `version`, propriedades e campos reservados autorizados |
| 3 | Somente para contêineres | Lista ordenada de tuplas filhas; deve existir mesmo quando estiver vazia |

Regras obrigatórias:

- componentes folha possuem exatamente duas posições;
- componentes contêineres possuem exatamente três posições;
- `id` e `version` são obrigatórios em todos os componentes;
- `id` deve ser único dentro da UI Spec;
- `version` utiliza SemVer completo;
- propriedades funcionais e visuais ficam diretamente no segundo item, sem objeto `props`;
- `$bindings`, `$events`, `$visibility` e `$active` ficam no segundo item quando autorizados pelo contrato do componente;
- `children` nunca é um atributo; filhos existem exclusivamente na terceira posição;
- um campo reservado `$...` desconhecido é erro fatal;
- tipo não registrado, versão principal incompatível ou propriedade obrigatória ausente impedem a publicação;
- propriedade comum desconhecida é rejeitada na publicação. Em runtime, somente uma propriedade opcional, aditiva e explicitamente declarada como segura pelo schema pode ser ignorada, sempre com diagnóstico `warning`.

## 7. Catálogo de componentes v1

O v1 contém 19 componentes, distribuídos entre conteúdo, layout, entrada, ação e feedback. O de/para abaixo é conceitual: o nome exato da classe ou widget pode variar conforme a versão das bibliotecas e a implementação corporativa do adapter.

| Tipo SDUI corporativo | Nível | React Web / Mística | React Mobile / Mística Adapter | Flutter Web / Mística Adapter | Flutter Mobile / Mística Adapter | WhatsApp / Conversacional<br>Adapter |
|---|---:|---|---|---|---|---|
| `ui.screen` | 1 | Page shell + layout responsivo | Screen + Safe Area + Scroll | Scaffold + layout responsivo | Scaffold + SafeArea | Se houver `title`, envia mensagem de texto em negrito; descarta o layout visual e preserva a ordem dos filhos |
| `ui.container` | 1 | Box/View wrapper | View | Container | Container | Não gera mensagem própria; agrupa semanticamente os filhos e preserva sua ordem |
| `ui.stack` | 1 | Flex | View/Flex | Row/Column/Flex | Row/Column/Flex | Não gera mensagem própria; preserva a ordem dos filhos e descarta direção, espaçamento e alinhamento visuais |
| `ui.card` | 1 | Mística Card | Card/Pressable adapter | Card adapter | Card adapter | Não gera superfície própria; preserva o conteúdo dos filhos e descarta aparência e elevação |
| `ui.text` | 0 | Mística Text/Typography | Text adapter | Text adapter | Text adapter | Envia mensagem de texto |
| `ui.image` | 0 | Image component | Image adapter | Image | Image | Envia mensagem de imagem usando `source`; utiliza `alt` como legenda quando informado |
| `ui.icon` | 0 | Mística Icon | Icon registry adapter | Icon registry adapter | Icon registry adapter | Não gera mensagem própria; omite o componente e registra diagnóstico informativo |
| `ui.divider` | 0 | Divider | View/Divider adapter | Divider | Divider | Não gera mensagem própria; omite o componente e registra diagnóstico informativo |
| `ui.spacer` | 0 | Spacing box | View spacer | SizedBox | SizedBox | Não gera mensagem própria; omite o componente e registra diagnóstico informativo |
| `ui.textInput` | 2 | Mística TextField | TextInput adapter | TextFormField adapter | TextFormField adapter | Envia solicitação textual, aguarda a próxima mensagem do usuário, valida e grava a resposta no binding de valor |
| `ui.textArea` | 2 | Mística TextArea/TextField multiline | TextInput multiline adapter | TextFormField multiline | TextFormField multiline | Envia solicitação textual longa, aguarda a próxima mensagem do usuário, valida e grava a resposta no binding de valor |
| `ui.select` | 2 | Mística Select/Dropdown | Picker/Bottom-sheet adapter | Dropdown adapter | Dropdown/Bottom-sheet adapter | Projeta até três opções como botões de resposta rápida; acima disso, utiliza lista interativa, respeitando os limites do canal |
| `ui.checkbox` | 2 | Mística Checkbox | Checkbox/Pressable adapter | Checkbox adapter | Checkbox adapter | Projeta confirmação por opções de resposta `Sim` e `Não` e grava o valor booleano no binding |
| `ui.datePicker` | 2 | Mística DateField/DatePicker | Date picker adapter | Date picker adapter | Date picker nativo adapter | Solicita data/hora por texto, informa o formato aceito, valida e normaliza o valor antes de gravá-lo no binding |
| `ui.button` | 3 | Mística Button | Button/Pressable adapter | Button adapter | Button adapter | Projeta `onPress` como botão de resposta rápida quando a ação for compatível; respeita o limite de três botões por mensagem |
| `ui.link` | 3 | Mística Link | Text/Pressable adapter | Link/TextButton adapter | TextButton adapter | Projeta `action.openUrl` como CTA com URL; outras ações compatíveis podem ser apresentadas como resposta rápida |
| `ui.alert` | 3 | Mística Feedback/Alert | Alert/View adapter | Alert adapter | Alert adapter | Envia mensagem textual com indicador semântico de severidade; não reproduz a apresentação visual do alerta |
| `ui.progress` | 3 | Mística Progress bar | Progress adapter | LinearProgressIndicator | LinearProgressIndicator | Envia mensagem textual com rótulo e percentual; não representa barra gráfica |
| `ui.loading` | 3 | Mística Spinner | Activity indicator adapter | CircularProgressIndicator | CircularProgressIndicator | Envia mensagem textual de espera; não representa animação ou overlay |

Propriedades principais do contrato:

| Tipo SDUI corporativo | Propriedades principais |
|---|---|
| `ui.screen` | `title`, `backgroundToken`, `scrollable`, `paddingToken` |
| `ui.container` | `backgroundToken`, `paddingToken`, `borderRadiusToken` |
| `ui.stack` | `direction`, `spacingToken`, `alignment` |
| `ui.card` | `variant`, `paddingToken`, `elevationToken` |
| `ui.text` | `text`, `variant`, `colorToken`, `align`, `maxLines` |
| `ui.image` | `source`, `alt`, `fit`, `aspectRatio` |
| `ui.icon` | `name`, `sizeToken`, `colorToken`, `accessibilityLabel` |
| `ui.divider` | `orientation`, `colorToken`, `spacingToken` |
| `ui.spacer` | `sizeToken`, `axis` |
| `ui.textInput` | `label`, `placeholder`, `inputMode`, `required`, `readOnly`, `maxLength`, `validation` |
| `ui.textArea` | `label`, `placeholder`, `required`, `minLines`, `maxLines`, `maxLength`, `validation` |
| `ui.select` | `label`, `placeholder`, `options`, `required`, `searchable` |
| `ui.checkbox` | `label`, `required`, `indeterminate` |
| `ui.datePicker` | `label`, `mode`, `minDate`, `maxDate`, `format`, `required` |
| `ui.button` | `label`, `variant`, `size`, `fullWidth`, `loading`, `disabled` |
| `ui.link` | `label`, `emphasis`, `external`, `accessibilityLabel` |
| `ui.alert` | `severity`, `title`, `message`, `dismissible` |
| `ui.progress` | `value`, `label`, `showValue` |
| `ui.loading` | `label`, `sizeToken`, `overlay` |

### 7.1 Contratos normativos dos componentes

As regras desta seção são normativas. Todo componente possui `id` único na UI Spec e `version` em SemVer, ambos obrigatórios. Atributos visuais aceitam somente valores e tokens homologados no Component Registry. Um atributo reservado iniciado por `$` somente pode ser utilizado quando estiver explicitamente autorizado para o componente.

#### 7.1.1 Componentes de layout

| Componente | Atributos | Campos reservados | Filhos e composição | Projeção no WhatsApp |
|---|---|---|---|---|
| `ui.screen` | Opcionais: `title`, `backgroundToken`, `scrollable`, `paddingToken` | Não aceita `$bindings`, `$events`, `$visibility` ou `$active` | Raiz única e obrigatória de `data`; aceita filhos ordenados; não pode ser aninhado | `title` inicia a conversa em destaque; preserva a ordem dos filhos; atributos exclusivamente visuais são descartados com diagnóstico `info` |
| `ui.container` | Opcionais: `backgroundToken`, `paddingToken`, `borderRadiusToken` | Aceita `$visibility` e `$active`; não aceita `$bindings` ou `$events` | Aceita filhos ordenados; pode ser filho de `ui.screen`, `ui.container`, `ui.stack` ou `ui.card` | Não produz mensagem própria; preserva os filhos; atributos visuais são descartados com diagnóstico `info` |
| `ui.stack` | Opcionais: `direction` (`vertical` ou `horizontal`, padrão `vertical`), `spacingToken`, `alignment` (`start`, `center`, `end` ou `stretch`, padrão `stretch`) | Aceita `$visibility` e `$active`; não aceita `$bindings` ou `$events` | Aceita filhos ordenados e pode conter componentes estruturais, de conteúdo, entrada, ação ou feedback | Não produz mensagem própria; lineariza os filhos na ordem declarada; direção, espaçamento e alinhamento são descartados com diagnóstico `info` |
| `ui.card` | Opcionais: `variant`, `paddingToken`, `elevationToken` | Aceita `$visibility` e `$active`; não aceita `$bindings` ou `$events` | Aceita filhos ordenados; interação deve ser composta com `ui.button` ou `ui.link` | Não produz mensagem própria; preserva os filhos; superfície, variante, espaçamento e elevação são descartados com diagnóstico `info` |

Em componentes estruturais, `$visibility: false` remove toda a subárvore e `$active: false` mantém a subárvore visível, mas desabilita seus descendentes interativos.

#### 7.1.2 Componentes de conteúdo

| Componente | Atributos | Campos reservados | Regras | Projeção no WhatsApp |
|---|---|---|---|---|
| `ui.text` | Obrigatório: `text`. Opcionais: `variant`, `colorToken`, `align`, `maxLines` | Aceita `$bindings.text` somente `oneWay` e `$visibility`; não aceita `$active` ou `$events` | `text` aceita placeholder textual | Produz mensagem textual; atributos visuais são descartados, admitindo apenas ênfase textual homologada |
| `ui.image` | Obrigatórios: `source`, `alt`. Opcionais: `fit`, `aspectRatio` | Aceita `$bindings` `oneWay` para `source` e `alt`, e `$visibility`; não aceita `$active` ou `$events` | `alt` é obrigatório para acessibilidade, inclusive quando vazio por decisão editorial justificada | Envia mídia de fonte previamente resolvida e autorizada; usa `alt` como legenda; falha aplica fallback textual homologado ou erro quando o conteúdo for essencial |
| `ui.icon` | Obrigatórios: `name`, `accessibilityLabel`. Opcionais: `sizeToken`, `colorToken` | Aceita `$visibility`; não aceita `$active`, `$bindings` ou `$events` | Ícone decorativo deve usar `accessibilityLabel` vazio | Omitido com diagnóstico `info`; o adapter não inventa emoji substituto |
| `ui.divider` | Opcionais: `orientation`, `colorToken`, `spacingToken` | Aceita `$visibility`; não aceita `$active`, `$bindings` ou `$events` | Componente folha e exclusivamente visual | Omitido com diagnóstico `info`, sem gerar caracteres decorativos |
| `ui.spacer` | Obrigatório: `sizeToken`. Opcional: `axis` | Aceita `$visibility`; não aceita `$active`, `$bindings` ou `$events` | Componente folha e exclusivamente visual | Omitido com diagnóstico `info`, sem introduzir mensagens vazias |

#### 7.1.3 Componentes de entrada

Todos os componentes de entrada aceitam `$bindings.value` em modo `twoWay`, `$visibility`, `$active` e validações declarativas homologadas. Não aceitam `$events` para submissão da etapa; a conclusão pertence a um componente de ação. Quando `$active` resultar em `false` ou `disabled`/`readOnly` for `true`, o valor pode ser exibido, mas não alterado.

| Componente | Atributos | Binding | Regras | Projeção no WhatsApp |
|---|---|---|---|---|
| `ui.textInput` | Obrigatório: `label`. Opcionais: `placeholder`, `inputMode`, `required`, `readOnly`, `maxLength`, `validation` | `$bindings.value` obrigatório, modo `twoWay` | `inputMode` é intenção semântica homologada, não nome de teclado de plataforma | Envia rótulo e instrução, aguarda resposta textual, valida e grava o valor |
| `ui.textArea` | Obrigatório: `label`. Opcionais: `placeholder`, `required`, `readOnly`, `minLines`, `maxLines`, `maxLength`, `validation` | `$bindings.value` obrigatório, modo `twoWay` | `minLines` e `maxLines` são exclusivamente visuais | Captura resposta textual; `minLines` e `maxLines` são descartados com diagnóstico `info` |
| `ui.select` | Obrigatórios: `label`, `options`. Opcionais: `placeholder`, `required`, `searchable` | `$bindings.value` obrigatório, modo `twoWay` | Cada opção exige `value` e `label` e pode declarar `disabled` | Até três opções habilitadas podem ser respostas rápidas; acima disso, usa lista homologada; limite excedido sem fallback torna a UI Spec incompatível |
| `ui.checkbox` | Obrigatório: `label`. Opcionais: `required`, `indeterminate` | `$bindings.value` obrigatório, modo `twoWay`, valor booleano | `indeterminate` é estado inicial e não cria terceiro valor de resposta | Solicita confirmação por `Sim` e `Não` e grava `true` ou `false` |
| `ui.datePicker` | Obrigatórios: `label`, `mode`. Opcionais: `minDate`, `maxDate`, `format`, `required`, `validation` | `$bindings.value` obrigatório, modo `twoWay` | Valor canônico em ISO 8601; `format` controla somente apresentação e instrução | Solicita valor em formato explícito, valida, normaliza e grava o valor canônico; não simula seletor visual |

#### 7.1.4 Componentes de ação

| Componente | Atributos | Campos reservados | Regras | Projeção no WhatsApp |
|---|---|---|---|---|
| `ui.button` | Obrigatório: `label`. Opcionais: `variant`, `size`, `fullWidth`, `loading`, `disabled` | Exige `$events.onPress`; aceita `$visibility` e `$active`; não aceita `$bindings` | `action.submit` valida os campos aplicáveis e solicita a conclusão da etapa; o renderer não executa regra de negócio | Ação compatível vira resposta rápida; excesso de ações exige lista ou fallback homologado |
| `ui.link` | Obrigatório: `label`. Opcionais: `emphasis`, `external`, `accessibilityLabel` | Exige `$events.onPress`; aceita `$visibility` e `$active`; não aceita `$bindings` | URL usa `action.openUrl` e está sujeita a esquema e domínio autorizados | URL vira CTA quando suportada; ação sem equivalência exige fallback homologado ou torna a UI Spec incompatível |

#### 7.1.5 Componentes de feedback

| Componente | Atributos | Campos reservados | Regras | Projeção no WhatsApp |
|---|---|---|---|---|
| `ui.alert` | Obrigatórios: `severity`, `message`. Opcionais: `title`, `dismissible` | Aceita `$visibility`, `$active`, `$bindings` `oneWay` para `title` e `message`; aceita `$events.onDismiss` somente quando `dismissible: true` | O descarte depende de ação homologada | Gera mensagem textual com indicação semântica de severidade; descarte somente é interativo quando homologado |
| `ui.progress` | Obrigatório: `value`. Opcionais: `label`, `showValue` | Aceita `$bindings.value` `oneWay` e `$visibility`; não aceita `$active` ou `$events` | `value` é numérico no intervalo de `0` a `1` | Gera texto com rótulo e percentual; não simula barra gráfica |
| `ui.loading` | Opcionais: `label`, `sizeToken`, `overlay` | Aceita `$visibility`; não aceita `$bindings`, `$events` ou `$active` | Feedback transitório; não pode bloquear indefinidamente a jornada | Gera mensagem textual de espera apenas quando necessário; animação, tamanho e overlay são descartados com diagnóstico `info` |

### 7.2 Convenções de propriedades

- `label`, `placeholder`, `title`, `message` e `text` aceitam texto literal ou placeholder seguro.
- `variant` representa intenção visual corporativa, nunca uma classe CSS ou nome interno do framework.
- `options` utiliza uma lista de objetos `{ "value": string, "label": string, "disabled"?: boolean }`.
- Datas são transportadas em ISO 8601; a apresentação localizada é responsabilidade do adapter de cada alvo.
- Dimensões, cores e tipografia devem referenciar tokens, exceto valores de conteúdo como `aspectRatio` ou `maxLength`.
- Propriedades específicas de uma única plataforma não entram no contrato comum. Se indispensáveis, devem ser declaradas como extensão de canal e não podem alterar o comportamento principal.

Exemplo de opções:

```json
[
  "ui.select",
  {
    "id": "marital-status",
    "version": "1.0.0",
    "label": "Estado civil",
    "placeholder": "Selecione",
    "required": true,
    "options": [
      { "value": "single", "label": "Solteiro(a)" },
      { "value": "married", "label": "Casado(a)" }
    ],
    "$bindings": {
      "value": {
        "path": "form.customer.maritalStatus",
        "mode": "twoWay"
      }
    }
  }
]
```

## 8. Bindings e placeholders

Bindings e placeholders conectam componentes ao contexto de execução sem inserir lógica de aplicação na árvore, mas possuem responsabilidades diferentes. **Placeholders** interpolam valores em conteúdo textual e produzem texto; **bindings** ligam uma propriedade inteira a um valor tipado e podem permitir leitura e escrita.

O contrato separa os seguintes namespaces:

| Namespace | Uso | Exemplo |
|---|---|---|
| `form` | Valores editáveis da jornada | `form.customer.name` |
| `data` | Dados carregados e somente leitura | `data.customer.document` |
| `session` | Contexto autorizado da sessão | `session.locale` |
| `route` | Parâmetros de navegação permitidos | `route.orderId` |
| `computed` | Valores derivados por regras registradas | `computed.isAdult` |

### 8.1 Bindings tipados

Um binding deve ser declarado em `$bindings`, informando a propriedade do componente, o caminho do dado e a direção do vínculo. No exemplo abaixo, a propriedade `value` recebe o valor inicial de `form.customer.email` e devolve ao mesmo caminho as alterações realizadas pelo usuário:

```json
[
  "ui.textInput",
  {
    "id": "customer-email",
    "version": "1.0.0",
    "label": "E-mail",
    "inputMode": "email",
    "required": true,
    "$bindings": {
      "value": {
        "path": "form.customer.email",
        "mode": "twoWay"
      }
    }
  }
]
```

`mode: "twoWay"` estabelece o fluxo `contexto ⇄ componente` e deve ser usado apenas em propriedades editáveis. Para dados somente leitura, `mode: "oneWay"` estabelece o fluxo `contexto → componente` e preserva o tipo original do valor:

```json
[
  "ui.progress",
  {
    "id": "order-progress",
    "version": "1.0.0",
    "label": "Andamento do pedido",
    "$bindings": {
      "value": {
        "path": "data.order.progress",
        "mode": "oneWay"
      }
    }
  }
]
```

Nesse caso, se `data.order.progress` contiver o número `0.75`, o renderer recebe o valor numérico `0.75`, e não o texto `"0.75"`.

### 8.2 Placeholders textuais

Placeholders destinam-se exclusivamente à interpolação somente leitura em propriedades textuais homologadas. Eles podem combinar texto literal com um ou mais valores do contexto:

```json
[
  "ui.text",
  {
    "id": "customer-greeting",
    "version": "1.0.0",
    "text": "Olá, {{data.customer.firstName}}. Seu pedido é {{data.order.id}}.",
    "variant": "typography.heading.medium"
  }
]
```

Se `data.customer.firstName` for `"Maria"` e `data.order.id` for `"ABC-123"`, o conteúdo apresentado será:

```text
Olá, Maria. Seu pedido é ABC-123.
```

Um placeholder converte o valor interpolado para sua representação textual. Ele não deve ser usado quando o componente precisa preservar o tipo original, editar o valor ou manter sincronização com o estado; nesses casos, deve-se usar `$bindings`.

### 8.3 Uso combinado

Um componente pode usar placeholder em uma propriedade textual e binding em uma propriedade tipada. No exemplo abaixo, o nome é interpolado no `label`, enquanto o valor editável permanece vinculado ao formulário:

```json
[
  "ui.textInput",
  {
    "id": "customer-full-name",
    "version": "1.0.0",
    "label": "Nome completo de {{data.customer.firstName}}",
    "$bindings": {
      "value": {
        "path": "form.customer.fullName",
        "mode": "twoWay"
      }
    }
  }
]
```

### 8.4 Regras obrigatórias

- usar placeholders somente em propriedades textuais explicitamente homologadas pelo schema do componente;
- usar `$bindings` para valores tipados, valores editáveis e sincronização de estado;
- aceitar `twoWay` somente em propriedades editáveis e caminhos autorizados;
- preservar o tipo original do dado resolvido por binding;
- converter para texto somente o valor interpolado por placeholder;
- validar caminhos e namespaces contra um data contract conhecido;
- distinguir binding ausente de valor `null` e definir fallback quando necessário;
- definir comportamento previsível para placeholder cujo caminho não exista;
- escapar conteúdo textual interpolado por padrão;
- não registrar em telemetria valores pessoais obtidos por binding ou placeholder;
- não permitir acesso a segredos, credenciais, headers, tokens ou objetos internos da aplicação;
- não executar JavaScript, Dart, expressões de template ou qualquer código arbitrário.

Resumo da escolha:

| Necessidade | Mecanismo |
|---|---|
| Inserir um valor dentro de uma frase | Placeholder `{{...}}` |
| Preservar número, booleano, data, lista ou objeto | `$bindings` |
| Preencher um campo editável e receber alterações | `$bindings` com `twoWay` |
| Exibir uma propriedade inteira somente para leitura | `$bindings` com `oneWay` |
| Combinar texto literal e vários valores | Placeholder `{{...}}` |

Regras gerais de segurança:

- não executar JavaScript, Dart, expressões de template ou código arbitrário;
- validar caminhos e namespaces contra um data contract conhecido;
- escapar conteúdo textual por padrão;
- impedir acesso a segredos, headers, tokens e objetos internos da aplicação;
- distinguir binding ausente de valor `null` e definir fallback quando necessário;
- registrar em telemetria apenas identificadores técnicos, nunca valores pessoais do formulário.

### 8.5 Visibilidade e estado ativo

`$visibility` e `$active` utilizam a mesma forma declarativa de condição:

```json
{
  "rule": "equals",
  "path": "computed.customerCanContinue",
  "value": true
}
```

As regras homologadas no v1 são `equals`, `notEquals`, `in` e `notIn`.

- `$visibility` determina se o componente está presente e é apresentado. Em contêineres, `false` remove toda a subárvore.
- `$active` determina se um componente visível pode receber interação. Em contêineres, `false` desabilita os descendentes interativos.
- a ausência de `$visibility` significa visível;
- a ausência de `$active` significa ativo;
- `disabled: true` é uma desativação estática e sempre prevalece;
- um componente está efetivamente habilitado apenas quando `disabled` não é `true` e `$active` não resulta em `false`;
- condições não executam código e seus caminhos devem pertencer a namespaces autorizados;
- `$visibility` e `$active` somente podem aparecer nos componentes que os homologam;
- usos importados de `$active` com intenção de ocultação devem ser convertidos para `$visibility` antes da publicação.

## 9. Ações e eventos

Eventos do componente são declarados em `$events` e apontam para ações registradas. O renderer emite o evento; o host valida a ação no Action Registry e coordena sua execução. O renderer nunca executa regra de negócio.

Eventos v1 recomendados:

| Evento | Componentes típicos | Uso |
|---|---|---|
| `onPress` | `ui.button`, `ui.link` | Acionar navegação, conclusão da etapa ou ação registrada |
| `onDismiss` | `ui.alert` | Fechar feedback dispensável |

Ações mínimas:

| Tipo de ação | Finalidade |
|---|---|
| `action.submit` | Validar os campos aplicáveis e solicitar a conclusão da etapa |
| `action.navigate` | Navegar para destino interno permitido |
| `action.openUrl` | Abrir URL validada conforme allowlist |
| `action.setValue` | Atualizar um caminho autorizado do estado |
| `action.track` | Emitir evento de telemetria sem dados sensíveis |
| `action.dismiss` | Alterar estado visual descartável |

Exemplo:

```json
[
  "ui.button",
  {
    "id": "continue-button",
    "version": "1.0.0",
    "label": "Continuar",
    "variant": "primary",
    "fullWidth": true,
    "$events": {
      "onPress": {
        "action": "action.submit"
      }
    }
  }
]
```

`action.submit` não contém destino de navegação nem identifica formulário. A continuidade é determinada pela jornada correspondente à UI Spec. O contrato não deve conter callbacks, URLs irrestritas ou comandos específicos de framework. A execução precisa passar por allowlist, validação de parâmetros, política de autorização e telemetria.

## 10. Design tokens semânticos

O SDUI referencia tokens corporativos. Cada adapter visual resolve esses tokens para a implementação vigente do Mística no respectivo alvo. O adapter `whatsapp` pode descartar tokens exclusivamente visuais; essa perda deve estar declarada na capacidade do componente e não pode alterar conteúdo, validação, captura de resposta ou resultado das ações.

| Grupo | Exemplos de tokens | Uso |
|---|---|---|
| Cor | `color.background.primary`, `color.text.primary`, `color.feedback.negative` | Fundos, conteúdo e estados sem codificar hexadecimal |
| Tipografia | `typography.heading.medium`, `typography.body.regular`, `typography.caption` | Hierarquia e leitura |
| Espaçamento | `spacing.none`, `spacing.xs`, `spacing.sm`, `spacing.md`, `spacing.lg`, `spacing.xl` | Gap, padding e margin |
| Forma | `radius.none`, `radius.sm`, `radius.md`, `radius.full` | Bordas e superfícies |
| Elevação | `elevation.none`, `elevation.low`, `elevation.medium` | Hierarquia de superfícies |
| Tamanho | `size.icon.sm`, `size.icon.md`, `size.control.lg` | Ícones e controles |
| Largura | `layout.content.compact`, `layout.content.default`, `layout.content.wide` | Limites responsivos de conteúdo |

Valores literais como `#0066FF`, `16px`, `12dp` ou nomes de classes CSS não devem ser publicados. A evolução visual do Mística deve ocorrer por atualização do mapeamento de tokens, preservando o snapshot SDUI. A ausência de representação para um token visual no WhatsApp não torna o componente incompatível quando sua semântica conversacional estiver homologada.

## 11. Regras de compatibilidade entre alvos

1. Todo componente v1 precisa ter a capacidade explicitamente classificada nos cinco alvos antes de ser marcado como `stable` para todo o ecossistema. Nos alvos em que houver representação válida, a implementação ou projeção deve estar homologada; quando não houver representação válida no WhatsApp, o Registry deve declará-lo `unsupported` para `whatsapp`, sem exigir uma adaptação artificial.
2. O mesmo nó deve preservar semântica, hierarquia de conteúdo, validação e resultado de ação equivalentes em React Web, React Mobile, Flutter Web, Flutter Mobile e WhatsApp. Paridade de layout e aparência aplica-se somente aos alvos visuais.
3. Interações podem respeitar padrões nativos — por exemplo, a apresentação do date picker — desde que o valor e as regras sejam idênticos.
4. Acessibilidade é obrigatória: nos alvos visuais, labels, foco, leitura por tecnologia assistiva, contraste e área mínima de toque devem seguir o Mística e as normas corporativas; no WhatsApp, conteúdo, instruções, alternativas textuais e opções interativas devem permanecer compreensíveis no fluxo conversacional.
5. Nos alvos visuais, o layout deve ser responsivo e baseado em containers; coordenadas absolutas não são aceitas no contrato comum. No WhatsApp, propriedades de layout são descartadas e a ordem da árvore determina a ordem da conversa.
6. Tokens não suportados em um alvo devem ser rejeitados na validação ou possuir fallback previamente declarado no Registry.
7. Diferenças de capacidade devem ser registradas por alvo e versão mínima do renderer ou aplicativo.
8. Uma tela não pode ser publicada para um alvo se contiver componente `unsupported` ou versão incompatível.
9. Cada renderer ou adapter deve ter fallback técnico seguro para falhas inesperadas, com telemetria, sem expor stack trace ao usuário.
10. A ordem de leitura, foco ou interação deve seguir a ordem da árvore, conforme a natureza do alvo, salvo regra de acessibilidade explicitamente homologada.
11. Compartilhamento de código não implica compatibilidade automática: Flutter Web e Flutter Mobile, por exemplo, podem usar o mesmo widget, mas devem ser homologados separadamente devido a diferenças de entrada, acessibilidade, navegação e runtime.
12. Se React Mobile for uma aplicação React Native, deve usar um adapter próprio. Se for apenas uma experiência Web responsiva/PWA, `react.web` e `react.mobile` podem compartilhar implementação, mantendo-se como alvos separados para validação e rollout.
13. `whatsapp` deve possuir compatibilidade própria por componente. O adapter deve respeitar limites de mensagens, botões, listas e mídia do canal, transformar entradas visuais em turnos conversacionais quando houver equivalência segura e registrar diagnóstico ou fallback explícito quando não houver.

## 12. Component Registry

O Component Registry é a fonte de verdade operacional do catálogo. Ele não precisa armazenar o código dos componentes, mas deve descrever o que o Builder pode produzir e o que cada canal consegue renderizar.

Registro mínimo por componente:

```json
{
  "type": "ui.textInput",
  "version": "1.0.0",
  "status": "stable",
  "level": 2,
  "category": "input",
  "attributesSchema": "schemas/ui.textInput/1.0.0.json",
  "allowsChildren": false,
  "reservedAttributes": ["$bindings", "$visibility", "$active"],
  "events": [],
  "targets": {
    "react.web": { "status": "supported", "minRendererVersion": "1.2.0" },
    "react.mobile": { "status": "supported", "minRendererVersion": "1.1.0" },
    "flutter.web": { "status": "supported", "minRendererVersion": "1.0.0" },
    "flutter.mobile": { "status": "supported", "minRendererVersion": "1.3.0" },
    "whatsapp": { "status": "supported", "minRendererVersion": "1.0.0" }
  },
  "adapterKeys": {
    "react.web": "textInput",
    "react.mobile": "textInput",
    "flutter.web": "textInput",
    "flutter.mobile": "textInput",
    "whatsapp": "textInput"
  }
}
```

O Registry deve fornecer ao Form Builder:

- schema dos atributos planos e valores padrão;
- indicação de container ou folha e tipos de filhos permitidos;
- eventos e ações autorizados;
- tokens aceitos;
- compatibilidade por alvo e versão mínima do renderer;
- status `experimental`, `stable`, `deprecated` ou `removed`;
- documentação e exemplos de preview;
- regras de migração entre versões.

O renderer deve resolver `type + version` por um mapa controlado. Reflexão dinâmica, import de código remoto e componentes não registrados não são permitidos.

## 13. Versionamento

O catálogo, cada componente, o schema da UI Spec e os renderizadores utilizam Semantic Versioning completo (`MAJOR.MINOR.PATCH`):

- **Major:** alteração incompatível, remoção ou mudança de significado;
- **Minor:** novo componente, propriedade opcional, evento ou token compatível;
- **Patch:** correção de documentação, adapter ou comportamento sem mudança contratual.

Diretrizes:

- a versão do snapshot identifica o schema geral (`schemaVersion`) e a versão do catálogo (`catalogVersion`);
- cada nó informa sua própria `version` para resolução inequívoca;
- componentes depreciados continuam renderizáveis durante uma janela corporativa definida;
- `journeyVersion` não é SemVer: é o número inteiro sequencial da versão publicada da jornada;
- snapshots já publicados permanecem imutáveis; correções geram uma nova versão publicada da jornada;
- migrações devem ser automatizáveis, auditáveis e executadas no Elastic Journey antes da republicação;
- a matriz de compatibilidade deve considerar catálogo, alvo, renderer e versão mínima da aplicação correspondente.

## 14. Formato canônico da UI Spec

### 14.1 Envelope do snapshot de tela

O snapshot publicado deve transportar metadados suficientes para validação, cache, auditoria e compatibilidade:

```json
{
  "schemaVersion": "1.0.0",
  "catalogVersion": "1.0.0",
  "journeyId": "12f6d6e2-e36d-4e67-9db4-8460a0f72cb6",
  "journeyVersion": 7,
  "uiStepId": "Node_3f865d35-06c4-4ba1-9e85-451d542d8302",
  "status": "published",
  "publishedAt": "2026-09-03T15:00:00Z",
  "supportedTargets": ["react.web", "react.mobile", "flutter.web", "flutter.mobile", "whatsapp"],
  "minRendererVersion": {
    "react.web": "1.2.0",
    "react.mobile": "1.1.0",
    "flutter.web": "1.0.0",
    "flutter.mobile": "1.3.0",
    "whatsapp": "1.0.0"
  },
  "dataSources": {},
  "data": [
    "ui.screen",
    {
      "id": "personal-data-screen",
      "version": "1.0.0",
      "title": "Dados pessoais"
    },
    []
  ]
}
```

`data` contém exatamente uma tupla raiz `ui.screen`. A terceira posição das tuplas contêineres define a ordem visual, de leitura, de foco padrão, de projeção conversacional e de serialização determinística. `dataSources` permanece como objeto vazio no v1 e será refinado posteriormente; renderers não executam URLs nem APIs declaradas na UI Spec.

| Campo | Tipo | Regra |
|---|---|---|
| `schemaVersion` | SemVer | Versão do schema do envelope |
| `catalogVersion` | SemVer | Versão do catálogo usada na publicação |
| `journeyId` | identificador | Identidade estável da jornada |
| `journeyVersion` | inteiro positivo | Versão sequencial publicada da jornada, correlacionada à definição correspondente publicada no runtime-engine |
| `uiStepId` | string | Identidade estável da etapa de interface dentro da jornada |
| `status` | enum | `published` ou `deprecated`; rascunhos não são publicados no repositório de snapshots |
| `publishedAt` | data/hora | Instante da publicação em ISO 8601 UTC |
| `supportedTargets` | lista | Alvos homologados para o snapshot |
| `minRendererVersion` | objeto | Versão mínima do renderer ou adapter por alvo |
| `dataSources` | objeto | Reservado para refinamento posterior; no v1 deve ser `{}` |
| `data` | tupla | Raiz única e obrigatória `ui.screen` |

O envelope não possui `metadata` livre nem uma versão independente da UI Spec. O título visual pertence a `ui.screen`; informações administrativas permanecem sob responsabilidade do Elastic Journey. Referências de design pertencem ao processo de autoria e ao Component Registry, não ao contrato de runtime.

### 14.2 Exemplo completo — tela de dados pessoais

```json
{
  "schemaVersion": "1.0.0",
  "catalogVersion": "1.0.0",
  "journeyId": "12f6d6e2-e36d-4e67-9db4-8460a0f72cb6",
  "journeyVersion": 7,
  "uiStepId": "Node_3f865d35-06c4-4ba1-9e85-451d542d8302",
  "status": "published",
  "publishedAt": "2026-09-03T15:00:00Z",
  "supportedTargets": [
    "react.web",
    "react.mobile",
    "flutter.web",
    "flutter.mobile",
    "whatsapp"
  ],
  "minRendererVersion": {
    "react.web": "1.2.0",
    "react.mobile": "1.1.0",
    "flutter.web": "1.0.0",
    "flutter.mobile": "1.3.0",
    "whatsapp": "1.0.0"
  },
  "dataSources": {},
  "data": [
    "ui.screen",
    {
      "id": "personal-data-screen",
      "version": "1.0.0",
      "title": "Dados pessoais",
      "scrollable": true,
      "backgroundToken": "color.background.primary",
      "paddingToken": "spacing.md"
    },
    [
      [
        "ui.stack",
        {
          "id": "form-stack",
          "version": "1.0.0",
          "direction": "vertical",
          "spacingToken": "spacing.md",
          "alignment": "stretch"
        },
        [
          [
            "ui.text",
            {
              "id": "heading",
              "version": "1.0.0",
              "text": "Olá, {{data.customer.firstName}}",
              "variant": "typography.heading.medium",
              "colorToken": "color.text.primary"
            }
          ],
          [
            "ui.textInput",
            {
              "id": "name",
              "version": "1.0.0",
              "label": "Nome completo",
              "inputMode": "text",
              "required": true,
              "maxLength": 120,
              "validation": [
                {
                  "rule": "required",
                  "message": "Informe seu nome completo."
                },
                {
                  "rule": "minLength",
                  "value": 3,
                  "message": "Informe ao menos 3 caracteres."
                }
              ],
              "$bindings": {
                "value": {
                  "path": "form.customer.name",
                  "mode": "twoWay"
                }
              }
            }
          ],
          [
            "ui.datePicker",
            {
              "id": "birth-date",
              "version": "1.0.0",
              "label": "Data de nascimento",
              "mode": "date",
              "maxDate": "today",
              "format": "locale",
              "required": true,
              "$bindings": {
                "value": {
                  "path": "form.customer.birthDate",
                  "mode": "twoWay"
                }
              }
            }
          ],
          [
            "ui.checkbox",
            {
              "id": "marketing-consent",
              "version": "1.0.0",
              "label": "Aceito receber comunicações sobre produtos e serviços.",
              "required": false,
              "$bindings": {
                "value": {
                  "path": "form.consents.marketing",
                  "mode": "twoWay"
                }
              }
            }
          ],
          [
            "ui.alert",
            {
              "id": "validation-alert",
              "version": "1.0.0",
              "severity": "negative",
              "title": "Revise os dados",
              "message": "Existem campos obrigatórios não preenchidos.",
              "$visibility": {
                "rule": "equals",
                "path": "computed.showValidationSummary",
                "value": true
              }
            }
          ],
          [
            "ui.button",
            {
              "id": "continue",
              "version": "1.0.0",
              "label": "Continuar",
              "variant": "primary",
              "size": "large",
              "fullWidth": true,
              "$events": {
                "onPress": {
                  "action": "action.submit"
                }
              }
            }
          ]
        ]
      ]
    ]
  ]
}
```

### 14.3 Exemplo de composição horizontal

O contrato expressa a direção pretendida. Responsividade, quebra e breakpoints não são publicados na UI Spec; cada adapter visual aplica exclusivamente o comportamento homologado para o alvo.

```json
[
  "ui.stack",
  {
    "id": "document-row",
    "version": "1.0.0",
    "direction": "horizontal",
    "spacingToken": "spacing.sm",
    "alignment": "stretch"
  },
  [
    [
      "ui.select",
      {
        "id": "document-type",
        "version": "1.0.0",
        "label": "Documento",
        "options": [
          { "value": "cpf", "label": "CPF" },
          { "value": "passport", "label": "Passaporte" }
        ],
        "$bindings": {
          "value": {
            "path": "form.document.type",
            "mode": "twoWay"
          }
        }
      }
    ],
    [
      "ui.textInput",
      {
        "id": "document-number",
        "version": "1.0.0",
        "label": "Número",
        "inputMode": "text",
        "required": true,
        "$bindings": {
          "value": {
            "path": "form.document.number",
            "mode": "twoWay"
          }
        }
      }
    ]
  ]
]
```

No WhatsApp, a pilha é linearizada conforme a ordem declarada e as propriedades de disposição visual são descartadas com diagnóstico `info`.

### 14.4 `dataSources`

`dataSources` é registrado no envelope para evolução compatível, mas permanece `{}` no v1. O refinamento posterior deve definir, antes de qualquer uso: tipos de fonte; fontes registradas ou estáticas; propriedade e execução; prefetch; cache; timeout; fallback; autenticação; tratamento de dados sensíveis; allowlist; namespace `data`; compatibilidade por alvo; e observabilidade.

Nenhum renderer ou adapter pode interpretar `dataSources` como autorização para chamar URLs, executar consultas ou transportar credenciais. Os dados são entregues pelo serviço responsável pela jornada e pelo BFF do canal e consumidos pelos componentes por meio de `$bindings` e placeholders.

## 15. Validação e publicação no Strapi

Antes da publicação, o Elastic Journey deve validar:

- schema do envelope e de todos os nós;
- unicidade de `id` na tela;
- existência de `type + version` no Registry;
- compatibilidade com todos os alvos declarados;
- hierarquia e tipos de filhos permitidos;
- `$bindings` contra o contrato de dados da jornada;
- ações, parâmetros, rotas e URLs permitidos;
- tokens existentes e suportados;
- requisitos de acessibilidade e conteúdo;
- versões mínimas dos renderizadores.

Após aprovação, o Elastic Journey gera um snapshot canônico associado a `journeyVersion`, registra auditoria e publica no Strapi. O snapshot não deve ser editado diretamente no Strapi. Qualquer alteração retorna ao Form Builder, passa por nova validação/aprovação e cria uma nova versão publicada da jornada.

Recomenda-se que o Strapi armazene ao menos: `journeyId`, `journeyVersion`, `uiStepId`, status, datas, alvos, versões mínimas e o JSON do snapshot. `integrityHash` não é um campo de autoria nem integra o envelope canônico: deve ser calculado pelo serviço de armazenamento e mantido como metadado técnico. O modelo editorial do Strapi não deve reconstruir ou reinterpretar a árvore.

### 15.1 Diagnósticos e fallbacks

Os resultados de validação e adaptação possuem três severidades:

| Severidade | Efeito |
|---|---|
| `error` | Bloqueia a publicação ou a execução da UI Spec |
| `warning` | Permite continuar somente com fallback previamente homologado no catálogo |
| `info` | Registra adaptação ou omissão esperada que não altera a semântica funcional |

Todo diagnóstico deve conter `code`, `message`, `path`, `uiStepId`, `componentId`, `componentType`, `target` e `correlationId` quando disponível. Valores de formulário e dados pessoais não podem ser incluídos.

Códigos estáveis do v1:

- `SDUI_DOCUMENT_INVALID`;
- `SDUI_ROOT_INVALID`;
- `SDUI_COMPONENT_UNSUPPORTED`;
- `SDUI_COMPONENT_VERSION_UNSUPPORTED`;
- `SDUI_COMPONENT_ID_REQUIRED`;
- `SDUI_COMPONENT_ID_DUPLICATED`;
- `SDUI_PROP_REQUIRED`;
- `SDUI_PROP_UNSUPPORTED`;
- `SDUI_RESERVED_ATTRIBUTE_UNSUPPORTED`;
- `SDUI_BINDING_INVALID`;
- `SDUI_EVENT_INVALID`;
- `SDUI_ACTION_UNSUPPORTED`;
- `SDUI_CONDITION_INVALID`;
- `SDUI_TARGET_UNSUPPORTED`;
- `SDUI_RENDERER_VERSION_UNSUPPORTED`;
- `SDUI_PROP_IGNORED`;
- `SDUI_FALLBACK_APPLIED`;
- `SDUI_COMPONENT_OMITTED`.

Componente desconhecido, versão principal incompatível, propriedade obrigatória ausente e atributo reservado desconhecido são sempre erros. O renderer não pode inventar conteúdo, ação, token ou comportamento para contornar incompatibilidade.

## 16. Critérios de aceite do v1

O catálogo está pronto para adoção quando:

- os 19 componentes possuem schemas e adapters homologados para `react.web`, `react.mobile`, `flutter.web` e `flutter.mobile`, além de capacidade explicitamente classificada como suportada ou não suportada em `whatsapp`;
- o Form Builder consome o Registry e impede configurações inválidas;
- os renderizadores passam por testes de contrato compartilhados;
- tokens e ícones possuem mapeamento consistente nos quatro alvos visuais, e descarte ou representação conversacional explicitamente documentados para `whatsapp`;
- acessibilidade e responsividade são validadas nos alvos visuais, e acessibilidade conversacional, ordem das mensagens e limites interativos são validados no WhatsApp;
- snapshots são versionados, auditáveis, imutáveis e publicados apenas após aprovação;
- versões não suportadas falham de forma segura e observável;
- existe estratégia documentada de depreciação e migração.

## 17. Decisão arquitetural recomendada

Adotar `ui.*` como namespace estável do catálogo corporativo e o Node Tree deste documento como formato canônico do Elastic Journey. React Web, React Mobile, Flutter Web, Flutter Mobile e WhatsApp devem possuir targets e adapters explicitamente registrados e independentes desse contrato. O Strapi permanece como repositório e canal de entrega dos snapshots aprovados, sem responsabilidade por autoria, semântica ou evolução do SDUI.

Essa separação preserva a portabilidade entre canais, reduz acoplamento tecnológico e permite evoluir Mística, React, Flutter, WhatsApp ou Strapi sem alterar desnecessariamente as jornadas publicadas.

## 18. Strapi vs AEM

### 18.1 Separação por canal — site corporativo vs. aplicações e apps

- **O Adobe AEM cuida dos canais institucionais e de marketing.** O site principal da empresa — por exemplo, a página inicial global, os portais de notícias da marca e as páginas de campanhas de marketing — roda no AEM. O time de Marketing precisa de autonomia para arrastar e soltar blocos, realizar testes A/B com o Adobe Target e analisar métricas com o Adobe Analytics, sem depender de desenvolvedores para cada alteração de texto.
- **O Strapi cuida de produtos digitais e microssites rápidos.** Quando a empresa precisa lançar um aplicativo móvel interno, um portal de clientes com dados dinâmicos ou um sistema para os funcionários, o Strapi pode ser utilizado. Ele entrega APIs limpas e rápidas em um ecossistema TypeScript/Node.js para que o time de Engenharia de Software alimente essas aplicações sem o peso e a complexidade da infraestrutura do AEM.

### 18.2 Velocidade de desenvolvimento — time-to-market vs. governança

- **AEM para governança rígida.** Alterações no AEM de uma grande empresa costumam passar por fluxos complexos de aprovação, envolvendo áreas como Compliance, Jurídico e Revisão de Marca. Essa governança é adequada ao site institucional principal, no qual é necessário reduzir o risco de erros graves, embora possa tornar a entrega mais lenta.
- **Strapi para agilidade.** Se um time de Produto precisa criar uma landing page em duas semanas para testar um novo produto no mercado, fazer isso dentro do AEM corporativo pode levar meses em razão da complexidade técnica e dos processos de TI. O time pode criar um projeto no Strapi, utilizar uma infraestrutura mais leve e lançar o experimento com maior rapidez.

### 18.3 Strapi como alimentador do próprio AEM — padrão Content Hub

Em algumas arquiteturas avançadas, a empresa utiliza o **Strapi como gerenciador de dados estruturados**, como catálogos de produtos, listas de lojas físicas e documentações técnicas. Esses dados são expostos pelas APIs do Strapi, e o **AEM consome essas APIs** para apresentar as informações nas páginas de marketing do site principal.

Nesse modelo, o Strapi cuida dos dados técnicos e estruturados, enquanto o AEM cuida da experiência editorial, da apresentação visual e do design.

### 18.4 Resumo — onde cada solução se destaca

- **Onde o AEM se destaca:** nas mãos dos times de **Marketing, Growth e Vendas**, controlando a identidade visual macro da marca, o conteúdo institucional e as campanhas globais.
- **Onde o Strapi se destaca:** nas mãos dos times de **Engenharia de Software e Produto — squads**, criando sistemas dinâmicos, aplicações, experiências rápidas e APIs eficientes com maior autonomia.

No contexto do Elastic Journey, o Strapi continua exercendo o papel definido neste catálogo: armazenar e distribuir snapshots SDUI publicados após aprovação. O comparativo não transfere para o Strapi a propriedade do contrato, da árvore de componentes ou da experiência de autoria, que permanecem sob governança do Elastic Journey e do catálogo corporativo.
