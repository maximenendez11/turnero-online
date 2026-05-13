import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminBusinessListItem,
  type AdminStaffRow,
} from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { AdminVitrinaStaffModalComponent } from '../components/admin-vitrina-staff-modal/admin-vitrina-staff-modal.component';
import { WorkspaceThemeService } from '../services/workspace-theme.service';

@Component({
  standalone: true,
  selector: 'app-admin-staff-page',
  imports: [CommonModule, FormsModule, AdminPageSkeletonComponent, AdminVitrinaStaffModalComponent],
  templateUrl: './admin-staff-page.component.html',
  styleUrl: './admin-staff-page.component.scss',
})
export class AdminStaffPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);

  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly detail = signal<AdminBusinessDetail | null>(null);
  readonly filterBusinessId = signal('');
  readonly loading = signal(true);
  readonly listBusy = signal(false);
  readonly error = signal<string | null>(null);
  readonly savingDeleteId = signal<string | null>(null);

  readonly staffRows = computed(() => this.detail()?.staff ?? []);

  readonly needsBusinessPick = computed(
    () => this.businesses().length > 1 && !this.filterBusinessId().trim(),
  );

  staffModalOpen = false;
  staffEditTarget: AdminStaffRow | null = null;

  constructor() {
    void this.init();
  }

  staffPhotoTrim(m: AdminStaffRow): string | null {
    const u = (m.photoUrl ?? '').trim();
    return u || null;
  }

  staffInitial(m: AdminStaffRow): string {
    return (m.displayName ?? '?').trim().slice(0, 1).toUpperCase();
  }

  async retry(): Promise<void> {
    await this.reloadDetail();
  }

  async onFilterBusinessChange(id: string): Promise<void> {
    this.filterBusinessId.set(id);
    await this.reloadDetail();
    await this.syncWorkspaceShellTheme();
  }

  openStaffAdd(): void {
    this.staffEditTarget = null;
    this.staffModalOpen = true;
  }

  openStaffEdit(m: AdminStaffRow): void {
    this.staffEditTarget = m;
    this.staffModalOpen = true;
  }

  closeStaffModal(): void {
    this.staffModalOpen = false;
    this.staffEditTarget = null;
  }

  onStaffSaved(): void {
    this.closeStaffModal();
    void this.reloadDetail();
  }

  async removeStaff(row: AdminStaffRow): Promise<void> {
    if (!confirm(`¿Eliminar a ${row.displayName} del equipo? Si está asignado a servicios, puede afectar reservas futuras.`)) {
      return;
    }
    this.savingDeleteId.set(row.id);
    this.error.set(null);
    try {
      await firstValueFrom(this.api.deleteStaffMember(row.id));
      await this.reloadDetail();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.savingDeleteId.set(null);
    }
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.api.getBusinesses().pipe(catchError(() => of([]))));
      this.businesses.set(list);
      if (list.length === 1) {
        this.filterBusinessId.set(list[0].id);
      }
      await this.reloadDetail();
      await this.syncWorkspaceShellTheme();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async reloadDetail(): Promise<void> {
    const bid = this.filterBusinessId().trim();
    if (!bid) {
      this.detail.set(null);
      this.error.set(null);
      return;
    }
    this.listBusy.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getBusiness(bid));
      this.detail.set(this.mapDetailStaff(d));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.detail.set(null);
    } finally {
      this.listBusy.set(false);
    }
  }

  private mapDetailStaff(d: AdminBusinessDetail): AdminBusinessDetail {
    return {
      ...d,
      staff: (d.staff ?? []).map((m) => ({
        ...m,
        role: m.role ?? '',
        photoUrl: m.photoUrl ?? '',
        showOnLanding: (m as { showOnLanding?: boolean }).showOnLanding !== false,
      })),
    };
  }

  private async syncWorkspaceShellTheme(): Promise<void> {
    const id = this.filterBusinessId().trim();
    if (!id) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    try {
      const d = await firstValueFrom(this.api.getBusiness(id));
      const bg = (d.themeBackgroundHex ?? '').trim();
      const pr = (d.themePrimaryHex ?? '').trim();
      this.workspaceTheme.applyBusinessTheme(
        /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
        /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null,
      );
      this.workspaceTheme.setNavBusinessName(d.name);
    } catch {
      this.workspaceTheme.resetToDefault();
    }
  }
}
