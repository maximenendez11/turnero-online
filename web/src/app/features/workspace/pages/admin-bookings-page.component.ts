import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AdminApiService, type AdminBookingRow, type AdminBusinessListItem } from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';

@Component({
  standalone: true,
  selector: 'app-admin-bookings-page',
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-bookings-page.component.html',
  styleUrl: './admin-bookings-page.component.scss',
})
export class AdminBookingsPageComponent {
  private readonly api = inject(AdminApiService);

  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly bookings = signal<AdminBookingRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savingId = signal<string | null>(null);

  filterBusinessId = '';

  constructor() {
    void this.init();
  }

  private async init(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    try {
      const list = await firstValueFrom(this.api.getBusinesses().pipe(catchError(() => of([]))));
      this.businesses.set(list);
      if (list.length === 1) {
        this.filterBusinessId = list[0].id;
      }
      await this.reloadBookings();
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  async reloadBookings(): Promise<void> {
    this.error.set(null);
    try {
      const rows = await firstValueFrom(
        this.api.getBookings(this.filterBusinessId || undefined).pipe(catchError(() => of([]))),
      );
      this.bookings.set(rows);
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }

  async onFilterChange(): Promise<void> {
    await this.reloadBookings();
  }

  async saveBooking(row: AdminBookingRow): Promise<void> {
    this.savingId.set(row.id);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.patchBooking(row.id, {
          status: row.status,
          customerFullName: row.customerFullName,
          customerContact: row.customerContact,
          startsAt: row.startsAt,
        }),
      );
      this.bookings.update((list) => list.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.savingId.set(null);
    }
  }
}
