# Elastic Journey — SDUI Component Catalog v1

**Status:** Proposta para adoção corporativa  
**Escopo:** Elastic Journey, React Web, React Mobile, Flutter Web e Flutter Mobile  
**Design system:** Mística  
**Versão do catálogo:** 1.0  

## 1. Resumo executivo

Este documento define o catálogo inicial de componentes Server-Driven UI (SDUI) do **Elastic Journey**. O objetivo é permitir que telas e formulários sejam compostos no Form Builder próprio e renderizados de forma consistente em quatro alvos: **React Web**, **React Mobile**, **Flutter Web** e **Flutter Mobile**, respeitando o design system **Mística**.

O contrato SDUI é corporativo e pertence ao **Elastic Journey**. Ele deve ser independente de frameworks, bibliotecas visuais e mecanismos de persistência. React, Flutter e Mística são implementações do contrato; não fazem parte de sua definição.

O **Strapi não é o proprietário do contrato SDUI**. Seu papel é armazenar e distribuir **snapshots imutáveis publicados pelo Elastic Journey após o fluxo de aprovação**. Rascunhos, validações, versionamento do catálogo, compatibilidade e governança permanecem sob responsabilidade do Elastic Journey.

## 2. Objetivo

O catálogo v1 estabelece:

- uma linguagem comum de componentes com nomenclatura `ui.*`;
- uma árvore de nós portável entre Web e Mobile e entre React e Flutter;
- propriedades, bindings, ações e eventos independentes de framework e canal;
- o de/para entre o contrato corporativo e os quatro alvos de renderização;
- regras mínimas de compatibilidade, validação, versionamento e publicação;
- uma base pequena e extensível para o Component Registry.

Ficam fora do v1: componentes exclusivos de um canal, navegação complexa, tabelas avançadas, editores rich text, upload múltiplo, assinatura, biometria e componentes de domínio. Esses itens devem entrar apenas após comprovação de uso e análise de compatibilidade.

## 3. Princípios arquiteturais

1. **Contrato independente de tecnologia.** A árvore utiliza nomes semânticos, como `ui.textInput`, e nunca nomes como `MisticaTextField`, `ReactNode` ou `FlutterWidget`.
2. **Paridade funcional antes da paridade visual absoluta.** O comportamento e a semântica devem ser equivalentes entre frameworks e canais; pequenas diferenças nativas de interação são aceitáveis.
3. **Mística por meio de adapters.** Cada alvo traduz propriedades e tokens corporativos para os componentes disponíveis em sua implementação do Mística.
4. **Catálogo mínimo e composável.** Novas necessidades devem ser resolvidas primeiro por composição dos componentes existentes.
5. **Node Tree declarativa.** Layout, conteúdo e interação são representados por nós recursivos com `children`; lógica de negócio permanece fora da camada visual.
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
| Strapi | Persistir e entregar snapshots publicados; não definir nem transformar o contrato |
| Aplicações de canal | Resolver dados, executar ações permitidas, aplicar telemetria e renderizar a árvore |

Fluxo recomendado:

```text
Form Builder → validação pelo Component Registry → aprovação → snapshot publicado no Strapi
                                                            ↓
                   React Web / React Mobile / Flutter Web / Flutter Mobile
```

Neste documento, **alvo de renderização** é a combinação de framework e canal. São identificadores distintos: `react.web`, `react.mobile`, `flutter.web` e `flutter.mobile`. Mesmo quando dois alvos compartilham código, eles mantêm entradas de compatibilidade separadas no Registry.

## 5. Níveis e categorias de componentes

### Nível 0 — Primitivos visuais

Elementos sem estado de negócio, usados para conteúdo e separação: texto, imagem, ícone, divisor e espaçamento.

### Nível 1 — Layout e composição

Organizam outros nós por meio de `children`: tela, container, pilha vertical/horizontal e card.

### Nível 2 — Entrada de dados

Capturam valores e integram-se ao estado do formulário: campo de texto, seleção, checkbox e seletor de data.

### Nível 3 — Ação e feedback

