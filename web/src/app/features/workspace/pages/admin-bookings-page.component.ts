import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AdminApiService, type AdminBookingRow, type AdminBusinessListItem } from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { AdminBookingsCalendarComponent } from './admin-bookings-calendar.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import type { AdminBookingCalendarCell } from './admin-bookings-calendar.types';
import {
  buildCalendarWeeks,
  formatBookingDateCompactInZone,
  formatBookingDateMediumInZone,
  formatBookingDayGroupTitleInZone,
  formatBookingTimeInZone,
  formatDayKeyInTimeZone,
  formatIsoToDatetimeLocalInZone,
  isSameZonedCalendarDay,
  monthStart,
  parseDatetimeLocalInZoneToIso,
  safeIanaTimeZone,
} from './admin-bookings-calendar.utils';

type AdminBookingListDayGroup = {
  trackKey: string;
  dayTitle: string;
  isToday: boolean;
  rows: AdminBookingRow[];
};

@Component({
  standalone: true,
  selector: 'app-admin-bookings-page',
  imports: [
    CommonModule,
    FormsModule,
    AdminBookingsCalendarComponent,
    AdminPageSkeletonComponent,
    SegmentedControlComponent,
  ],
  templateUrl: './admin-bookings-page.component.html',
  styleUrl: './admin-bookings-page.component.scss',
})
export class AdminBookingsPageComponent {
  private readonly api = inject(AdminApiService);
  private readonly workspaceTheme = inject(WorkspaceThemeService);

  readonly businesses = signal<AdminBusinessListItem[]>([]);
  readonly bookings = signal<AdminBookingRow[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savingId = signal<string | null>(null);

  readonly viewAnchor = signal(monthStart(new Date()));
  readonly selectedBooking = signal<AdminBookingRow | null>(null);
  readonly viewMode = signal<'calendar' | 'list'>('calendar');
  readonly viewModeItems = [
    { id: 'calendar', label: 'Calendario' },
    { id: 'list', label: 'Listado' },
  ] as const;

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

  readonly filterBusinessId = signal('');
  readonly listSearchQuery = signal('');
  readonly listStatusFilter = signal<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');

  /** Turnos del listado tras búsqueda y filtro de estado (orden cronológico). */
  readonly listFilteredRows = computed(() => {
    const q = this.listSearchQuery().trim().toLowerCase();
    const st = this.listStatusFilter();
    let rows = [...this.bookings()].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
    if (st !== 'all') {
      rows = rows.filter((r) => r.status === st);
    }
    if (q) {
      rows = rows.filter((r) => this.rowMatchesListSearch(r, q));
    }
    return rows;
  });

  /** Agrupa por día civil según la zona de cada negocio (listado tipo timeline). */
  readonly listDayGroups = computed((): AdminBookingListDayGroup[] => {
    const rows = this.listFilteredRows();
    const buckets = new Map<string, { tz: string; dayKey: string; rows: AdminBookingRow[] }>();
    for (const r of rows) {
      const tz = this.timeZoneForBooking(r);
      const dayKey = formatDayKeyInTimeZone(new Date(r.startsAt), tz);
      const key = `${tz}|${dayKey}`;
      let g = buckets.get(key);
      if (!g) {
        g = { tz, dayKey, rows: [] };
        buckets.set(key, g);
      }
      g.rows.push(r);
    }
    const sorted = [...buckets.values()].sort(
      (a, b) => new Date(a.rows[0].startsAt).getTime() - new Date(b.rows[0].startsAt).getTime(),
    );
    return sorted.map((g) => {
      const ordered = [...g.rows].sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());
      const first = ordered[0];
      const tz = g.tz;
      return {
        trackKey: `${tz}|${g.dayKey}`,
        dayTitle: formatBookingDayGroupTitleInZone(first.startsAt, tz),
        isToday: formatDayKeyInTimeZone(new Date(), tz) === g.dayKey,
        rows: ordered,
      };
    });
  });

  readonly listEmptyAfterFilter = computed(
    () => this.bookings().length > 0 && this.listFilteredRows().length === 0,
  );

  constructor() {
    void this.init();
  }

  formatBookingDateMedium(iso: string): string {
    return formatBookingDateMediumInZone(iso, this.calendarTimeZone());
  }

  formatListRowDate(row: AdminBookingRow): string {
    return formatBookingDateCompactInZone(row.startsAt, this.timeZoneForBooking(row));
  }

  formatListRowTime(row: AdminBookingRow): string {
    return formatBookingTimeInZone(row.startsAt, this.timeZoneForBooking(row));
  }

  private rowMatchesListSearch(r: AdminBookingRow, q: string): boolean {
    const blob = [
      r.customerFullName,
      r.customerContact ?? '',
      r.service.name,
      r.code,
      r.business.name,
      this.bookingStatusLabel(r.status),
    ]
      .join('\n')
      .toLowerCase();
    return blob.includes(q);
  }

  /** Etiqueta en español para la UI (la API usa enums en inglés). */
  bookingStatusLabel(status: string): string {
    switch (status) {
      case 'pending':
        return 'Pendiente';
      case 'confirmed':
        return 'Confirmado';
      case 'cancelled':
        return 'Cancelado';
      default:
        return status;
    }
  }

  /** Zona del negocio del turno (alinear edición con la misma región que la API). */
  timeZoneForBooking(row: AdminBookingRow): string {
    const raw = this.businesses().find((b) => b.id === row.business.id)?.timezone;
    return safeIanaTimeZone(raw);
  }

  /** Valor para `datetime-local`: reloj local del negocio, no ISO en crudo. */
  startsAtInputValue(row: AdminBookingRow): string {
    return formatIsoToDatetimeLocalInZone(row.startsAt, this.timeZoneForBooking(row));
  }

  onStartsAtInputChange(row: AdminBookingRow, value: string): void {
    if (!value.trim()) return;
    const iso = parseDatetimeLocalInZoneToIso(value, this.timeZoneForBooking(row));
    if (iso) row.startsAt = iso;
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

  setViewMode(mode: string): void {
    if (mode === 'calendar' || mode === 'list') {
      this.viewMode.set(mode);
    }
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
      await this.syncWorkspaceShellThemeFromFilter();
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
    await this.syncWorkspaceShellThemeFromFilter();
  }

  /** Mismo tema que la reserva pública según el negocio filtrado. */
  private async syncWorkspaceShellThemeFromFilter(): Promise<void> {
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

  async saveBooking(row: AdminBookingRow): Promise<void> {
    this.savingId.set(row.id);
    this.error.set(null);
    try {
      const updated = await firstValueFrom(
        this.api.patchBooking(row.id, {
          status: row.status,
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
