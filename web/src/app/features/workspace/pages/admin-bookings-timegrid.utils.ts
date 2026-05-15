import { DateTime } from 'luxon';
import type { AdminAgendaBlockRow, AdminBookingRow } from '../../../core/services/admin-api.service';
import type { OpeningWindowLike } from '../utils/opening-hours-now.utils';
import { formatDayKeyInTimeZone, safeIanaTimeZone } from './admin-bookings-calendar.utils';

const MINUTES_PER_DAY = 24 * 60;
/** Altura mínima del bloque en % del rango visible (turnos cortos siguen siendo clicables/legibles). */
const MIN_EVENT_HEIGHT_PCT = 7.5;

const DEFAULT_WINDOW_START = 8 * 60;
const DEFAULT_WINDOW_END = 20 * 60;
const WINDOW_PAD_MIN = 30;
/** Si no hay ventanas ni turnos, al menos esta franja (minutos). */
const MIN_VISIBLE_SPAN = 6 * 60;

export type TimeGridVisibleRange = {
  startMin: number;
  endMin: number;
};

export type TimeGridHourSlot = {
  label: string;
  /** Primera fila sin borde superior (alinear con el tope de la rejilla). */
  isFirst: boolean;
};

export type PlacedTimeGridBooking = {
  row: AdminBookingRow;
  topPct: number;
  heightPct: number;
  lane: number;
  laneCount: number;
  /** Minutos del día (zona) para detectar solapes y repartir ancho solo entre quienes chocan. */
  startMin: number;
  endMin: number;
};

export type TimeGridDayColumn = {
  dayKey: string;
  headerWeekday: string;
  headerDayNum: string;
  headerMonth: string;
  isToday: boolean;
  placed: PlacedTimeGridBooking[];
  placedBlocks: PlacedTimeGridBlock[];
};

export type PlacedTimeGridBlock = {
  block: AdminAgendaBlockRow;
  topPct: number;
  heightPct: number;
};

function zonedDayStartMinutes(iso: string, timeZone: string): number {
  const tz = safeIanaTimeZone(timeZone);
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 0;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(d);
  const map = new Map(parts.filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]));
  const h = +(map.get('hour') ?? '0');
  const m = +(map.get('minute') ?? '0');
  return h * 60 + m;
}

/** Lunes de la semana ISO (Luxon) que contiene `dayKey` en `tz`. */
export function mondayKeyFromDayKey(dayKey: string, timeZone: string): string {
  const tz = safeIanaTimeZone(timeZone);
  const d = DateTime.fromISO(dayKey, { zone: tz });
  if (!d.isValid) return dayKey;
  const wd = d.weekday;
  return d.startOf('day').minus({ days: wd - 1 }).toISODate() ?? dayKey;
}

export function weekDayKeysFromMonday(mondayKey: string, timeZone: string): string[] {
  const tz = safeIanaTimeZone(timeZone);
  const start = DateTime.fromISO(mondayKey, { zone: tz });
  if (!start.isValid) return [mondayKey];
  return Array.from({ length: 7 }, (_, i) => start.plus({ days: i }).toISODate() ?? mondayKey);
}

/** 0 = domingo … 6 = sábado (igual que `Date.getDay` y ventanas admin). */
export function jsWeekdayFromDayKey(dayKey: string, timeZone: string): number {
  const tz = safeIanaTimeZone(timeZone);
  const dt = DateTime.fromISO(dayKey, { zone: tz });
  if (!dt.isValid) return 0;
  return dt.weekday === 7 ? 0 : dt.weekday;
}

/** Segmentos [startMin, endMin) del mismo día civil en `tz` para turnos en `dayKeys`. */
export function bookingDaySegmentsInKeys(
  bookings: AdminBookingRow[],
  dayKeys: string[],
  timeZone: string,
): { startMin: number; endMin: number }[] {
  const tz = safeIanaTimeZone(timeZone);
  const keySet = new Set(dayKeys);
  const out: { startMin: number; endMin: number }[] = [];
  for (const row of bookings) {
    const dk = formatDayKeyInTimeZone(new Date(row.startsAt), tz);
    if (!keySet.has(dk)) continue;
    const start = zonedDayStartMinutes(row.startsAt, tz);
    const dur = Math.max(1, row.durationMin ?? 30);
    let end = start + dur;
    if (end > MINUTES_PER_DAY) end = MINUTES_PER_DAY;
    if (start >= MINUTES_PER_DAY) continue;
    out.push({ startMin: start, endMin: end });
  }
  return out;
}

