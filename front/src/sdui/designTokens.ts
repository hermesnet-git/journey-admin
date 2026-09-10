// Catálogo de design tokens semânticos (seção 10 do contrato SDUI corporativo v1) — lista ESTÁTICA,
// não uma tabela gerenciável: tokens pertencem ao design system Mística, não são autorados pelo
// admin. Serve só pra oferecer combo-box em vez de texto livre nos campos PropKind.TOKEN do painel
// de propriedades. Só os exemplos literais já documentados no contrato — nenhum token inventado;
// se o Mística ganhar mais tokens, ampliar esta lista quando confirmado.
export interface DesignToken {
  value: string;
  group: string;
  label: string;
  description?: string;
}

export const DESIGN_TOKEN_GROUPS: { key: string; label: string; tokens: DesignToken[] }[] = [
  {
    key: 'color',
    label: 'Cor',
    tokens: [
      { value: 'color.background.primary', group: 'color', label: 'Fundo principal', description: 'Fundo padrão da tela ou área principal.' },
      { value: 'color.background.secondary', group: 'color', label: 'Fundo secundário', description: 'Fundo de apoio para separar áreas.' },
      { value: 'color.background.elevated', group: 'color', label: 'Fundo elevado', description: 'Superfície destacada, como cards ou painéis.' },
      { value: 'color.background.inverse', group: 'color', label: 'Fundo invertido', description: 'Área de alto contraste sobre fundo escuro.' },
      { value: 'color.surface.default', group: 'color', label: 'Superfície padrão' },
      { value: 'color.surface.highlight', group: 'color', label: 'Superfície em destaque' },
      { value: 'color.surface.selected', group: 'color', label: 'Superfície selecionada' },
      { value: 'color.surface.disabled', group: 'color', label: 'Superfície desabilitada' },
      { value: 'color.text.primary', group: 'color', label: 'Texto principal' },
      { value: 'color.text.secondary', group: 'color', label: 'Texto secundário' },
      { value: 'color.text.inverse', group: 'color', label: 'Texto invertido' },
      { value: 'color.text.disabled', group: 'color', label: 'Texto desabilitado' },
      { value: 'color.border.default', group: 'color', label: 'Borda padrão' },
      { value: 'color.border.strong', group: 'color', label: 'Borda forte' },
      { value: 'color.border.focus', group: 'color', label: 'Borda em foco' },
      { value: 'color.border.error', group: 'color', label: 'Borda com erro' },
      { value: 'color.action.primary', group: 'color', label: 'Ação principal' },
      { value: 'color.action.secondary', group: 'color', label: 'Ação secundária' },
      { value: 'color.action.danger', group: 'color', label: 'Ação destrutiva' },
      { value: 'color.feedback.info', group: 'color', label: 'Informação' },
      { value: 'color.feedback.success', group: 'color', label: 'Sucesso' },
      { value: 'color.feedback.warning', group: 'color', label: 'Atenção' },
      { value: 'color.feedback.negative', group: 'color', label: 'Erro' },
    ],
  },
  {
    key: 'typography',
    label: 'Tipografia',
    tokens: [
      { value: 'typography.heading.medium', group: 'typography', label: 'Título médio' },
      { value: 'typography.body.regular', group: 'typography', label: 'Corpo de texto' },
      { value: 'typography.caption', group: 'typography', label: 'Legenda' },
    ],
  },
  {
    key: 'spacing',
    label: 'Espaçamento',
    tokens: [
      { value: 'spacing.none', group: 'spacing', label: 'Sem espaçamento' },
      { value: 'spacing.xs', group: 'spacing', label: 'Muito pequeno' },
      { value: 'spacing.sm', group: 'spacing', label: 'Pequeno' },
      { value: 'spacing.md', group: 'spacing', label: 'Médio' },
      { value: 'spacing.lg', group: 'spacing', label: 'Grande' },
      { value: 'spacing.xl', group: 'spacing', label: 'Muito grande' },
    ],
  },
  {
    key: 'radius',
    label: 'Forma',
    tokens: [
      { value: 'radius.none', group: 'radius', label: 'Sem arredondamento' },
      { value: 'radius.sm', group: 'radius', label: 'Arredondamento pequeno' },
      { value: 'radius.md', group: 'radius', label: 'Arredondamento médio' },
      { value: 'radius.full', group: 'radius', label: 'Arredondamento total' },
    ],
  },
  {
    key: 'elevation',
    label: 'Elevação',
    tokens: [
      { value: 'elevation.none', group: 'elevation', label: 'Sem elevação' },
      { value: 'elevation.low', group: 'elevation', label: 'Elevação baixa' },
      { value: 'elevation.medium', group: 'elevation', label: 'Elevação média' },
    ],
  },
  {
    key: 'size',
    label: 'Tamanho',
    tokens: [
      { value: 'size.icon.sm', group: 'size', label: 'Ícone pequeno' },
      { value: 'size.icon.md', group: 'size', label: 'Ícone médio' },
      { value: 'size.control.lg', group: 'size', label: 'Controle grande' },
    ],
  },
  {
    key: 'layout',
    label: 'Largura',
    tokens: [
      { value: 'layout.content.compact', group: 'layout', label: 'Conteúdo compacto' },
      { value: 'layout.content.default', group: 'layout', label: 'Conteúdo padrão' },
      { value: 'layout.content.wide', group: 'layout', label: 'Conteúdo amplo' },
    ],
  },
];

export function tokensForGroup(group: string | null): string[] {
  return tokenOptionsForGroup(group).map((token) => token.value);
}

export function tokenOptionsForGroup(group: string | null): DesignToken[] {
  if (!group) return DESIGN_TOKEN_GROUPS.flatMap((g) => g.tokens);
  return DESIGN_TOKEN_GROUPS.find((g) => g.key === group)?.tokens ?? [];
}

export function tokenLabel(value: string): string {
  return tokenOptionsForGroup(null).find((token) => token.value === value)?.label ?? value;
}
