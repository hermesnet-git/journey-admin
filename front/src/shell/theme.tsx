import { createContext, useContext } from 'react';

export interface AppColors {
  bg: string;
  surface: string;
  chipBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  hoverBg: string;
  activeBg: string;
  skeletonBg: string;
  shadow: string;
  danger: string;
  dangerSoft: string;
  dangerBorder: string;
  success: string;
  successSoft: string;
  successBorder: string;
  warning: string;
  warningSoft: string;
  warningBorder: string;
}

export const LIGHT_APP_COLORS: AppColors = {
  bg: '#fafafa',
  surface: '#ffffff',
  chipBg: '#f4f4f5',
  border: '#e4e4e7',
  textPrimary: '#1a1a1a',
  textSecondary: '#71717a',
  textMuted: '#a1a1aa',
  accent: '#019DF4',
  accentSoft: '#eff8ff',
  hoverBg: '#f4f4f5',
  activeBg: '#f4f4f5',
  skeletonBg: '#f4f4f5',
  shadow: 'rgba(0,0,0,.08)',
  danger: '#dc2626',
  dangerSoft: '#fef2f2',
  dangerBorder: '#fecaca',
  success: '#15803d',
  successSoft: '#f0fdf4',
  successBorder: '#bbf7d0',
  warning: '#b45309',
  warningSoft: '#fffbeb',
  warningBorder: '#fde68a',
};

export const DARK_APP_COLORS: AppColors = {
  bg: '#0e0f13',
  surface: '#17181d',
  chipBg: '#232429',
  border: '#2a2b31',
  textPrimary: '#f2f2f5',
  textSecondary: '#96969f',
  textMuted: '#6c6c76',
  accent: '#3db4ff',
  accentSoft: 'rgba(61,180,255,0.14)',
  hoverBg: 'rgba(255,255,255,0.06)',
  activeBg: '#1f2026',
  skeletonBg: '#1f2026',
  shadow: 'rgba(0,0,0,.4)',
  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.14)',
  dangerBorder: 'rgba(248,113,113,0.35)',
  success: '#4ade80',
  successSoft: 'rgba(74,222,128,0.14)',
  successBorder: 'rgba(74,222,128,0.35)',
  warning: '#fbbf24',
  warningSoft: 'rgba(251,191,36,0.14)',
  warningBorder: 'rgba(251,191,36,0.35)',
};

export interface AppTheme {
  dark: boolean;
  colors: AppColors;
  toggle: () => void;
}

export const AppThemeContext = createContext<AppTheme>({
  dark: false,
  colors: LIGHT_APP_COLORS,
  toggle: () => {},
});

export function useAppTheme() {
  return useContext(AppThemeContext);
}
