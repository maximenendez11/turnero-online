/** Tema por defecto del flujo de reserva (alineado con design-tokens). */
export const DEFAULT_BOOKING_PAGE_BG = '#131313';
export const DEFAULT_BOOKING_PRIMARY = '#adc6ff';
export const DEFAULT_BOOKING_ON_PRIMARY = '#002e6a';

export function parseHex6(value: string | null | undefined): { r: number; g: number; b: number } | null {
  const s = (value ?? '').trim();
  const m = /^#([0-9a-fA-F]{6})$/.exec(s);
  if (!m) return null;
  const n = parseInt(m[1], 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function relativeLuminance(rgb: { r: number; g: number; b: number }): number {
  const lin = [rgb.r, rgb.g, rgb.b].map((c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * lin[0] + 0.7152 * lin[1] + 0.0722 * lin[2];
}

/** Mezcla dos hex `ratio` hacia `mixWith` (0 = solo base, 1 = solo mixWith). */
export function mixHex(base: string, mixWith: string, ratio: number): string {
  const A = parseHex6(base);
  const B = parseHex6(mixWith);
  if (!A || !B) return base;
  const t = Math.min(1, Math.max(0, ratio));
  const r = Math.round(A.r * (1 - t) + B.r * t);
  const g = Math.round(A.g * (1 - t) + B.g * t);
  const b = Math.round(A.b * (1 - t) + B.b * t);
  const h = (n: number) => n.toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Variables CSS para toda la pantalla de reserva: superficies, textos y stepper en función del fondo.
 */
export function buildBookingShellCssVars(
  themeBackgroundHex: string | null | undefined,
  themePrimaryHex: string | null | undefined,
): Record<string, string> {
  const pageBg = hexOrDefault(themeBackgroundHex, DEFAULT_BOOKING_PAGE_BG);
  const primary = hexOrDefault(themePrimaryHex, DEFAULT_BOOKING_PRIMARY);
  const onPrimary = pickOnPrimaryForHex(primary);
  const rgb = parseHex6(pageBg);
  const L = rgb ? relativeLuminance(rgb) : 0;
  const light = L > 0.52;

  let text: string;
  let muted: string;
  let hint: string;
  let surface: string;
  let surface2: string;
  let border: string;
  let track: string;
  let todoBg: string;
  let todoBorder: string;
  let currentInner: string;

  if (light) {
    text = '#1a1b1f';
    muted = '#4a4d5c';
    hint = '#6b7080';
    surface = mixHex(pageBg, '#0f0f14', 0.06);
    surface2 = mixHex(pageBg, '#0f0f14', 0.1);
    border = mixHex(pageBg, '#000000', 0.12);
    track = mixHex(pageBg, '#000000', 0.18);
    todoBg = mixHex(pageBg, '#000000', 0.05);
    todoBorder = mixHex(pageBg, '#000000', 0.18);
    currentInner = surface;
  } else {
    text = '#e8e6e3';
    muted = '#b8bcc8';
    hint = '#9499a8';
    surface = mixHex(pageBg, '#ffffff', 0.07);
    surface2 = mixHex(pageBg, '#ffffff', 0.11);
    border = mixHex(pageBg, '#ffffff', 0.13);
    track = mixHex(pageBg, '#ffffff', 0.2);
    todoBg = mixHex(pageBg, '#ffffff', 0.06);
    todoBorder = mixHex(pageBg, '#ffffff', 0.15);
    currentInner = mixHex(pageBg, '#ffffff', 0.05);
  }

  return {
    '--booking-page-bg': pageBg,
    '--booking-primary': primary,
    '--booking-on-primary': onPrimary,
    '--booking-text': text,
    '--booking-text-muted': muted,
    '--booking-text-hint': hint,
    '--booking-surface': surface,
    '--booking-surface-2': surface2,
    '--booking-border': border,
    '--booking-stepper-track': track,
    '--booking-stepper-todo-bg': todoBg,
    '--booking-stepper-todo-border': todoBorder,
    '--booking-stepper-current-inner': currentInner,
  };
}

/** Texto legible sobre un fondo de color `hex` (botones, chips del stepper completados). */
export function pickOnPrimaryForHex(hex: string): string {
  const rgb = parseHex6(hex);
  if (!rgb) return DEFAULT_BOOKING_ON_PRIMARY;
  return relativeLuminance(rgb) > 0.45 ? '#0d0d0d' : '#f8f8f8';
}

export function hexOrDefault(value: string | null | undefined, fallback: string): string {
  const v = (value ?? '').trim();
  return parseHex6(v) ? v : fallback;
}
