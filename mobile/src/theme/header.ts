import { appTheme } from './tokens';

export const primaryHeroGradient = [
  appTheme.palette.primary,
  appTheme.palette.tertiary,
] as const;

export const adminHeroGradient = [
  appTheme.palette.success,
  appTheme.palette.quaternary,
] as const;