/** Segmentos de bloqueos de agenda por día civil visible (para ampliar la franja vertical). */
export function agendaBlockSegmentsInKeys(
  blocks: AdminAgendaBlockRow[],
  dayKeys: string[],
  timeZone: string,
): { startMin: number; endMin: number }[] {
  const tz = safeIanaTimeZone(timeZone);
  const out: { startMin: number; endMin: number }[] = [];
  for (const dayKey of dayKeys) {
    const day0 = DateTime.fromISO(dayKey, { zone: tz }).startOf('day');
    if (!day0.isValid) continue;
    const day1 = day0.endOf('day');
    for (const block of blocks) {
      const b0 = DateTime.fromJSDate(new Date(block.startsAt)).setZone(tz);
      const b1 = DateTime.fromJSDate(new Date(block.endsAt)).setZone(tz);
      if (!b0.isValid || !b1.isValid) continue;
      if (b0 >= day1 || b1 <= day0) continue;
      const clip0 = b0 > day0 ? b0 : day0;
      const clip1 = b1 < day1 ? b1 : day1;
      const startMin = Math.max(0, Math.round(clip0.diff(day0, 'minutes').minutes));
      const endMin = Math.min(MINUTES_PER_DAY, Math.round(clip1.diff(day0, 'minutes').minutes));
      if (endMin > startMin) out.push({ startMin, endMin });
    }
  }
  return out;
}

/**
 * Rango vertical de la rejilla: unión de horarios de apertura por cada día visible,
 * ampliado con turnos reales y padding; alineado a horas enteras.
 */
export function computeVisibleTimeRange(opts: {
  dayKeys: string[];
  openingWindows: OpeningWindowLike[] | undefined;
  bookingSegments: { startMin: number; endMin: number }[];
  blockSegments?: { startMin: number; endMin: number }[];
  timeZone: string;
}): TimeGridVisibleRange {
  const windows = opts.openingWindows ?? [];
  let minS = Infinity;
  let maxE = -Infinity;

  for (const dk of opts.dayKeys) {
    const wd = jsWeekdayFromDayKey(dk, opts.timeZone);
    const dayW = windows.filter((w) => w.weekday === wd);
    if (dayW.length === 0) {
      minS = Math.min(minS, DEFAULT_WINDOW_START);
      maxE = Math.max(maxE, DEFAULT_WINDOW_END);
    } else {
      for (const w of dayW) {
        minS = Math.min(minS, w.startMin);
        maxE = Math.max(maxE, w.endMin);
      }
    }
  }

  if (!Number.isFinite(minS) || !Number.isFinite(maxE)) {
    minS = DEFAULT_WINDOW_START;
    maxE = DEFAULT_WINDOW_END;
  }

  for (const seg of opts.bookingSegments) {
    minS = Math.min(minS, seg.startMin);
    maxE = Math.max(maxE, seg.endMin);
  }

  for (const seg of opts.blockSegments ?? []) {
    minS = Math.min(minS, seg.startMin);
    maxE = Math.max(maxE, seg.endMin);
  }

  minS = Math.max(0, minS - WINDOW_PAD_MIN);
  maxE = Math.min(MINUTES_PER_DAY, maxE + WINDOW_PAD_MIN);

  let start = Math.floor(minS / 60) * 60;
  let end = Math.ceil(maxE / 60) * 60;
  if (end <= start) {
    end = start + MIN_VISIBLE_SPAN;
  }
  if (end - start < MIN_VISIBLE_SPAN) {
    const mid = (start + end) / 2;
    start = Math.max(0, Math.floor((mid - MIN_VISIBLE_SPAN / 2) / 60) * 60);
    end = Math.min(MINUTES_PER_DAY, start + MIN_VISIBLE_SPAN);
    if (end - start < MIN_VISIBLE_SPAN) {
      start = Math.max(0, MINUTES_PER_DAY - MIN_VISIBLE_SPAN);
      end = MINUTES_PER_DAY;
    }
  }
  return { startMin: start, endMin: end };
}

export function buildHourSlots(range: TimeGridVisibleRange): TimeGridHourSlot[] {
  const slots: TimeGridHourSlot[] = [];
  for (let m = range.startMin; m < range.endMin; m += 60) {
    const h = Math.floor(m / 60);
    const label = `${h < 10 ? '0' + h : h}:00`;
    slots.push({ label, isFirst: slots.length === 0 });
  }
  return slots;
}

export function formatTimeGridRangeLabel(range: TimeGridVisibleRange): string {
  const sh = Math.floor(range.startMin / 60);
  const sm = range.startMin % 60;
  const eh = Math.floor(range.endMin / 60);
  const em = range.endMin % 60;
  const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
  return `${pad(sh)}:${pad(sm)}–${pad(eh)}:${pad(em)}`;
}

function segmentsOverlap(aStart: number, aEnd: number, bStart: number, bEnd: number): boolean {
  return aStart < bEnd && bStart < aEnd;
}

function maxConcurrentDuring(p: PlacedTimeGridBooking, all: PlacedTimeGridBooking[]): number {
  const starts = all
    .filter((q) => segmentsOverlap(p.startMin, p.endMin, q.startMin, q.endMin))
    .map((q) => q.startMin)
    .filter((t) => t >= p.startMin && t < p.endMin);
  starts.push(p.startMin);
  let maxC = 0;
  for (const t of new Set(starts)) {
    const c = all.filter((q) => q.startMin <= t && t < q.endMin).length;
    maxC = Math.max(maxC, c);
  }
  return Math.max(1, maxC);
}

