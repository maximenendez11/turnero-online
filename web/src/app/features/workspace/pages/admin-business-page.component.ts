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

@Component({
  standalone: true,
  selector: 'app-admin-business-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-business-page.component.html',
  styleUrl: './admin-business-page.component.scss',
})
export class AdminBusinessPageComponent {
  private readonly api = inject(AdminApiService);

  readonly weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  selectedBusinessId = '';
  detail: AdminBusinessDetail | null = null;

  /** Copia editable de ventanas para PUT */
  windowsDraft: { weekday: number; startMin: number; endMin: number; sortOrder: number }[] = [];

  newService = { name: '', description: '', durationMin: 45, price: 0 };

  constructor() {
    void this.init();
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
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  async onBusinessChange(): Promise<void> {
    await this.loadDetail();
  }

  async loadDetail(): Promise<void> {
    if (!this.selectedBusinessId) {
      this.detail = null;
      this.windowsDraft = [];
      return;
    }
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.getBusiness(this.selectedBusinessId));
      this.detail = {
        ...d,
        description: d.description ?? '',
        slug: d.slug ?? '',
        services: d.services.map((s) => ({ ...s, description: s.description ?? '' })),
      };
      this.windowsDraft = d.openingWindows.map((w) => ({
        weekday: w.weekday,
        startMin: w.startMin,
        endMin: w.endMin,
        sortOrder: w.sortOrder,
      }));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
      this.detail = null;
    }
  }

  addWindowRow(): void {
    this.windowsDraft.push({ weekday: 1, startMin: 9 * 60, endMin: 18 * 60, sortOrder: 0 });
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
          slug: this.detail.slug,
          description: this.detail.description,
          address: this.detail.address,
          timezone: this.detail.timezone,
          bookingIntervalMin: this.detail.bookingIntervalMin,
          status: this.detail.status,
        }),
      );
      this.detail = d;
      this.windowsDraft = d.openingWindows.map((w) => ({
        weekday: w.weekday,
        startMin: w.startMin,
        endMin: w.endMin,
        sortOrder: w.sortOrder,
      }));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }

  async saveWindows(): Promise<void> {
    if (!this.detail) return;
    this.saving.set(true);
    this.error.set(null);
    try {
      const d = await firstValueFrom(this.api.replaceOpeningWindows(this.detail.id, this.windowsDraft));
      this.detail = d;
      this.windowsDraft = d.openingWindows.map((w) => ({
        weekday: w.weekday,
        startMin: w.startMin,
        endMin: w.endMin,
        sortOrder: w.sortOrder,
      }));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
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
    } catch (e) {
      this.error.set(apiErrorMessage(e));
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
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.saving.set(false);
    }
  }
}
