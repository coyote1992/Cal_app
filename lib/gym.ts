// Gym helpers. Strength is logged as sets × reps at one working weight (or
// bodyweight); cardio as intensity + hours; stretching as minutes. The metrics
// that matter here are sets per movement pattern (push/pull/lower/arms & delt)
// — not aggregate tonnage — plus cardio time. Cardio and stretching are their
// own categories, so they never accrue "sets".

import type {
  CardioIntensity,
  CardioLog,
  Exercise,
  ExerciseCategory,
  ExerciseKind,
  StrengthLog,
  StretchLog,
  Workout,
  WorkoutExercise,
} from "./types";
import { startOfWeek } from "./date";
import { uid } from "./util";

/** The categories Stats and Settings goals track. */
export const CATEGORIES: ExerciseCategory[] = ["push", "pull", "lower", "arms", "cardio"];
/** Every category you can log under — the Log page's dropdowns. */
export const LOG_CATEGORIES: ExerciseCategory[] = ["push", "pull", "lower", "arms", "cardio", "stretching"];
/** The strength patterns — the ones that accrue sets. */
export const STRENGTH_CATEGORIES: ExerciseCategory[] = ["push", "pull", "lower", "arms"];
export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  push: "Push",
  pull: "Pull",
  lower: "Lower",
  arms: "Arms & Delt",
  cardio: "Cardio",
  stretching: "Stretching",
};
/** What kind of log an exercise in a category produces. */
export function kindForCategory(c: ExerciseCategory): ExerciseKind {
  return c === "cardio" ? "cardio" : c === "stretching" ? "stretch" : "strength";
}
export const INTENSITY_LABEL: Record<CardioIntensity, string> = { low: "Low", medium: "Medium", high: "High" };

/** Hours rendered compactly: 0.5 → "0.5 h", 1 → "1 h". */
export function formatHours(h: number): string {
  return `${Math.round(h * 100) / 100} h`;
}

export function isStrength(we: WorkoutExercise): we is StrengthLog {
  return we.kind === "strength";
}
export function isCardio(we: WorkoutExercise): we is CardioLog {
  return we.kind === "cardio";
}

export function isStretch(we: WorkoutExercise): we is StretchLog {
  return we.kind === "stretch";
}

/** A strength exercise "counts" once a weight is entered (or it's bodyweight);
 *  cardio once hours are; stretching once minutes are. */
export function strengthLogged(we: WorkoutExercise): we is StrengthLog {
  return isStrength(we) && (we.isBodyweight === true || (we.weight != null && we.weight > 0));
}
export function stretchLogged(we: WorkoutExercise): we is StretchLog {
  return isStretch(we) && we.sets > 0 && we.seconds > 0;
}
export function cardioLogged(we: WorkoutExercise): we is CardioLog {
  return isCardio(we) && we.hours != null && we.hours > 0;
}
export function exerciseLogged(we: WorkoutExercise): boolean {
  return strengthLogged(we) || cardioLogged(we) || stretchLogged(we);
}
export function workoutHasContent(w: Workout | undefined): boolean {
  return !!w && w.exercises.some(exerciseLogged);
}

export function workoutForDate(workouts: Workout[], iso: string): Workout | undefined {
  return workouts.find((w) => w.date === iso);
}

/** Fields the user can change on a logged exercise (only the relevant ones apply). */
export interface WorkoutExercisePatch {
  /** Pass `null` to clear. */
  weight?: number | null;
  sets?: number;
  /** Reps per set (strength). */
  reps?: number;
  isBodyweight?: boolean;
  intensity?: CardioIntensity;
  /** Cardio duration in hours; `null` clears. */
  hours?: number | null;
  /** Length of each stretch hold, in seconds. */
  seconds?: number;
}

const positive = (n: number | null | undefined): n is number => n != null && Number.isFinite(n) && n > 0;
const whole = (n: number, max: number) => Math.min(Math.max(Math.round(n), 1), max);

