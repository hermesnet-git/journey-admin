import { createContext, useContext } from 'react';

export interface FlowColors {
  headerBg: string;
  sidebarBg: string;
  canvasBg: string;
  border: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  accentSoft: string;
  hoverBg: string;
  chipBg: string;
  dotColor: string;
  handleColor: string;
  cardBg: string;
  cardBorder: string;
  danger: string;
  dangerSoft: string;
}

// Ported from the wf-designer reference project's design system (Vivo purple accent).
export const LIGHT_COLORS: FlowColors = {
  headerBg: '#ffffff',
  sidebarBg: '#fafafa',
  canvasBg: '#f4f4f7',
  border: '#e4e4ea',
  textPrimary: '#1a1a1f',
  textSecondary: '#6c6c76',
  accent: '#8A05BE',
  accentSoft: 'rgba(138,5,190,0.10)',
  hoverBg: 'rgba(0,0,0,0.04)',
  chipBg: '#f0f0f3',
  dotColor: 'rgba(0,0,0,0.12)',
  handleColor: '#8A05BE',
  cardBg: '#ffffff',
  cardBorder: '#e2e2e8',
  danger: '#dc2626',
  dangerSoft: 'rgba(220,38,38,0.12)',
};

export const DARK_COLORS: FlowColors = {
  headerBg: '#17181d',
  sidebarBg: '#17181d',
  canvasBg: '#0e0f13',
  border: '#2a2b31',
  textPrimary: '#f2f2f5',
  textSecondary: '#96969f',
  accent: '#A24EE8',
  accentSoft: 'rgba(162,78,232,0.18)',
  hoverBg: 'rgba(255,255,255,0.05)',
  chipBg: '#232429',
  dotColor: 'rgba(255,255,255,0.09)',
  handleColor: '#A24EE8',
  cardBg: '#1c1d22',
  cardBorder: '#2c2d33',
  danger: '#f87171',
  dangerSoft: 'rgba(248,113,113,0.16)',
};

export interface FlowTheme {
  dark: boolean;
  c: FlowColors;
}

export const FlowThemeContext = createContext<FlowTheme>({ dark: false, c: LIGHT_COLORS });

export function useFlowTheme() {
  return useContext(FlowThemeContext);
}
