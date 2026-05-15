import type { AdminAgendaBlockRow, AdminBookingRow } from '../../../core/services/admin-api.service';

/** Celda del mes (42 por vista). */
export type AdminBookingCalendarCell = {
  date: Date;
  dayNum: number;
  inMonth: boolean;
  isToday: boolean;
  bookings: AdminBookingRow[];
  agendaBlocks: AdminAgendaBlockRow[];
  trackKey: string;
};

export type AdminCalendarGranularity = 'month' | 'week' | 'day';
