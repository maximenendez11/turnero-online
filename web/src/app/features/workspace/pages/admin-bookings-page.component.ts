import { CommonModule } from '@angular/common';
import { Component, HostListener, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DateTime } from 'luxon';
import { catchError, firstValueFrom, of } from 'rxjs';
import { AdminApiService, type AdminAgendaBlockRow, type AdminBookingRow, type AdminBusinessListItem } from '../../../core/services/admin-api.service';
import { apiErrorMessage } from '../../../core/utils/api-error-message';
import { WorkspaceThemeService } from '../services/workspace-theme.service';
import { AdminPageSkeletonComponent } from '../components/admin-page-skeleton/admin-page-skeleton.component';
import { AdminBookingsCalendarComponent } from './admin-bookings-calendar.component';
import { AdminBookingCreateDialogComponent } from '../components/admin-booking-create-dialog/admin-booking-create-dialog.component';
import { AdminAgendaBlockDialogComponent } from '../components/admin-agenda-block-dialog/admin-agenda-block-dialog.component';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import type { AdminBookingCalendarCell, AdminCalendarGranularity } from './admin-bookings-calendar.types';
import type { OpeningWindowLike } from '../utils/opening-hours-now.utils';
import {
  agendaBlockTouchesZonedCalendarDay,
  buildCalendarWeeks,
  FALLBACK_CALENDAR_TIMEZONE,
  formatBookingDateCompactInZone,
  formatBookingDateMediumInZone,
  formatBookingDayGroupTitleInZone,
  formatBookingTimeInZone,
  formatBookingTimeRange24InZone,
  formatDayKeyInTimeZone,
  formatIsoToDatetimeLocalInZone,
  isSameZonedCalendarDay,
  monthStart,
  parseDatetimeLocalInZoneToIso,
  safeIanaTimeZone,
} from './admin-bookings-calendar.utils';
import {
  agendaBlockSegmentsInKeys,
  bookingDaySegmentsInKeys,
  buildHourSlots,
  buildTimeGridColumns,
  computeVisibleTimeRange,
  formatTimeGridRangeLabel,
  mondayKeyFromDayKey,
  weekDayKeysFromMonday,
} from './admin-bookings-timegrid.utils';

