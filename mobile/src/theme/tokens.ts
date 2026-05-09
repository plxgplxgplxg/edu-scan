import { Platform } from 'react-native';

export const palette = {
  background: '#F4F5FF',
  foreground: '#242640',
  foregroundSoft: '#6C7197',
  card: '#FFFFFF',
  primary: '#615BE3',
  primaryStrong: '#4C40D6',
  primaryMuted: '#EEF0FF',
  secondary: '#F2F3FF',
  secondaryForeground: '#5A57D6',
  tertiary: '#8D7BFF',
  muted: '#E8EAF8',
  mutedForeground: '#7379A6',
  accent: '#7F38F5',
  destructive: '#FF4D5E',
  destructiveSoft: '#FFE8EA',
  success: '#18C08F',
  successSoft: '#D9F8EA',
  warning: '#FF8A00',
  warningSoft: '#FFF0D9',
  info: '#2E9BFF',
  infoSoft: '#DFF1FF',
  border: 'rgba(108, 113, 151, 0.12)',
  inputBackground: '#F7F7FE',
  overlay: 'rgba(18, 24, 56, 0.48)',
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
  huge: 40,
} as const;

export const radius = {
  pill: 999,
  sm: 12,
  md: 18,
  lg: 24,
  xl: 30,
  xxl: 38,
} as const;

export const shadows = {
  card: {
    shadowColor: '#1E214D',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 5,
  },
  floating: {
    shadowColor: '#1E214D',
    shadowOpacity: 0.12,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 14 },
    elevation: 9,
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
    lg: 17,
    xl: 20,
    xxl: 24,
    hero: 38,
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
