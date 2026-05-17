import { Injectable, signal } from '@angular/core';
import { buildBookingShellCssVars } from '../../booking/utils/booking-theme.utils';
import { AppSplashService } from '../../../core/services/app-splash.service';
import { buildAppShellCssVars } from '../utils/workspace-shell-theme.utils';
import type { WorkspaceMode } from '../workspace-mode.config';

type ShellPalette = 'app' | 'business';

/**
 * Tema del shell del workspace (`--booking-*`).
 * Modo cliente: paleta clara de la app. Modo negocio: colores del comercio (con cache).
 */
@Injectable({ providedIn: 'root' })
export class WorkspaceThemeService {
  constructor(private readonly splash: AppSplashService) {}

  readonly cssVars = signal<Record<string, string>>(buildAppShellCssVars());
  readonly navBusinessName = signal<string | null>(null);

  private cachedBusinessVars: Record<string, string> | null = null;
  private activePalette: ShellPalette = 'app';

  hasBusinessThemeCached(): boolean {
    return this.cachedBusinessVars !== null;
  }

  /** Precalienta colores del negocio sin cambiar el shell visible (modo cliente). */
  warmBusinessThemeCache(
    themeBackgroundHex: string | null | undefined,
    themePrimaryHex: string | null | undefined,
    businessName?: string | null,
  ): void {
    this.cachedBusinessVars = buildBookingShellCssVars(themeBackgroundHex, themePrimaryHex);
    const n = (businessName ?? '').trim();
    if (n) this.navBusinessName.set(n);
  }

  applyBusinessTheme(themeBackgroundHex: string | null | undefined, themePrimaryHex: string | null | undefined): void {
    const vars = buildBookingShellCssVars(themeBackgroundHex, themePrimaryHex);
    this.cachedBusinessVars = vars;
    if (this.activePalette === 'business' && this.varsMatch(this.cssVars(), vars)) {
      this.splash.hide();
      return;
    }
    this.activePalette = 'business';
    this.cssVars.set(vars);
    this.splash.hide();
  }

  applyAppShellTheme(): void {
    const vars = buildAppShellCssVars();
    if (this.activePalette === 'app' && this.varsMatch(this.cssVars(), vars)) {
      return;
    }
    this.activePalette = 'app';
    this.cssVars.set(vars);
  }

  restoreBusinessTheme(): void {
    const vars = this.cachedBusinessVars ?? buildAppShellCssVars();
    if (this.activePalette === 'business' && this.varsMatch(this.cssVars(), vars)) {
      return;
    }
    this.activePalette = 'business';
    this.cssVars.set(vars);
  }

  syncForWorkspaceMode(mode: WorkspaceMode, isCreateBusinessFlow: boolean): void {
    if (isCreateBusinessFlow || mode === 'customer') {
      this.applyAppShellTheme();
      return;
    }
    this.restoreBusinessTheme();
  }

  setNavBusinessName(name: string | null | undefined): void {
    const n = (name ?? '').trim();
    this.navBusinessName.set(n.length > 0 ? n : null);
  }

  resetToDefault(): void {
    this.applyAppShellTheme();
    this.navBusinessName.set(null);
  }

  private varsMatch(a: Record<string, string>, b: Record<string, string>): boolean {
    return a['--booking-page-bg'] === b['--booking-page-bg'] && a['--booking-primary'] === b['--booking-primary'];
  }
}