type AdminBookingListDayGroup = {
  trackKey: string;
  /** Día civil YYYY-MM-DD en `timeZone` (para filtrar desde hoy). */
  dayKey: string;
  timeZone: string;
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
    AdminBookingCreateDialogComponent,
    AdminAgendaBlockDialogComponent,
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
  readonly agendaBlocks = signal<AdminAgendaBlockRow[]>([]);
  private agendaBlocksLoadGen = 0;
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly savingId = signal<string | null>(null);

  readonly viewAnchor = signal(monthStart(new Date()));
  /** Día de referencia (YYYY-MM-DD en `calendarTimeZone`) para vista semana / día. */
  readonly rangeDayKey = signal<string>(
    formatDayKeyInTimeZone(new Date(), FALLBACK_CALENDAR_TIMEZONE),
  );
  readonly calendarGranularity = signal<AdminCalendarGranularity>('month');
  readonly selectedBooking = signal<AdminBookingRow | null>(null);
  readonly viewMode = signal<'calendar' | 'list'>('calendar');
  readonly manualCreateOpen = signal(false);
  readonly agendaBlockOpen = signal(false);
  readonly viewModeItems = [
    { id: 'calendar', label: 'Calendario' },
    { id: 'list', label: 'Listado' },
  ] as const;

  readonly viewMonthLabel = computed(() =>
    this.viewAnchor().toLocaleDateString('es-AR', { month: 'long', year: 'numeric' }),
  );

  readonly calendarPeriodLabel = computed(() => {
    const tz = this.calendarTimeZone();
    if (this.calendarGranularity() === 'month') {
      return this.viewMonthLabel();
    }
    const k = this.rangeDayKey();
    const dt = DateTime.fromISO(k, { zone: tz });
    if (!dt.isValid) return this.viewMonthLabel();
    if (this.calendarGranularity() === 'day') {
      const raw = dt.setLocale('es').toFormat("EEEE d 'de' MMMM yyyy");
      return raw.length ? raw.charAt(0).toLocaleUpperCase('es') + raw.slice(1) : raw;
    }
    const start = DateTime.fromISO(mondayKeyFromDayKey(k, tz), { zone: tz });
    if (!start.isValid) return this.viewMonthLabel();
    const end = start.plus({ days: 6 });
    if (start.month === end.month && start.year === end.year) {
      return `${start.day}–${end.day} de ${start.setLocale('es').toFormat('MMMM yyyy')}`;
    }
    if (start.year === end.year) {
      return `${start.setLocale('es').toFormat('d MMM')} – ${end.setLocale('es').toFormat('d MMM yyyy')}`;
    }
    return `${start.setLocale('es').toFormat('d MMM yyyy')} – ${end.setLocale('es').toFormat('d MMM yyyy')}`;
  });

  readonly timeGridDayKeys = computed((): string[] => {
    const g = this.calendarGranularity();
    if (g === 'month') return [];
    const tz = this.calendarTimeZone();
    return g === 'day'
      ? [this.rangeDayKey()]
      : weekDayKeysFromMonday(mondayKeyFromDayKey(this.rangeDayKey(), tz), tz);
  });

  /** Horarios del negocio filtrado (o único); vacío en "Todos" con varios negocios. */
  readonly openingWindowsForCalendar = computed((): OpeningWindowLike[] => {
    const list = this.businesses();
    const fid = this.filterBusinessId().trim();
    if (fid) {
      return list.find((b) => b.id === fid)?.openingWindows ?? [];
    }
    if (list.length === 1) {
      return list[0]?.openingWindows ?? [];
    }
    return [];
  });

  readonly timeGridVisibleRange = computed(() => {
    if (this.calendarGranularity() === 'month') {
      return { startMin: 8 * 60, endMin: 20 * 60 };
    }
    const keys = this.timeGridDayKeys();
    const tz = this.calendarTimeZone();
    const segs = bookingDaySegmentsInKeys(this.bookings(), keys, tz);
    const blockSegs = agendaBlockSegmentsInKeys(this.agendaBlocks(), keys, tz);
    return computeVisibleTimeRange({
      dayKeys: keys,
      openingWindows: this.openingWindowsForCalendar(),
      bookingSegments: segs,
      blockSegments: blockSegs,
      timeZone: tz,
    });
  });

  readonly timeGridHourSlots = computed(() => {
    if (this.calendarGranularity() === 'month') return [];
    return buildHourSlots(this.timeGridVisibleRange());
  });

  readonly timeGridColumns = computed(() => {
    if (this.calendarGranularity() === 'month') return [];
    const keys = this.timeGridDayKeys();
    return buildTimeGridColumns(
      keys,
      this.bookings(),
      this.calendarTimeZone(),
      this.timeGridVisibleRange(),
      this.agendaBlocks(),
    );
  });

  readonly timeGridRangeCaption = computed(() => {
    if (this.calendarGranularity() === 'month') return '';
    return `Franja horaria: ${formatTimeGridRangeLabel(this.timeGridVisibleRange())}`;
  });

  readonly bookingsInVisiblePeriodCount = computed(() => {
    const tz = this.calendarTimeZone();
    if (this.calendarGranularity() === 'month') {
      return this.bookingsInVisibleMonth().length;
    }
    if (this.calendarGranularity() === 'day') {
      const k = this.rangeDayKey();
      return this.bookings().filter((r) => formatDayKeyInTimeZone(new Date(r.startsAt), tz) === k).length;
    }
    const keySet = new Set(this.timeGridDayKeys());
    return this.bookings().filter((r) => keySet.has(formatDayKeyInTimeZone(new Date(r.startsAt), tz))).length;
  });

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
    const blocks = this.agendaBlocks();
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
          agendaBlocks: blocks
            .filter((b) => agendaBlockTouchesZonedCalendarDay(b, d, tz))
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
  readonly filterBusinessName = computed(() => {
    const id = this.filterBusinessId().trim();
    if (!id) return '';
    return this.businesses().find((b) => b.id === id)?.name ?? '';
  });
  readonly listSearchQuery = signal('');
  readonly listStatusFilter = signal<'all' | 'pending' | 'confirmed' | 'cancelled'>('all');
  /** Si es false, el listado solo muestra grupos de día desde hoy (por zona de cada negocio). */
  readonly listShowPastBookings = signal(false);

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
  readonly listDayGroupsUnfiltered = computed((): AdminBookingListDayGroup[] => {
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
        dayKey: g.dayKey,
        timeZone: tz,
        dayTitle: formatBookingDayGroupTitleInZone(first.startsAt, tz),
        isToday: formatDayKeyInTimeZone(new Date(), tz) === g.dayKey,
        rows: ordered,
      };
    });
  });

  readonly listDayGroups = computed((): AdminBookingListDayGroup[] => {
    const all = this.listDayGroupsUnfiltered();
    if (this.listShowPastBookings()) return all;
    return all.filter((g) => g.dayKey >= formatDayKeyInTimeZone(new Date(), g.timeZone));
  });

  /** Hay turnos con filtros actuales pero todos son anteriores a hoy y el switch está apagado. */
  readonly listHiddenAllPast = computed(
    () =>
      !this.listShowPastBookings() &&
      this.listFilteredRows().length > 0 &&
      this.listDayGroupsUnfiltered().length > 0 &&
      this.listDayGroups().length === 0,
  );

  readonly listEmptyAfterFilter = computed(
    () => this.bookings().length > 0 && this.listFilteredRows().length === 0,
  );

  constructor() {
    effect(() => {
      this.filterBusinessId();
      this.calendarGranularity();
      this.viewAnchor();
      this.rangeDayKey();
      queueMicrotask(() => void this.reloadAgendaBlocks());
    });
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

  /** Fecha + rango 24 h en la zona del negocio (detalle del modal). */
  formatBookingDetailSchedule(row: AdminBookingRow): string {
    const tz = this.timeZoneForBooking(row);
    const d = formatBookingDateCompactInZone(row.startsAt, tz);
    const range = formatBookingTimeRange24InZone(row.startsAt, row.durationMin, tz);
    return `${d} · ${range}`;
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

  private agendaBlocksQueryRange(): { from: string; to: string } {
    const tz = this.calendarTimeZone();
    const g = this.calendarGranularity();
    if (g === 'month') {
      const anchor = this.viewAnchor();
      const start = DateTime.fromObject(
        { year: anchor.getFullYear(), month: anchor.getMonth() + 1, day: 1 },
        { zone: tz },
      )
        .minus({ days: 7 })
        .toUTC();
      const end = DateTime.fromObject(
        { year: anchor.getFullYear(), month: anchor.getMonth() + 1, day: 1 },
        { zone: tz },
      )
        .endOf('month')
        .plus({ days: 14 })
        .toUTC();
      return { from: start.toISO()!, to: end.toISO()! };
    }
    const keys = this.timeGridDayKeys();
    const first = keys[0] ?? this.rangeDayKey();
    const last = keys[keys.length - 1] ?? this.rangeDayKey();
    const d0 = DateTime.fromISO(first, { zone: tz }).startOf('day').minus({ hours: 12 });
    const d1 = DateTime.fromISO(last, { zone: tz }).endOf('day').plus({ hours: 12 });
    return { from: d0.toUTC().toISO()!, to: d1.toUTC().toISO()! };
  }

  private async reloadAgendaBlocks(): Promise<void> {
    const gen = ++this.agendaBlocksLoadGen;
    const bid = this.filterBusinessId().trim();
    if (!bid) {
      if (gen === this.agendaBlocksLoadGen) this.agendaBlocks.set([]);
      return;
    }
    const { from, to } = this.agendaBlocksQueryRange();
    try {
      const rows = await firstValueFrom(this.api.getAgendaBlocks(bid, from, to).pipe(catchError(() => of([]))));
      if (gen !== this.agendaBlocksLoadGen) return;
      this.agendaBlocks.set(Array.isArray(rows) ? rows : []);
    } catch {
      if (gen !== this.agendaBlocksLoadGen) return;
      this.agendaBlocks.set([]);
    }
  }

  setCalendarGranularity(id: string): void {
    if (id !== 'month' && id !== 'week' && id !== 'day') return;
    const next = id as AdminCalendarGranularity;
    const prev = this.calendarGranularity();
    const tz = this.calendarTimeZone();
    if (prev === 'month' && (next === 'week' || next === 'day')) {
      const anchor = this.viewAnchor();
      const monthStartKey = formatDayKeyInTimeZone(
        new Date(anchor.getFullYear(), anchor.getMonth(), 1),
        tz,
      );
      const todayKey = formatDayKeyInTimeZone(new Date(), tz);
      const ms = DateTime.fromISO(monthStartKey, { zone: tz });
      const te = DateTime.fromISO(todayKey, { zone: tz });
      if (ms.isValid && te.isValid && te >= ms.startOf('day') && te <= ms.endOf('month')) {
        this.rangeDayKey.set(todayKey);
      } else {
        this.rangeDayKey.set(monthStartKey);
      }
    }
    if (next === 'month' && (prev === 'week' || prev === 'day')) {
      const dt = DateTime.fromISO(this.rangeDayKey(), { zone: tz });
      if (dt.isValid) {
        this.viewAnchor.set(dt.startOf('month').toJSDate());
      }
    }
    this.calendarGranularity.set(next);
    this.selectedBooking.set(null);
  }

  navigatePeriodPrev(): void {
    const g = this.calendarGranularity();
    const tz = this.calendarTimeZone();
    if (g === 'month') {
      this.prevMonth();
      return;
    }
    if (g === 'week') {
      const d = DateTime.fromISO(this.rangeDayKey(), { zone: tz }).minus({ weeks: 1 });
      const iso = d.toISODate();
      if (d.isValid && iso) this.rangeDayKey.set(iso);
    } else {
      const d = DateTime.fromISO(this.rangeDayKey(), { zone: tz }).minus({ days: 1 });
      const iso = d.toISODate();
      if (d.isValid && iso) this.rangeDayKey.set(iso);
    }
    this.selectedBooking.set(null);
  }

  navigatePeriodNext(): void {
    const g = this.calendarGranularity();
    const tz = this.calendarTimeZone();
    if (g === 'month') {
      this.nextMonth();
      return;
    }
    if (g === 'week') {
      const d = DateTime.fromISO(this.rangeDayKey(), { zone: tz }).plus({ weeks: 1 });
      const iso = d.toISODate();
      if (d.isValid && iso) this.rangeDayKey.set(iso);
    } else {
      const d = DateTime.fromISO(this.rangeDayKey(), { zone: tz }).plus({ days: 1 });
      const iso = d.toISODate();
      if (d.isValid && iso) this.rangeDayKey.set(iso);
    }
    this.selectedBooking.set(null);
  }

  private prevMonth(): void {
    this.viewAnchor.update((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
    this.selectedBooking.set(null);
  }

  private nextMonth(): void {
    this.viewAnchor.update((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
    this.selectedBooking.set(null);
  }

  goToday(): void {
    const tz = this.calendarTimeZone();
    if (this.calendarGranularity() === 'month') {
      this.viewAnchor.set(monthStart(new Date()));
    } else {
      this.rangeDayKey.set(formatDayKeyInTimeZone(new Date(), tz));
    }
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

  canRegisterManualBooking(): boolean {
    const list = this.businesses();
    if (list.length === 0) return false;
    const fid = this.filterBusinessId().trim();
    if (list.length > 1 && !fid) return false;
    return fid !== '' || list.length === 1;
  }

  canBlockAgenda(): boolean {
    return this.canRegisterManualBooking();
  }

  blockAgendaDisabledHint(): string | null {
    if (this.canBlockAgenda()) return null;
    if (this.businesses().length > 1) return 'Elegí un negocio en el filtro para bloquear la agenda.';
    return null;
  }

  manualCreateDisabledHint(): string | null {
    if (this.canRegisterManualBooking()) return null;
    if (this.businesses().length > 1) return 'Elegí un negocio en el filtro para registrar un turno.';
    return null;
  }

  openManualCreate(): void {
    if (!this.canRegisterManualBooking()) return;
    this.clearSelection();
    this.agendaBlockOpen.set(false);
    this.manualCreateOpen.set(true);
  }

  closeManualCreate(): void {
    this.manualCreateOpen.set(false);
  }

  openBlockAgenda(): void {
    if (!this.canBlockAgenda()) return;
    this.clearSelection();
    this.manualCreateOpen.set(false);
    this.agendaBlockOpen.set(true);
  }

  closeBlockAgenda(): void {
    this.agendaBlockOpen.set(false);
  }

  async onAgendaBlockCompleted(): Promise<void> {
    this.agendaBlockOpen.set(false);
    await this.reloadBookings();
    await this.reloadAgendaBlocks();
  }

  onManualBookingCreated(row: AdminBookingRow): void {
    this.bookings.update((list) => {
      const next = [...list, row];
      next.sort((a, b) => new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime());
      return next;
    });
    this.manualCreateOpen.set(false);
  }

  onListRowActivate(row: AdminBookingRow, ev: Event): void {
    const t = ev.target as HTMLElement | null;
    if (t?.closest('a, button, input, select, textarea')) return;
    this.selectBooking(row);
  }

  @HostListener('document:keydown.escape')
  onDocumentEscape(): void {
    if (this.agendaBlockOpen()) {
      this.closeBlockAgenda();
      return;
    }
    if (this.manualCreateOpen()) {
      this.closeManualCreate();
      return;
    }
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
      this.rangeDayKey.set(formatDayKeyInTimeZone(new Date(), this.calendarTimeZone()));
      await this.reloadBookings();
      this.syncWorkspaceShellThemeFromFilter();
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
    this.rangeDayKey.set(formatDayKeyInTimeZone(new Date(), this.calendarTimeZone()));
    this.syncWorkspaceShellThemeFromFilter();
  }

  /** Mismo tema que la reserva pública según el negocio filtrado (datos ya en `getBusinesses`, sin GET pesado). */
  private syncWorkspaceShellThemeFromFilter(): void {
    const id = this.filterBusinessId().trim();
    if (!id) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    const d = this.businesses().find((b) => b.id === id);
    if (!d) {
      this.workspaceTheme.resetToDefault();
      return;
    }
    const bg = (d.themeBackgroundHex ?? '').trim();
    const pr = (d.themePrimaryHex ?? '').trim();
    this.workspaceTheme.applyBusinessTheme(
      /^#[0-9A-Fa-f]{6}$/.test(bg) ? bg : null,
      /^#[0-9A-Fa-f]{6}$/.test(pr) ? pr : null,
    );
    this.workspaceTheme.setNavBusinessName(d.name);
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
