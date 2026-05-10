import type { AdminBookingRow } from '../../../core/services/admin-api.service';

/** Celda del mes (42 por vista). */
export type AdminBookingCalendarCell = {
  date: Date;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  bookings: AdminBookingRow[];
  trackKey: string;
};
