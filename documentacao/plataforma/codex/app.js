(() => {
  "use strict";

  const slides = [...document.querySelectorAll(".slide")];
  const total = slides.length;
  const deck = document.getElementById("deck");
  const prevButton = document.getElementById("prevButton");
  const nextButton = document.getElementById("nextButton");
  const slideStatus = document.getElementById("slideStatus");
  const progressBar = document.getElementById("progressBar");
  const overviewDialog = document.getElementById("overviewDialog");
  const overviewGrid = document.getElementById("overviewGrid");
  const overviewButton = document.getElementById("overviewButton");
  const readingButton = document.getElementById("readingButton");
  const themeButton = document.getElementById("themeButton");
  const themeIcon = document.getElementById("themeIcon");
  const fullscreenButton = document.getElementById("fullscreenButton");
  const detailDrawer = document.getElementById("detailDrawer");
  const drawerBackdrop = document.getElementById("drawerBackdrop");
  const drawerClose = document.getElementById("drawerClose");

  let current = slideFromHash();
  let previous = current;
  let readingMode = false;
  let touchStartX = null;

  const details = {
    admin: {
      kicker: "Design time",
      title: "Admin Front",
      summary: "Superfície de autoria e operação para construir, testar, versionar e publicar jornadas.",
      responsibilities: [
        "Modelagem visual do workflow e configuração de conectores.",
        "Composição da árvore de tela no Form Builder orientado pelo Component Registry.",
        "Preview por canal, execução assistida, diagnóstico e dashboard.",
        "Gestão de produtos, jornadas, versões, publicações e catálogos."
      ],
      contracts: ["Consome a API do Admin Backend.", "Nunca acessa motor, Strapi ou credenciais administrativas diretamente."],
      source: "../../requisitos/admin/ej-admin-arquitetura-logica.md"
    },
    "admin-back": {
      kicker: "Design time",
      title: "Admin Backend",
      summary: "Núcleo de domínio do portal: valida regras de autoria, mantém versões e coordena a publicação.",
      responsibilities: [
        "Persistir produtos, jornadas, flow JSONB, Component Registry e versões.",
        "Validar estrutura, compatibilidade de canais e conteúdo SDUI antes do publish.",
        "Congelar o snapshot da versão e registrar auditoria.",
        "Coordenar publicação de processo e de telas sem expor detalhes do motor ao frontend."
      ],
      contracts: ["POST para ms-transform-publication.", "POST de envelopes SDUI para ms-espec-registry.", "Leituras operacionais do runtime para dashboard e diagnóstico."],
      source: "../../back/src/main/java/com/jouney/admin/application/version/PublishJourneyVersion.java"
    },
    transform: {
      kicker: "Plano de publicação",
      title: "ms-transform-publication",
      summary: "Traduz o snapshot lógico do fluxo para BPMN e administra deployments específicos por versão.",
      responsibilities: [
        "Transformar nós e conexões em um processo BPMN executável.",
        "Gravar a journeyVersion como versionTag da definição.",
        "Implantar no motor e devolver deploymentId/processDefinitionId.",
        "Despublicar um deployment específico e bloquear remoção com instâncias ativas."
      ],
      contracts: ["POST /api/v1/publications", "DELETE /api/v1/publications/{journeyId}/deployments/{deploymentId}", "Integra com a REST API do motor."],
      source: "../../simulacoes/ms-transform-publication/src/main/java/com/jouney/transformpublication/interfaces/publication/PublicationController.java"
    },
    registry: {
      kicker: "Contrato e especificação",
      title: "ms-espec-registry",
      summary: "Guardião operacional do contrato SDUI e ponte controlada para os snapshots publicados no Strapi.",
      responsibilities: [
        "Validar e persistir envelopes canônicos por User Task.",
        "Resolver bindings, placeholders, visibilidade e contexto da tela.",
        "Converter respostas do formulário e variáveis iniciais para o formato do motor.",
        "Fornecer flow e UI Spec ao ms-journey sem executar a instância."
      ],
      contracts: ["/api/v1/sdui-snapshots", "/journeys/{id}/flow", "/nodes/{nodeId}/form/resolve", "/answers/convert"],
      source: "../../simulacoes/ms-espec-registry/src/main/java/com/jouney/especregistry/interfaces/journey/FormSpecController.java"
    },
    journey: {
      kicker: "Fachada de runtime",
      title: "ms-journey",
      summary: "API estável para BFFs e canais iniciarem, avançarem, consultarem e encerrarem jornadas.",
      responsibilities: [
        "Iniciar instâncias com channelType, variáveis e business key.",
        "Descobrir a tarefa/atividade atual no motor.",
        "Combinar estado do motor e UI Spec resolvida em StepResponse.",
        "Converter respostas e completar somente a tarefa ativa."
      ],
      contracts: ["GET /journeys/{id}/flow", "POST /journeys/{id}/instances", "GET /instances/{id}/current-step", "POST /instances/{id}/tasks/{taskId}/complete", "DELETE /instances/{id}"],
      source: "../../simulacoes/ms-journey/src/main/java/com/jouney/journey/JourneyController.java"
    },
    engine: {
      kicker: "Motor de estado",
      title: "ms-runtime-engine",
      summary: "Nome lógico do motor que mantém definições, instâncias, tarefas, variáveis, histórico e esperas da jornada.",
      responsibilities: [
        "Persistir o estado de cada instância e garantir continuidade entre interações.",
        "Executar gateways, tarefas síncronas e checkpoints humanos ou assíncronos.",
        "Expor tarefas, variáveis, histórico e atividade atual.",
        "Integrar REST e mensageria por mecanismos próprios do runtime."
      ],
      contracts: ["Implementação atual: ms-runtime-camunda (Camunda 7 embutido).", "REST do motor consumida por ms-journey, publicação e superfícies operacionais."],
      source: "../../simulacoes/ms-runtime-camunda/README.md"
    },
    strapi: {
      kicker: "Repositório SDUI",
      title: "Strapi",
      summary: "Armazena e entrega snapshots SDUI publicados; não é proprietário do contrato nem ambiente de autoria.",
      responsibilities: [
        "Persistir JSON canônico e metadados de journeyVersion/uiStepId.",
        "Entregar a fotografia imutável da tela publicada.",
        "Manter hash de integridade como metadado técnico."
      ],
      contracts: ["Acessado somente pelo ms-espec-registry.", "Não reconstrói nem transforma a árvore SDUI."],
      source: "../../requisitos/admin/sdui/elastic-journey-sdui-component-catalog-v1.md"
    },
    emulator: {
      kicker: "Prova multicanal",
      title: "Emulador de Canais",
      summary: "Laboratório que comprova o consumo de uma jornada por hosts reais usando os mesmos contratos de runtime.",
      responsibilities: [
        "Listar publicações por canal e criar bootstraps temporários.",
        "Abrir hosts Web/Mobile ou iniciar uma sessão conversacional.",
        "Centralizar a borda upstream no Emulator BFF.",
        "Exercitar runtimes headless e renderers que podem evoluir para SDKs."
      ],
      contracts: ["Admin Backend apenas para descoberta de PUBLISHED.", "ms-journey para execução.", "WCE Bridge isolado como transporte de laboratório."],
      source: "../../simulacoes/emulador-canais/docs/arquitetura.md"
    }
  };

  const sequenceCopy = [
    { title: "O canal inicia a jornada", text: "O host informa channelType e variáveis. O ms-journey gera uma business key e adiciona o canal ao contexto da instância." },
    { title: "A fachada cria a instância", text: "As variáveis declaradas são convertidas e o motor inicia a definição publicada correspondente à jornada." },
    { title: "O passo ativo vem do motor", text: "O ms-journey consulta a instância, identifica uma User Task ou a atividade de espera corrente e lê as variáveis atuais." },
    { title: "A tela é resolvida fora do motor", text: "Com journeyVersion, nodeId e variáveis, o ms-espec-registry recupera o snapshot e aplica bindings, placeholders e visibilidade." },
    { title: "O canal recebe um contrato pronto", text: "StepResponse informa USER_TASK, WAITING ou ENDED. Em uma tarefa humana, form.sdui contém a tela canônica resolvida." },
    { title: "A resposta avança o processo", text: "O canal envia answers; o registry converte os valores para variáveis do motor e o ms-journey completa somente a tarefa ativa." }
  ];

  function slideFromHash() {
    const match = window.location.hash.match(/slide-(\d+)/);
    const number = match ? Number(match[1]) : 1;
    return Math.min(Math.max(number - 1, 0), total - 1);
  }

  function showSlide(index, options = {}) {
    if (readingMode) {
      const target = slides[Math.min(Math.max(index, 0), total - 1)];
      target.scrollIntoView({ behavior: options.instant ? "auto" : "smooth", block: "start" });
      current = slides.indexOf(target);
      updateChrome();
      return;
    }

    const next = Math.min(Math.max(index, 0), total - 1);
    if (next === current && !options.force) return;
    previous = current;
    current = next;
    slides.forEach((slide, i) => {
      slide.classList.toggle("active", i === current);
      slide.classList.toggle("exit-left", i < current);
      slide.setAttribute("aria-hidden", String(i !== current));
    });
    if (!options.skipHash) history.replaceState(null, "", `#slide-${current + 1}`);
    updateChrome();
    slides[current].scrollTop = 0;
  }

  function updateChrome() {
    const visibleNumber = String(current + 1).padStart(2, "0");
    slideStatus.innerHTML = `<strong>${visibleNumber}</strong><span>/ ${String(total).padStart(2, "0")}</span>`;
    progressBar.style.width = `${((current + 1) / total) * 100}%`;
    prevButton.disabled = current === 0;
    nextButton.disabled = current === total - 1;
    document.title = `${slides[current].dataset.title} — Dynamic Journey`;
    [...overviewGrid.children].forEach((item, i) => item.classList.toggle("current", i === current));
  }

  function changeSlide(delta) {
    if (readingMode) return;
    showSlide(current + delta);
  }

  function buildOverview() {
    const fragment = document.createDocumentFragment();
    slides.forEach((slide, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "overview-item";
      button.innerHTML = `<span>${String(index + 1).padStart(2, "0")}</span><strong>${slide.dataset.title}</strong>`;
      button.addEventListener("click", () => {
        overviewDialog.close();
        showSlide(index, { force: true });
      });
      fragment.appendChild(button);
    });
    overviewGrid.appendChild(fragment);
  }

  function openOverview() {
    if (typeof overviewDialog.showModal === "function") overviewDialog.showModal();
    else overviewDialog.setAttribute("open", "");
  }

  function toggleReading() {
    readingMode = !readingMode;
    document.body.classList.toggle("reading-mode", readingMode);
    readingButton.setAttribute("aria-pressed", String(readingMode));
    readingButton.querySelector(".control-label").textContent = readingMode ? "Apresentação" : "Modo leitura";
    if (!readingMode) {
      window.scrollTo({ top: 0, behavior: "auto" });
      showSlide(current, { force: true });
    } else {
      slides[current].scrollIntoView({ behavior: "auto", block: "start" });
    }
  }

  function setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    themeIcon.textContent = theme === "dark" ? "☼" : "◐";
    localStorage.setItem("dynamic-journey-theme", theme);
  }

  function toggleTheme() {
    setTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
  }

  async function toggleFullscreen() {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      // Fullscreen may be blocked for local files or embedded browsers; navigation still works.
    }
  }

  function openDetail(key) {
    const detail = details[key];
    if (!detail) return;
    document.getElementById("detailKicker").textContent = detail.kicker;
    document.getElementById("detailTitle").textContent = detail.title;
    document.getElementById("detailSummary").textContent = detail.summary;
    fillList(document.getElementById("detailResponsibilities"), detail.responsibilities);
    fillList(document.getElementById("detailContracts"), detail.contracts);
    document.getElementById("detailSource").innerHTML = `Fonte principal: <a href="${detail.source}">${detail.source.split("/").pop()}</a>`;
    detailDrawer.classList.add("open");
    drawerBackdrop.classList.add("open");
    detailDrawer.setAttribute("aria-hidden", "false");
    drawerClose.focus();
  }

  function fillList(target, items) {
    target.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
  }

  function closeDetail() {
    detailDrawer.classList.remove("open");
    drawerBackdrop.classList.remove("open");
    detailDrawer.setAttribute("aria-hidden", "true");
  }

  function setSequence(step) {
    const normalized = Math.min(Math.max(step, 1), sequenceCopy.length);
    document.querySelectorAll(".sequence-event").forEach((item) => item.classList.toggle("active", Number(item.dataset.sequence) === normalized));
    document.querySelectorAll("[data-seq]").forEach((item) => item.classList.toggle("active", Number(item.dataset.seq) === normalized));
    const copy = sequenceCopy[normalized - 1];
    const panel = document.getElementById("sequenceExplain");
    panel.querySelector(".sequence-number").textContent = String(normalized).padStart(2, "0");
    panel.querySelector("h3").textContent = copy.title;
    panel.querySelector("p").textContent = copy.text;
    panel.dataset.current = String(normalized);
  }

  buildOverview();
  setTheme(localStorage.getItem("dynamic-journey-theme") || "dark");
  showSlide(current, { force: true, skipHash: !window.location.hash });

  prevButton.addEventListener("click", () => changeSlide(-1));
  nextButton.addEventListener("click", () => changeSlide(1));
  slideStatus.addEventListener("click", openOverview);
  overviewButton.addEventListener("click", openOverview);
  readingButton.addEventListener("click", toggleReading);
  themeButton.addEventListener("click", toggleTheme);
  fullscreenButton.addEventListener("click", toggleFullscreen);
  drawerClose.addEventListener("click", closeDetail);
  drawerBackdrop.addEventListener("click", closeDetail);
  document.querySelector("[data-close-dialog]").addEventListener("click", () => overviewDialog.close());

  document.addEventListener("click", (event) => {
    const go = event.target.closest("[data-go]");
    if (go) showSlide(Number(go.dataset.go) - 1, { force: true });

    const detail = event.target.closest("[data-detail]");
    if (detail) openDetail(detail.dataset.detail);

    const focus = event.target.closest("[data-focus]");
    if (focus) {
      const selected = focus.dataset.focus;
      document.querySelectorAll("[data-focus]").forEach((chip) => chip.classList.toggle("active", chip === focus));
      const landscape = document.getElementById("landscape");
      landscape.dataset.focus = selected;
      landscape.querySelectorAll(".landscape-zone").forEach((zone) => zone.classList.toggle("is-focused", selected === "all" || zone.dataset.layer === selected));
    }

    const seq = event.target.closest("[data-seq]");
    if (seq) setSequence(Number(seq.dataset.seq));

    const seqGo = event.target.closest("[data-seq-go]");
    if (seqGo) {
      const panel = document.getElementById("sequenceExplain");
      const active = Number(panel.dataset.current || 1);
      setSequence(active + (seqGo.dataset.seqGo === "next" ? 1 : -1));
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.target.matches("input, textarea, select")) return;
    if (detailDrawer.classList.contains("open") && event.key === "Escape") {
      closeDetail();
      return;
    }
    if (overviewDialog.open) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) {
      event.preventDefault();
      changeSlide(1);
    } else if (["ArrowLeft", "PageUp"].includes(event.key)) {
      event.preventDefault();
      changeSlide(-1);
    } else if (event.key === "Home") {
      showSlide(0);
    } else if (event.key === "End") {
      showSlide(total - 1);
    } else if (event.key.toLowerCase() === "o") {
      openOverview();
    } else if (event.key.toLowerCase() === "r") {
      toggleReading();
    } else if (event.key.toLowerCase() === "f") {
      toggleFullscreen();
    } else if (event.key.toLowerCase() === "t") {
      toggleTheme();
    }
  });

  deck.addEventListener("touchstart", (event) => {
    touchStartX = event.changedTouches[0]?.clientX ?? null;
  }, { passive: true });

  deck.addEventListener("touchend", (event) => {
    if (touchStartX === null || readingMode) return;
    const delta = (event.changedTouches[0]?.clientX ?? touchStartX) - touchStartX;
    if (Math.abs(delta) > 60) changeSlide(delta < 0 ? 1 : -1);
    touchStartX = null;
  }, { passive: true });

  window.addEventListener("hashchange", () => showSlide(slideFromHash(), { force: true, skipHash: true }));
})();
