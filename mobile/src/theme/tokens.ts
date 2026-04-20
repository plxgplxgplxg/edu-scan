import { Platform } from 'react-native';

export const palette = {
  background: '#F0F2F8',
  foreground: '#1A1A2E',
  card: '#FFFFFF',
  primary: '#5B5BD6',
  primaryStrong: '#4F46E5',
  secondary: '#EEF0FF',
  secondaryForeground: '#5B5BD6',
  muted: '#E8EAF0',
  mutedForeground: '#6B7194',
  accent: '#7C5CFC',
  destructive: '#E5484D',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  border: 'rgba(0, 0, 0, 0.1)',
  inputBackground: '#F4F5F9',
  overlay: 'rgba(15, 23, 42, 0.52)',
  white: '#FFFFFF',
  black: '#050508',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radius = {
  pill: 999,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 32,
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  floating: {
    shadowColor: '#0F172A',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 8,
  },
} as const;

export const typography = {
  family: Platform.select({
    ios: 'System',
    android: 'sans-serif',
    default: 'System',
  }),
  sizes: {
    xs: 11,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 22,
    hero: 32,
    display: 52,
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
  spacing,
  radius,
  shadows,
  typography,
};
