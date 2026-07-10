import { Platform } from 'react-native';

export const palette = {
  // Light mode tokens
  background: '#F6F6FB',
  backgroundElevated: '#FFFFFF',
  foreground: '#15162C',
  foregroundSoft: '#65678C',
  surface1: '#FFFFFF',
  surface2: '#FAFAFF',
  primary: '#6552F5',
  primaryStrong: '#4C3AD6',
  primaryMuted: '#EEEBFF',
  secondary: '#F2F0FF',
  tertiary: '#FF5FA2',
  quaternary: '#00D4B4',
  muted: '#ECEDF7',
  mutedForeground: '#8082A6',
  border: 'rgba(21,22,44,0.08)',
  borderStrong: 'rgba(21,22,44,0.14)',
  inputBackground: '#F3F3FB',
  overlay: 'rgba(11,11,20,0.55)',
  destructive: '#FF3B5C',
  destructiveSoft: '#FFE7ED',
  success: '#12B886',
  successSoft: '#DEFBF0',
  warning: '#FF9500',
  warningSoft: '#FFF1DB',
  info: '#2E9BFF',
  infoSoft: '#E2F2FF',
  glassFill: 'rgba(255,255,255,0.62)',
  glassBorder: 'rgba(255,255,255,0.55)',
  white: '#FFFFFF',
  black: '#0B0B14',
  
  // Backwards compatibility for existing code that hasn't been migrated
  card: '#FFFFFF',
  accent: '#7C5CFC',
  secondaryForeground: '#6552F5',
} as const;

export const darkPalette = {
  background: '#0B0B14',
  backgroundElevated: '#15151F',
  foreground: '#F1F1FA',
  foregroundSoft: '#9A9CC2',
  surface1: '#17182A',
  surface2: '#1E2036',
  primary: '#8B7CFF',
  primaryStrong: '#6552F5',
  primaryMuted: '#241F45',
  secondary: '#1B1A33',
  tertiary: '#FF7FB4',
  quaternary: '#22E8C8',
  muted: '#26283F',
  mutedForeground: '#7C7EA3',
  border: 'rgba(255,255,255,0.08)',
  borderStrong: 'rgba(255,255,255,0.16)',
  inputBackground: '#1A1B2E',
  overlay: 'rgba(0,0,0,0.72)',
  destructive: '#FF6B87',
  destructiveSoft: '#3A1622',
  success: '#2FE0A8',
  successSoft: '#0E2A22',
  warning: '#FFB454',
  warningSoft: '#332008',
  info: '#5CB6FF',
  infoSoft: '#0F2438',
  glassFill: 'rgba(23,24,42,0.55)',
  glassBorder: 'rgba(255,255,255,0.10)',
  white: '#FFFFFF',
  black: '#0B0B14',

  // Backwards compatibility
  card: '#17182A',
  accent: '#FF7FB4',
  secondaryForeground: '#8B7CFF',
} as const;

export const spacing = {
  micro: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  giant: 56,
} as const;

export const radius = {
  pill: 999,
  xs: 10,
  sm: 14,
  md: 20,
  lg: 26,
  xl: 32,
  xxl: 40,
} as const;

export const shadows = {
  // We use the key layer for shadow properties, and ambient will need custom handling in components
  card: {
    shadowColor: '#2A1F5C',
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  floating: {
    shadowColor: '#2A1F5C',
    shadowOpacity: 0.10,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  glow: {
    shadowColor: '#6552F5',
    shadowOpacity: 0.28,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
} as const;

export const typography = {
  family: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  displayFamily: 'Space Grotesk',
  monoFamily: 'JetBrains Mono',
  sizes: {
    caption: 13,
    label: 13,
    body: 16,
    bodyStrong: 16,
    headline: 22,
    title: 32,
    hero: 48,
    // Backwards compat
    xs: 11,
    sm: 12,
    md: 14,
    lg: 17,
    xl: 20,
    xxl: 24,
    display: 52,
  },
  lineHeights: {
    caption: 18,
    label: 18,
    body: 24,
    bodyStrong: 24,
    headline: 28,
    title: 38,
    hero: 52,
  },
  weights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
} as const;

export const appTheme = {
  palette,
  darkPalette,
  spacing,
  radius,
  shadows,
  typography,
};
