/** Semana que empieza en lunes (es-AR). */

export type CalendarDayCell = { date: Date; inMonth: boolean };

export function buildCalendarWeeks(year: number, month: number): CalendarDayCell[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = new Date(year, month, 1 - startOffset);
  const weeks: CalendarDayCell[][] = [];
  const cur = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate());
  for (let w = 0; w < 6; w++) {
    const week: CalendarDayCell[] = [];
    for (let i = 0; i < 7; i++) {
      week.push({
        date: new Date(cur.getFullYear(), cur.getMonth(), cur.getDate()),
        inMonth: cur.getMonth() === month,
      });
      cur.setDate(cur.getDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

export function isSameCalendarDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export const FALLBACK_CALENDAR_TIMEZONE = 'America/Argentina/Buenos_Aires';

/** Evita `RangeError` de Intl si la API devuelve timezone vacío o inválido (rompe todo el template). */
export function safeIanaTimeZone(timeZone: string | null | undefined): string {
  const s = (timeZone ?? '').trim();
  if (!s) return FALLBACK_CALENDAR_TIMEZONE;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: s }).format(new Date());
    return s;
  } catch {
    return FALLBACK_CALENDAR_TIMEZONE;
  }
}

/** Día civil `YYYY-MM-DD` en la zona IANA indicada (alinear turnos UTC con celdas del calendario). */
export function formatDayKeyInTimeZone(d: Date, timeZone: string): string {
  const tz = safeIanaTimeZone(timeZone);
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

export function isSameZonedCalendarDay(a: Date, b: Date, timeZone: string): boolean {
  try {
    return formatDayKeyInTimeZone(a, timeZone) === formatDayKeyInTimeZone(b, timeZone);
  } catch {
    return false;
  }
}

export function formatBookingTimeInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = safeIanaTimeZone(timeZone);
  return d.toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  });
}

export function formatBookingDateMediumInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const tz = safeIanaTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat('es-AR', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: tz,
    }).format(d);
  } catch {
    return d.toLocaleString('es-AR');
  }
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
