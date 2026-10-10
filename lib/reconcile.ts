// Rules for keeping two devices in step through the cloud snapshot. Pure, no
// browser APIs, so they can be reasoned about (and tested) on their own.
//
// Each device remembers `base`: the `updatedAt` of the version it last synced.
// Comparing against that — for equality, never order — tells us who changed
// anything since, without needing the two devices' clocks to agree.

import type { AppData, Workout, WorkoutExercise } from "./types";

export type SyncAction = "none" | "adopt" | "push" | "merge";

/**
 * @param base    updatedAt of the version this device last synced (null = never)
 * @param localAt updatedAt of the data on this device right now
 * @param cloudAt updatedAt of the cloud copy (null = nothing in the cloud yet)
 */
export function decideSync(base: number | null, localAt: number, cloudAt: number | null): SyncAction {
  if (cloudAt == null) return "push";
  // With no history, any difference could be either side's change: assume both.
  const localDirty = base == null ? localAt !== cloudAt : localAt !== base;
  const cloudChanged = base == null ? localAt !== cloudAt : cloudAt !== base;
  if (!localDirty && !cloudChanged) return "none";
  if (cloudChanged && !localDirty) return "adopt"; // we have nothing unsynced: take theirs
  if (localDirty && !cloudChanged) return "push"; // only we changed: send ours
  return "merge"; // both changed: keep everything
}

function unionById<T extends { id: string }>(preferred: T[], other: T[]): T[] {
  const seen = new Set(preferred.map((x) => x.id));
  return [...preferred, ...other.filter((x) => !seen.has(x.id))];
}

function mergeWorkouts(preferred: Workout[], other: Workout[]): Workout[] {
  const byDate = new Map<string, Workout>();
  for (const w of preferred) byDate.set(w.date, w);
  for (const o of other) {
    const p = byDate.get(o.date);
    if (!p) {
      byDate.set(o.date, o);
      continue;
    }
    byDate.set(o.date, {
      ...p,
      exercises: unionById<WorkoutExercise>(p.exercises, o.exercises),
      bodyWeight: p.bodyWeight ?? o.bodyWeight,
      note: p.note ?? o.note,
      createdAt: Math.min(p.createdAt, o.createdAt),
    });
  }
  return [...byDate.values()];
}

/**
 * Union of two snapshots, for the rare case where both devices changed since
 * their last sync. Records match by id (workouts by date), so nothing either
 * side added is lost. There are no per-record timestamps, so when the same
 * record differs, the newer snapshot wins; and something deleted on only one
 * side can come back — the safe direction for a log nobody wants to lose.
 */
export function mergeData(local: AppData, cloud: AppData): AppData {
  const [p, o] = local.updatedAt >= cloud.updatedAt ? [local, cloud] : [cloud, local];
  return {
    version: Math.max(local.version, cloud.version),
    foods: unionById(p.foods, o.foods),
    entries: unionById(p.entries, o.entries),
    exercises: unionById(p.exercises, o.exercises),
    workouts: mergeWorkouts(p.workouts, o.workouts),
    settings: p.settings,
    closedDays: [...new Set([...p.closedDays, ...o.closedDays])],
    // A merge is a fresh edit: it must differ from both inputs so it gets pushed.
    updatedAt: Math.max(Date.now(), local.updatedAt, cloud.updatedAt) + 1,
  };
}
