import { createContext, useContext } from 'react';

export interface AppColors {
  bg: string;
  surface: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentSoft: string;
  hoverBg: string;
  activeBg: string;
}

export const LIGHT_APP_COLORS: AppColors = {
  bg: '#fafafa',
  surface: '#ffffff',
  border: '#e4e4e7',
  textPrimary: '#1a1a1a',
  textSecondary: '#71717a',
  textMuted: '#a1a1aa',
  accent: '#019DF4',
  accentSoft: '#eff8ff',
  hoverBg: '#f4f4f5',
  activeBg: '#f4f4f5',
};

export const DARK_APP_COLORS: AppColors = {
  bg: '#0e0f13',
  surface: '#17181d',
  border: '#2a2b31',
  textPrimary: '#f2f2f5',
  textSecondary: '#96969f',
  textMuted: '#6c6c76',
  accent: '#3db4ff',
  accentSoft: 'rgba(61,180,255,0.14)',
  hoverBg: 'rgba(255,255,255,0.06)',
  activeBg: '#1f2026',
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
