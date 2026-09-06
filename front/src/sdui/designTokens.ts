// Catálogo de design tokens semânticos (seção 10 do contrato SDUI corporativo v1) — lista ESTÁTICA,
// não uma tabela gerenciável: tokens pertencem ao design system Mística, não são autorados pelo
// admin. Serve só pra oferecer combo-box em vez de texto livre nos campos PropKind.TOKEN do painel
// de propriedades. Só os exemplos literais já documentados no contrato — nenhum token inventado;
// se o Mística ganhar mais tokens, ampliar esta lista quando confirmado.
export interface DesignToken {
  value: string;
  group: string;
}

export const DESIGN_TOKEN_GROUPS: { key: string; label: string; tokens: string[] }[] = [
  { key: 'color', label: 'Cor', tokens: ['color.background.primary', 'color.text.primary', 'color.text.secondary', 'color.feedback.negative'] },
  { key: 'typography', label: 'Tipografia', tokens: ['typography.heading.medium', 'typography.body.regular', 'typography.caption'] },
  { key: 'spacing', label: 'Espaçamento', tokens: ['spacing.none', 'spacing.xs', 'spacing.sm', 'spacing.md', 'spacing.lg', 'spacing.xl'] },
  { key: 'radius', label: 'Forma', tokens: ['radius.none', 'radius.sm', 'radius.md', 'radius.full'] },
  { key: 'elevation', label: 'Elevação', tokens: ['elevation.none', 'elevation.low', 'elevation.medium'] },
  { key: 'size', label: 'Tamanho', tokens: ['size.icon.sm', 'size.icon.md', 'size.control.lg'] },
  { key: 'layout', label: 'Largura', tokens: ['layout.content.compact', 'layout.content.default', 'layout.content.wide'] },
];

export function tokensForGroup(group: string | null): string[] {
  if (!group) return DESIGN_TOKEN_GROUPS.flatMap((g) => g.tokens);
  return DESIGN_TOKEN_GROUPS.find((g) => g.key === group)?.tokens ?? [];
}
