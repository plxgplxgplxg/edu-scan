import { en } from './en';
import { vi } from './vi';

export const contentByLanguage = {
  vi,
  en,
};

export type AppContent = typeof vi | typeof en;
