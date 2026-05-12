import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  inject,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminStaffRow,
} from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import { AdminVitrinaBannerModalComponent } from '../admin-vitrina-banner-modal/admin-vitrina-banner-modal.component';
import { AdminVitrinaStaffModalComponent } from '../admin-vitrina-staff-modal/admin-vitrina-staff-modal.component';

@Component({
  standalone: true,
  selector: 'app-admin-business-landing-panel',
  imports: [CommonModule, AdminVitrinaBannerModalComponent, AdminVitrinaStaffModalComponent],
  templateUrl: './admin-business-landing-panel.component.html',
  styleUrl: './admin-business-landing-panel.component.scss',
})
export class AdminBusinessLandingPanelComponent implements OnChanges {
  private readonly api = inject(AdminApiService);

  readonly defaultBannerPreview = '/images/landing-default-banner.svg';

  @Input({ required: true }) detail!: AdminBusinessDetail;
  @Output() readonly reload = new EventEmitter<void>();

  saving = false;
  bannerPreviewBroken = false;
  bannerModalOpen = false;
  staffModalOpen = false;
  staffEditTarget: AdminStaffRow | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['detail'] && this.detail) {
      this.bannerPreviewBroken = false;
    }
  }

  bannerInputTrimmed(): string {
    return (this.detail?.bannerImageUrl ?? '').trim();
  }

  bannerPreviewSrc(): string {
    const u = this.bannerInputTrimmed();
    if (!u || this.bannerPreviewBroken) return this.defaultBannerPreview;
    return u;
  }

  staffPhotoTrim(m: AdminStaffRow): string | null {
    const u = (m.photoUrl ?? '').trim();
    return u || null;
  }

  staffInitial(m: AdminStaffRow): string {
    return (m.displayName ?? '?').trim().slice(0, 1).toUpperCase();
  }

  onVitrinaSaved(): void {
    this.reload.emit();
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

  async removeStaff(row: AdminStaffRow): Promise<void> {
    if (!confirm(`¿Quitar a ${row.displayName} de la vitrina pública?`)) return;
    this.saving = true;
    try {
      await firstValueFrom(this.api.deleteStaffMember(row.id));
      this.reload.emit();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      this.saving = false;
    }
  }
}
