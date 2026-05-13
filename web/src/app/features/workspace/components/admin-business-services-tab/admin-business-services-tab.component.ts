import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import {
  AdminApiService,
  type AdminBusinessDetail,
  type AdminServiceRow,
  type AdminStaffRow,
} from '../../../../core/services/admin-api.service';
import { AppConfirmDialogService } from '../../../../core/services/app-confirm-dialog.service';
import { apiErrorMessage } from '../../../../core/utils/api-error-message';
import {
  allStaffIds,
  depositPreviewLabel,
  draftFromService,
  emptyDraft,
  listPriceLabel,
  staffIdsForSave,
  type ServiceEditorDraft,
} from './admin-business-services-tab.utils';

@Component({
  standalone: true,
  selector: 'app-admin-business-services-tab',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-business-services-tab.component.html',
  styleUrls: ['./admin-business-services-tab.component.scss', './admin-business-services-tab.editor.scss'],
})
export class AdminBusinessServicesTabComponent {
  private readonly api = inject(AdminApiService);
  private readonly confirmDialog = inject(AppConfirmDialogService);

  @Input({ required: true }) detail!: AdminBusinessDetail;
  @Output() readonly reload = new EventEmitter<void>();

  readonly saving = signal(false);
  readonly notice = signal<{ kind: 'ok' | 'err'; text: string } | null>(null);

  searchQuery = '';
  view: 'list' | 'editor' = 'list';
  editorMode: 'create' | 'edit' = 'create';
  draft: ServiceEditorDraft | null = null;

  private noticeTimer: ReturnType<typeof setTimeout> | null = null;

  readonly schedulingLabels: Record<AdminServiceRow['schedulingType'], string> = {
    regular: 'Regular (franja horaria)',
    variable_date: 'Fecha / horario variable',
    cupos: 'Por cupos / cupo limitado',
  };

  readonly schedulingKeys: AdminServiceRow['schedulingType'][] = ['regular', 'variable_date', 'cupos'];

  readonly imageSlots: (1 | 2 | 3)[] = [1, 2, 3];

  readonly serviceImageBusy = signal<number | null>(null);

  get filteredServices(): AdminServiceRow[] {
    const q = this.searchQuery.trim().toLowerCase();
    const list = this.detail.services ?? [];
    if (!q) return list;
    return list.filter((s) => s.name.toLowerCase().includes(q));
  }

  listPrice(s: AdminServiceRow): string {
    return listPriceLabel(s.price, s.priceOnRequest);
  }

  depositHint(): string | null {
    return this.draft ? depositPreviewLabel(this.draft) : null;
  }

  openList(): void {
    this.view = 'list';
    this.draft = null;
  }

  openCreate(): void {
    const d = emptyDraft();
    const ids = allStaffIds(this.detail.staff);
    d.staffIds = ids.length ? [...ids] : [];
    this.draft = d;
    this.editorMode = 'create';
    this.view = 'editor';
  }

  openEdit(s: AdminServiceRow): void {
    this.draft = draftFromService(s, this.detail.staff);
    this.editorMode = 'edit';
    this.view = 'editor';
  }

  toggleStaff(staffId: string): void {
    if (!this.draft) return;
    const set = new Set(this.draft.staffIds);
    if (set.has(staffId)) set.delete(staffId);
    else set.add(staffId);
    this.draft = { ...this.draft, staffIds: [...set] };
  }

  staffChecked(id: string): boolean {
    return !!this.draft?.staffIds.includes(id);
  }

  staffPhotoTrim(m: AdminStaffRow): string | null {
    const u = (m.photoUrl ?? '').trim();
    return u || null;
  }

  staffInitial(m: AdminStaffRow): string {
    return (m.displayName ?? '?').trim().slice(0, 1).toUpperCase();
  }

  readonly defaultServiceImg = '/images/service-placeholder.svg';

  canUploadServiceImages(): boolean {
    return this.editorMode === 'edit' && !!this.draft?.id?.trim();
  }

  private imageField(slot: 1 | 2 | 3): 'imageUrl' | 'imageUrl2' | 'imageUrl3' {
    return slot === 1 ? 'imageUrl' : slot === 2 ? 'imageUrl2' : 'imageUrl3';
  }

  serviceImagePreview(slot: 1 | 2 | 3): string | null {
    if (!this.draft) return null;
    const u = this.draft[this.imageField(slot)]?.trim();
    return u || null;
  }