Disparam eventos ou comunicam estado ao usuário: botão, link, alerta, indicador de progresso e carregamento.

### Nível 4 — Componentes de domínio

Composições governadas para casos corporativos específicos, como endereço, identificação ou consentimento. Não fazem parte do catálogo v1; devem ser introduzidas em versões posteriores com semântica de domínio explícita.

## 6. Estrutura padrão de um nó

Todo componente é representado por um nó. O formato recomendado é:

```json
{
  "id": "customer-name",
  "type": "ui.textInput",
  "version": "1.0",
  "props": {},
  "bindings": {},
  "events": {},
  "visibility": {},
  "children": []
}
```

| Campo | Obrigatório | Descrição |
|---|---:|---|
| `id` | Sim | Identificador único e estável dentro da tela; usado por telemetria, validação e diagnóstico |
| `type` | Sim | Tipo corporativo registrado, sempre no padrão `ui.*` |
| `version` | Sim | Versão principal/secundária do contrato do componente |
| `props` | Não | Configuração estática validada pelo schema do componente |
| `bindings` | Não | Mapeamento entre propriedades/valor e o contexto de dados |
| `events` | Não | Mapeamento de eventos do componente para ações declarativas permitidas |
| `visibility` | Não | Regra declarativa de exibição ou habilitação |
| `children` | Para containers | Lista ordenada de nós filhos; omitida em componentes folha |

Campos desconhecidos devem ser ignorados apenas quando o schema declarar compatibilidade aditiva. Campos obrigatórios ausentes, tipo não registrado ou versão principal incompatível devem impedir a publicação.

## 7. Catálogo de componentes v1

O v1 contém 19 componentes, distribuídos entre conteúdo, layout, entrada, ação e feedback. O de/para abaixo é conceitual: o nome exato da classe ou widget pode variar conforme a versão das bibliotecas e a implementação corporativa do adapter.

| Tipo SDUI corporativo | Nível | React Web / Mística | React Mobile / Mística Adapter | Flutter Web / Mística Adapter | Flutter Mobile / Mística Adapter |
|---|---:|---|---|---|---|
| `ui.screen` | 1 | Page shell + layout responsivo | Screen + Safe Area + Scroll | Scaffold + layout responsivo | Scaffold + SafeArea |
| `ui.container` | 1 | Box/View wrapper | View | Container | Container |
| `ui.stack` | 1 | Flex | View/Flex | Row/Column/Flex | Row/Column/Flex |
| `ui.card` | 1 | Mística Card | Card/Pressable adapter | Card adapter | Card adapter |
| `ui.text` | 0 | Mística Text/Typography | Text adapter | Text adapter | Text adapter |
| `ui.image` | 0 | Image component | Image adapter | Image | Image |
| `ui.icon` | 0 | Mística Icon | Icon registry adapter | Icon registry adapter | Icon registry adapter |
| `ui.divider` | 0 | Divider | View/Divider adapter | Divider | Divider |
| `ui.spacer` | 0 | Spacing box | View spacer | SizedBox | SizedBox |
| `ui.textInput` | 2 | Mística TextField | TextInput adapter | TextFormField adapter | TextFormField adapter |
| `ui.textArea` | 2 | Mística TextArea/TextField multiline | TextInput multiline adapter | TextFormField multiline | TextFormField multiline |
| `ui.select` | 2 | Mística Select/Dropdown | Picker/Bottom-sheet adapter | Dropdown adapter | Dropdown/Bottom-sheet adapter |
| `ui.checkbox` | 2 | Mística Checkbox | Checkbox/Pressable adapter | Checkbox adapter | Checkbox adapter |
| `ui.datePicker` | 2 | Mística DateField/DatePicker | Date picker adapter | Date picker adapter | Date picker nativo adapter |
| `ui.button` | 3 | Mística Button | Button/Pressable adapter | Button adapter | Button adapter |
| `ui.link` | 3 | Mística Link | Text/Pressable adapter | Link/TextButton adapter | TextButton adapter |
| `ui.alert` | 3 | Mística Feedback/Alert | Alert/View adapter | Alert adapter | Alert adapter |
| `ui.progress` | 3 | Mística Progress bar | Progress adapter | LinearProgressIndicator | LinearProgressIndicator |
| `ui.loading` | 3 | Mística Spinner | Activity indicator adapter | CircularProgressIndicator | CircularProgressIndicator |

