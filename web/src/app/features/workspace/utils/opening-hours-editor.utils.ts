/** weekday 0 = domingo … 6 = sábado (Prisma / Date.getDay). */

export type WindowDraft = { weekday: number; startMin: number; endMin: number };

export type TimeSegment = { startMin: number; endMin: number };

const MIN_DAY = 0;
const MAX_DAY = 6;

export const WEEKDAY_SHORT: { weekday: number; short: string; long: string }[] = [
  { weekday: 1, short: 'Lun', long: 'Lunes' },
  { weekday: 2, short: 'Mar', long: 'Martes' },
  { weekday: 3, short: 'Mie', long: 'Miércoles' },
  { weekday: 4, short: 'Jue', long: 'Jueves' },
  { weekday: 5, short: 'Vie', long: 'Viernes' },
  { weekday: 6, short: 'Sab', long: 'Sábado' },
  { weekday: 0, short: 'Dom', long: 'Domingo' },
];

export function sortWindowsForSave(windows: WindowDraft[]): WindowDraft[] {
  return [...windows].sort((a, b) => a.weekday - b.weekday || a.startMin - b.startMin || a.endMin - b.endMin);
}

/** Firma estable para comparar si los horarios en borrador difieren de los guardados. */
export function openingWindowsSnapshot(windows: WindowDraft[]): string {
  return JSON.stringify(sortWindowsForSave(windows).map((w) => [w.weekday, w.startMin, w.endMin]));
}

export function validateSegment(seg: TimeSegment): string | null {
  if (seg.startMin < 0 || seg.startMin > 24 * 60 || seg.endMin < 0 || seg.endMin > 24 * 60) {
    return 'Las horas deben estar entre 00:00 y 24:00.';
  }
  if (seg.endMin <= seg.startMin) {
    return 'La hora de fin debe ser mayor que la de inicio en cada tramo.';
  }
  return null;
}

export function validateSegmentsNoOverlap(segments: TimeSegment[]): string | null {
  const sorted = [...segments].sort((a, b) => a.startMin - b.startMin);
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].startMin < sorted[i - 1].endMin) {
      return 'Hay tramos superpuestos. Ajustá los horarios para que no se solapen.';
    }
  }
  return null;
}

export function validateAllWindows(windows: WindowDraft[]): string | null {
  const byDay = new Map<number, TimeSegment[]>();
  for (const w of windows) {
    if (w.weekday < MIN_DAY || w.weekday > MAX_DAY) return 'Día de la semana inválido.';
    const err = validateSegment({ startMin: w.startMin, endMin: w.endMin });
    if (err) return err;
    const list = byDay.get(w.weekday) ?? [];
    list.push({ startMin: w.startMin, endMin: w.endMin });
    byDay.set(w.weekday, list);
  }
  for (const segs of byDay.values()) {
    const o = validateSegmentsNoOverlap(segs);
    if (o) return o;
  }
  return null;
}

export function segmentsForWeekday(windows: WindowDraft[], weekday: number): TimeSegment[] {
  return windows
    .filter((w) => w.weekday === weekday)
    .map((w) => ({ startMin: w.startMin, endMin: w.endMin }))
    .sort((a, b) => a.startMin - b.startMin);
}

export function removeWindowsForWeekdays(windows: WindowDraft[], weekdays: number[]): void {
  const set = new Set(weekdays);
  for (let i = windows.length - 1; i >= 0; i--) {
    if (set.has(windows[i].weekday)) windows.splice(i, 1);
  }
}

export function appendWindowsForWeekdays(
  windows: WindowDraft[],
  weekdays: number[],
  segments: TimeSegment[],
): void {
  const sortedDays = [...new Set(weekdays)].filter((d) => d >= MIN_DAY && d <= MAX_DAY).sort((a, b) => a - b);
  for (const day of sortedDays) {
    for (const seg of segments) {
      windows.push({ weekday: day, startMin: seg.startMin, endMin: seg.endMin });
    }
  }
}

export function previousWeekday(d: number): number {
  return (d + 6) % 7;
}

export function minutesToTime(m: number): string {
  const clamped = Math.max(0, Math.min(24 * 60, Math.round(m)));
  const h = Math.floor(clamped / 60);
  const min = clamped % 60;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((x) => Number(x));
  if (Number.isNaN(h)) return 0;
  return Math.min(24 * 60, Math.max(0, h * 60 + (Number.isNaN(m) ? 0 : m)));
}
