// Aggregation helpers over the flat entries list.

import type { Entry } from "./types";

export function entriesForDate(entries: Entry[], iso: string): Entry[] {
  return entries
    .filter((e) => e.date === iso)
    .sort((a, b) => a.createdAt - b.createdAt);
}

export function caloriesForDate(entries: Entry[], iso: string): number {
  return entries.reduce((sum, e) => (e.date === iso ? sum + e.calories : sum), 0);
}

/** Map of ISO day -> total calories, for fast lookup over a range. */
export function totalsByDate(entries: Entry[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const e of entries) m.set(e.date, (m.get(e.date) ?? 0) + e.calories);
  return m;
}

export interface RangeSummary {
  total: number;
  /** Days in the range that have at least one entry. */
  loggedDays: number;
  /** Average over logged days (0 if none). */
  avgPerLoggedDay: number;
  /** Days whose total exceeded the budget. */
  daysOver: number;
}

export function summarizeRange(
  entries: Entry[],
  isoDays: string[],
  budget: number,
): RangeSummary {
  const byDate = totalsByDate(entries);
  let total = 0;
  let loggedDays = 0;
  let daysOver = 0;
  for (const iso of isoDays) {
    const t = byDate.get(iso) ?? 0;
    total += t;
    if (t > 0) loggedDays += 1;
    if (budget > 0 && t > budget) daysOver += 1;
  }
  return {
    total,
    loggedDays,
    avgPerLoggedDay: loggedDays > 0 ? Math.round(total / loggedDays) : 0,
    daysOver,
  };
}
