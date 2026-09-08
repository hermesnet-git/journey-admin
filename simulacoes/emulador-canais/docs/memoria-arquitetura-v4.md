# Memória de arquitetura v4 — Identidade Vivo do Channel Lab

**Data da decisão:** 2026-09-07  
**Complementa:** `memoria-arquitetura-v0.md` a `memoria-arquitetura-v3.md`

## 1. Decisão

O Channel Lab adota a skin `Vivo-evolution` disponibilizada pela versão instalada de `@telefonica/mistica`.

A aplicação usa:

- `ThemeContextProvider` como raiz visual;
- `getSkinByName('Vivo-evolution')` como fonte da skin;
- `VivoLogo` no cabeçalho;
- botões Mística nas ações principais e destrutivas;
- `skinVars` para projetar cores semânticas da Vivo no layout especializado do cockpit.
- alternância `light`/`dark` na barra superior, aplicada pela `colorScheme` da Mística e persistida localmente no navegador.

## 2. Fronteira preservada

Usar Mística no laboratório não transforma o Channel Lab em renderer SDUI. O Lab continua apenas coordenando seleção, bootstrap, incorporação e diagnóstico.

Os hosts carregados em iframe ou executados em dispositivo mantêm seus temas, adapters e ciclos de vida independentes. A skin do Lab não atravessa a fronteira do iframe e não altera React Web, React Native, Flutter ou WCE.

## 3. Layout especializado

Nem todo elemento do cockpit precisa ser substituído por um componente Mística. A grade de canais, a lista administrativa, a área de preview e o painel de diagnóstico são estruturas específicas do emulador.

Esses elementos permanecem em HTML/CSS, mas suas cores de marca, superfícies, textos, bordas e estados passam a referenciar tokens semânticos da skin. Dessa forma, o layout continua adequado à operação técnica sem manter uma paleta paralela à identidade Vivo.

## 4. Decisões anteriores

As responsabilidades, rotas, portas, bootstrap efêmero e limites de alteração registrados nas memórias anteriores permanecem inalterados.