Propriedades principais do contrato:

| Tipo SDUI corporativo | Propriedades principais |
|---|---|
| `ui.screen` | `title`, `backgroundToken`, `scrollable`, `paddingToken` |
| `ui.container` | `paddingToken`, `marginToken`, `backgroundToken`, `borderToken`, `maxWidthToken` |
| `ui.stack` | `direction`, `gapToken`, `align`, `justify`, `wrap` |
| `ui.card` | `variant`, `paddingToken`, `elevationToken`, `interactive` |
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

### 7.1 Convenções de propriedades

- `label`, `placeholder`, `title`, `message` e `text` aceitam texto literal ou placeholder seguro.
- `variant` representa intenção visual corporativa, nunca uma classe CSS ou nome interno do framework.
- `options` utiliza uma lista de objetos `{ "value": string, "label": string, "disabled"?: boolean }`.
- Datas são transportadas em ISO 8601; a apresentação localizada é responsabilidade do adapter de cada alvo.
- Dimensões, cores e tipografia devem referenciar tokens, exceto valores de conteúdo como `aspectRatio` ou `maxLength`.
- Propriedades específicas de uma única plataforma não entram no contrato comum. Se indispensáveis, devem ser declaradas como extensão de canal e não podem alterar o comportamento principal.

Exemplo de opções:

```json
{
  "type": "ui.select",
  "props": {
    "label": "Estado civil",
    "placeholder": "Selecione",
    "required": true,
    "options": [
      { "value": "single", "label": "Solteiro(a)" },
      { "value": "married", "label": "Casado(a)" }
    ]
  }
}
```

## 8. Bindings e placeholders

Bindings conectam o nó ao contexto de execução sem inserir lógica de aplicação na árvore. Recomenda-se separar namespaces:

| Namespace | Uso | Exemplo |
|---|---|---|
| `form` | Valores editáveis da jornada | `form.customer.name` |
| `data` | Dados carregados e somente leitura | `data.customer.document` |
| `session` | Contexto autorizado da sessão | `session.locale` |
| `route` | Parâmetros de navegação permitidos | `route.orderId` |
| `computed` | Valores derivados por regras registradas | `computed.isAdult` |

Um binding de valor deve ser explícito:

```json
{
  "id": "customer-email",
  "type": "ui.textInput",
  "version": "1.0",
  "props": {
    "label": "E-mail",
    "inputMode": "email",
    "required": true
  },
  "bindings": {
    "value": { "path": "form.customer.email", "mode": "twoWay" }
  }
}
```

Placeholders destinam-se a interpolação somente leitura em conteúdo textual:

```json
{
  "type": "ui.text",
  "props": {
    "text": "Olá, {{data.customer.firstName}}",
    "variant": "heading.medium"
  }
}
```

Regras obrigatórias:

- não executar JavaScript, Dart, expressões de template ou código arbitrário;
- validar caminhos e namespaces contra um data contract conhecido;
- escapar conteúdo textual por padrão;
- impedir acesso a segredos, headers, tokens e objetos internos da aplicação;
- distinguir binding ausente de valor `null` e definir fallback quando necessário;
- registrar em telemetria apenas identificadores técnicos, nunca valores pessoais do formulário.

## 9. Ações e eventos

Eventos do componente apontam para ações declarativas registradas. O renderer emite o evento; o Action Registry valida e executa a ação.

Eventos v1 recomendados:

| Evento | Componentes típicos | Uso |
|---|---|---|
| `onPress` | `ui.button`, `ui.link`, `ui.card` interativo | Acionar navegação, envio ou ação registrada |
| `onChange` | Inputs, select, checkbox e date picker | Atualizar estado e disparar validação declarada |
| `onBlur` | Campos de entrada | Validar ou registrar interação |
| `onDismiss` | `ui.alert` | Fechar feedback dispensável |

