import { DateTime } from 'luxon';

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Parse estricto `YYYY-MM-DD` (fecha civil del selector, sin ambigüedad UTC). */
export function parseIsoDateOnly(input: string): { y: number; m: number; d: number } | null {
  const m = ISO_DATE_ONLY.exec(input.trim());
  if (!m) return null;
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  const probe = DateTime.utc(y, mo, d, 12, 0, 0);
  if (!probe.isValid || probe.year !== y || probe.month !== mo || probe.day !== d) return null;
  return { y, m: mo, d };
}

function zoneOrUtc(zone: string | null | undefined): string {
  const z = zone?.trim();
  return z && z.length > 0 ? z : 'UTC';
}

/**
 * Día de semana JS 0–6 (domingo–sábado), igual que `Date.getDay()` y las ventanas en BD.
 * Se calcula en la zona del negocio para que coincida con el calendario del usuario.
 */
export function jsWeekdayInBusinessZone(y: number, mo: number, d: number, businessTimeZone: string | null | undefined): number {
  const z = zoneOrUtc(businessTimeZone);
  let dt = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: z });
  if (!dt.isValid) {
    dt = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: 'UTC' });
  }
  return dt.weekday % 7;
}

/** Inicio y fin del día civil `y-m-d` en la zona del negocio (intervalos UTC para Prisma). */
export function zonedBusinessDayRange(
  y: number,
  mo: number,
  d: number,
  businessTimeZone: string | null | undefined,
): { start: Date; end: Date } {
  const z = zoneOrUtc(businessTimeZone);
  let day = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: z });
  if (!day.isValid) {
    day = DateTime.fromObject({ year: y, month: mo, day: d }, { zone: 'UTC' });
  }
  return {
    start: day.startOf('day').toJSDate(),
    end: day.endOf('day').toJSDate(),
  };
}

/** Instante UTC del minuto `cursorMin` desde medianoche en ese día civil y zona del negocio. */
export function utcInstantForZonedMinutes(
  y: number,
  mo: number,
  d: number,
  minutesFromMidnight: number,
  businessTimeZone: string | null | undefined,
): Date {
  const z = zoneOrUtc(businessTimeZone);
  const h = Math.floor(minutesFromMidnight / 60);
  const min = minutesFromMidnight % 60;
  let dt = DateTime.fromObject(
    { year: y, month: mo, day: d, hour: h, minute: min, second: 0, millisecond: 0 },
    { zone: z },
  );
  if (!dt.isValid) {
    dt = DateTime.fromObject(
      { year: y, month: mo, day: d, hour: h, minute: min, second: 0, millisecond: 0 },
      { zone: 'UTC' },
    );
  }
  return dt.toJSDate();
}
