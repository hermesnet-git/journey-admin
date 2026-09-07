import { skinVars } from '@telefonica/mistica';
import type { CSSProperties } from 'react';

const SPACING: Record<string, number> = {
  'spacing.none': 0,
  'spacing.xs': 4,
  'spacing.sm': 8,
  'spacing.md': 16,
  'spacing.lg': 24,
  'spacing.xl': 32,
};

const WIDTH: Record<string, number> = {
  'layout.content.compact': 480,
  'layout.content.default': 640,
  'layout.content.wide': 960,
};

const ICON_SIZE: Record<string, number> = {
  'size.icon.sm': 16,
  'size.icon.md': 24,
  'size.control.lg': 32,
};

const ELEVATION: Record<string, string> = {
  'elevation.none': 'none',
  'elevation.low': '0 1px 4px rgba(0, 0, 0, 0.16)',
  'elevation.medium': '0 5px 18px rgba(0, 0, 0, 0.18)',
};

export function spacing(token: unknown, fallback = 0): number {
  return typeof token === 'string' ? SPACING[token] ?? fallback : fallback;
}

export function maxWidth(token: unknown): number | undefined {
  return typeof token === 'string' ? WIDTH[token] : undefined;
}

export function iconSize(token: unknown): number {
  return typeof token === 'string' ? ICON_SIZE[token] ?? 24 : 24;
}

export function elevation(token: unknown): string {
  return typeof token === 'string' ? ELEVATION[token] ?? ELEVATION['elevation.none']! : ELEVATION['elevation.none']!;
}

export function color(token: unknown): string | undefined {
  if (typeof token !== 'string') return undefined;
  const colors: Record<string, string> = {
    'color.background.primary': skinVars.colors.background,
    'color.background.secondary': skinVars.colors.backgroundAlternative,
    'color.text.primary': skinVars.colors.textPrimary,
    'color.text.secondary': skinVars.colors.textSecondary,
    'color.feedback.negative': skinVars.colors.error,
    'color.feedback.positive': skinVars.colors.success,
  };
  return colors[token];
}

export function align(value: unknown): CSSProperties['alignItems'] {
  const aliases: Record<string, CSSProperties['alignItems']> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    stretch: 'stretch',
  };
  return typeof value === 'string' ? aliases[value] : undefined;
}

export function justify(value: unknown): CSSProperties['justifyContent'] {
  const aliases: Record<string, CSSProperties['justifyContent']> = {
    start: 'flex-start',
    end: 'flex-end',
    center: 'center',
    between: 'space-between',
    around: 'space-around',
    evenly: 'space-evenly',
  };
  return typeof value === 'string' ? aliases[value] : undefined;
}