Ações mínimas:

| Tipo de ação | Finalidade |
|---|---|
| `action.submit` | Validar e enviar o estado do formulário |
| `action.navigate` | Navegar para destino interno permitido |
| `action.openUrl` | Abrir URL validada conforme allowlist |
| `action.setValue` | Atualizar um caminho autorizado do estado |
| `action.track` | Emitir evento de telemetria sem dados sensíveis |
| `action.dismiss` | Alterar estado visual descartável |

Exemplo:

```json
{
  "id": "continue-button",
  "type": "ui.button",
  "version": "1.0",
  "props": {
    "label": "Continuar",
    "variant": "primary",
    "fullWidth": true
  },
  "events": {
    "onPress": {
      "action": "action.submit",
      "params": {
        "formId": "customer-registration",
        "successRoute": "address"
      }
    }
  }
}
```

O contrato não deve conter callbacks, URLs irrestritas ou comandos específicos de framework. A execução precisa passar por allowlist, validação de parâmetros, política de autorização e telemetria.

## 10. Design tokens semânticos

O SDUI referencia tokens corporativos. Cada adapter resolve esses tokens para a implementação vigente do Mística no respectivo alvo.

| Grupo | Exemplos de tokens | Uso |
|---|---|---|
| Cor | `color.background.primary`, `color.text.primary`, `color.feedback.negative` | Fundos, conteúdo e estados sem codificar hexadecimal |
| Tipografia | `typography.heading.medium`, `typography.body.regular`, `typography.caption` | Hierarquia e leitura |
| Espaçamento | `spacing.none`, `spacing.xs`, `spacing.sm`, `spacing.md`, `spacing.lg`, `spacing.xl` | Gap, padding e margin |
| Forma | `radius.none`, `radius.sm`, `radius.md`, `radius.full` | Bordas e superfícies |
| Elevação | `elevation.none`, `elevation.low`, `elevation.medium` | Hierarquia de superfícies |
| Tamanho | `size.icon.sm`, `size.icon.md`, `size.control.lg` | Ícones e controles |
| Largura | `layout.content.compact`, `layout.content.default`, `layout.content.wide` | Limites responsivos de conteúdo |

Valores literais como `#0066FF`, `16px`, `12dp` ou nomes de classes CSS não devem ser publicados. A evolução visual do Mística deve ocorrer por atualização do mapeamento de tokens, preservando o snapshot SDUI.

## 11. Regras de compatibilidade entre plataformas

1. Todo componente v1 precisa ter implementação homologada nos quatro alvos antes de ser marcado como `stable` para todo o ecossistema.
2. O mesmo nó deve produzir semântica, hierarquia de conteúdo, validação e resultado de ação equivalentes em React Web, React Mobile, Flutter Web e Flutter Mobile.
3. Interações podem respeitar padrões nativos — por exemplo, a apresentação do date picker — desde que o valor e as regras sejam idênticos.
4. Acessibilidade é obrigatória: labels, foco, leitura por tecnologia assistiva, contraste e área mínima de toque devem seguir o Mística e as normas corporativas.
5. O layout deve ser responsivo e baseado em containers; coordenadas absolutas não são aceitas no contrato comum.
6. Tokens não suportados em um alvo devem ser rejeitados na validação ou possuir fallback previamente declarado no Registry.
7. Diferenças de capacidade devem ser registradas por alvo e versão mínima do renderer ou aplicativo.
8. Uma tela não pode ser publicada para um alvo se contiver componente `unsupported` ou versão incompatível.
9. Cada renderer deve ter fallback técnico seguro para falhas inesperadas, com telemetria, sem expor stack trace ao usuário.
10. Ordem de leitura e de foco deve seguir a ordem da árvore, salvo regra de acessibilidade explicitamente homologada.
11. Compartilhamento de código não implica compatibilidade automática: Flutter Web e Flutter Mobile, por exemplo, podem usar o mesmo widget, mas devem ser homologados separadamente devido a diferenças de entrada, acessibilidade, navegação e runtime.
12. Se React Mobile for uma aplicação React Native, deve usar um adapter próprio. Se for apenas uma experiência Web responsiva/PWA, `react.web` e `react.mobile` podem compartilhar implementação, mantendo-se como alvos separados para validação e rollout.

