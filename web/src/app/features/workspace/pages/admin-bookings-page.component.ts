import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AdminApiService, type AdminBookingRow, type AdminBusinessListItem } from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { AdminBookingsCalendarComponent } from './admin-bookings-calendar.component';
import type { AdminBookingCalendarCell } from './admin-bookings-calendar.types';
import {
  buildCalendarWeeks,
  formatBookingDateMediumInZone,
  formatDayKeyInTimeZone,
  isSameZonedCalendarDay,
  monthStart,
  safeIanaTimeZone,
} from './admin-bookings-calendar.utils';

@Component({
  standalone: true,
  selector: 'app-admin-bookings-page',
  imports: [CommonModule, FormsModule, AdminBookingsCalendarComponent],
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

  readonly viewAnchor = signal(monthStart(new Date()));
  readonly selectedBooking = signal<AdminBookingRow | null>(null);
  readonly viewMode = signal<'calendar' | 'list'>('calendar');

  readonly viewMonthLabel = computed(() =>
    this.viewAnchor().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  );

  /**
   * Zona horaria para ubicar turnos en el calendario (API guarda UTC).
   * Prioriza el negocio filtrado / único negocio del usuario.
   */
  readonly calendarTimeZone = computed(() => {
    const list = this.businesses();
    const fid = this.filterBusinessId();
    let raw: string | undefined;
    if (fid) {
      raw = list.find((b) => b.id === fid)?.timezone;
    } else if (list.length === 1) {
      raw = list[0].timezone;
    }
    return safeIanaTimeZone(raw);
  });

  /** Celdas planas (42) para el grid: evita rarezas de layout con *ngFor anidados. */
  readonly flatCells = computed(() => {
    const tz = this.calendarTimeZone();
    const anchor = this.viewAnchor();
    const weeks = buildCalendarWeeks(anchor.getFullYear(), anchor.getMonth());
    const rows = this.bookings();
    const today = new Date();
    const out: AdminBookingCalendarCell[] = [];
    for (const week of weeks) {
      for (const cell of week) {
        const d = cell.date;
        out.push({
          date: d,
          dayNum: d.getDate(),
          inMonth: cell.inMonth,
          isToday: isSameZonedCalendarDay(d, today, tz),
          bookings: rows
            .filter((r) => isSameZonedCalendarDay(new Date(r.startsAt), d, tz))
            .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
          trackKey: `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`,
        });
      }
    }
    return out;
  });

  /** Turnos del mes visible según día civil en `calendarTimeZone`. */
  readonly bookingsInVisibleMonth = computed(() => {
    const tz = this.calendarTimeZone();
    const anchor = this.viewAnchor();
    const prefix = `${anchor.getFullYear()}-${String(anchor.getMonth() + 1).padStart(2, '0')}`;
    return this.bookings().filter((r) => {
      const k = formatDayKeyInTimeZone(new Date(r.startsAt), tz);
      return k.startsWith(`${prefix}-`);
    });
  });

  readonly bookingsSorted = computed(() =>
    [...this.bookings()].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime()),
  );

  readonly filterBusinessId = signal('');

  constructor() {
    void this.init();
  }

  formatBookingDateMedium(iso: string): string {
    return formatBookingDateMediumInZone(iso, this.calendarTimeZone());
  }

  private normalizeBookingRows(res: unknown): AdminBookingRow[] {
    if (res == null) return [];
    if (!Array.isArray(res)) return [];
    return res as AdminBookingRow[];
  }

  prevMonth(): void {
    this.viewAnchor.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.selectedBooking.set(null);
  }

  nextMonth(): void {
    this.viewAnchor.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.selectedBooking.set(null);
  }

  goToday(): void {
    this.viewAnchor.set(monthStart(new Date()));
    this.selectedBooking.set(null);
  }

  selectBooking(row: AdminBookingRow): void {
    this.selectedBooking.set(row);
  }

  clearSelection(): void {
    this.selectedBooking.set(null);
  }

  setViewMode(mode: 'calendar' | 'list'): void {
    this.viewMode.set(mode);
  }

  onListRowActivate(row: AdminBookingRow, ev: Event): void {
    const t = ev.target as HTMLElement | null;
    if (t?.closest('a, button, input, select, textarea')) return;
    this.selectBooking(row);
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.selectedBooking()) {
      this.clearSelection();
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
      const bid = this.filterBusinessId();
      const raw = await firstValueFrom(this.api.getBookings(bid || undefined));
      const rows = this.normalizeBookingRows(raw);
      this.bookings.set(rows);
      const sel = this.selectedBooking();
      if (sel) {
        const still = rows.find((r) => r.id === sel.id);
        this.selectedBooking.set(still ?? null);
      }
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    }
  }

  async onFilterBusinessChange(id: string): Promise<void> {
    this.filterBusinessId.set(id);
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
      this.selectedBooking.update((cur) => (cur?.id === updated.id ? { ...cur, ...updated } : cur));
    } catch (e) {
      this.error.set(apiErrorMessage(e));
    } finally {
      this.savingId.set(null);
    }
  }
}