export function applyWorkoutPatch(e: WorkoutExercise, patch: WorkoutExercisePatch): WorkoutExercise {
  if (e.kind === "strength") {
    return {
      ...e,
      weight: patch.weight !== undefined ? (positive(patch.weight) ? patch.weight : undefined) : e.weight,
      isBodyweight: patch.isBodyweight !== undefined ? patch.isBodyweight || undefined : e.isBodyweight,
      sets: patch.sets !== undefined && Number.isFinite(patch.sets) ? whole(patch.sets, 99) : e.sets,
      reps: patch.reps !== undefined && Number.isFinite(patch.reps) ? whole(patch.reps, 999) : e.reps,
    };
  }
  if (e.kind === "stretch") {
    return {
      ...e,
      sets: patch.sets !== undefined && Number.isFinite(patch.sets) ? whole(patch.sets, 99) : e.sets,
      seconds: patch.seconds !== undefined && Number.isFinite(patch.seconds) ? whole(patch.seconds, 3600) : e.seconds,
    };
  }
  return {
    ...e,
    intensity: patch.intensity ?? e.intensity,
    hours: patch.hours !== undefined ? (positive(patch.hours) ? Math.round(patch.hours * 100) / 100 : undefined) : e.hours,
  };
}

/** A fresh log for an exercise, pre-filled from the last time it was logged
 *  (progressive-overload nicety) or sensible defaults. */
export function newWorkoutExercise(
  exercise: { id?: string; name: string; category: ExerciseCategory; kind: ExerciseKind },
  prev?: WorkoutExercise,
): WorkoutExercise {
  const base = { id: uid(), exerciseId: exercise.id, name: exercise.name };
  if (exercise.kind === "cardio") {
    const p = prev && prev.kind === "cardio" ? prev : undefined;
    return { ...base, category: "cardio", kind: "cardio", intensity: p?.intensity ?? "medium", hours: p?.hours };
  }
  if (exercise.kind === "stretch") {
    const p = prev && prev.kind === "stretch" ? prev : undefined;
    return { ...base, category: "stretching", kind: "stretch", sets: p?.sets ?? 3, seconds: p?.seconds ?? 30 };
  }
  const p = prev && prev.kind === "strength" ? prev : undefined;
  return {
    ...base,
    category: exercise.category,
    kind: "strength",
    weight: p?.weight,
    isBodyweight: p?.isBodyweight,
    sets: p?.sets ?? 3,
    reps: p?.reps ?? 8,
  };
}

/** Sets logged per category for one list of exercises (unentered lifts ignored). */
export function categorySets(exercises: WorkoutExercise[]): Record<ExerciseCategory, number> {
  const r: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, arms: 0, cardio: 0, stretching: 0 };
  for (const e of exercises) if (strengthLogged(e)) r[e.category] += e.sets;
  return r;
}

/** Total cardio hours logged in one list of exercises. */
export function cardioHours(exercises: WorkoutExercise[]): number {
  return exercises.reduce((h, e) => (cardioLogged(e) ? h + (e.hours ?? 0) : h), 0);
}

