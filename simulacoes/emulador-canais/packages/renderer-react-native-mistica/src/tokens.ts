import type { ColorValue, TextStyle, ViewStyle } from 'react-native';

export interface MobileMisticaTokens {
  colors: {
    backgroundPrimary: ColorValue;
    backgroundSecondary: ColorValue;
    surface: ColorValue;
    textPrimary: ColorValue;
    textSecondary: ColorValue;
    brand: ColorValue;
    brandPressed: ColorValue;
    onBrand: ColorValue;
    border: ColorValue;
    negative: ColorValue;
    negativeLow: ColorValue;
    positive: ColorValue;
    positiveLow: ColorValue;
    warning: ColorValue;
    warningLow: ColorValue;
    informativeLow: ColorValue;
    disabled: ColorValue;
  };
  spacing: Record<string, number>;
  iconSize: Record<string, number>;
  maxWidth: Record<string, number>;
}

export const defaultMobileMisticaTokens: MobileMisticaTokens = {
  colors: {
    backgroundPrimary: '#f4f4f6',
    backgroundSecondary: '#ececf1',
    surface: '#ffffff',
    textPrimary: '#242429',
    textSecondary: '#62626b',
    brand: '#0066cc',
    brandPressed: '#004c99',
    onBrand: '#ffffff',
    border: '#b8b8c0',
    negative: '#b42318',
    negativeLow: '#fff0f0',
    positive: '#16833b',
    positiveLow: '#e8f7ed',
    warning: '#8a5a00',
    warningLow: '#fff5d6',
    informativeLow: '#e8f2ff',
    disabled: '#d7d7dc',
  },
  spacing: {
    'spacing.none': 0,
    'spacing.xs': 4,
    'spacing.sm': 8,
    'spacing.md': 16,
    'spacing.lg': 24,
    'spacing.xl': 32,
  },
  iconSize: {
    'size.icon.sm': 16,
    'size.icon.md': 24,
    'size.control.lg': 32,
  },
  maxWidth: {
    'layout.content.compact': 480,
    'layout.content.default': 640,
    'layout.content.wide': 960,
  },
};

export function spacing(tokens: MobileMisticaTokens, token: unknown, fallback = 0): number {
  return typeof token === 'string' ? tokens.spacing[token] ?? fallback : fallback;
}

export function iconSize(tokens: MobileMisticaTokens, token: unknown): number {
  return typeof token === 'string' ? tokens.iconSize[token] ?? 24 : 24;
}

export function maxWidth(tokens: MobileMisticaTokens, token: unknown): number | undefined {
  return typeof token === 'string' ? tokens.maxWidth[token] : undefined;
}

export function color(tokens: MobileMisticaTokens, token: unknown): ColorValue | undefined {
  if (typeof token !== 'string') return undefined;
  const values: Record<string, ColorValue> = {
    'color.background.primary': tokens.colors.backgroundPrimary,
    'color.background.secondary': tokens.colors.backgroundSecondary,
    'color.text.primary': tokens.colors.textPrimary,
    'color.text.secondary': tokens.colors.textSecondary,
    'color.feedback.negative': tokens.colors.negative,
    'color.feedback.positive': tokens.colors.positive,
  };
  return values[token];
}

export function elevation(token: unknown): ViewStyle {
  if (token === 'elevation.medium') return { elevation: 6, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } };
  if (token === 'elevation.low') return { elevation: 2, shadowColor: '#000', shadowOpacity: 0.14, shadowRadius: 3, shadowOffset: { width: 0, height: 1 } };
  return {};
}

export function textAlign(value: unknown): TextStyle['textAlign'] {
  return value === 'center' || value === 'right' || value === 'justify' ? value : 'left';
}

