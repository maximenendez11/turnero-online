import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Component, OnDestroy, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { catchError, firstValueFrom, forkJoin, map, of } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminBusinessListItem,
  type AdminDashboardMetrics,
} from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { isOpenNowInWindows } from '../utils/opening-hours-now.utils';

export type DashboardBusinessStatus = {
  id: string;
  name: string;
  isOpen: boolean;
  hasSchedule: boolean;
  timeZone: string;
};

export type DashboardShareRow = {
  id: string;
  name: string;
  /** Ruta pública p. ej. `/mi-slug` (landing) o `null` si falta slug. */
  bookingPath: string | null;
};

@Component({
  standalone: true,
  selector: 'app-admin-dashboard-page',
  imports: [CommonModule, RouterLink, AdminPageSkeletonComponent],
  templateUrl: './admin-dashboard-page.component.html',
  styleUrl: './admin-dashboard-page.component.scss',
})
export class AdminDashboardPageComponent implements OnDestroy {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);
  private readonly platformId = inject(PLATFORM_ID);

  private readonly details = signal<AdminBusinessDetail[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly metrics = signal<AdminDashboardMetrics | null>(null);
  readonly metricsError = signal<string | null>(null);

  /** Tic cada minuto para recalcular abierto/cerrado sin volver a llamar a la API. */
  private readonly nowMs = signal(Date.now());
  private tickId: ReturnType<typeof setInterval> | null = null;

  readonly statusRows = computed<DashboardBusinessStatus[]>(() => {
    const at = new Date(this.nowMs());
    return this.details().map((d) => ({
      id: d.id,
      name: d.name,
      isOpen: isOpenNowInWindows(d.openingWindows, d.timezone, at),
      hasSchedule: d.openingWindows.length > 0,
      timeZone: d.timezone,
    }));
  });

  readonly shareRows = computed<DashboardShareRow[]>(() => {
    return this.details().map((d) => {
      const slug = d.slug?.trim() ?? '';
      const bookingPath = slug.length > 0 ? `/${slug}` : null;
      return { id: d.id, name: d.name, bookingPath };
    });
  });

  /** Aviso tras copiar / error breve. */
  readonly copyHint = signal<string | null>(null);
  private copyHintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.load();
    this.tickId = setInterval(() => this.nowMs.set(Date.now()), 60_000);
  }

  ngOnDestroy(): void {
    if (this.tickId !== null) {
      clearInterval(this.tickId);
      this.tickId = null;
    }
    if (this.copyHintTimer) {
      clearTimeout(this.copyHintTimer);
      this.copyHintTimer = null;
    }
  }

  canNativeShare(): boolean {
    return isPlatformBrowser(this.platformId) && typeof navigator !== 'undefined' && !!navigator.share;
  }

  /** URL absoluta para mostrar, copiar y compartir (solo navegador). */
  bookingPublicUrl(row: DashboardShareRow): string {
    if (!row.bookingPath) return '';
    return isPlatformBrowser(this.platformId)
      ? `${window.location.origin}${row.bookingPath}`
      : row.bookingPath;
  }

  async copyBookingLink(row: DashboardShareRow): Promise<void> {
    const url = this.bookingPublicUrl(row);
    if (!isPlatformBrowser(this.platformId) || !url.startsWith('http')) return;
    try {
      await navigator.clipboard.writeText(url);
      this.flashCopyHint('Enlace copiado');
    } catch {
      this.flashCopyHint('No se pudo copiar automáticamente');
    }
  }

  async nativeShare(row: DashboardShareRow): Promise<void> {
    const url = this.bookingPublicUrl(row);
    if (!isPlatformBrowser(this.platformId) || !url.startsWith('http') || !navigator.share) return;
    try {
      await navigator.share({
        title: `Reservar en ${row.name}`,
        text: 'Sacá turno online en segundos.',
        url,
      });
    } catch {
      /* usuario canceló o falló */
    }
  }

  private flashCopyHint(text: string): void {
    if (this.copyHintTimer) {
      clearTimeout(this.copyHintTimer);
      this.copyHintTimer = null;
    }
    this.copyHint.set(text);
    this.copyHintTimer = setTimeout(() => {
      this.copyHint.set(null);
      this.copyHintTimer = null;
    }, 2800);
  }

  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.metricsError.set(null);
    this.metrics.set(null);
    try {
      const [list, metricsRes] = await Promise.all([
        firstValueFrom(this.api.getBusinesses()),
        firstValueFrom(
          this.api.getDashboardMetrics().pipe(
            catchError(() => {
              this.metricsError.set('No se pudieron cargar las métricas de turnos.');
              return of(null);
            }),
          ),
        ),
      ]);
      this.metrics.set(metricsRes);
      if (list.length === 0) {
        this.details.set([]);
        this.workspaceTheme.resetToDefault();
        return;
      }
      const details = await firstValueFrom(
        forkJoin(
          list.map((b: AdminBusinessListItem) =>
            this.api.getBusiness(b.id).pipe(
              catchError(() => of(null)),
              map((d) => d),
            ),
          ),
        ),
      );
      const ok = details.filter((d): d is AdminBusinessDetail => d !== null);
      this.details.set(ok);
      this.syncWorkspaceShellTheme(ok);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.details.set([]);
      this.workspaceTheme.resetToDefault();
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Igual que en Turnos/Negocio: el layout usa `WorkspaceThemeService` para `--booking-*`.
   * Con varios negocios se aplica el tema del primero de la lista (orden API).
   */
  private syncWorkspaceShellTheme(details: AdminBusinessDetail[]): void {
    if (details.length === 0) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    const d = details[0];
    const bg = (d.themeBackgroundHex ?? '').trim();
    const pr = (d.themePrimaryHex ?? '').trim();
    this.workspaceTheme.applyBusinessTheme(
      /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
      /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null,
    );
    this.workspaceTheme.setNavBusinessName(d.name);
  }
}
