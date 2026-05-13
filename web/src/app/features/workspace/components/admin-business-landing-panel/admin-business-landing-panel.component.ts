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
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminStaffRow,
} from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import { AdminVitrinaBannerModalComponent } from '../admin-vitrina-banner-modal/admin-vitrina-banner-modal.component';

@Component({
  standalone: true,
  selector: 'app-admin-business-landing-panel',
  imports: [CommonModule, RouterLink, AdminVitrinaBannerModalComponent],
  templateUrl: './admin-business-landing-panel.component.html',
  styleUrl: './admin-business-landing-panel.component.scss',
})
export class AdminBusinessLandingPanelComponent implements OnChanges {
  private readonly api = inject(AdminApiService);

  readonly defaultBannerPreview = '/images/landing-default-banner.svg';

  @Input({ required: true }) detail!: AdminBusinessDetail;
  @Output() readonly reload = new EventEmitter<void>();

  toggleSaving = false;
  bannerPreviewBroken = false;
  bannerModalOpen = false;

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

  onVidrieraSaved(): void {
    this.reload.emit();
  }

  async onShowOnLandingChange(m: AdminStaffRow, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const next = input.checked;
    if (next === m.showOnLanding) return;
    this.toggleSaving = true;
    try {
      await firstValueFrom(this.api.patchStaffMember(m.id, { showOnLanding: next }));
      this.reload.emit();
    } catch (e) {
      alert(apiErrorMessage(e));
      input.checked = m.showOnLanding;
    } finally {
      this.toggleSaving = false;
    }
  }
}
