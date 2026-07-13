// Local-time date helpers. All ISO strings are YYYY-MM-DD in the user's local
// timezone (never UTC) to avoid off-by-one-day bugs around midnight.

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MONTH_FULL = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}

export function addMonths(iso: string, n: number): string {
  const d = fromISO(iso);
  d.setMonth(d.getMonth() + n);
  return toISO(d);
}

export function startOfWeek(iso: string, weekStartsOn: 0 | 1): string {
  const d = fromISO(iso);
  const diff = (d.getDay() - weekStartsOn + 7) % 7;
  d.setDate(d.getDate() - diff);
  return toISO(d);
}

/** The 7 ISO days of the week containing `iso`. */
export function weekDays(iso: string, weekStartsOn: 0 | 1): string[] {
  const start = startOfWeek(iso, weekStartsOn);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Every ISO day in the month containing `iso`. */
export function monthDays(iso: string): string[] {
  const d = fromISO(iso);
  const y = d.getFullYear();
  const m = d.getMonth();
  const count = new Date(y, m + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => toISO(new Date(y, m, i + 1)));
}

/** Weekday index (0-6) of the month's first day, relative to weekStartsOn. */
export function monthLeadingBlanks(iso: string, weekStartsOn: 0 | 1): number {
  const d = fromISO(iso);
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  return (first.getDay() - weekStartsOn + 7) % 7;
}

export function shortDow(iso: string): string {
  return DOW_SHORT[fromISO(iso).getDay()];
}

export function dayNumber(iso: string): number {
  return fromISO(iso).getDate();
}

/** "Today" / "Yesterday" / "Tomorrow" / "Mon, Jul 13". */
export function dayLabel(iso: string): string {
  const today = todayISO();
  if (iso === today) return "Today";
  if (iso === addDays(today, -1)) return "Yesterday";
  if (iso === addDays(today, 1)) return "Tomorrow";
  const d = fromISO(iso);
  return `${DOW_SHORT[d.getDay()]}, ${MONTH_SHORT[d.getMonth()]} ${d.getDate()}`;
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  return `${MONTH_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

/** "Jul 7 – 13" for a week range. */
export function weekRangeLabel(startISO: string, endISO: string): string {
  const s = fromISO(startISO);
  const e = fromISO(endISO);
  const left = `${MONTH_SHORT[s.getMonth()]} ${s.getDate()}`;
  const right = s.getMonth() === e.getMonth() ? `${e.getDate()}` : `${MONTH_SHORT[e.getMonth()]} ${e.getDate()}`;
  return `${left} – ${right}`;
}

export function dowHeaders(weekStartsOn: 0 | 1): string[] {
  const base = ["S", "M", "T", "W", "T", "F", "S"];
  return weekStartsOn === 1 ? [...base.slice(1), base[0]] : base;
}