## 12. Component Registry

O Component Registry é a fonte de verdade operacional do catálogo. Ele não precisa armazenar o código dos componentes, mas deve descrever o que o Builder pode produzir e o que cada canal consegue renderizar.

Registro mínimo por componente:

```json
{
  "type": "ui.textInput",
  "version": "1.0",
  "status": "stable",
  "level": 2,
  "category": "input",
  "propsSchema": "schemas/ui.textInput/1.0.json",
  "allowsChildren": false,
  "events": ["onChange", "onBlur"],
  "targets": {
    "react.web": { "status": "supported", "minRendererVersion": "1.2.0" },
    "react.mobile": { "status": "supported", "minRendererVersion": "1.1.0" },
    "flutter.web": { "status": "supported", "minRendererVersion": "1.0.0" },
    "flutter.mobile": { "status": "supported", "minRendererVersion": "1.3.0" }
  },
  "adapterKeys": {
    "react.web": "textInput",
    "react.mobile": "textInput",
    "flutter.web": "textInput",
    "flutter.mobile": "textInput"
  }
}
```

O Registry deve fornecer ao Form Builder:

- schema de propriedades e valores padrão;
- indicação de container ou folha e tipos de filhos permitidos;
- eventos e ações autorizados;
- tokens aceitos;
- compatibilidade por alvo e versão mínima do renderer;
- status `experimental`, `stable`, `deprecated` ou `removed`;
- documentação e exemplos de preview;
- regras de migração entre versões.

O renderer deve resolver `type + version` por um mapa controlado. Reflexão dinâmica, import de código remoto e componentes não registrados não são permitidos.

## 13. Versionamento

Recomenda-se Semantic Versioning para o catálogo, componentes, schema de tela e renderizadores:

- **Major:** alteração incompatível, remoção ou mudança de significado;
- **Minor:** novo componente, propriedade opcional, evento ou token compatível;
- **Patch:** correção de documentação, adapter ou comportamento sem mudança contratual.

Diretrizes:

- a versão do snapshot identifica o schema geral (`schemaVersion`) e a versão do catálogo (`catalogVersion`);
- cada nó informa sua própria `version` para resolução inequívoca;
- componentes depreciados continuam renderizáveis durante uma janela corporativa definida;
- snapshots já publicados permanecem imutáveis; correções geram uma nova revisão;
- migrações devem ser automatizáveis, auditáveis e executadas no Elastic Journey antes da republicação;
- a matriz de compatibilidade deve considerar catálogo, alvo, renderer e versão mínima da aplicação correspondente.

## 14. Formato Node Tree recomendado

### 14.1 Envelope do snapshot de tela

O snapshot publicado deve transportar metadados suficientes para validação, cache, auditoria e compatibilidade:

```json
{
  "schemaVersion": "1.0",
  "catalogVersion": "1.0",
  "journeyId": "customer-onboarding",
  "screenId": "personal-data",
  "revision": 7,
  "status": "published",
  "publishedAt": "2026-09-03T15:00:00Z",
  "supportedTargets": ["react.web", "react.mobile", "flutter.web", "flutter.mobile"],
  "minRendererVersion": {
    "react.web": "1.2.0",
    "react.mobile": "1.1.0",
    "flutter.web": "1.0.0",
    "flutter.mobile": "1.3.0"
  },
  "root": {}
}
```

`root` deve conter exatamente um `ui.screen`. A ordem em `children` define ordem visual, leitura, foco padrão e serialização determinística.

### 14.2 Exemplo completo — tela de dados pessoais

