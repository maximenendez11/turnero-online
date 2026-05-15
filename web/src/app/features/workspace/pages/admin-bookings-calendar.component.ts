import { Component, input, output } from '@angular/core';
import type { AdminBookingRow } from '../../../core/services/admin-api.service';
import { SegmentedControlComponent } from '../../../shared/ui/segmented-control/segmented-control.component';
import {
  formatAgendaBlockMonthChip,
  formatAgendaBlockRangeOnZonedDay,
  formatAgendaBlockTimegridTitle,
  formatBookingTimeRangeLocalizedInZone,
} from './admin-bookings-calendar.utils';
import type { AdminBookingCalendarCell, AdminCalendarGranularity } from './admin-bookings-calendar.types';
import type { TimeGridDayColumn, TimeGridHourSlot } from './admin-bookings-timegrid.utils';

@Component({
  standalone: true,
  selector: 'app-admin-bookings-calendar',
  imports: [SegmentedControlComponent],
  templateUrl: './admin-bookings-calendar.component.html',
  styleUrls: ['./admin-bookings-calendar.component.scss', './admin-bookings-timegrid.scss'],
})
export class AdminBookingsCalendarComponent {
  readonly granularity = input<AdminCalendarGranularity>('month');
  readonly cells = input.required<AdminBookingCalendarCell[]>();
  readonly timeGridColumns = input<TimeGridDayColumn[]>([]);
  readonly timeGridHourSlots = input<TimeGridHourSlot[]>([]);
  /** Leyenda del rango horario visible (p. ej. horario de apertura + turnos). */
  readonly timeGridRangeCaption = input('');
  readonly periodLabel = input.required<string>();
  readonly timeZone = input.required<string>();
  readonly selectedBookingId = input<string | null>(null);
  readonly totalBookings = input(0);
  readonly bookingsInVisiblePeriod = input(0);

  readonly granularityItems = [
    { id: 'month', label: 'Mes' },
    { id: 'week', label: 'Semana' },
    { id: 'day', label: 'Día' },
  ] as const;

  readonly prevPeriod = output<void>();
  readonly nextPeriod = output<void>();
  readonly goToday = output<void>();
  readonly bookingSelect = output<AdminBookingRow>();
  readonly granularityChange = output<AdminCalendarGranularity>();

  /** Inicio - fin (misma presentación que las tarjetas del mes). */
  formatEventTimeRange(row: AdminBookingRow): string {
    return formatBookingTimeRangeLocalizedInZone(row.startsAt, row.durationMin, this.timeZone());
  }

  cellAriaLabel(cell: { date: Date }): string {
    try {
      return cell.date.toLocaleDateString('es-AR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return '';
    }
  }

  onBookingClick(row: AdminBookingRow): void {
    this.bookingSelect.emit(row);
  }

  eventAriaLabel(row: AdminBookingRow): string {
    const range = this.formatEventTimeRange(row);
    return `${range}, ${row.service.name}, ${row.customerFullName}`;
  }

  formatBlockRangeOnCell(block: { startsAt: string; endsAt: string; reason: string }, cell: { date: Date }): string {
    return formatAgendaBlockRangeOnZonedDay(block, cell.date, this.timeZone());
  }

  formatBlockMonthChip(block: { startsAt: string; endsAt: string; reason: string }, cell: { date: Date }): string {
    return formatAgendaBlockMonthChip(block, cell.date, this.timeZone());
  }

  formatBlockTimegridTitle(
    block: { startsAt: string; endsAt: string; reason: string },
    dayKey: string,
  ): string {
    return formatAgendaBlockTimegridTitle(block, dayKey, this.timeZone());
  }

  onGranularityChange(id: string): void {
    if (id === 'month' || id === 'week' || id === 'day') {
      this.granularityChange.emit(id);
    }
  }

  evtLeftPct(placed: { lane: number; laneCount: number }): number {
    const n = Math.max(1, placed.laneCount);
    const gapPct = n > 1 ? 1.1 : 0;
    const usable = 100 - gapPct * (n - 1);
    const w = usable / n;
    return placed.lane * (w + gapPct);
  }

  evtWidthPct(placed: { laneCount: number }): number {
    const n = Math.max(1, placed.laneCount);
    const gapPct = n > 1 ? 1.1 : 0;
    const usable = 100 - gapPct * (n - 1);
    return usable / n;
  }
}
