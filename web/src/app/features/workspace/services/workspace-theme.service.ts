import { Injectable, signal } from '@angular/core';
import { buildBookingShellCssVars } from '../../booking/utils/booking-theme.utils';

/**
 * Aplica en el shell del workspace las mismas variables CSS que la reserva pública
 * (`--booking-*`), según los colores guardados del negocio.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceThemeService {
  readonly cssVars = signal<Record<string, string>>({});
  /** Nombre del negocio activo para el nav del workspace (sidebar). */
  readonly navBusinessName = signal<string | null>(null);

  applyBusinessTheme(themeBackgroundHex: string | null | undefined, themePrimaryHex: string | null | undefined): void {
    this.cssVars.set(buildBookingShellCssVars(themeBackgroundHex, themePrimaryHex));
  }

  setNavBusinessName(name: string | null | undefined): void {
    const n = (name ?? '').trim();
    this.navBusinessName.set(n.length > 0 ? n : null);
  }

  resetToDefault(): void {
    this.cssVars.set({});
    this.navBusinessName.set(null);
  }
}