```json
{
  "schemaVersion": "1.0",
  "catalogVersion": "1.0",
  "journeyId": "customer-onboarding",
  "screenId": "personal-data",
  "revision": 7,
  "status": "published",
  "publishedAt": "2026-09-03T15:00:00Z",
  "supportedTargets": ["react.web", "react.mobile", "flutter.web", "flutter.mobile"],
  "minRendererVersion": {
    "react.web": "1.2.0",
    "react.mobile": "1.1.0",
    "flutter.web": "1.0.0",
    "flutter.mobile": "1.3.0"
  },
  "root": {
    "id": "personal-data-screen",
    "type": "ui.screen",
    "version": "1.0",
    "props": {
      "title": "Dados pessoais",
      "scrollable": true,
      "backgroundToken": "color.background.primary",
      "paddingToken": "spacing.md"
    },
    "children": [
      {
        "id": "screen-content",
        "type": "ui.container",
        "version": "1.0",
        "props": {
          "maxWidthToken": "layout.content.default"
        },
        "children": [
          {
            "id": "form-stack",
            "type": "ui.stack",
            "version": "1.0",
            "props": {
              "direction": "vertical",
              "gapToken": "spacing.md",
              "align": "stretch"
            },
            "children": [
              {
                "id": "heading",
                "type": "ui.text",
                "version": "1.0",
                "props": {
                  "text": "Olá, {{data.customer.firstName}}",
                  "variant": "typography.heading.medium",
                  "colorToken": "color.text.primary"
                }
              },
              {
                "id": "instructions",
                "type": "ui.text",
                "version": "1.0",
                "props": {
                  "text": "Confirme seus dados para continuar.",
                  "variant": "typography.body.regular",
                  "colorToken": "color.text.secondary"
                }
              },
              {
                "id": "name",
                "type": "ui.textInput",
                "version": "1.0",
                "props": {
                  "label": "Nome completo",
                  "inputMode": "text",
                  "required": true,
                  "maxLength": 120,
                  "validation": [
                    { "rule": "required", "message": "Informe seu nome completo." },
                    { "rule": "minLength", "value": 3, "message": "Informe ao menos 3 caracteres." }
                  ]
                },
                "bindings": {
                  "value": { "path": "form.customer.name", "mode": "twoWay" }
                },
                "events": {
                  "onBlur": {
                    "action": "action.track",
                    "params": { "event": "personal_data_name_completed" }
                  }
                }
              },
              {
                "id": "email",
                "type": "ui.textInput",
                "version": "1.0",
                "props": {
                  "label": "E-mail",
                  "inputMode": "email",
                  "required": true,
                  "validation": [
                    { "rule": "required", "message": "Informe seu e-mail." },
                    { "rule": "email", "message": "Informe um e-mail válido." }
                  ]
                },
                "bindings": {
                  "value": { "path": "form.customer.email", "mode": "twoWay" }
                }
              },
              {
                "id": "birth-date",
                "type": "ui.datePicker",
                "version": "1.0",
                "props": {
                  "label": "Data de nascimento",
                  "mode": "date",
                  "maxDate": "today",
                  "format": "locale",
                  "required": true
                },
                "bindings": {
                  "value": { "path": "form.customer.birthDate", "mode": "twoWay" }
                }
              },
              {
                "id": "marketing-consent",
                "type": "ui.checkbox",
                "version": "1.0",
                "props": {
                  "label": "Aceito receber comunicações sobre produtos e serviços.",
                  "required": false
                },
                "bindings": {
                  "value": { "path": "form.consents.marketing", "mode": "twoWay" }
                }
              },
              {
                "id": "validation-alert",
                "type": "ui.alert",
                "version": "1.0",
                "props": {
                  "severity": "negative",
                  "title": "Revise os dados",
                  "message": "Existem campos obrigatórios não preenchidos."
                },
                "visibility": {
                  "rule": "equals",
                  "path": "computed.showValidationSummary",
                  "value": true
                }
              },
              {
                "id": "continue",
                "type": "ui.button",
                "version": "1.0",
                "props": {
                  "label": "Continuar",
                  "variant": "primary",
                  "size": "large",
                  "fullWidth": true
                },
                "events": {
                  "onPress": {
                    "action": "action.submit",
                    "params": {
                      "formId": "personal-data-form",
                      "successRoute": "address"
                    }
                  }
                }
              }
            ]
          }
        ]
      }
    ]
  }
}
```

