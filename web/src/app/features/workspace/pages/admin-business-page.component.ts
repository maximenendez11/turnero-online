import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminBusinessListItem,
  type AdminServiceRow,
  type AdminServiceStaffLink,
} from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import {
  DEFAULT_BOOKING_PAGE_BG,
  DEFAULT_BOOKING_PRIMARY,
} from '../../booking/utils/booking-theme.utils';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { BookingThemePreviewComponent } from '../components/booking-theme-preview/booking-theme-preview.component';
import { AdminBusinessLandingPanelComponent } from '../components/admin-business-landing-panel/admin-business-landing-panel.component';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { AdminOpeningHoursEditorComponent } from '../components/admin-opening-hours-editor/admin-opening-hours-editor.component';
import { AdminBusinessServicesTabComponent } from '../components/admin-business-services-tab/admin-business-services-tab.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import {
  openingWindowsSnapshot,
  sortWindowsForSave,
  validateAllWindows,
  type WindowDraft,
} from '../utils/opening-hours-editor.utils';
import { AppConfirmDialogService } from '../../../core/services/app-confirm-dialog.service';
import { openingHoursUnsavedLeaveDialog } from './admin-business-page.deactivate';

export type BusinessSettingsTab = 'datos' | 'horarios' | 'servicios' | 'apariencia' | 'vidriera';

@Component({
  standalone: true,
  selector: 'app-admin-business-page',
  imports: [
    CommonModule,
    FormsModule,
    AdminPageSkeletonComponent,
    BookingThemePreviewComponent,
    SegmentedControlComponent,
    AdminBusinessLandingPanelComponent,
    AdminOpeningHoursEditorComponent,
    AdminBusinessServicesTabComponent,
  ],
  templateUrl: './admin-business-page.component.html',
  styleUrl: './admin-business-page.component.scss',
})
export class AdminBusinessPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);
  private readonly confirmDialog = inject(AppConfirmDialogService);

  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly notice = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);
  /** Pestaña activa en la configuración del negocio (solo con `detail` cargado). */
  readonly settingsTab = signal<BusinessSettingsTab>('datos');
  readonly settingsTabItems = [
    { id: 'datos', label: 'Datos' },
    { id: 'horarios', label: 'Horarios' },
    { id: 'servicios', label: 'Servicios' },
    { id: 'vidriera', label: 'Vidriera' },
    { id: 'apariencia', label: 'Apariencia' },
  ] as const;

  selectedBusinessId = '';
  detail: AdminBusinessDetail | null = null;
  windowsDraft: WindowDraft[] = [];

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;
  /** Último negocio cargado con éxito (para revertir el select si cancela con horarios sin guardar). */
  private loadedBusinessId = '';
  /** Firma de `windowsDraft` alineada con el servidor tras cargar o guardar horarios. */
  private openingHoursBaseline = '';

  constructor() {
    void this.init();
  }

  /** Usado por el guard de ruta: horarios en borrador distintos del último estado guardado. */
  openingHoursDirty(): boolean {
    if (!this.detail) return false;
    return openingWindowsSnapshot(this.windowsDraft) !== this.openingHoursBaseline;
  }

  @HostListener('window:beforeunload', ['$event'])
  protected onBeforeUnload(ev: BeforeUnloadEvent): void {
    if (this.openingHoursDirty()) {
      ev.preventDefault();
      ev.returnValue = '';
    }
  }

  get publicBookingPreview(): string {
    const slug = this.detail?.slug?.trim();
    return slug ? `/${slug}` : '';
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
    if (this.openingHoursDirty()) {
      const ok = await this.confirmDialog.confirm(openingHoursUnsavedLeaveDialog());
      if (!ok) {
        this.selectedBusinessId = this.loadedBusinessId;
        return;
      }
    }
    this.settingsTab.set('datos');
    await this.loadDetail();
  }

  setSettingsTab(tab: string): void {
    void this.applySettingsTabChange(tab);
  }

  private async applySettingsTabChange(tab: string): Promise<void> {
    if (tab !== 'datos' && tab !== 'horarios' && tab !== 'servicios' && tab !== 'apariencia' && tab !== 'vidriera') {
      return;
    }
    if (this.settingsTab() === tab) return;
    if (this.openingHoursDirty()) {
      const ok = await this.confirmDialog.confirm(openingHoursUnsavedLeaveDialog());
      if (!ok) return;
    }
    this.settingsTab.set(tab as BusinessSettingsTab);
  }

  async loadDetail(): Promise<void> {
    if (!this.selectedBusinessId) {
      this.detail = null;
      this.windowsDraft = [];
      this.loadedBusinessId = '';
      this.refreshOpeningHoursBaseline();
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
      this.loadedBusinessId = this.selectedBusinessId;
      this.refreshOpeningHoursBaseline();
      this.syncWorkspaceShellTheme();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.detail = null;
      this.windowsDraft = [];
      this.loadedBusinessId = '';
      this.refreshOpeningHoursBaseline();
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
    const validation = validateAllWindows(this.windowsDraft);
    if (validation) {
      this.flash('err', validation);
      return;
    }
    this.saving.set(true);
    this.error.set(null);
    const sorted = sortWindowsForSave(this.windowsDraft);
    const windows = sorted.map((w, i) => ({
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
      bannerImageUrl: d.bannerImageUrl ?? '',
      staff: (d.staff ?? []).map((m) => ({
        ...m,
        role: m.role ?? '',
        photoUrl: m.photoUrl ?? '',
        showOnLanding: (m as { showOnLanding?: boolean }).showOnLanding !== false,
      })),
      services: d.services.map((raw) => {
        const row = raw as AdminServiceRow & { eligibleStaff?: AdminServiceStaffLink[] };
        const { eligibleStaff, ...rest } = row;
        const staffIds = eligibleStaff?.map((l) => l.staffId) ?? [];
        return {
          ...rest,
          description: rest.description ?? '',
          imageUrl: rest.imageUrl ?? '',
          imageUrl2: rest.imageUrl2 ?? '',
          imageUrl3: rest.imageUrl3 ?? '',
          priceOnRequest: rest.priceOnRequest ?? false,
          depositPercent: rest.depositPercent ?? null,
          modalityPresencial: rest.modalityPresencial ?? true,
          modalityOnline: rest.modalityOnline ?? false,
          modalityDomicilio: rest.modalityDomicilio ?? false,
          schedulingType: rest.schedulingType ?? 'regular',
          reminderClarifications: rest.reminderClarifications ?? '',
          staffIds,
        };
      }),
    };
  }

  private syncWindowsFromDetail(): void {
    if (!this.detail) return;
    this.windowsDraft = this.detail.openingWindows.map((w) => ({
      weekday: w.weekday,
      startMin: w.startMin,
      endMin: w.endMin,
    }));
    this.refreshOpeningHoursBaseline();
  }

  private refreshOpeningHoursBaseline(): void {
    this.openingHoursBaseline = this.detail ? openingWindowsSnapshot(this.windowsDraft) : '';
  }

}
