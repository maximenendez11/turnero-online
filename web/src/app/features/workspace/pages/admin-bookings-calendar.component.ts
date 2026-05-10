import { CommonModule } from '@angular/common';
import { Component, input, output } from '@angular/core';
import type { AdminBookingRow } from '../../../core/services/admin-api.service';
import { formatBookingTimeInZone } from './admin-bookings-calendar.utils';
import type { AdminBookingCalendarCell } from './admin-bookings-calendar.types';

@Component({
  standalone: true,
  selector: 'app-admin-bookings-calendar',
  imports: [CommonModule],
  templateUrl: './admin-bookings-calendar.component.html',
  styleUrl: './admin-bookings-calendar.component.scss',
})
export class AdminBookingsCalendarComponent {
  readonly cells = input.required<AdminBookingCalendarCell[]>();
  readonly monthLabel = input.required<string>();
  readonly timeZone = input.required<string>();
  readonly selectedBookingId = input<string | null>(null);
  readonly totalBookings = input(0);
  readonly bookingsInVisibleMonth = input(0);

  readonly prevMonth = output<void>();
  readonly nextMonth = output<void>();
  readonly goToday = output<void>();
  readonly bookingSelect = output<AdminBookingRow>();

  formatTime(iso: string): string {
    return formatBookingTimeInZone(iso, this.timeZone());
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
    const svc = row.service.name;
    return `${this.formatTime(row.startsAt)}, ${svc}, ${row.customerFullName}`;
  }
}