### 14.3 Exemplo de composição horizontal responsiva

O contrato expressa a intenção; o adapter decide a implementação responsiva homologada para cada alvo.

```json
{
  "id": "document-row",
  "type": "ui.stack",
  "version": "1.0",
  "props": {
    "direction": "responsive",
    "gapToken": "spacing.sm",
    "align": "stretch"
  },
  "children": [
    {
      "id": "document-type",
      "type": "ui.select",
      "version": "1.0",
      "props": {
        "label": "Documento",
        "options": [
          { "value": "cpf", "label": "CPF" },
          { "value": "passport", "label": "Passaporte" }
        ]
      },
      "bindings": {
        "value": { "path": "form.document.type", "mode": "twoWay" }
      }
    },
    {
      "id": "document-number",
      "type": "ui.textInput",
      "version": "1.0",
      "props": {
        "label": "Número",
        "inputMode": "text",
        "required": true
      },
      "bindings": {
        "value": { "path": "form.document.number", "mode": "twoWay" }
      }
    }
  ]
}
```

Semântica sugerida para `direction: "responsive"`: disposição horizontal quando a largura disponível e a acessibilidade permitirem; disposição vertical nos demais casos. Os breakpoints permanecem definidos pelo Mística e pelo adapter, não pelo snapshot.

## 15. Validação e publicação no Strapi

Antes da publicação, o Elastic Journey deve validar:

- schema do envelope e de todos os nós;
- unicidade de `id` na tela;
- existência de `type + version` no Registry;
- compatibilidade com todos os alvos declarados;
- hierarquia e tipos de filhos permitidos;
- bindings contra o data contract da jornada;
- ações, parâmetros, rotas e URLs permitidos;
- tokens existentes e suportados;
- requisitos de acessibilidade e conteúdo;
- versões mínimas dos renderizadores.

Após aprovação, o Elastic Journey gera um snapshot canônico, atribui `revision`, registra auditoria e publica no Strapi. O snapshot não deve ser editado diretamente no Strapi. Qualquer alteração retorna ao Form Builder, passa por nova validação/aprovação e cria uma nova revisão publicada.

Recomenda-se que o Strapi armazene ao menos: identificadores de jornada e tela, revisão, status, datas, hash de integridade, alvos, versões mínimas e o JSON do snapshot. O modelo editorial do Strapi não deve reconstruir ou reinterpretar a árvore.

## 16. Critérios de aceite do v1

O catálogo está pronto para adoção quando:

- os 19 componentes possuem schemas e adapters homologados para `react.web`, `react.mobile`, `flutter.web` e `flutter.mobile`;
- o Form Builder consome o Registry e impede configurações inválidas;
- os renderizadores passam por testes de contrato compartilhados;
- tokens e ícones possuem mapeamento consistente nos quatro alvos;
- acessibilidade e responsividade são validadas em cenários de referência;
- snapshots são versionados, auditáveis, imutáveis e publicados apenas após aprovação;
- versões não suportadas falham de forma segura e observável;
- existe estratégia documentada de depreciação e migração.

## 17. Decisão arquitetural recomendada

Adotar `ui.*` como namespace estável do catálogo corporativo e o Node Tree deste documento como formato canônico do Elastic Journey. React Web, React Mobile, Flutter Web e Flutter Mobile devem possuir targets e adapters explicitamente registrados e independentes desse contrato. O Strapi permanece como repositório e canal de entrega dos snapshots aprovados, sem responsabilidade por autoria, semântica ou evolução do SDUI.

Essa separação preserva a portabilidade entre canais, reduz acoplamento tecnológico e permite evoluir Mística, React, Flutter ou Strapi sem alterar desnecessariamente as jornadas publicadas.

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
