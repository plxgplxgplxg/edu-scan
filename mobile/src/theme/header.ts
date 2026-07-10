import { appTheme } from './tokens';

export const primaryHeroGradient = [
  appTheme.palette.primary,
  '#8B5CF6',
  appTheme.palette.tertiary,
] as const;

export const adminHeroGradient = [
  appTheme.palette.success,
  appTheme.palette.quaternary,
] as const;
