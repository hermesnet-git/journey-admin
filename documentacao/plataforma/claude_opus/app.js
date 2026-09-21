/* ==========================================================================
   Dynamic Journey — Arquitetura de Plataformas e Canais Digitais
   Navegação da apresentação, player de sequência e renderizador SDUI.
   Vanilla JS, sem dependências.
   ========================================================================== */
(function () {
  "use strict";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) { /* file:// ou bloqueado */ } }
  };

  /* ---------------------------------------------------------------- deck */
  var views = $$(".view");
  var cmpToggle = null; // definido junto do comparativo; usado pelo atalho A
  var total = views.length;
  var idx = 0;
  var seen = {};
  var rail = $("#rail");
  var toc = $("#toc");

  views.forEach(function (v, i) {
    var b = document.createElement("button");
    b.title = (i + 1) + ". " + v.dataset.title;
    b.addEventListener("click", function () { go(i); });
    rail.appendChild(b);

    var t = document.createElement("button");
    t.innerHTML = '<span class="num">' + String(i + 1).padStart(2, "0") + '</span>' +
      '<span class="nm">' + v.dataset.title + '</span>' +
      '<span class="ds">' + (v.dataset.desc || "") + '</span>';
    t.addEventListener("click", function () { go(i); closeToc(); });
    toc.appendChild(t);
  });
  $("#cAll").textContent = String(total).padStart(2, "0");

  function go(n) {
    idx = Math.max(0, Math.min(total - 1, n));
    seen[idx] = true;
    views.forEach(function (v, i) { v.classList.toggle("active", i === idx); });
    $$("button", rail).forEach(function (b, i) {
      b.classList.toggle("on", i === idx);
      b.classList.toggle("seen", !!seen[i] && i !== idx);
    });
    $$("button", toc).forEach(function (b, i) { b.classList.toggle("on", i === idx); });
    $("#cNow").textContent = String(idx + 1).padStart(2, "0");
    $("#btnPrev").disabled = idx === 0;
    $("#btnNext").disabled = idx === total - 1;
    if (!document.body.classList.contains("reading")) {
      views[idx].scrollTop = 0;
      if (history.replaceState) history.replaceState(null, "", "#" + (idx + 1));
    }
    if (views[idx].dataset.title === "Ciclo de uma etapa") seqSelect(0);
  }

  $("#btnPrev").addEventListener("click", function () { go(idx - 1); });
  $("#btnNext").addEventListener("click", function () { go(idx + 1); });
  /* --------------------------------------------------------- ferramentas */
  var overlay = $("#overlay");
  function openToc() { overlay.classList.add("open"); $("#btnToc").classList.add("on"); }
  function closeToc() { overlay.classList.remove("open"); $("#btnToc").classList.remove("on"); }
  $("#btnToc").addEventListener("click", function () {
    overlay.classList.contains("open") ? closeToc() : openToc();
  });
  $("#btnTocClose").addEventListener("click", closeToc);
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeToc(); });

  function setTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    store.set("dj-theme", t);
  }
  var saved = store.get("dj-theme");
  if (saved) setTheme(saved);
  $("#btnTheme").addEventListener("click", function () {
    setTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");
  });

  function toggleReading() {
    var on = document.body.classList.toggle("reading");
    $("#btnRead").classList.toggle("on", on);
    if (on) {
      views.forEach(function (v) { v.classList.add("active"); });
      views[idx].scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      go(idx);
    }
  }
  $("#btnRead").addEventListener("click", toggleReading);

  $("#btnFull").addEventListener("click", function () {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  });

  /* ------------------------------------------------------------- teclado */
  document.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "input" || tag === "textarea") return;
    var k = e.key.toLowerCase();
    if (k === "arrowright" || k === "pagedown" || k === " ") { e.preventDefault(); go(idx + 1); }
    else if (k === "arrowleft" || k === "pageup") { e.preventDefault(); go(idx - 1); }
    else if (k === "home") { e.preventDefault(); go(0); }
    else if (k === "end") { e.preventDefault(); go(total - 1); }
    else if (k === "o") { overlay.classList.contains("open") ? closeToc() : openToc(); }
    else if (k === "r") { toggleReading(); }
    else if (k === "t") { $("#btnTheme").click(); }
    else if (k === "f") { $("#btnFull").click(); }
    else if (k === "a" && cmpToggle &&
      (document.body.classList.contains("reading") || views[idx].querySelector("#cmpWrap"))) { cmpToggle(); }
    else if (k === "escape") { closeToc(); closeDrawer(); }
  });

  /* ---------------------------------------------------- foco no mapa 03 */
  var mapDiagram = $("#mapDiagram");
  $$("#mapChips .chip").forEach(function (c) {
    c.addEventListener("click", function () {
      $$("#mapChips .chip").forEach(function (o) { o.classList.remove("on"); });
      c.classList.add("on");
      mapDiagram.setAttribute("data-focus", c.dataset.map);
    });
  });

  /* --------------------------------------- comparativo antes/depois 02 */
  var CANAIS = ["App Mobile", "Portal Web", "WhatsApp / Chat", "Loja / PDV", "Call Center"];
  var RESPONSA = ["Orquestração", "Regras de negócio", "Controle de estado",
    "Renderização de telas", "Integrações", "Tratamento de erros"];
  var COL_W = 224, COL_GAP = 20, COL_X0 = 20, CENTRO = 620;

  function svgEl(tag, attrs) {
    var e = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }
  function svgText(x, y, txt, cls) {
    var t = svgEl("text", { x: x, y: y, "text-anchor": "middle", class: cls });
    t.textContent = txt;
    return t;
  }

  var cmpChannels = $("#cmpChannels");
  if (cmpChannels) {
    var cols = $("#cmpCols"), edges = $("#cmpEdges");
    var edgeB = svgEl("g", { class: "cmp-edge-b" });
    var edgeA = svgEl("g", { class: "cmp-edge-a" });

    CANAIS.forEach(function (nome, i) {
      var left = COL_X0 + i * (COL_W + COL_GAP);
      var cx = left + COL_W / 2;

      cmpChannels.appendChild(svgEl("rect", { class: "n-box", x: left, y: 8, width: COL_W, height: 34, rx: 10 }));
      cmpChannels.appendChild(svgText(cx, 30, nome, "n-t"));

      // cenário sem plataforma: cada canal replica as seis capacidades
      var col = svgEl("g", { class: "cmp-col", style: "--dx:" + (CENTRO - cx) + "px" });
      RESPONSA.forEach(function (r, j) {
        var y = 56 + j * 29;
        col.appendChild(svgEl("rect", { class: "n-box", x: left + 10, y: y, width: COL_W - 20, height: 25, rx: 7 }));
        col.appendChild(svgText(cx, y + 17, r, "n-s"));
      });
      cols.appendChild(col);

      edgeB.appendChild(svgEl("line", {
        class: "edge", x1: cx, y1: 232, x2: cx, y2: 294, "marker-end": "url(#ah6)"
      }));
      edgeA.appendChild(svgEl("line", {
        class: "edge brand", x1: cx, y1: 46, x2: CENTRO, y2: 104, "marker-end": "url(#ah6)"
      }));
    });

    edges.appendChild(edgeB);
    edges.appendChild(edgeA);
    edges.appendChild(svgEl("line", {
      class: "edge brand cmp-edge-a", x1: CENTRO, y1: 284, x2: CENTRO, y2: 296, "marker-end": "url(#ah6)"
    }));

    var cmpWrap = $("#cmpWrap");
    var cmpBtns = $$("#cmpChips .seg-btn");
    var setCmp = function (state) {
      cmpWrap.setAttribute("data-state", state);
      cmpBtns.forEach(function (b) {
        var on = b.getAttribute("data-state") === state;
        b.classList.toggle("on", on);
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
    };
    cmpToggle = function () {
      setCmp(cmpWrap.getAttribute("data-state") === "after" ? "before" : "after");
    };
    cmpBtns.forEach(function (b) {
      b.addEventListener("click", function (e) { e.stopPropagation(); setCmp(b.getAttribute("data-state")); });
    });
    $("#cmpFigure").addEventListener("click", cmpToggle);
  }

  /* ------------------------------------------- explorador do catálogo 04 */
  var ALVOS = ["React Web", "React Mobile", "Flutter Web", "Flutter Mobile", "WhatsApp"];
  var NIVEIS = ["Nível 0 · Conteúdo", "Nível 1 · Layout", "Nível 2 · Entrada", "Nível 3 · Ação e feedback"];
  var RES_ESTRUTURA = "$visibility e $active. Não aceita $bindings nem $events.";
  var RES_ENTRADA = "$bindings.value obrigatório, bidirecional e no namespace form; aceita também $visibility e $active.";
  var RES_ACAO = "$events.onPress obrigatório; aceita $visibility e $active. Não aceita $bindings.";
  var RES_VISUAL = "Somente $visibility.";
  var WA_OMITE = "Omitido, com diagnóstico informativo; o adapter não inventa substituto";

  // Transcrição do de/para normativo do catálogo SDUI v1, §7 e §7.1. Propriedade com 1 = obrigatória.
  var CATALOGO = [
    { t: "ui.text", n: 0, cat: "Conteúdo", filhos: "Folha",
      props: [["text", 1], ["variant"], ["colorToken"], ["align"], ["maxLines"]],
      res: "$bindings.text somente leitura e $visibility.",
      alvos: ["Mística Text/Typography", "Text adapter", "Text adapter", "Text adapter", "Envia mensagem de texto"] },
    { t: "ui.image", n: 0, cat: "Conteúdo", filhos: "Folha",
      props: [["source", 1], ["alt", 1], ["fit"], ["aspectRatio"]],
      res: "$bindings somente leitura para source e alt, e $visibility.",
      alvos: ["Image component", "Image adapter", "Image", "Image", "Envia mensagem de imagem, usando alt como legenda"] },
    { t: "ui.icon", n: 0, cat: "Conteúdo", filhos: "Folha",
      props: [["name", 1], ["accessibilityLabel", 1], ["sizeToken"], ["colorToken"]],
      res: RES_VISUAL,
      alvos: ["Mística Icon", "Icon registry adapter", "Icon registry adapter", "Icon registry adapter", WA_OMITE] },
    { t: "ui.divider", n: 0, cat: "Conteúdo", filhos: "Folha",
      props: [["orientation"], ["colorToken"], ["spacingToken"]],
      res: RES_VISUAL,
      alvos: ["Divider", "View/Divider adapter", "Divider", "Divider", WA_OMITE] },
    { t: "ui.spacer", n: 0, cat: "Conteúdo", filhos: "Folha",
      props: [["sizeToken", 1], ["axis"]],
      res: RES_VISUAL,
      alvos: ["Spacing box", "View spacer", "SizedBox", "SizedBox", WA_OMITE] },

    { t: "ui.screen", n: 1, cat: "Layout", filhos: "Raiz única da tela",
      props: [["title"], ["backgroundToken"], ["scrollable"], ["paddingToken"]],
      res: "Não aceita campos reservados. É a raiz obrigatória e não pode ser aninhada.",
      alvos: ["Page shell com layout responsivo", "Screen, Safe Area e Scroll", "Scaffold com layout responsivo", "Scaffold e SafeArea",
        "O título abre a conversa em negrito; layout descartado, ordem dos filhos preservada"] },
    { t: "ui.container", n: 1, cat: "Layout", filhos: "Aceita filhos",
      props: [["backgroundToken"], ["paddingToken"], ["borderRadiusToken"]],
      res: RES_ESTRUTURA,
      alvos: ["Box/View wrapper", "View", "Container", "Container", "Não gera mensagem; agrupa os filhos e preserva a ordem"] },
    { t: "ui.stack", n: 1, cat: "Layout", filhos: "Aceita filhos",
      props: [["direction"], ["spacingToken"], ["alignment"]],
      res: RES_ESTRUTURA,
      alvos: ["Flex", "View/Flex", "Row/Column/Flex", "Row/Column/Flex", "Não gera mensagem; lineariza os filhos e descarta direção e espaçamento"] },
    { t: "ui.card", n: 1, cat: "Layout", filhos: "Aceita filhos",
      props: [["variant"], ["paddingToken"], ["elevationToken"]],
      res: RES_ESTRUTURA,
      alvos: ["Mística Card", "Card/Pressable adapter", "Card adapter", "Card adapter", "Não gera superfície; preserva os filhos e descarta aparência e elevação"] },

    { t: "ui.textInput", n: 2, cat: "Entrada", filhos: "Folha",
      props: [["label", 1], ["placeholder"], ["inputMode"], ["required"], ["readOnly"], ["maxLength"], ["validation"]],
      res: RES_ENTRADA,
      alvos: ["Mística TextField", "TextInput adapter", "TextFormField adapter", "TextFormField adapter",
        "Pede a informação, aguarda a próxima mensagem, valida e grava no vínculo"] },
    { t: "ui.textArea", n: 2, cat: "Entrada", filhos: "Folha",
      props: [["label", 1], ["placeholder"], ["required"], ["minLines"], ["maxLines"], ["maxLength"], ["validation"]],
      res: RES_ENTRADA,
      alvos: ["Mística TextArea multilinha", "TextInput multilinha", "TextFormField multilinha", "TextFormField multilinha",
        "Pede um texto longo, aguarda a resposta, valida e grava no vínculo"] },
    { t: "ui.select", n: 2, cat: "Entrada", filhos: "Folha",
      props: [["label", 1], ["options", 1], ["placeholder"], ["required"], ["searchable"]],
      res: RES_ENTRADA,
      alvos: ["Mística Select/Dropdown", "Picker ou bottom sheet", "Dropdown adapter", "Dropdown ou bottom sheet",
        "Até três opções viram botões de resposta rápida; acima disso, lista interativa"] },
    { t: "ui.checkbox", n: 2, cat: "Entrada", filhos: "Folha",
      props: [["label", 1], ["required"], ["indeterminate"]],
      res: RES_ENTRADA,
      alvos: ["Mística Checkbox", "Checkbox/Pressable adapter", "Checkbox adapter", "Checkbox adapter",
        "Confirmação por Sim e Não, gravando o valor booleano no vínculo"] },
    { t: "ui.datePicker", n: 2, cat: "Entrada", filhos: "Folha",
      props: [["label", 1], ["mode", 1], ["minDate"], ["maxDate"], ["format"], ["required"]],
      res: RES_ENTRADA,
      alvos: ["Mística DateField/DatePicker", "Date picker adapter", "Date picker adapter", "Date picker nativo",
        "Pede a data por texto no formato aceito, valida e normaliza antes de gravar"] },

    { t: "ui.button", n: 3, cat: "Ação", filhos: "Folha",
      props: [["label", 1], ["variant"], ["size"], ["fullWidth"], ["loading"], ["disabled"]],
      res: RES_ACAO,
      alvos: ["Mística Button", "Button/Pressable adapter", "Button adapter", "Button adapter",
        "Vira botão de resposta rápida, respeitando o limite de três por mensagem"] },
    { t: "ui.link", n: 3, cat: "Ação", filhos: "Folha",
      props: [["label", 1], ["emphasis"], ["external"], ["accessibilityLabel"]],
      res: RES_ACAO,
      alvos: ["Mística Link", "Text/Pressable adapter", "Link/TextButton adapter", "TextButton adapter",
        "Abrir URL vira chamada para ação com link; outras ações, resposta rápida"] },
    { t: "ui.alert", n: 3, cat: "Feedback", filhos: "Folha",
      props: [["severity", 1], ["message", 1], ["title"], ["dismissible"]],
      res: "$visibility, $active, $bindings somente leitura para title e message, e $events.onDismiss quando dismissible.",
      alvos: ["Mística Feedback/Alert", "Alert/View adapter", "Alert adapter", "Alert adapter",
        "Mensagem de texto com indicação de severidade, sem reproduzir o visual"] },
    { t: "ui.progress", n: 3, cat: "Feedback", filhos: "Folha",
      props: [["value", 1], ["label"], ["showValue"]],
      res: "$bindings.value somente leitura e $visibility.",
      alvos: ["Mística Progress bar", "Progress adapter", "LinearProgressIndicator", "LinearProgressIndicator",
        "Mensagem de texto com rótulo e percentual, sem barra gráfica"] },
    { t: "ui.loading", n: 3, cat: "Feedback", filhos: "Folha",
      props: [["label"], ["sizeToken"], ["overlay"]],
      res: RES_VISUAL,
      alvos: ["Mística Spinner", "Activity indicator adapter", "CircularProgressIndicator", "CircularProgressIndicator",
        "Mensagem de espera só quando necessária, sem animação nem overlay"] }
  ];

  var catList = $("#catList");
  if (catList) {
    NIVEIS.forEach(function (rotulo, nivel) {
      var grupo = document.createElement("div");
      grupo.className = "cat-level";
      var chips = CATALOGO.filter(function (c) { return c.n === nivel; }).map(function (c) {
        return '<button class="chip mono" data-cat="' + c.t + '">' + esc(c.t.replace("ui.", "")) + "</button>";
      }).join("");
      grupo.innerHTML = "<h4>" + esc(rotulo) + '</h4><div class="chips">' + chips + "</div>";
      catList.appendChild(grupo);
    });
    var fora = document.createElement("p");
    fora.className = "cat-out";
    fora.textContent = "Nível 4 · Domínio (endereço, identificação, consentimento): fora do escopo do v1.";
    catList.appendChild(fora);

    $$("[data-cat]", catList).forEach(function (b) {
      b.addEventListener("click", function () { catSelect(b.getAttribute("data-cat")); });
    });
    catSelect("ui.select");
  }

  function catSelect(tipo) {
    var c = CATALOGO.filter(function (x) { return x.t === tipo; })[0];
    if (!c) return;
    $$("[data-cat]", catList).forEach(function (b) {
      b.classList.toggle("on", b.getAttribute("data-cat") === tipo);
    });
    var props = c.props.map(function (p) {
      return '<span class="pill' + (p[1] ? " req" : "") + '">' + esc(p[0]) + "</span>";
    }).join("");
    var linhas = ALVOS.map(function (alvo, i) {
      return '<tr' + (i === 4 ? ' class="wa"' : "") + '><td><span class="tdot"></span>' + esc(alvo) +
        "</td><td>" + esc(c.alvos[i]) + "</td></tr>";
    }).join("");
    $("#catPanel").innerHTML =
      '<span class="cat-type">' + esc(c.t) + "</span>" +
      '<div class="pills mt-s"><span class="pill">' + esc(NIVEIS[c.n].replace(/ · .*/, "") + " · " + c.cat) + "</span>" +
      '<span class="pill">' + esc(c.filhos) + "</span>" +
      '<span class="pill on"><span class="dot"></span>Estável · de fábrica</span></div>' +
      "<h4>Propriedades · obrigatórias em destaque</h4><div class=\"pills\">" + props + "</div>" +
      '<h4>Campos reservados</h4><p class="cat-res">' + esc(c.res) + "</p>" +
      '<h4>Forma em cada alvo</h4><div class="table-wrap"><table class="table cat-targets"><tbody>' +
      linhas + "</tbody></table></div>";
  }

  /* ------------------------------------------------- painel de detalhes */
  var DETAILS = {
    "cat-governanca": {
      tag: "Contrato central", title: "Governança do catálogo",
      body: [
        ["Identidade", "Cada componente é identificado pelo par tipo e versão. Uma tela nunca referencia um componente por chave interna, o que permite versões diferentes do mesmo componente coexistirem."],
        ["Ciclo de vida", ["experimental", "estável", "descontinuado", "removido: qualquer tela que ainda o use é rejeitada na próxima publicação"]],
        ["Origem", "Os 19 componentes do v1 vêm de fábrica, marcados como estáveis. A instalação pode registrar componentes próprios, identificados à parte para não se misturarem à massa oficial."],
        ["Imutabilidade", "Alterar o catálogo não afeta jornadas já publicadas. A árvore de cada tela é congelada na publicação, e a validação só volta a se aplicar numa nova publicação."],
        ["Versionamento", "Catálogo, componentes, schema do envelope e renderizadores seguem versionamento semântico. A versão da jornada, por sua vez, é um inteiro sequencial."],
        ["Fonte", "catálogo SDUI v1 §12–§13 · back/ db/migration V18 e V22"]
      ]
    },
    "cat-editor": {
      tag: "Autoria", title: "O que o editor de telas lê do catálogo",
      body: [
        ["Lido do catálogo", ["quais componentes existem e em que estado estão", "o esquema de propriedades: tipo, obrigatoriedade, valor padrão e grupo de token aceito", "se o componente aceita filhos, e quais", "quais campos reservados são permitidos: vínculo, evento, visibilidade e estado ativo", "a compatibilidade com o canal que está sendo desenhado, com aviso quando não há"]],
        ["Consequência", "A paleta e o painel de propriedades são dirigidos pelo catálogo: o editor não oferece ao autor nada que a publicação vá rejeitar depois."],
        ["Limite atual", "Quais propriedades aceitam vínculo ainda está definido no próprio editor para os componentes de fábrica. Um componente customizado com vínculos permitidos no catálogo não ganha, hoje, vínculo por propriedade."],
        ["Fonte", "front/ · flow-designer/form-builder/PropertyInspector"]
      ]
    },
    "cat-publicacao": {
      tag: "Publicação", title: "Validação e cálculo de alvos",
      body: [
        ["Validação de cada tela", ["raiz obrigatoriamente ui.screen, com identificadores únicos", "todo tipo e versão existe no catálogo e não está removido", "propriedades permitidas e obrigatórias conferidas por componente", "filhos apenas onde o componente aceita", "vínculos restritos aos namespaces reconhecidos e ações restritas às seis homologadas", "campos reservados apenas onde o catálogo autoriza"]],
        ["Cálculo", "Os canais suportados por uma tela são a interseção dos alvos suportados por todos os componentes que ela usa. A versão mínima de renderizador por alvo é a maior exigida entre eles. Nada disso é configurado à mão."],
        ["Consequência", "Usar um componente sem suporte num canal remove aquele canal da tela na publicação, e não na frente do cliente."],
        ["Fonte", "back/ · domain/flow/FlowValidator e SduiEnvelopeBuilder"]
      ]
    },
    "cat-runtime": {
      tag: "Runtime", title: "Resolução da tela em execução",
      body: [
        ["Validação do envelope", "Antes de gravar e antes de servir uma tela, o registro de especificação confere a versão do schema e do catálogo, a raiz da árvore e a identidade de cada componente."],
        ["Vínculos e placeholders", "Textos com placeholder e vínculos de leitura são resolvidos contra as variáveis da instância num único ponto, para que nenhum canal precise repetir essa lógica."],
        ["O que o contrato proíbe", "Valor computado nunca é resolvido: o catálogo veta a execução de expressão arbitrária, e a plataforma não tem motor de regras para isso."],
        ["Fonte", "simulacoes/ms-espec-registry · domain/sdui"]
      ]
    },
    "cat-renderers": {
      tag: "Canais", title: "O que os renderizadores exigem do catálogo",
      body: [
        ["Mapa controlado", "Cada renderizador resolve tipo e versão por um mapa explícito. Reflexão dinâmica, importação de código remoto e componentes não registrados são vetados pelo contrato."],
        ["Paridade funcional", "O mesmo componente mantém a mesma semântica em todos os alvos, admitindo diferenças nativas de apresentação. No WhatsApp, isso significa projetar a tela como conversa em vez de layout."],
        ["Decisão antes de renderizar", "O envelope informa os alvos suportados e a versão mínima de renderizador. Um canal desatualizado sabe, antes de desenhar qualquer coisa, que não deve tentar exibir aquela tela."],
        ["Fonte", "catálogo SDUI v1 §4, §11 e §12 · simulacoes/emulador-canais/packages"]
      ]
    },
    portal: {
      tag: "Solução 1", title: "Portal Administrativo",
      body: [
        ["Responsabilidade", "Dono do domínio administrativo completo: produtos, jornadas, fluxo, árvore de telas, versões, catálogo de integrações e auditoria. É também quem coordena a publicação, chamando os serviços de destino em ordem definida."],
        ["Composição", ["Front: modelador visual de fluxo e editor de telas.", "Back: domínio, validação estrutural e orquestração da publicação.", "Base de dados própria, nunca compartilhada com os canais."]],
        ["Fronteira", "Não conhece o formato executável do fluxo nem abre conexão com broker de mensageria. Delega ambos, e nunca armazena segredo — apenas referências de credencial."],
        ["Fonte", "back/ · requisitos/admin/ej-admin-arquitetura-logica.md"]
      ]
    },
    runtime: {
      tag: "Solução 2", title: "Motor de Runtime",
      body: [
        ["Responsabilidade", "Executar a jornada publicada e manter o estado de cada instância em andamento: qual passo está ativo, quais variáveis já foram populadas e qual caminho o usuário percorreu."],
        ["Composição", ["ms-journey: única porta de entrada dos canais digitais.", "Motor: executa o processo publicado e guarda o estado.", "Registro de especificação: resolve a tela do passo e converte respostas em variáveis."]],
        ["Versão em execução", "A versão publicada da jornada é gravada como marca de versão do processo implantado, o que permite instâncias antigas continuarem rodando na versão em que nasceram enquanto novas nascem na versão corrente."],
        ["Fonte", "simulacoes/ms-journey · simulacoes/ms-espec-registry"]
      ]
    },
    emulador: {
      tag: "Solução 3", title: "Emulador de Canais",
      body: [
        ["Propósito", "Provar, com aplicações reais em cinco tecnologias diferentes, que a mesma jornada publicada executa em qualquer canal sem conhecer o motor nem o formato interno das telas."],
        ["Composição", ["Cockpit de laboratório: descobre jornadas publicadas e prepara a abertura de um host.", "BFF único: única borda de saída, fala apenas com o ms-journey.", "Cinco hosts: React Web, React Native, Flutter Web, Flutter Mobile e WhatsApp simulado."]],
        ["Limite", "É laboratório, não produção. Sessões vivem em memória e a validação ponta a ponta com todos os serviços ativos ainda está pendente."],
        ["Fonte", "simulacoes/emulador-canais/docs/arquitetura.md"]
      ]
    },
    validacao: {
      tag: "Antes de ir ao ar", title: "O que a publicação valida",
      body: [
        ["Forma do fluxo", ["Exatamente um elemento inicial e ao menos um final.", "Todo nó num caminho contínuo entre início e fim.", "Graus de entrada e saída por tipo de nó, incluindo desvio com exatamente dois caminhos e um deles padrão."]],
        ["Variáveis", "Toda referência a uma variável, seja em configuração de integração, em texto de etapa ou em condição de desvio, precisa existir em algum nó ancestral alcançável. O nome reservado do canal não pode ser declarado manualmente."],
        ["Árvore de cada tela", ["Raiz obrigatoriamente uma tela; identificadores únicos.", "Todo componente existe no catálogo e não está removido.", "Propriedades permitidas e obrigatórias conferidas por componente.", "Vínculos restritos aos namespaces reconhecidos e ações restritas ao conjunto fechado do sistema.", "Cada canal da jornada precisa manter ao menos um componente visível."]],
        ["Consequência", "Uma violação impede a publicação e devolve a lista de problemas por nó, em vez de falhar no runtime."],
        ["Fonte", "back/ · domain/flow/FlowValidator"]
      ]
    },
    "envelope-build": {
      tag: "Cálculo, não configuração", title: "Como os alvos compatíveis são deduzidos",
      body: [
        ["Regra", "Os canais suportados por uma tela não são escolhidos à mão: são a interseção dos alvos suportados por todos os componentes que aquela tela usa, segundo o catálogo vigente no momento da publicação."],
        ["Versão mínima de renderizador", "Para cada alvo, é calculado o maior valor exigido entre os componentes presentes. Um host com versão anterior sabe, pelo próprio envelope, que não deve tentar renderizar aquela tela."],
        ["Efeito prático", "Incluir um componente que não existe no WhatsApp remove o WhatsApp da lista de alvos daquela tela. O contrato torna a incompatibilidade visível na publicação, não na conversa com o cliente."],
        ["Fonte", "back/ · domain/flow/SduiEnvelopeBuilder · catálogo SDUI v1 §11"]
      ]
    },
    imutabilidade: {
      tag: "Garantia", title: "Imutabilidade e convivência de versões",
      body: [
        ["Chave do registro", "Cada tela publicada é identificada pela jornada, pelo número da versão e pelo identificador da etapa. Uma nova versão gera registros novos; nada é sobrescrito."],
        ["Convivência", "Publicar uma versão nova não derruba a anterior. Instâncias já em execução continuam atendidas pela versão em que nasceram, e despublicar é uma ação separada e explícita."],
        ["Integridade", "O registro guarda um resumo criptográfico do conteúdo publicado, permitindo detectar divergência entre o que foi publicado e o que está armazenado."],
        ["Ressalva conhecida", "Republicar a mesma versão insere um segundo registro ativo com a mesma chave lógica. Ver a visão “Achados de arquitetura”."],
        ["Fonte", "simulacoes/ms-espec-registry · infrastructure/sdui"]
      ]
    },
    journey: {
      tag: "Fronteira", title: "O que o ms-journey deliberadamente não faz",
      body: [
        ["Não interpreta a tela", "A especificação da tela é repassada ao canal como conteúdo opaco. Quem entende a árvore é o renderizador do canal; o ms-journey apenas a transporta."],
        ["Não expõe diagnóstico interno", "Detalhes de investigação do motor, úteis ao portal, ficam fora do contrato do canal. O canal precisa saber que algo falhou, não qual nó interno falhou nem sua configuração bruta."],
        ["Não mascara falha upstream", "Erros vindos do motor ou do registro de especificação são espelhados com fidelidade, em vez de virarem um erro genérico que esconde a causa real."],
        ["Não conhece o portal", "Nenhuma operação consulta o domínio administrativo. A relação entre os dois mundos é sempre de publicação, e sempre de saída."],
        ["Fonte", "simulacoes/ms-journey · JourneyController"]
      ]
    },
    bindings: {
      tag: "Seção 8", title: "Vínculos e placeholders",
      body: [
        ["Duas mecânicas distintas", "Placeholders interpolam valores dentro de conteúdo textual e produzem texto. Vínculos ligam uma propriedade inteira a um valor tipado e podem permitir leitura e escrita."],
        ["Namespaces", ["Formulário: valores capturados na própria tela, leitura e escrita.", "Dados: valores fornecidos por quem iniciou a jornada, somente leitura.", "Sessão e rota: contexto do canal.", "Computado: nunca resolve, porque o contrato proíbe execução de expressão arbitrária."]],
        ["Componentes de entrada", "Exigem vínculo de valor em modo bidirecional apontando para o namespace de formulário. É esse vínculo que transforma a resposta do usuário em variável de execução ao concluir a etapa."],
        ["Fonte", "catálogo SDUI v1 §8 · ms-espec-registry · domain/sdui"]
      ]
    },
    acoes: {
      tag: "Seção 9", title: "Conjunto fechado de ações",
      body: [
        ["Princípio", "A tela declara intenção, nunca comportamento. O renderizador reconhece um conjunto fechado de ações e não executa nada fora dele."],
        ["Ações homologadas", ["submeter a etapa", "navegar", "abrir URL", "definir valor", "registrar evento de acompanhamento", "descartar"]],
        ["Submissão", "Submeter valida os campos aplicáveis e solicita a conclusão da etapa ao runtime. O renderizador não executa regra de negócio: ele pede, o motor decide."],
        ["Fonte", "catálogo SDUI v1 §9 · validação de ações na publicação"]
      ]
    },
    compat: {
      tag: "Seção 11", title: "Quando um alvo não suporta um componente",
      body: [
        ["Regra honesta", "Quando não existe representação válida num alvo, o catálogo marca o componente como não suportado naquele alvo. Não se força uma adaptação artificial só para preencher a matriz."],
        ["Classificação obrigatória", "Nenhum componente vira estável sem ter a capacidade classificada em todos os cinco alvos."],
        ["Alvos irmãos", "Compartilhar código entre dois alvos da mesma tecnologia não implica compatibilidade automática: cada alvo é homologado separadamente."],
        ["Ordem", "A ordem dos filhos na árvore define leitura, foco e a projeção conversacional. Ela é contrato, não detalhe visual."],
        ["Fonte", "catálogo SDUI v1 §11"]
      ]
    },
    datasources: {
      tag: "Seção 14.4", title: "O campo reservado para dados dinâmicos",
      body: [
        ["Estado atual", "O envelope reserva um campo para fontes de dados, mas ele é obrigatoriamente vazio no v1 e a validação rejeita qualquer conteúdo nele."],
        ["Restrição de segurança", "Nenhum renderizador pode interpretar esse campo como autorização para chamar URLs, executar consultas ou transportar credenciais. Dados chegam pelos vínculos, entregues pelo serviço da jornada."],
        ["Decisões pendentes", ["tipos de fonte e quem as executa", "prefetch, cache e timeout", "fallback e autenticação", "tratamento de dados sensíveis e lista de permissão", "compatibilidade por alvo e observabilidade"]],
        ["Fonte", "catálogo SDUI v1 §14.4"]
      ]
    },
    whatsapp: {
      tag: "Caso especial", title: "A cadeia do canal conversacional",
      body: [
        ["Projeção, não layout", "O adapter conversacional não reproduz a tela: projeta a árvore como uma sequência de mensagens, preservando a ordem declarada e descartando o que é puramente visual, com diagnóstico informativo."],
        ["Captura de resposta", "Cada componente de entrada vira uma solicitação textual que aguarda a próxima mensagem do usuário, valida e grava no vínculo de valor. Escolhas viram respostas rápidas quando cabem no limite do canal, e lista interativa quando não cabem."],
        ["Cadeia no laboratório", "O BFF monta a conversa e a entrega a uma ponte que simula o aplicativo de mensagens. A resposta do usuário volta pelo mesmo caminho e vira conclusão da tarefa ativa no runtime."],
        ["Estado", "A sessão conversacional do laboratório vive em memória e se perde ao reiniciar o serviço."],
        ["Fonte", "catálogo SDUI v1 §7 · emulador-canais/docs"]
      ]
    }
  };

  var drawer = $("#drawer"), scrim = $("#scrim");
  function openDrawer(key) {
    var d = DETAILS[key];
    if (!d) return;
    $("#drawerTag").textContent = d.tag;
    $("#drawerTitle").textContent = d.title;
    var html = "";
    d.body.forEach(function (sec) {
      html += "<h4>" + esc(sec[0]) + "</h4>";
      if (Array.isArray(sec[1])) {
        html += "<ul>" + sec[1].map(function (li) { return "<li>" + esc(li) + "</li>"; }).join("") + "</ul>";
      } else if (sec[0] === "Fonte") {
        html += '<p class="src">' + esc(sec[1]) + "</p>";
      } else {
        html += "<p>" + esc(sec[1]) + "</p>";
      }
    });
    $("#drawerBody").innerHTML = html;
    drawer.classList.add("open");
    drawer.setAttribute("aria-hidden", "false");
    scrim.classList.add("on");
  }
  function closeDrawer() {
    drawer.classList.remove("open");
    drawer.setAttribute("aria-hidden", "true");
    scrim.classList.remove("on");
  }
  $("#btnDrawerClose").addEventListener("click", closeDrawer);
  scrim.addEventListener("click", closeDrawer);
  $$("[data-detail]").forEach(function (el) {
    var key = el.getAttribute("data-detail");
    el.addEventListener("click", function () { openDrawer(key); });
    // nós de SVG não são botões: Enter e espaço precisam abrir o detalhe sem avançar a visão
    if (el.tagName.toLowerCase() !== "button") {
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); openDrawer(key); }
      });
    }
  });

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  }

  /* ------------------------------------------------ player de sequência */
  var SEQ = [
    {
      t: "O canal inicia a jornada", s: "informando de onde está chamando",
      hop: "canal", actor: "Canal → ms-journey",
      call: "POST /journeys/{journeyId}/instances?channelType=WEB",
      code: '{\n  "cpf": "12345678900",\n  "pedido": 4471\n}',
      note: "O tipo de canal é parâmetro da execução. A mesma jornada aceita web, mobile ou conversacional, e o valor fica disponível como variável para caminhos condicionais."
    },
    {
      t: "Converter as variáveis de entrada", s: "tipagem conforme o nó inicial",
      hop: "spec", actor: "ms-journey → Especificação",
      call: "POST /journeys/{journeyId}/start-variables/convert",
      code: '{\n  "data_cpf":    { "value": "12345678900", "type": "String" },\n  "data_pedido": { "value": 4471, "type": "Double" }\n}',
      note: "As variáveis declaradas no nó inicial são coagidas ao tipo declarado e recebem o prefixo do namespace de dados. Faltar uma obrigatória interrompe aqui, antes de qualquer instância nascer."
    },
    {
      t: "Iniciar a instância no motor", s: "estado da jornada passa a existir",
      hop: "engine", actor: "ms-journey → Runtime Engine",
      call: "POST /process-definition/key/{journeyKey}/start",
      code: '{\n  "businessKey": "b2f1…",\n  "variables": {\n    "data_cpf":    { "value": "12345678900", "type": "String" },\n    "data_pedido": { "value": 4471, "type": "Double" },\n    "channel":     { "value": "WEB", "type": "String" }\n  }\n}',
      note: "O canal é injetado como variável de execução junto às demais. A chave do processo é derivada do identificador da jornada, o que mantém a correspondência entre o que foi publicado e o que executa."
    },
    {
      t: "Descobrir o passo ativo", s: "tarefa de usuário, espera ou fim",
      hop: "engine", actor: "ms-journey → Runtime Engine",
      call: "GET /task?processInstanceId={id}",
      code: '[\n  {\n    "id": "a91c…",\n    "taskDefinitionKey": "Node_3f865d35…",\n    "name": "Dados pessoais"\n  }\n]',
      note: "Havendo tarefa ativa, o passo é de interação. Não havendo, o ms-journey desce até a atividade folha para distinguir uma jornada em espera de uma jornada encerrada."
    },
    {
      t: "Resolver a tela daquele nó", s: "com as variáveis correntes",
      hop: "spec", actor: "ms-journey → Especificação",
      call: "POST /journeys/{id}/versions/{v}/nodes/{nodeId}/form/resolve",
      code: '{\n  "variables": {\n    "data_cpf":    { "value": "12345678900", "type": "String" },\n    "data_pedido": { "value": 4471, "type": "Double" }\n  }\n}',
      note: "A resolução acontece num único lugar: interpolação de texto e vínculos de leitura são aplicados aqui, para que nenhum canal precise repetir essa lógica."
    },
    {
      t: "Ler a tela publicada", s: "sempre a revisão vigente",
      hop: "repo", actor: "Especificação → Repositório",
      call: "GET /sdui-snapshots?journeyId=…&journeyVersion=…&uiStepId=…",
      code: '{\n  "status": "published",\n  "journeyVersion": 7,\n  "uiStepId": "Node_3f865d35…",\n  "data": ["ui.screen", { … }, [ … ]]\n}',
      note: "A leitura é sempre da revisão publicada, nunca do rascunho em edição no portal. Editar a tela no editor não afeta instâncias em execução."
    },
    {
      t: "Devolver o passo ao canal", s: "tela resolvida e contexto",
      hop: "back", actor: "ms-journey → Canal",
      call: "200 OK · StepResponse",
      code: '{\n  "type": "USER_TASK",\n  "taskId": "a91c…",\n  "nodeName": "Dados pessoais",\n  "form": {\n    "sdui": { "schemaVersion": "1.0.0", "data": [ … ] },\n    "context": { "form": { … }, "data": { … } }\n  }\n}',
      note: "O canal recebe a árvore pronta para renderizar e o contexto correspondente. É neste ponto que o renderizador do canal entra em ação, como na visão de projeção multicanal."
    },
    {
      t: "Concluir a etapa", s: "respostas viram variáveis",
      hop: "canal", actor: "Canal → ms-journey",
      call: "POST /instances/{id}/tasks/{taskId}/complete",
      code: '{\n  "answers": {\n    "name": "Marina Duarte",\n    "birthDate": "1991-04-12",\n    "marketingConsent": true\n  }\n}',
      note: "Cada resposta é convertida em variável de execução com o prefixo do namespace de formulário e o tipo derivado do componente que a capturou. O motor avança e o ciclo recomeça no passo seguinte."
    }
  ];

  var seqList = $("#seqSteps");
  if (seqList) {
    SEQ.forEach(function (s, i) {
      var li = document.createElement("li");
      li.innerHTML = '<span class="idx">' + (i + 1) + '</span><span class="txt"><b>' +
        esc(s.t) + '</b><span>' + esc(s.s) + '</span></span>';
      li.addEventListener("click", function () { seqSelect(i); });
      seqList.appendChild(li);
    });
  }

  function seqSelect(n) {
    if (!seqList) return;
    var s = SEQ[n];
    $$("li", seqList).forEach(function (li, i) {
      li.classList.toggle("on", i === n);
      li.classList.toggle("done", i < n);
    });
    $("#seqHop").textContent = s.call;
    $("#seqActor").textContent = s.actor;
    $("#seqCode").textContent = s.code;
    $("#seqNote").textContent = s.note;
    $$("#seqEdges .hop").forEach(function (e) {
      var on = e.dataset.hop === s.hop;
      e.classList.toggle("on", on);
      e.classList.toggle("pulse-edge", on);
    });
  }

  /* ------------------------------------------------- playground SDUI 09 */
  var CONTEXT = { "data.customer.firstName": "Marina", "data.plan.current": "Controle 20GB" };

  var SCREENS = {
    dados: {
      label: "Dados pessoais",
      env: {
        schemaVersion: "1.0.0", catalogVersion: "1.0.0", journeyVersion: 7,
        uiStepId: "Node_3f865d35", status: "published",
        supportedTargets: ["react.web", "react.mobile", "flutter.web", "flutter.mobile", "whatsapp"],
        dataSources: {},
        data: ["ui.screen", { id: "personal-data-screen", version: "1.0.0", title: "Dados pessoais", scrollable: true }, [
          ["ui.stack", { id: "form-stack", version: "1.0.0", direction: "vertical", spacingToken: "spacing.md" }, [
            ["ui.text", { id: "heading", version: "1.0.0", text: "Olá, {{data.customer.firstName}}", variant: "typography.heading.medium" }],
            ["ui.textInput", { id: "name", version: "1.0.0", label: "Nome completo", inputMode: "text", required: true, $bindings: { value: { path: "form.customer.name", mode: "twoWay" } } }],
            ["ui.datePicker", { id: "birth-date", version: "1.0.0", label: "Data de nascimento", mode: "date", format: "locale", required: true, $bindings: { value: { path: "form.customer.birthDate", mode: "twoWay" } } }],
            ["ui.checkbox", { id: "marketing", version: "1.0.0", label: "Aceito receber comunicações sobre produtos e serviços.", $bindings: { value: { path: "form.consents.marketing", mode: "twoWay" } } }],
            ["ui.alert", { id: "validation-alert", version: "1.0.0", severity: "negative", title: "Revise os dados", message: "Existem campos obrigatórios não preenchidos.", $visibility: { rule: "equals", path: "computed.showValidationSummary", value: true } }],
            ["ui.button", { id: "continue", version: "1.0.0", label: "Continuar", variant: "primary", fullWidth: true, $events: { onPress: { action: "action.submit" } } }]
          ]]
        ]]
      }
    },
    plano: {
      label: "Escolha do plano",
      env: {
        schemaVersion: "1.0.0", catalogVersion: "1.0.0", journeyVersion: 7,
        uiStepId: "Node_7ac21b04", status: "published",
        supportedTargets: ["react.web", "react.mobile", "flutter.web", "flutter.mobile", "whatsapp"],
        dataSources: {},
        data: ["ui.screen", { id: "plan-screen", version: "1.0.0", title: "Escolha seu novo plano" }, [
          ["ui.stack", { id: "plan-stack", version: "1.0.0", direction: "vertical", spacingToken: "spacing.md" }, [
            ["ui.text", { id: "current", version: "1.0.0", text: "Seu plano atual é {{data.plan.current}}." }],
            ["ui.divider", { id: "sep", version: "1.0.0", orientation: "horizontal" }],
            ["ui.select", { id: "plan", version: "1.0.0", label: "Novo plano", placeholder: "Selecione", required: true, options: [
              { value: "c30", label: "Controle 30GB" }, { value: "c50", label: "Controle 50GB" },
              { value: "p100", label: "Pós 100GB" }, { value: "p200", label: "Pós 200GB" },
              { value: "fam", label: "Família 300GB" }
            ], $bindings: { value: { path: "form.plan.selected", mode: "twoWay" } } }],
            ["ui.button", { id: "next", version: "1.0.0", label: "Continuar", variant: "primary", fullWidth: true, $events: { onPress: { action: "action.submit" } } }]
          ]]
        ]]
      }
    },
    confirma: {
      label: "Confirmação",
      env: {
        schemaVersion: "1.0.0", catalogVersion: "1.0.0", journeyVersion: 7,
        uiStepId: "Node_9de40f17", status: "published",
        supportedTargets: ["react.web", "react.mobile", "flutter.web", "flutter.mobile", "whatsapp"],
        dataSources: {},
        data: ["ui.screen", { id: "confirm-screen", version: "1.0.0", title: "Confirme a contratação" }, [
          ["ui.card", { id: "summary", version: "1.0.0", variant: "outlined" }, [
            ["ui.text", { id: "sum", version: "1.0.0", text: "Plano escolhido: Controle 50GB por R$ 79,90/mês." }],
            ["ui.icon", { id: "ico", version: "1.0.0", name: "check", accessibilityLabel: "" }],
            ["ui.progress", { id: "prog", version: "1.0.0", value: 0.75, label: "Contratação", showValue: true }]
          ]],
          ["ui.checkbox", { id: "terms", version: "1.0.0", label: "Li e aceito os termos de contratação.", required: true, $bindings: { value: { path: "form.terms.accepted", mode: "twoWay" } } }],
          ["ui.select", { id: "billing", version: "1.0.0", label: "Vencimento da fatura", options: [
            { value: "5", label: "Dia 5" }, { value: "15", label: "Dia 15" }, { value: "25", label: "Dia 25" }
          ], $bindings: { value: { path: "form.billing.day", mode: "twoWay" } } }],
          ["ui.button", { id: "confirm", version: "1.0.0", label: "Confirmar contratação", variant: "primary", fullWidth: true, $events: { onPress: { action: "action.submit" } } }]
        ]]
      }
    }
  };

  function interp(text) {
    return String(text == null ? "" : text).replace(/\{\{\s*([\w.]+)\s*\}\}/g, function (m, p) {
      return CONTEXT.hasOwnProperty(p) ? CONTEXT[p] : m;
    });
  }
  function isTuple(n) { return Array.isArray(n) && typeof n[0] === "string"; }
  function kids(n) { return Array.isArray(n[2]) ? n[2] : []; }
  function visible(attrs) {
    // §8.5: visibilidade não satisfeita remove a subárvore. `computed` nunca resolve.
    return !attrs || !attrs.$visibility;
  }

  /* --- projeção visual (web e mobile compartilham o mesmo adapter) --- */
  function renderVisual(node, out) {
    if (!isTuple(node)) return;
    var type = node[0], a = node[1] || {};
    if (!visible(a)) return;
    switch (type) {
      case "ui.screen":
        out.push('<div class="r-title">' + esc(interp(a.title)) + "</div>");
        kids(node).forEach(function (c) { renderVisual(c, out); });
        break;
      case "ui.stack": case "ui.container":
        kids(node).forEach(function (c) { renderVisual(c, out); });
        break;
      case "ui.card":
        out.push('<div style="border:1px solid #dcd8e5;border-radius:10px;padding:11px;margin-bottom:11px">');
        kids(node).forEach(function (c) { renderVisual(c, out); });
        out.push("</div>");
        break;
      case "ui.text":
        out.push('<div class="r-text">' + esc(interp(a.text)) + "</div>");
        break;
      case "ui.textInput": case "ui.textArea":
        out.push('<div class="r-field"><span class="r-label">' + esc(a.label) +
          (a.required ? " *" : "") + '</span><div class="r-input">' + esc(a.placeholder || "") + "</div></div>");
        break;
      case "ui.datePicker":
        out.push('<div class="r-field"><span class="r-label">' + esc(a.label) +
          (a.required ? " *" : "") + '</span><div class="r-input">dd/mm/aaaa</div></div>');
        break;
      case "ui.select":
        out.push('<div class="r-field"><span class="r-label">' + esc(a.label) +
          (a.required ? " *" : "") + '</span><div class="r-input">' +
          esc(a.placeholder || (a.options && a.options[0] ? a.options[0].label : "")) + " ⌄</div></div>");
        break;
      case "ui.checkbox":
        out.push('<div class="r-field r-check"><i></i><span>' + esc(a.label) + "</span></div>");
        break;
      case "ui.alert":
        out.push('<div class="r-alert"><b>' + esc(a.title || "") + "</b><span>" + esc(a.message) + "</span></div>");
        break;
      case "ui.progress":
        out.push('<div class="r-field"><span class="r-label">' + esc(a.label || "") +
          (a.showValue ? " · " + Math.round(a.value * 100) + "%" : "") +
          '</span><div style="height:6px;border-radius:4px;background:#eae6f0;overflow:hidden">' +
          '<div style="height:100%;width:' + (a.value * 100) + '%;background:#660099"></div></div></div>');
        break;
      case "ui.divider":
        out.push('<div style="height:1px;background:#eae6f0;margin:11px 0"></div>');
        break;
      case "ui.spacer":
        out.push('<div style="height:12px"></div>');
        break;
      case "ui.icon":
        out.push('<span style="color:#660099;font-weight:700">✓</span>');
        break;
      case "ui.button":
        out.push('<div class="r-btn">' + esc(a.label) + "</div>");
        break;
      case "ui.link":
        out.push('<div style="color:#660099;font-weight:650;font-size:11.6px;margin-top:8px">' + esc(a.label) + "</div>");
        break;
    }
  }

  /* --- projeção conversacional (§7 do catálogo) --- */
  function renderWa(node, msgs, diag) {
    if (!isTuple(node)) return;
    var type = node[0], a = node[1] || {};
    if (!visible(a)) {
      diag.push("<b>" + type + "</b>: subárvore removida por regra de visibilidade não satisfeita.");
      return;
    }
    switch (type) {
      case "ui.screen":
        if (a.title) msgs.push({ k: "in", h: "<b>" + esc(interp(a.title)) + "</b>" });
        diag.push("<b>ui.screen</b>: título abre a conversa; layout descartado, ordem dos filhos preservada.");
        kids(node).forEach(function (c) { renderWa(c, msgs, diag); });
        break;
      case "ui.stack": case "ui.container": case "ui.card":
        diag.push("<b>" + type + "</b>: não gera mensagem própria; filhos linearizados na ordem declarada (info).");
        kids(node).forEach(function (c) { renderWa(c, msgs, diag); });
        break;
      case "ui.text":
        msgs.push({ k: "in", h: esc(interp(a.text)) });
        break;
      case "ui.textInput": case "ui.textArea":
        msgs.push({ k: "in", h: esc(a.label) + (a.required ? "" : " (opcional)") });
        msgs.push({ k: "sys", h: "aguardando resposta de texto" });
        break;
      case "ui.datePicker":
        msgs.push({ k: "in", h: esc(a.label) + " — informe no formato dd/mm/aaaa." });
        msgs.push({ k: "sys", h: "valida e normaliza antes de gravar" });
        diag.push("<b>ui.datePicker</b>: seletor visual não é simulado; valor é solicitado por texto com formato explícito.");
        break;
      case "ui.select":
        var opts = (a.options || []).filter(function (o) { return !o.disabled; });
        msgs.push({ k: "in", h: esc(a.label) });
        if (opts.length <= 3) {
          opts.forEach(function (o) { msgs.push({ k: "quick", h: esc(o.label) }); });
          diag.push("<b>ui.select</b>: " + opts.length + " opções viram respostas rápidas (limite de três por mensagem).");
        } else {
          msgs.push({ k: "quick", h: "Ver as " + opts.length + " opções" });
          diag.push("<b>ui.select</b>: " + opts.length + " opções excedem o limite de respostas rápidas; projeta lista interativa.");
        }
        break;
      case "ui.checkbox":
        msgs.push({ k: "in", h: esc(a.label) });
        msgs.push({ k: "quick", h: "Sim" });
        msgs.push({ k: "quick", h: "Não" });
        diag.push("<b>ui.checkbox</b>: confirmação por Sim e Não, gravando valor booleano no vínculo.");
        break;
      case "ui.alert":
        msgs.push({ k: "in", h: "⚠️ <b>" + esc(a.title || "") + "</b><br/>" + esc(a.message) });
        break;
      case "ui.progress":
        msgs.push({ k: "in", h: esc(a.label || "Progresso") + ": " + Math.round(a.value * 100) + "%" });
        diag.push("<b>ui.progress</b>: vira texto com rótulo e percentual; barra gráfica não é representada.");
        break;
      case "ui.loading":
        msgs.push({ k: "in", h: esc(a.label || "Só um instante…") });
        break;
      case "ui.icon": case "ui.divider": case "ui.spacer":
        diag.push("<b>" + type + "</b>: omitido com diagnóstico informativo; o adapter não inventa substituto.");
        break;
      case "ui.button":
        msgs.push({ k: "quick", h: esc(a.label) });
        break;
      case "ui.link":
        msgs.push({ k: "in", h: esc(a.label) + " 🔗" });
        break;
    }
  }

  function hlJson(obj) {
    var s = JSON.stringify(obj, null, 2);
    return esc(s)
      .replace(/&quot;([^&]+)&quot;(\s*:)/g, '<span class="k">"$1"</span>$2')
      .replace(/:\s&quot;([^&]*)&quot;/g, ': <span class="s">"$1"</span>')
      .replace(/:\s(-?\d+\.?\d*)/g, ': <span class="n">$1</span>')
      .replace(/:\s(true|false)/g, ': <span class="n">$1</span>');
  }

  var labChips = $("#labChips");
  if (labChips) {
    Object.keys(SCREENS).forEach(function (k, i) {
      var b = document.createElement("button");
      b.className = "chip" + (i === 0 ? " on" : "");
      b.textContent = SCREENS[k].label;
      b.addEventListener("click", function () {
        $$(".chip", labChips).forEach(function (o) { o.classList.remove("on"); });
        b.classList.add("on");
        paint(k);
      });
      labChips.appendChild(b);
    });
    paint("dados");
  }

  function paint(key) {
    var sc = SCREENS[key];
    var env = sc.env;

    $("#labMeta").textContent = "v" + env.journeyVersion + " · " + env.supportedTargets.length + " alvos";
    $("#labCode").innerHTML = hlJson(env);

    var web = [];
    renderVisual(env.data, web);
    $("#renderWeb").innerHTML = web.join("");
    $("#renderApp").innerHTML = web.join("");

    var msgs = [], diag = [];
    renderWa(env.data, msgs, diag);
    $("#renderWa").innerHTML = msgs.map(function (m) {
      if (m.k === "sys") return '<div class="bubble sys">' + m.h + "</div>";
      if (m.k === "quick") return '<div class="bubble quick">' + m.h + "</div>";
      return '<div class="bubble">' + m.h + '<span class="t">09:41</span></div>';
    }).join("");

    var extra = [];
    if (JSON.stringify(env.data).indexOf("{{") > -1) {
      extra.push("<b>Interpolação</b>: placeholders resolvidos com o contexto da instância antes de sair para o canal.");
    }
    $("#labRules").innerHTML = "<b>Regras de projeção aplicadas neste envelope</b><br/>" +
      dedupe(diag.concat(extra)).join("<br/>");
  }

  function dedupe(arr) {
    var seenIt = {}, out = [];
    arr.forEach(function (x) { if (!seenIt[x]) { seenIt[x] = 1; out.push(x); } });
    return out;
  }

  /* ------------------------------------------------- capa: jornada guiada */
  // o fluxo é desenhado a 732×600 px; a escala acompanha a largura real da coluna
  var coverFlow = $(".cover-flow");
  if (coverFlow && typeof ResizeObserver === "function") {
    new ResizeObserver(function () {
      coverFlow.style.setProperty("--k", coverFlow.clientWidth / 732);
    }).observe(coverFlow);
  }

  /* ---------------------------------------------------------- inicializa */
  var start = parseInt((location.hash || "").replace("#", ""), 10);
  go(isNaN(start) ? 0 : start - 1);
  seqSelect(0);
})();
