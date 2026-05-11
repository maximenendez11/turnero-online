import { BookingFlowService } from '../services/booking-flow.service';

/** Snapshot del shell público para evitar FOUC al cambiar de paso (cada ruta recrea el componente). */
export type BookingShellSnapshot = {
  themeBackgroundHex: string | null;
  themePrimaryHex: string | null;
  businessName: string;
};

const storageKey = (slug: string) => `turnero.booking.shell.v1:${encodeURIComponent(slug)}`;

function validHex6(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim();
  return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : null;
}

/**
 * Orden: memoria en `BookingFlowService` (mismo flujo, sin esperar API), luego sessionStorage.
 */
export function hydrateBookingShellSnapshot(slug: string, flow: BookingFlowService): BookingShellSnapshot | null {
  const mem = flow.peekBookingShell(slug);
  if (mem) return mem;
  try {
    const raw = sessionStorage.getItem(storageKey(slug));
    if (!raw) return null;
    const o = JSON.parse(raw) as Record<string, unknown>;
    const bg = validHex6(o['themeBackgroundHex']);
    const pr = validHex6(o['themePrimaryHex']);
    const nameRaw = typeof o['businessName'] === 'string' ? o['businessName'].trim() : '';
    const name = nameRaw || slug.replace(/-/g, ' ');
    if (!bg && !pr && !nameRaw) return null;
    return {
      themeBackgroundHex: bg,
      themePrimaryHex: pr,
      businessName: name,
    };
  } catch {
    return null;
  }
}

export function persistBookingShellSnapshot(slug: string, flow: BookingFlowService, snap: BookingShellSnapshot): void {
  flow.rememberBookingShell(slug, snap);
  try {
    sessionStorage.setItem(storageKey(slug), JSON.stringify(snap));
  } catch {
    /* quota / modo privado */
  }
}