  async onServiceImageFile(slot: 1 | 2 | 3, ev: Event): Promise<void> {
    const input = ev.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || !this.draft?.id || !this.canUploadServiceImages()) return;
    this.serviceImageBusy.set(slot);
    try {
      const { url } = await firstValueFrom(this.api.uploadServiceImage(this.detail.id, this.draft.id, slot, file));
      const key = this.imageField(slot);
      this.draft = { ...this.draft, [key]: url };
      this.reload.emit();
      this.flash('ok', `Imagen ${slot} actualizada.`);
    } catch (e) {
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.serviceImageBusy.set(null);
    }
  }

  async clearServiceImage(slot: 1 | 2 | 3): Promise<void> {
    if (!this.draft) return;
    const key = this.imageField(slot);
    if (!this.draft[key]?.trim()) return;
    if (this.editorMode === 'edit' && this.draft.id) {
      this.serviceImageBusy.set(slot);
      try {
        await firstValueFrom(this.api.patchService(this.draft.id, { [key]: '' }));
        this.draft = { ...this.draft, [key]: '' };
        this.reload.emit();
        this.flash('ok', `Imagen ${slot} quitada.`);
      } catch (e) {
        this.flash('err', apiErrorMessage(e));
      } finally {
        this.serviceImageBusy.set(null);
      }
    } else {
      this.draft = { ...this.draft, [key]: '' };
    }
  }

  async back(): Promise<void> {
    this.openList();
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

  private validateDraft(): string | null {
    if (!this.draft) return 'Sin datos';
    if (!this.draft.name.trim()) return 'El nombre del servicio es obligatorio.';
    if (!this.draft.modalityPresencial && !this.draft.modalityOnline && !this.draft.modalityDomicilio) {
      return 'Elegí al menos una modalidad de prestación.';
    }
    if (!this.draft.priceOnRequest && (!Number.isFinite(this.draft.price) || this.draft.price < 0)) {
      return 'El precio no es válido.';
    }
    return null;
  }

  private buildPayload(d: ServiceEditorDraft): Record<string, unknown> {
    const staffIds = staffIdsForSave(d, allStaffIds(this.detail.staff));
    return {
      name: d.name.trim(),
      description: d.description.trim() || null,
      durationMin: d.durationMin,
      price: d.priceOnRequest ? 0 : Number(d.price),
      priceOnRequest: d.priceOnRequest,
      depositPercent: d.depositPercent === null || d.depositPercent === undefined ? null : d.depositPercent,
      modalityPresencial: d.modalityPresencial,
      modalityOnline: d.modalityOnline,
      modalityDomicilio: d.modalityDomicilio,
      schedulingType: d.schedulingType,
      reminderClarifications: d.reminderClarifications.trim() || null,
      isActive: d.isActive,
      imageUrl: d.imageUrl.trim() || undefined,
      imageUrl2: d.imageUrl2.trim() || undefined,
      imageUrl3: d.imageUrl3.trim() || undefined,
      staffIds,
    };
  }

  async save(): Promise<void> {
    if (!this.draft) return;
    const err = this.validateDraft();
    if (err) {
      this.flash('err', err);
      return;
    }
    this.saving.set(true);
    try {
      const body = this.buildPayload(this.draft);
      if (this.editorMode === 'create') {
        const { isActive: _drop, ...createBody } = body;
        await firstValueFrom(this.api.createService(this.detail.id, createBody));
        this.flash('ok', 'Servicio creado.');
      } else {
        await firstValueFrom(this.api.patchService(this.draft.id, body));
        this.flash('ok', `Servicio «${this.draft.name.trim()}» guardado.`);
      }
      this.openList();
      this.reload.emit();
    } catch (e) {
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  setDepositPercent(v: unknown): void {
    if (!this.draft) return;
    if (v === '' || v === null || v === undefined) {
      this.draft = { ...this.draft, depositPercent: null };
      return;
    }
    const n = Number(v);
    this.draft = {
      ...this.draft,
      depositPercent: Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : null,
    };
  }

  async remove(): Promise<void> {
    if (!this.draft?.id || this.editorMode !== 'edit') return;
    const ok = await this.confirmDialog.confirm({
      title: 'Eliminar servicio',
      message: `¿Eliminar «${this.draft.name.trim()}»? No podés deshacer esta acción si no hay otras formas de recuperarlo.`,
      confirmLabel: 'Eliminar',
      cancelLabel: 'Cancelar',
    });
    if (!ok) return;
    this.saving.set(true);
    try {
      await firstValueFrom(this.api.deleteService(this.draft.id));
      this.flash('ok', 'Servicio eliminado.');
      this.openList();
      this.reload.emit();
    } catch (e) {
      this.flash('err', apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