// ── library grouping ────────────────────────────────────────
export function exercisesByCategory(exercises: Exercise[]): Array<{ category: ExerciseCategory; exercises: Exercise[] }> {
  return LOG_CATEGORIES.map((category) => ({
    category,
    exercises: exercises.filter((e) => e.category === category).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

/**
 * The most recent logged entry for an exercise, newest-first across workouts —
 * powers pre-filling the weight/intensity you used last time.
 */
export function lastLogForExercise(
  workouts: Workout[],
  key: { exerciseId?: string; name: string },
  onOrBeforeISO?: string,
): WorkoutExercise | undefined {
  const sorted = workouts
    .filter((w) => !onOrBeforeISO || w.date <= onOrBeforeISO)
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const nameKey = key.name.trim().toLowerCase();
  for (const w of sorted) {
    for (let i = w.exercises.length - 1; i >= 0; i--) {
      const e = w.exercises[i];
      const match = key.exerciseId ? e.exerciseId === key.exerciseId : e.name.trim().toLowerCase() === nameKey;
      if (match && exerciseLogged(e)) return e;
    }
  }
  return undefined;
}

/** One-line summary of a logged exercise: "3 × 8 · 60 kg", "3 × 8 · BW", "0.5 h · medium", "10 min". */
export function describeLog(we: WorkoutExercise, unit: string): string {
  if (we.kind === "cardio") {
    return [we.hours != null ? formatHours(we.hours) : "", INTENSITY_LABEL[we.intensity].toLowerCase()].filter(Boolean).join(" · ");
  }
  if (we.kind === "stretch") return `${we.sets} × ${we.seconds} s`;
  const load = we.isBodyweight ? "BW" : we.weight != null ? `${we.weight} ${unit}` : "";
  return [`${we.sets} × ${we.reps}`, load].filter(Boolean).join(" · ");
}

/**
 * The exercises logged most recently, newest first and de-duplicated — the
 * Log page's "Recent" shortcut list. Built from the workouts' own snapshots so
 * it still works for an exercise since deleted from the library.
 */
export function recentExercises(workouts: Workout[], limit = 5): WorkoutExercise[] {
  const sorted = [...workouts].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  const seen = new Set<string>();
  const out: WorkoutExercise[] = [];
  for (const w of sorted) {
    for (let i = w.exercises.length - 1; i >= 0; i--) {
      const e = w.exercises[i];
      const key = e.exerciseId ?? e.name.trim().toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(e);
      if (out.length >= limit) return out;
    }
  }
  return out;
}

// ── range summary for Stats ─────────────────────────────────
export interface GymSummary {
  /** Days with at least one logged strength set (cardio-only days don't count). */
  gymDays: number;
  /** Days with at least one logged cardio bout. */
  cardioDays: number;
  categorySets: Record<ExerciseCategory, number>;
  /** Every exercise per category (ranked by sets) with its set contribution. */
  byCategory: Record<ExerciseCategory, { name: string; sets: number }[]>;
  cardio: {
    sessions: number;
    hours: number;
    byIntensity: Record<CardioIntensity, number>; // hours
    /** Hours per cardio exercise, ranked — the cardio box's equivalent of sets. */
    byExercise: { name: string; hours: number }[];
  };
}

export function gymSummary(workouts: Workout[], isoDays: string[]): GymSummary {
  const inRange = new Set(isoDays);
  const categorySets: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, arms: 0, cardio: 0, stretching: 0 };
  const perExercise: Record<ExerciseCategory, Map<string, number>> = {
    push: new Map(),
    pull: new Map(),
    lower: new Map(),
    arms: new Map(),
    cardio: new Map(),
    stretching: new Map(),
  };
  const perCardio = new Map<string, number>();
  const cardio = { sessions: 0, hours: 0, byIntensity: { low: 0, medium: 0, high: 0 } as Record<CardioIntensity, number> };
  let gymDays = 0;
  let cardioDays = 0;

  for (const w of workouts) {
    if (!inRange.has(w.date) || !workoutHasContent(w)) continue;
    if (w.exercises.some(strengthLogged)) gymDays += 1;
    if (w.exercises.some(cardioLogged)) cardioDays += 1;
    for (const e of w.exercises) {
      if (strengthLogged(e)) {
        categorySets[e.category] += e.sets;
        perExercise[e.category].set(e.name, (perExercise[e.category].get(e.name) ?? 0) + e.sets);
      } else if (cardioLogged(e)) {
        cardio.sessions += 1;
        cardio.hours += e.hours ?? 0;
        cardio.byIntensity[e.intensity] += e.hours ?? 0;
        perCardio.set(e.name, (perCardio.get(e.name) ?? 0) + (e.hours ?? 0));
      }
    }
  }

  const byCategory = {} as GymSummary["byCategory"];
  for (const c of LOG_CATEGORIES) {
    byCategory[c] = [...perExercise[c].entries()].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets);
  }
  const byExercise = [...perCardio.entries()].map(([name, hours]) => ({ name, hours })).sort((a, b) => b.hours - a.hours);

  return { gymDays, cardioDays, categorySets, byCategory, cardio: { ...cardio, byExercise } };
}

/** Sets per category across a specific set of days (e.g. only closed days). */
export function categorySetsOnDays(workouts: Workout[], days: string[]): Record<ExerciseCategory, number> {
  const inDays = new Set(days);
  const r: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, arms: 0, cardio: 0, stretching: 0 };
  for (const w of workouts) {
    if (!inDays.has(w.date)) continue;
    for (const e of w.exercises) if (strengthLogged(e)) r[e.category] += e.sets;
  }
  return r;
}

/** Cardio hours across a specific set of days. */
export function cardioHoursOnDays(workouts: Workout[], days: string[]): number {
  const inDays = new Set(days);
  let h = 0;
  for (const w of workouts) if (inDays.has(w.date)) h += cardioHours(w.exercises);
  return h;
}

/** Set of every ISO day that has logged cardio — for the calendar's cardio mark. */
export function cardioDaySet(workouts: Workout[]): Set<string> {
  const s = new Set<string>();
  for (const w of workouts) if (w.exercises.some(cardioLogged)) s.add(w.date);
  return s;
}

/** Set of every ISO day with logged strength work — for the calendar's weight mark. */
export function strengthDaySet(workouts: Workout[]): Set<string> {
  const s = new Set<string>();
  for (const w of workouts) if (w.exercises.some(strengthLogged)) s.add(w.date);
  return s;
}

/** How many distinct weeks these days fall into — the "closed weeks" denominator. */
export function distinctWeeks(days: string[], weekStartsOn: 0 | 1): number {
  return new Set(days.map((d) => startOfWeek(d, weekStartsOn))).size;
}

// ── body weight ──────────────────────────────────────────────
export interface WeightLog {
  date: string;
  weight: number;
}

function average(nums: number[]): number | null {
  return nums.length ? nums.reduce((s, v) => s + v, 0) / nums.length : null;
}

/** Body-weight logs within a set of days, oldest first. */
export function weightLogsOnDays(workouts: Workout[], days: string[]): WeightLog[] {
  const inDays = new Set(days);
  return workouts
    .filter((w) => inDays.has(w.date) && w.bodyWeight != null && w.bodyWeight > 0)
    .map((w) => ({ date: w.date, weight: w.bodyWeight as number }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** Plain average of the weigh-ins within a set of days (e.g. one week). */
export function weeklyWeightAverage(workouts: Workout[], days: string[]): number | null {
  return average(weightLogsOnDays(workouts, days).map((l) => l.weight));
}

/** Average of each week's average weight, for the weeks touching these days
 *  (e.g. a month) — not a flat average of every log, so a week with more
 *  weigh-ins doesn't outweigh a week with fewer. */
export function monthlyWeightAverage(
  workouts: Workout[],
  days: string[],
  weekStartsOn: 0 | 1,
): { avg: number | null; weekCount: number } {
  const logs = weightLogsOnDays(workouts, days);
  if (!logs.length) return { avg: null, weekCount: 0 };
  const byWeek = new Map<string, number[]>();
  for (const l of logs) {
    const wk = startOfWeek(l.date, weekStartsOn);
    if (!byWeek.has(wk)) byWeek.set(wk, []);
    byWeek.get(wk)!.push(l.weight);
  }
  const weekAverages = [...byWeek.values()].map((arr) => average(arr) as number);
  return { avg: average(weekAverages), weekCount: weekAverages.length };
}

/** Most recent logged body weight on/before a date — to prefill the next entry. */
export function lastBodyWeight(workouts: Workout[], onOrBeforeISO?: string): number | undefined {
  const sorted = workouts
    .filter((w) => w.bodyWeight != null && w.bodyWeight > 0 && (!onOrBeforeISO || w.date <= onOrBeforeISO))
    .sort((a, b) => b.date.localeCompare(a.date));
  return sorted[0]?.bodyWeight;
}

/** "82.4 kg". */
export function formatWeight(v: number, unit: string): string {
  return `${Math.round(v * 10) / 10} ${unit}`;
}

