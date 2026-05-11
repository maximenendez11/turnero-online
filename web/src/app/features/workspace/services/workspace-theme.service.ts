import { Injectable, signal } from '@angular/core';
import { buildBookingShellCssVars } from '../../booking/utils/booking-theme.utils';

/**
 * Aplica en el shell del workspace las mismas variables CSS que la reserva pública
 * (`--booking-*`), según los colores guardados del negocio.
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceThemeService {
  readonly cssVars = signal<Record<string, string>>({});

  applyBusinessTheme(themeBackgroundHex: string | null | undefined, themePrimaryHex: string | null | undefined): void {
    this.cssVars.set(buildBookingShellCssVars(themeBackgroundHex, themePrimaryHex));
  }

  resetToDefault(): void {
    this.cssVars.set({});
  }
}
