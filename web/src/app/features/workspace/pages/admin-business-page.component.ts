import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminBusinessListItem,
  type AdminServiceRow,
} from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import {
  DEFAULT_BOOKING_PAGE_BG,
  DEFAULT_BOOKING_PRIMARY,
} from '../../booking/utils/booking-theme.utils';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { BookingThemePreviewComponent } from '../components/booking-theme-preview/booking-theme-preview.component';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';

export type WindowDraft = { weekday: number; startMin: number; endMin: number };

export type BusinessSettingsTab = 'datos' | 'horarios' | 'servicios' | 'apariencia';

@Component({
  standalone: true,
  selector: 'app-admin-business-page',
  imports: [CommonModule, FormsModule, AdminPageSkeletonComponent, BookingThemePreviewComponent],
  templateUrl: './admin-business-page.component.html',
  styleUrl: './admin-business-page.component.scss',
})
export class AdminBusinessPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);

  readonly weekdayLabels = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);
  /** Pestaña activa en la configuración del negocio (solo con `detail` cargado). */
  readonly settingsTab = signal<BusinessSettingsTab>('datos');

  selectedBusinessId = '';
  detail: AdminBusinessDetail | null = null;
  windowsDraft: WindowDraft[] = [];
  newService = { name: '', description: '', durationMin: 45, price: 0 };

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    void this.init();
  }

  get publicBookingPreview(): string {
    const slug = this.detail?.slug?.trim();
    return slug ? `/${slug}/book/service` : '';
  }

  minutesToTime(m: number): string {
    const clamped = Math.max(0, Math.min(24 * 60, Math.round(m)));
    const h = Math.floor(clamped / 60);
    const min = clamped % 60;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  }

  setStartFromTime(w: WindowDraft, time: string): void {
    w.startMin = this.timeToMinutes(time);
  }

  setEndFromTime(w: WindowDraft, time: string): void {
    w.endMin = this.timeToMinutes(time);
  }

  private timeToMinutes(time: string): number {
    const [h, m] = time.split(':').map((x) => Number(x));
    if (Number.isNaN(h)) return 0;
    return Math.min(24 * 60, Math.max(0, h * 60 + (Number.isNaN(m) ? 0 : m)));
  }

  private flash(kind: 'ok' | 'err', text: string): void {
    if (this.noticeTimer) {
      clearTimeout(this.noticeTimer);
      this.noticeTimer = null;
    }
    this.notice.set({ kind, text });
    this.noticeTimer = setTimeout(() => {
      this.notice.set(null);
      this.noticeTimer = null;
    }, 4500);
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.api.getBusinesses());
      this.businesses.set(list);
      if (list.length > 0) {
        this.selectedBusinessId = list[0].id;
        await this.loadDetail();
      } else {
        this.selectedBusinessId = '';
        this.workspaceTheme.resetToDefault();
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  async onBusinessChange(): Promise<void> {
    this.settingsTab.set('datos');
    await this.loadDetail();
  }

  setSettingsTab(tab: BusinessSettingsTab): void {
    this.settingsTab.set(tab);
  }

  async loadDetail(): Promise<void> {
    if (!this.selectedBusinessId) {
      this.detail = null;
      this.windowsDraft = [];
      this.workspaceTheme.resetToDefault();
      return;
    }
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getBusiness(this.selectedBusinessId));
      this.detail = this.mapDetailForForm(d);
      this.windowsDraft = d.openingWindows.map((w) => ({
        weekday: w.weekday,
        startMin: w.startMin,
        endMin: w.endMin,
      }));
      this.syncWorkspaceShellTheme();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.detail = null;
      this.workspaceTheme.resetToDefault();
    }
  }

  private normalizeThemeHex(v: string | null | undefined): string | null {
    const s = (v ?? '').trim();
    return /^#[0-9A-Fa-f]{6}$/.test(s) ? s : null;
  }

  /** Alinea el shell del admin con los colores guardados del negocio (misma paleta que la reserva pública). */
  private syncWorkspaceShellTheme(): void {
    if (!this.detail) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    this.workspaceTheme.applyBusinessTheme(
      this.normalizeThemeHex(this.detail.themeBackgroundHex),
      this.normalizeThemeHex(this.detail.themePrimaryHex),
    );
    this.workspaceTheme.setNavBusinessName(this.detail.name);
  }

  addWindowRow(): void {
    this.windowsDraft.push({ weekday: 1, startMin: 9 * 60, endMin: 18 * 60 });
  }

  removeWindowRow(i: number): void {
    this.windowsDraft.splice(i, 1);
  }

  async saveCore(): Promise<void> {
    if (!this.detail) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(
        this.api.patchBusiness(this.detail.id, {
          name: this.detail.name,
          slug: this.detail.slug || null,
          description: this.detail.description,
          address: this.detail.address,
          timezone: this.detail.timezone,
          bookingIntervalMin: this.detail.bookingIntervalMin,
          status: this.detail.status,
        }),
      );
      this.detail = this.mapDetailForForm(d);
      this.syncWindowsFromDetail();
      this.syncWorkspaceShellTheme();
      this.error.set(null);
      this.flash('ok', 'Datos del negocio guardados.');
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async saveWindows(): Promise<void> {
    if (!this.detail) return;
    this.saving.set(true);
    this.error.set(null);
    const windows = this.windowsDraft.map((w, i) => ({
      weekday: w.weekday,
      startMin: w.startMin,
      endMin: w.endMin,
      sortOrder: i,
    }));
    try {
      const d = await firstValueFrom(this.api.replaceOpeningWindows(this.detail.id, windows));
      this.detail = this.mapDetailForForm(d);
      this.syncWindowsFromDetail();
      this.error.set(null);
      this.flash('ok', 'Horarios actualizados.');
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async saveTheme(): Promise<void> {
    if (!this.detail) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(
        this.api.patchBusiness(this.detail.id, {
          themeBackgroundHex: (this.detail.themeBackgroundHex ?? '').trim(),
          themePrimaryHex: (this.detail.themePrimaryHex ?? '').trim(),
        }),
      );
      this.detail = this.mapDetailForForm(d);
      this.syncWorkspaceShellTheme();
      this.error.set(null);
      this.flash('ok', 'Colores de la reserva pública guardados.');
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  resetThemeToDefaults(): void {
    if (!this.detail) return;
    this.detail.themeBackgroundHex = '';
    this.detail.themePrimaryHex = '';
  }

  themeBgPickerValue(): string {
    const v = this.detail?.themeBackgroundHex?.trim() ?? '';
    return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_BOOKING_PAGE_BG;
  }

  themePrimaryPickerValue(): string {
    const v = this.detail?.themePrimaryHex?.trim() ?? '';
    return /^#[0-9A-Fa-f]{6}$/.test(v) ? v : DEFAULT_BOOKING_PRIMARY;
  }

  setThemeBgFromPicker(ev: Event): void {
    if (!this.detail) return;
    this.detail.themeBackgroundHex = (ev.target as HTMLInputElement).value;
  }

  setThemePrimaryFromPicker(ev: Event): void {
    if (!this.detail) return;
    this.detail.themePrimaryHex = (ev.target as HTMLInputElement).value;
  }

  private mapDetailForForm(d: AdminBusinessDetail): AdminBusinessDetail {
    return {
      ...d,
      description: d.description ?? '',
      slug: d.slug ?? '',
      themeBackgroundHex: d.themeBackgroundHex ?? '',
      themePrimaryHex: d.themePrimaryHex ?? '',
      services: d.services.map((s) => ({ ...s, description: s.description ?? '' })),
    };
  }

  private syncWindowsFromDetail(): void {
    if (!this.detail) return;
    this.windowsDraft = this.detail.openingWindows.map((w) => ({
      weekday: w.weekday,
      startMin: w.startMin,
      endMin: w.endMin,
    }));
  }

  async addService(): Promise<void> {
    if (!this.detail || !this.newService.name.trim()) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.createService(this.detail.id, {
          name: this.newService.name.trim(),
          description: this.newService.description.trim() || undefined,
          durationMin: Number(this.newService.durationMin),
          price: Number(this.newService.price),
        }),
      );
      this.newService = { name: '', description: '', durationMin: 45, price: 0 };
      await this.loadDetail();
      this.error.set(null);
      this.flash('ok', 'Servicio creado.');
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  priceNumber(s: AdminServiceRow): number {
    return Number(s.price);
  }

  setServicePrice(s: AdminServiceRow, v: number): void {
    s.price = v;
  }

  async saveService(s: AdminServiceRow): Promise<void> {
    this.saving.set(true);
    this.error.set(null);
    try {
      await firstValueFrom(
        this.api.patchService(s.id, {
          name: s.name,
          description: s.description,
          durationMin: s.durationMin,
          price: this.priceNumber(s),
          isActive: s.isActive,
        }),
      );
      await this.loadDetail();
      this.error.set(null);
      this.flash('ok', `Servicio «${s.name}» guardado.`);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
