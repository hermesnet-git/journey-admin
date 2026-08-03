# AGENTS.md — front

Instruções para agentes de IA (Claude Code, GitHub Copilot, Codex etc.) trabalhando neste projeto.

## Stack

- React + TypeScript + Vite
- Tailwind CSS v4 (`@import "tailwindcss"` em `src/index.css`)
- Mística (`@telefonica/mistica`) — design system usado para botões (`ButtonPrimary`/`ButtonSecondary`/`ButtonLink`), tags e o `ThemeContextProvider` (ver `src/App.tsx`)
- `@xyflow/react` (React Flow) — usado no flow-designer

Build: `npm run build` (roda `tsc -b && vite build`). Rode sempre após alterações para pegar erros de tipo.

## Tema (claro/escuro)

- `src/shell/theme.tsx` define `AppThemeContext`/`useAppTheme()` com o token set `AppColors` (`bg`, `surface`, `border`, `textPrimary`, `textSecondary`, `textMuted`, `accent`, `danger`, `success`, `warning`, etc., cada um com variante clara e escura).
- **Nunca hardcode cores** (hex, `bg-white`, `text-[#...]`) em componentes de página. Sempre `const { colors: c } = useAppTheme();` e aplicar via `style={{ color: c.textPrimary, ... }}`.
- Motivo: Tailwind não suporta pseudo-classes (`hover:`) com valores JS dinâmicos, então o padrão do projeto é inline-style + `onMouseEnter`/`onMouseLeave` para hover, em vez de classes de tema/CSS custom properties globais.
- O `flow-designer` tem seu próprio tema (`src/flow-designer/theme.ts`, `useFlowTheme()`), sincronizado a partir de `useAppTheme()`. Não misture os dois token sets.
- `ThemeContextProvider` da Mística fica em `App.tsx`, com `colorScheme` dinâmico — se um componente Mística aparecer sem estilo, verifique se `@telefonica/mistica/css/mistica.css` está importado (`main.tsx`) e se está dentro do provider.

## Padrão de formulário (campos)

Definido em `src/products/ui.tsx`, portado do estilo do `PropertiesPanel` do flow-designer para manter um único padrão visual em todo o app:

- `Field` — label acima do campo (`fontSize: 12, fontWeight: 600, color: c.textSecondary`), asterisco vermelho quando obrigatório, texto "(opcional)" quando não.
- `TextInput` / `TextArea` / `SelectInput` — inputs HTML nativos estilizados via `fieldInputStyle` (borda, radius 8, `fontSize: 13.5`, fundo `c.surface`). `TextArea` é redimensionável verticalmente (`resize: 'vertical'`).
- **Não** use os componentes de formulário da Mística (`TextFieldBase`, `Select`) para campos de formulário de página — eles têm tipografia/label próprios que destoam desse padrão. Mística fica reservada a botões e tags.
- Para qualquer formulário novo, componha com `Field` + `TextInput`/`TextArea`/`SelectInput`, seguindo o exemplo em `src/products/ProductFormModal.tsx` e `src/products/ChannelFormModal.tsx`.

## Estrutura

- `src/shell/` — tema, layout/shell do app (tabs, etc.)
- `src/products/` — páginas e formulários de Produtos/Canais (padrão de referência para novos CRUDs)
- `src/journeys/` — página de Jornadas
- `src/dashboard/` — dashboard de Workflows
- `src/flow-designer/` — editor visual de jornadas (React Flow), com tema e design system próprios portados do projeto `wf-designer`

## Regras gerais

- Sem verificação visual em navegador disponível neste ambiente de agente — `npm run build` garante apenas tipos/bundle, não a aparência. Avisar o usuário quando uma mudança visual não puder ser confirmada.
- Não reintroduzir sweep global de CSS/variáveis para tema — já foi tentado e revertido; o padrão é token-driven inline styles (ver seção Tema).