export function placeBookingsInDayColumn(
  rows: AdminBookingRow[],
  dayKey: string,
  timeZone: string,
  visible: TimeGridVisibleRange,
): PlacedTimeGridBooking[] {
  const tz = safeIanaTimeZone(timeZone);
  const span = Math.max(60, visible.endMin - visible.startMin);
  const inDay = rows
    .filter((r) => formatDayKeyInTimeZone(new Date(r.startsAt), tz) === dayKey)
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const segments: { start: number; end: number; row: AdminBookingRow }[] = [];
  for (const row of inDay) {
    const start = zonedDayStartMinutes(row.startsAt, tz);
    const dur = Math.max(1, row.durationMin ?? 30);
    let end = start + dur;
    if (end > MINUTES_PER_DAY) end = MINUTES_PER_DAY;
    if (start >= MINUTES_PER_DAY) continue;
    segments.push({ start, end, row });
  }

  const laneEnds: number[] = [];
  const placed: PlacedTimeGridBooking[] = [];

  for (const seg of segments) {
    let lane = 0;
    while (lane < laneEnds.length && laneEnds[lane] > seg.start) {
      lane++;
    }
    if (lane === laneEnds.length) laneEnds.push(seg.end);
    else laneEnds[lane] = seg.end;

    const visStart = Math.max(seg.start, visible.startMin);
    const visEnd = Math.min(seg.end, visible.endMin);
    if (visEnd <= visible.startMin || visStart >= visible.endMin) {
      continue;
    }

    const rawH = ((visEnd - visStart) / span) * 100;
    const heightPct = Math.max(rawH, MIN_EVENT_HEIGHT_PCT);
    const topPct = ((visStart - visible.startMin) / span) * 100;

    placed.push({
      row: seg.row,
      topPct,
      heightPct,
      lane,
      laneCount: 1,
      startMin: seg.start,
      endMin: seg.end,
    });
  }

  for (const p of placed) {
    p.laneCount = maxConcurrentDuring(p, placed);
  }

  return placed;
}

export function placeAgendaBlocksInDayColumn(
  blocks: AdminAgendaBlockRow[],
  dayKey: string,
  timeZone: string,
  visible: TimeGridVisibleRange,
): PlacedTimeGridBlock[] {
  const tz = safeIanaTimeZone(timeZone);
  const span = Math.max(60, visible.endMin - visible.startMin);
  const placed: PlacedTimeGridBlock[] = [];
  const day0 = DateTime.fromISO(dayKey, { zone: tz }).startOf('day');
  if (!day0.isValid) return [];
  const day1 = day0.endOf('day');

  for (const block of blocks) {
    const b0 = DateTime.fromJSDate(new Date(block.startsAt)).setZone(tz);
    const b1 = DateTime.fromJSDate(new Date(block.endsAt)).setZone(tz);
    if (!b0.isValid || !b1.isValid) continue;
    if (b0 >= day1 || b1 <= day0) continue;
    const clip0 = b0 > day0 ? b0 : day0;
    const clip1 = b1 < day1 ? b1 : day1;
    const startMin = Math.max(0, Math.round(clip0.diff(day0, 'minutes').minutes));
    const endMin = Math.min(MINUTES_PER_DAY, Math.round(clip1.diff(day0, 'minutes').minutes));
    if (endMin <= startMin) continue;

    const visStart = Math.max(startMin, visible.startMin);
    const visEnd = Math.min(endMin, visible.endMin);
    if (visEnd <= visible.startMin || visStart >= visible.endMin) {
      continue;
    }

    const rawH = ((visEnd - visStart) / span) * 100;
    const heightPct = Math.max(rawH, MIN_EVENT_HEIGHT_PCT);
    const topPct = ((visStart - visible.startMin) / span) * 100;
    placed.push({ block, topPct, heightPct });
  }

  return placed.sort((a, b) => a.topPct - b.topPct);
}

export function buildTimeGridColumns(
  dayKeys: string[],
  allBookings: AdminBookingRow[],
  timeZone: string,
  visible: TimeGridVisibleRange,
  agendaBlocks: AdminAgendaBlockRow[] = [],
): TimeGridDayColumn[] {
  const tz = safeIanaTimeZone(timeZone);
  const nowKey = formatDayKeyInTimeZone(new Date(), tz);
  return dayKeys.map((dayKey) => {
    const dt = DateTime.fromISO(dayKey, { zone: tz });
    const headerWeekday = dt.isValid ? dt.setLocale('es').toFormat('EEE') : '';
    const headerDayNum = dt.isValid ? dt.toFormat('d') : '';
    const headerMonth = dt.isValid ? dt.setLocale('es').toFormat('MMM') : '';
    return {
      dayKey,
      headerWeekday,
      headerDayNum,
      headerMonth,
      isToday: dayKey === nowKey,
      placed: placeBookingsInDayColumn(allBookings, dayKey, tz, visible),
      placedBlocks: placeAgendaBlocksInDayColumn(agendaBlocks, dayKey, tz, visible),
    };
  });
}
