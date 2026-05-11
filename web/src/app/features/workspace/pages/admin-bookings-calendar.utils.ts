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

/** Fecha solo (sin hora), compacta, para columnas de listado. */
export function formatBookingDateCompactInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = safeIanaTimeZone(timeZone);
  try {
    return new Intl.DateTimeFormat('es-AR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: tz,
    }).format(d);
  } catch {
    return '';
  }
}

/** Título de grupo por día civil en la zona del negocio (ej. "Lunes 12 de mayo de 2026"). */
export function formatBookingDayGroupTitleInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = safeIanaTimeZone(timeZone);
  try {
    const raw = new Intl.DateTimeFormat('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: tz,
    }).format(d);
    return raw.length ? raw.charAt(0).toLocaleUpperCase('es-AR') + raw.slice(1) : raw;
  } catch {
    return '';
  }
}

export function monthStart(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

/** Valor para `<input type="datetime-local">`: fecha/hora “de reloj” en la zona IANA del negocio. */
export function formatIsoToDatetimeLocalInZone(iso: string, timeZone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const tz = safeIanaTimeZone(timeZone);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const map = new Map<string, string>();
  for (const p of parts) {
    if (p.type !== 'literal') map.set(p.type, p.value);
  }
  const year = map.get('year');
  const month = map.get('month')?.padStart(2, '0');
  const day = map.get('day')?.padStart(2, '0');
  const hour = map.get('hour')?.padStart(2, '0');
  const minute = map.get('minute')?.padStart(2, '0');
  if (!year || !month || !day || hour === undefined || minute === undefined) return '';
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Interpreta el valor de `datetime-local` como instante en la zona del negocio y devuelve ISO UTC.
 * Si no hay coincidencia (poco probable), devuelve null.
 */
export function parseDatetimeLocalInZoneToIso(localValue: string, timeZone: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(trimmed);
  if (!m) return null;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  const target = `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
  const tz = safeIanaTimeZone(timeZone);

  const dayMs = 24 * 60 * 60 * 1000;
  const start = Date.UTC(y, mo - 1, d, 0, 0, 0) - dayMs;
  const end = Date.UTC(y, mo - 1, d, 0, 0, 0) + 2 * dayMs;

  for (let t = start; t < end; t += 60 * 1000) {
    const iso = new Date(t).toISOString();
    if (formatIsoToDatetimeLocalInZone(iso, tz) === target) {
      return iso;
    }
  }
  return null;
}
