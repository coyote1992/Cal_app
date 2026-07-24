// Gym helpers. Strength is logged as a single working weight × a 2-or-3 set
// count (reps fixed at 8); cardio as intensity + minutes. The metrics that
// matter here are sets per movement pattern (push/pull/lower/other) per day —
// not aggregate tonnage — plus cardio time.

import type {
  CardioIntensity,
  CardioLog,
  Exercise,
  ExerciseCategory,
  StrengthLog,
  Workout,
  WorkoutExercise,
} from "./types";
import { startOfWeek } from "./date";

export const CATEGORIES: ExerciseCategory[] = ["push", "pull", "lower", "other"];
export const CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  push: "Push",
  pull: "Pull",
  lower: "Lower",
  other: "Other",
};
export const INTENSITY_LABEL: Record<CardioIntensity, string> = { low: "Low", medium: "Medium", high: "High" };

export function isStrength(we: WorkoutExercise): we is StrengthLog {
  return we.kind === "strength";
}
export function isCardio(we: WorkoutExercise): we is CardioLog {
  return we.kind === "cardio";
}

/** A strength exercise "counts" once a weight is entered; cardio once minutes are. */
export function strengthLogged(we: WorkoutExercise): we is StrengthLog {
  return isStrength(we) && we.weight != null && we.weight > 0;
}
export function cardioLogged(we: WorkoutExercise): we is CardioLog {
  return isCardio(we) && we.minutes != null && we.minutes > 0;
}
export function exerciseLogged(we: WorkoutExercise): boolean {
  return strengthLogged(we) || cardioLogged(we);
}
export function workoutHasContent(w: Workout | undefined): boolean {
  return !!w && w.exercises.some(exerciseLogged);
}

export function workoutForDate(workouts: Workout[], iso: string): Workout | undefined {
  return workouts.find((w) => w.date === iso);
}

/** Sets logged per category for one list of exercises (unentered lifts ignored). */
export function categorySets(exercises: WorkoutExercise[]): Record<ExerciseCategory, number> {
  const r: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, other: 0 };
  for (const e of exercises) if (strengthLogged(e)) r[e.category] += e.sets;
  return r;
}

/** Total cardio minutes logged in one list of exercises. */
export function cardioMinutes(exercises: WorkoutExercise[]): number {
  return exercises.reduce((m, e) => (cardioLogged(e) ? m + (e.minutes ?? 0) : m), 0);
}

// ── library grouping ────────────────────────────────────────
export function exercisesByCategory(exercises: Exercise[]): Array<{ category: ExerciseCategory; exercises: Exercise[] }> {
  return CATEGORIES.map((category) => ({
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

// ── range summary for Stats ─────────────────────────────────
export interface GymSummary {
  gymDays: number;
  categorySets: Record<ExerciseCategory, number>;
  /** Every exercise per category (ranked by sets) with its set contribution. */
  byCategory: Record<ExerciseCategory, { name: string; sets: number }[]>;
  cardio: {
    sessions: number;
    minutes: number;
    byIntensity: Record<CardioIntensity, number>; // minutes
  };
}

export function gymSummary(workouts: Workout[], isoDays: string[]): GymSummary {
  const inRange = new Set(isoDays);
  const categorySets: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, other: 0 };
  const perExercise: Record<ExerciseCategory, Map<string, number>> = { push: new Map(), pull: new Map(), lower: new Map(), other: new Map() };
  const cardio = { sessions: 0, minutes: 0, byIntensity: { low: 0, medium: 0, high: 0 } as Record<CardioIntensity, number> };
  let gymDays = 0;

  for (const w of workouts) {
    if (!inRange.has(w.date) || !workoutHasContent(w)) continue;
    gymDays += 1;
    for (const e of w.exercises) {
      if (strengthLogged(e)) {
        categorySets[e.category] += e.sets;
        perExercise[e.category].set(e.name, (perExercise[e.category].get(e.name) ?? 0) + e.sets);
      } else if (cardioLogged(e)) {
        cardio.sessions += 1;
        cardio.minutes += e.minutes ?? 0;
        cardio.byIntensity[e.intensity] += e.minutes ?? 0;
      }
    }
  }

  const byCategory = {} as GymSummary["byCategory"];
  for (const c of CATEGORIES) {
    byCategory[c] = [...perExercise[c].entries()].map(([name, sets]) => ({ name, sets })).sort((a, b) => b.sets - a.sets);
  }

  return { gymDays, categorySets, byCategory, cardio };
}

/** Sets per category across a specific set of days (e.g. only closed days). */
export function categorySetsOnDays(workouts: Workout[], days: string[]): Record<ExerciseCategory, number> {
  const inDays = new Set(days);
  const r: Record<ExerciseCategory, number> = { push: 0, pull: 0, lower: 0, other: 0 };
  for (const w of workouts) {
    if (!inDays.has(w.date)) continue;
    for (const e of w.exercises) if (strengthLogged(e)) r[e.category] += e.sets;
  }
  return r;
}

/** Cardio minutes across a specific set of days. */
export function cardioMinutesOnDays(workouts: Workout[], days: string[]): number {
  const inDays = new Set(days);
  let m = 0;
  for (const w of workouts) if (inDays.has(w.date)) m += cardioMinutes(w.exercises);
  return m;
}

/** How many distinct weeks these days fall into — the "closed weeks" denominator. */
export function distinctWeeks(days: string[], weekStartsOn: 0 | 1): number {
  return new Set(days.map((d) => startOfWeek(d, weekStartsOn))).size;
}

/** Set of every ISO day with a logged workout — for calendar weight icons. */
export function gymDaySet(workouts: Workout[]): Set<string> {
  const s = new Set<string>();
  for (const w of workouts) if (workoutHasContent(w)) s.add(w.date);
  return s;
}
