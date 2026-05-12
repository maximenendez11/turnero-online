import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  standalone: true,
  selector: 'app-admin-vitrina-banner-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-vitrina-banner-modal.component.html',
  styleUrl: './admin-vitrina-banner-modal.component.scss',
})
export class AdminVitrinaBannerModalComponent implements OnChanges {
  private readonly api = inject(AdminApiService);

  @Input({ required: true }) businessId!: string;
  @Input() open = false;
  @Input() bannerUrl = '';
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  readonly defaultPreview = '/images/landing-default-banner.svg';

  tab: 'url' | 'file' = 'url';
  draftUrl = '';
  pickedFile: File | null = null;
  pickedPreview: string | null = null;
  busy = false;
  previewBroken = false;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open']?.currentValue === true) {
      this.draftUrl = (this.bannerUrl ?? '').trim();
      this.clearPickedFile();
      this.tab = 'url';
      this.previewBroken = false;
    }
  }

  clearDraftUrl(): void {
    this.draftUrl = '';
    this.previewBroken = false;
  }

  close(): void {
    if (this.busy) return;
    this.clearPickedFile();
    this.dismiss.emit();
  }

  setTab(t: 'url' | 'file'): void {
    this.tab = t;
    this.previewBroken = false;
  }

  onFilePicked(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    input.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    if (f.size > 5 * 1024 * 1024) {
      alert('El archivo supera los 5 MB.');
      return;
    }
    this.revokePickedPreview();
    this.pickedFile = f;
    this.pickedPreview = URL.createObjectURL(f);
  }

  clearPickedFile(): void {
    this.revokePickedPreview();
    this.pickedFile = null;
  }

  previewSrc(): string {
    if (this.pickedPreview) return this.pickedPreview;
    const u = this.draftUrl.trim();
    if (!u || this.previewBroken) return this.defaultPreview;
    return u;
  }

  async confirm(): Promise<void> {
    if (this.tab === 'file' && !this.pickedFile) return;
    this.busy = true;
    try {
      let urlOut = this.draftUrl.trim();
      if (this.tab === 'file' && this.pickedFile) {
        const { url } = await firstValueFrom(
          this.api.uploadLandingMedia(this.businessId, this.pickedFile, 'banner'),
        );
        urlOut = url;
      }
      await firstValueFrom(this.api.patchBusiness(this.businessId, { bannerImageUrl: urlOut }));
      this.clearPickedFile();
      this.saved.emit();
      this.dismiss.emit();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      this.busy = false;
    }
  }

  async useDefaultBanner(): Promise<void> {
    this.busy = true;
    try {
      await firstValueFrom(this.api.patchBusiness(this.businessId, { bannerImageUrl: '' }));
      this.clearPickedFile();
      this.saved.emit();
      this.dismiss.emit();
    } catch (e) {
      alert(apiErrorMessage(e));
    } finally {
      this.busy = false;
    }
  }

  private revokePickedPreview(): void {
    if (this.pickedPreview) {
      URL.revokeObjectURL(this.pickedPreview);
      this.pickedPreview = null;
    }
  }
}
