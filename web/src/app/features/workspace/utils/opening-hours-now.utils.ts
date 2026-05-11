import { DateTime } from 'luxon';
import { safeIanaTimeZone } from '../pages/admin-bookings-calendar.utils';

export type OpeningWindowLike = { weekday: number; startMin: number; endMin: number };

/**
 * Día de la semana en la zona del negocio: 0 = domingo … 6 = sábado (igual que admin + `Date.getDay`).
 */
export function getZonedWeekdayAndMinute(
  timeZone: string,
  at: Date = new Date(),
): { weekday: number; minuteOfDay: number } {
  const tz = safeIanaTimeZone(timeZone);
  const dt = DateTime.fromJSDate(at).setZone(tz);
  const weekday = dt.weekday === 7 ? 0 : dt.weekday;
  const minuteOfDay = dt.hour * 60 + dt.minute;
  return { weekday, minuteOfDay };
}

/** `true` si `at` cae dentro de algún tramo [startMin, endMin) del mismo día civil en `timeZone`. */
export function isOpenNowInWindows(
  windows: OpeningWindowLike[],
  timeZone: string,
  at: Date = new Date(),
): boolean {
  if (!windows?.length) return false;
  const { weekday, minuteOfDay } = getZonedWeekdayAndMinute(timeZone, at);
  return windows.some(
    (w) => w.weekday === weekday && minuteOfDay >= w.startMin && minuteOfDay < w.endMin,
  );
}
