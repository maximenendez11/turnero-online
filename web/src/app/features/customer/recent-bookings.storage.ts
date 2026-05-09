const STORAGE_KEY = 'bookinghub-recent-bookings';
const MAX = 25;

export type RecentBookingEntry = {
  tenantSlug: string;
  code: string;
  at: string;
};

export function rememberBooking(entry: RecentBookingEntry): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const list: RecentBookingEntry[] = raw ? JSON.parse(raw) : [];
    const next = [
      entry,
      ...list.filter((b) => !(b.tenantSlug === entry.tenantSlug && b.code === entry.code)),
    ].slice(0, MAX);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readRecentBookings(): RecentBookingEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as RecentBookingEntry[];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
