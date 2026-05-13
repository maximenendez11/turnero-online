import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AdminApiService } from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  standalone: true,
  selector: 'app-admin-vitrina-banner-modal',
  imports: [CommonModule],
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

  pickedFile: File | null = null;
  pickedPreview: string | null = null;
  busy = false;
  previewBroken = false;

  ngOnChanges(ch: SimpleChanges): void {
    if (ch['open']?.currentValue === true) {
      this.clearPickedFile();
      this.previewBroken = false;
    }
  }

  close(): void {
    if (this.busy) return;
    this.clearPickedFile();
    this.dismiss.emit();
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
    this.previewBroken = false;
  }

  clearPickedFile(): void {
    this.revokePickedPreview();
    this.pickedFile = null;
  }

  previewSrc(): string {
    if (this.pickedPreview) return this.pickedPreview;
    const u = (this.bannerUrl ?? '').trim();
    if (!u || this.previewBroken) return this.defaultPreview;
    return u;
  }

  async confirm(): Promise<void> {
    if (!this.pickedFile) return;
    this.busy = true;
    try {
      const { url } = await firstValueFrom(
        this.api.uploadLandingMedia(this.businessId, this.pickedFile, 'banner'),
      );
      await firstValueFrom(this.api.patchBusiness(this.businessId, { bannerImageUrl: url }));
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
