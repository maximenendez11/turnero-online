import { buildBookingShellCssVars } from '../../booking/utils/booking-theme.utils';

/** Paleta clara del producto (shell cliente / onboarding). */
export const APP_SHELL_PAGE_BG = '#f7f8fa';
export const APP_SHELL_PRIMARY = '#1a5fd4';

export function buildAppShellCssVars(): Record<string, string> {
  return buildBookingShellCssVars(APP_SHELL_PAGE_BG, APP_SHELL_PRIMARY);
}

/** Variables que el workspace anima al cambiar de modo. */
export const WORKSPACE_THEME_CSS_VARS = [
  '--booking-page-bg',
  '--booking-primary',
  '--booking-on-primary',
  '--booking-text',
  '--booking-text-muted',
  '--booking-text-hint',
  '--booking-surface',
  '--booking-surface-2',
  '--booking-border',
  '--booking-stepper-track',
  '--booking-stepper-todo-bg',
  '--booking-stepper-todo-border',
  '--booking-stepper-current-inner',
] as const;
