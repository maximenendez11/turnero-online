import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminApiService, type AdminStaffRow } from '../../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';

@Component({
  standalone: true,
  selector: 'app-admin-vitrina-staff-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-vitrina-staff-modal.component.html',
  styleUrls: [
    './admin-vitrina-staff-modal.component.scss',
    '../admin-vitrina-banner-modal/admin-vitrina-banner-modal.component.scss',
  ],
})
export class AdminVitrinaStaffModalComponent implements OnChanges {
  private readonly api = inject(AdminApiService);

  @Input({ required: true }) businessId!: string;
  @Input() open = false;
  /** Si viene definido, el modal actúa en modo edición. */
  @Input() editStaff: AdminStaffRow | null = null;
  @Output() readonly dismiss = new EventEmitter<void>();
  @Output() readonly saved = new EventEmitter<void>();

  displayName = '';
  role = '';
  tab: 'url' | 'file' = 'url';
  photoUrl = '';
  pickedFile: File | null = null;
  pickedPreview: string | null = null;
  busy = false;
  photoPreviewBroken = false;

  get isEdit(): boolean {
    return this.editStaff != null;
  }

  ngOnChanges(ch: SimpleChanges): void {
    if (!this.open) return;
    if (ch['open']?.currentValue === true || ch['editStaff']) {
      if (this.editStaff) {
        this.displayName = this.editStaff.displayName;
        this.role = (this.editStaff.role ?? '').trim();
        this.photoUrl = (this.editStaff.photoUrl ?? '').trim();
      } else {
        this.displayName = '';
        this.role = '';
        this.photoUrl = '';
      }
      this.clearPickedFile();
      this.tab = 'url';
      this.photoPreviewBroken = false;
    }
  }

  close(): void {
    if (this.busy) return;
    this.clearPickedFile();
    this.dismiss.emit();
  }

  setTab(t: 'url' | 'file'): void {
    this.tab = t;
    this.photoPreviewBroken = false;
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

  photoPreviewSrc(): string {
    if (this.pickedPreview) return this.pickedPreview;
    const u = this.photoUrl.trim();
    if (!u || this.photoPreviewBroken) return '/images/person-placeholder.svg';
    return u;
  }

  canSubmit(): boolean {
    if (!this.displayName.trim()) return false;
    if (!this.isEdit && this.tab === 'file' && !this.pickedFile) return false;
    return true;
  }

  async submit(): Promise<void> {
    if (!this.canSubmit()) return;
    const name = this.displayName.trim();
    const roleTrim = this.role.trim();
    this.busy = true;
    try {
      if (this.editStaff) {
        const body: { displayName: string; role: string | null; photoUrl?: string | null } = {
          displayName: name,
          role: roleTrim || null,
        };
        if (this.tab === 'file' && this.pickedFile) {
          const { url } = await firstValueFrom(
            this.api.uploadLandingMedia(this.businessId, this.pickedFile, 'staff'),
          );
          body.photoUrl = url;
        } else if (this.tab === 'url') {
          body.photoUrl = this.photoUrl.trim() || null;
        }
        await firstValueFrom(this.api.patchStaffMember(this.editStaff.id, body));
      } else {
        const createBody: { displayName: string; role?: string; photoUrl?: string } = {
          displayName: name,
          role: roleTrim || undefined,
        };
        if (this.tab === 'file' && this.pickedFile) {
          const { url } = await firstValueFrom(
            this.api.uploadLandingMedia(this.businessId, this.pickedFile, 'staff'),
          );
          createBody.photoUrl = url;
        } else if (this.tab === 'url' && this.photoUrl.trim()) {
          createBody.photoUrl = this.photoUrl.trim();
        }
        await firstValueFrom(this.api.createStaffMember(this.businessId, createBody));
      }
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
