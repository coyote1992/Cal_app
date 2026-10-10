"use client";

// Single source of truth for the whole app. Holds foods/entries/settings in
// React state, hydrates from (and persists to) the storage layer. Every screen
// reads and mutates data through useStore().

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type {
  AppData,
  CalorieBasis,
  CardioIntensity,
  Entry,
  EntrySource,
  Exercise,
  ExerciseCategory,
  ExerciseKind,
  Food,
  Settings,
  Workout,
  WorkoutExercise,
} from "@/lib/types";
import { emptyData, loadData, normalize, saveData } from "@/lib/storage";
import { lastLogForExercise } from "@/lib/gym";
import { computeCalories, isPer100, uid } from "@/lib/util";
import {
  clearSyncCode,
  generateSyncCode,
  getSyncBase,
  getSyncCode,
  pullSnapshot,
  pushSnapshot,
  setSyncBase,
  setSyncCode as persistSyncCode,
} from "@/lib/sync";
import { decideSync, mergeData } from "@/lib/reconcile";

export type SyncStatus = "idle" | "syncing" | "synced" | "error";
export interface SyncResult {
  ok: boolean;
  error?: string;
}

export interface FoodInput {
  name: string;
  category: string;
  basis: CalorieBasis;
  calories: number;
  protein?: number;
  unit?: string;
}

export interface ExerciseInput {
  name: string;
  category: ExerciseCategory;
  kind: ExerciseKind;
}

/** Fields the user can change on a logged exercise (only the relevant ones apply). */
export interface WorkoutExercisePatch {
  weight?: number;
  sets?: number;
  intensity?: CardioIntensity;
  /** Cardio duration in hours. */
  hours?: number;
}

function applyWorkoutPatch(e: WorkoutExercise, patch: WorkoutExercisePatch): WorkoutExercise {
  if (e.kind === "strength") {
    return {
      ...e,
      weight:
        patch.weight !== undefined ? (Number.isFinite(patch.weight) && patch.weight! > 0 ? patch.weight : undefined) : e.weight,
      sets: patch.sets !== undefined ? (patch.sets === 2 ? 2 : 3) : e.sets,
    };
  }
  return {
    ...e,
    intensity: patch.intensity ?? e.intensity,
    hours:
      patch.hours !== undefined
        ? Number.isFinite(patch.hours) && patch.hours! > 0
          ? Math.round(patch.hours! * 100) / 100
          : undefined
        : e.hours,
  };
}

export interface EntryInput {
  date: string;
  name: string;
  category?: string;
  basis: CalorieBasis;
  /** Rate: kcal per serving or per 100 g. */
  perUnit: number;
  /** Protein rate on the same basis (per serving or per 100 g/ml). Optional. */
  proteinPerUnit?: number;
  /** Amount: servings or grams. */
  quantity: number;
  source: EntrySource;
  foodId?: string;
  note?: string;
}

interface StoreValue {
  hydrated: boolean;
  foods: Food[];
  entries: Entry[];
  settings: Settings;
  addFood: (input: FoodInput) => Food;
  updateFood: (id: string, patch: FoodInput) => void;
  deleteFood: (id: string) => void;
  addEntry: (input: EntryInput) => void;
  deleteEntry: (id: string) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  exercises: Exercise[];
  workouts: Workout[];
  addExercise: (input: ExerciseInput) => Exercise;
  updateExercise: (id: string, patch: ExerciseInput) => void;
  deleteExercise: (id: string) => void;
  addExerciseToWorkout: (
    date: string,
    exercise: { id?: string; name: string; category: ExerciseCategory; kind: ExerciseKind },
  ) => void;
  updateWorkoutExercise: (date: string, workoutExerciseId: string, patch: WorkoutExercisePatch) => void;
  deleteWorkoutExercise: (date: string, workoutExerciseId: string) => void;
  setBodyWeight: (date: string, weight: number | undefined) => void;
  closedDays: string[];
  isDayClosed: (date: string) => boolean;
  closeDay: (date: string) => void;
  reopenDay: (date: string) => void;
  replaceAll: (data: AppData) => void;
  clearAll: () => void;
  exportJSON: () => string;
  syncCode: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  /** When this device last confirmed it matches the cloud (ms), or null. */
  lastSyncedAt: number | null;
  syncNow: () => Promise<SyncResult>;
  startNewSync: () => Promise<SyncResult>;
  linkSync: (code: string) => Promise<SyncResult>;
  unlinkSync: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

function cleanProtein(v: number | undefined): number | undefined {
  return v != null && Number.isFinite(v) && v > 0 ? Math.max(0, Math.round(v)) : undefined;
}

function makeFood(input: FoodInput): Food {
  return {
    id: uid(),
    name: input.name.trim(),
    category: input.category.trim() || "Other",
    basis: input.basis,
    calories: Math.max(0, Math.round(input.calories)),
    protein: cleanProtein(input.protein),
    unit: input.basis === "serving" ? input.unit?.trim() || undefined : undefined,
    createdAt: Date.now(),
  };
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(emptyData);
  const [hydrated, setHydrated] = useState(false);
  const [syncCode, setSyncCodeState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Always the latest data, readable from async code without stale closures.
  const dataRef = useRef<AppData>(data);
  const inFlight = useRef(false);
  const rerun = useRef(false);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Load what's on this device straight away; the cloud catches up in the
  // background (see the sync effects below) instead of holding up the UI.
  useEffect(() => {
    setData(loadData());
    setSyncCodeState(getSyncCode());
    setHydrated(true);
  }, []);

  /**
   * Bring this device and the cloud copy level. Looks at the cloud first and
   * only then decides — adopt theirs, push ours, or merge both when each side
   * changed — so a stale device can never blindly overwrite newer data.
   * Safe to call as often as we like; overlapping calls collapse into one rerun.
   */
  const reconcile = useCallback(async (code: string): Promise<SyncResult> => {
    if (inFlight.current) {
      rerun.current = true;
      return { ok: true };
    }
    inFlight.current = true;
    try {
      do {
        rerun.current = false;
        const cloud = await pullSnapshot(code);
        const local = dataRef.current; // read after the await: it may have changed
        const action = decideSync(getSyncBase(), local.updatedAt, cloud ? cloud.updatedAt : null);

        if (action === "adopt" && cloud) {
          setSyncStatus("syncing");
          const next = normalize(cloud.data);
          dataRef.current = next;
          setData(next);
          setSyncBase(cloud.updatedAt);
        } else if (action === "merge" && cloud) {
          setSyncStatus("syncing");
          const merged = mergeData(local, normalize(cloud.data));
          dataRef.current = merged;
          setData(merged);
          await pushSnapshot(code, merged, merged.updatedAt);
          setSyncBase(merged.updatedAt);
        } else if (action === "push") {
          setSyncStatus("syncing");
          await pushSnapshot(code, local, local.updatedAt);
          setSyncBase(local.updatedAt);
        } else if (cloud) {
          setSyncBase(cloud.updatedAt);
        }
      } while (rerun.current);
      setSyncStatus("synced");
      setSyncError(null);
      setLastSyncedAt(Date.now());
      return { ok: true };
    } catch (e) {
      const message = (e as Error).message;
      setSyncStatus("error");
      setSyncError(message);
      return { ok: false, error: message };
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Persist locally on every change, and — if linked — reconcile with the cloud
  // on a short debounce so rapid edits (e.g. typing a budget) don't spam requests.
  useEffect(() => {
    if (!hydrated) return;
    saveData(data);
    if (!syncCode) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      void reconcile(syncCode);
    }, 1000);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [data, hydrated, syncCode, reconcile]);

  // Pull in what the other device did: on open, whenever the app comes back to
  // the foreground (a home-screen app can sit suspended for days without ever
  // reloading), when the network returns, and once a minute while it's open.
  useEffect(() => {
    if (!hydrated || !syncCode) return;
    let last = 0;
    const kick = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - last < 1500) return; // resume fires several events at once
      last = now;
      void reconcile(syncCode);
    };
    kick();
    document.addEventListener("visibilitychange", kick);
    window.addEventListener("focus", kick);
    window.addEventListener("pageshow", kick);
    window.addEventListener("online", kick);
    const timer = window.setInterval(kick, 60_000);
    return () => {
      document.removeEventListener("visibilitychange", kick);
      window.removeEventListener("focus", kick);
      window.removeEventListener("pageshow", kick);
      window.removeEventListener("online", kick);
      window.clearInterval(timer);
    };
  }, [hydrated, syncCode, reconcile]);

  const addFood = useCallback((input: FoodInput): Food => {
    const food = makeFood(input);
    setData((d) => ({ ...d, foods: [...d.foods, food], updatedAt: Date.now() }));
    return food;
  }, []);

  const updateFood = useCallback((id: string, patch: FoodInput) => {
    setData((d) => ({
      ...d,
      foods: d.foods.map((f) =>
        f.id === id
          ? {
              ...f,
              name: patch.name.trim(),
              category: patch.category.trim() || "Other",
              basis: patch.basis,
              calories: Math.max(0, Math.round(patch.calories)),
              protein: cleanProtein(patch.protein),
              unit: patch.basis === "serving" ? patch.unit?.trim() || undefined : undefined,
            }
          : f,
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  const deleteFood = useCallback((id: string) => {
    setData((d) => ({ ...d, foods: d.foods.filter((f) => f.id !== id), updatedAt: Date.now() }));
  }, []);

  const addEntry = useCallback((input: EntryInput) => {
    const quantity = input.quantity > 0 ? input.quantity : isPer100(input.basis) ? 100 : 1;
    const protein =
      input.proteinPerUnit != null && Number.isFinite(input.proteinPerUnit)
        ? computeCalories(input.basis, input.proteinPerUnit, quantity)
        : undefined;
    setData((d) => ({
      ...d,
      entries: [
        ...d.entries,
        {
          id: uid(),
          date: input.date,
          name: input.name.trim(),
          category: input.category,
          basis: input.basis,
          perUnit: Math.round(input.perUnit),
          quantity,
          calories: computeCalories(input.basis, input.perUnit, quantity),
          protein,
          source: input.source,
          foodId: input.foodId,
          note: input.note,
          createdAt: Date.now(),
        },
      ],
      updatedAt: Date.now(),
    }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id), updatedAt: Date.now() }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch }, updatedAt: Date.now() }));
  }, []);

  const isDayClosed = useCallback((date: string) => data.closedDays.includes(date), [data.closedDays]);

  const closeDay = useCallback((date: string) => {
    setData((d) =>
      d.closedDays.includes(date)
        ? d
        : { ...d, closedDays: [...d.closedDays, date], updatedAt: Date.now() },
    );
  }, []);

  const reopenDay = useCallback((date: string) => {
    setData((d) => ({ ...d, closedDays: d.closedDays.filter((x) => x !== date), updatedAt: Date.now() }));
  }, []);

  // ── gym ──────────────────────────────────────────────────
  const addExercise = useCallback((input: ExerciseInput): Exercise => {
    // Cardio always lives in the cardio category, whatever was picked.
    const category = input.kind === "cardio" ? "cardio" : input.category;
    const ex: Exercise = { id: uid(), name: input.name.trim(), category, kind: input.kind, createdAt: Date.now() };
    setData((d) => ({ ...d, exercises: [...d.exercises, ex], updatedAt: Date.now() }));
    return ex;
  }, []);

  const updateExercise = useCallback((id: string, patch: ExerciseInput) => {
    setData((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.id === id
          ? { ...e, name: patch.name.trim(), category: patch.kind === "cardio" ? "cardio" : patch.category, kind: patch.kind }
          : e,
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  // Deleting a library exercise leaves past workouts intact (they snapshot the
  // name/category), exactly like deleting a food doesn't touch logged entries.
  const deleteExercise = useCallback((id: string) => {
    setData((d) => ({ ...d, exercises: d.exercises.filter((e) => e.id !== id), updatedAt: Date.now() }));
  }, []);

  // Add an exercise to the day, pre-filling the weight/intensity from the last
  // time it was logged (progressive-overload nicety).
  const addExerciseToWorkout = useCallback(
    (date: string, exercise: { id?: string; name: string; category: ExerciseCategory; kind: ExerciseKind }) => {
      setData((d) => {
        const prev = lastLogForExercise(d.workouts, { exerciseId: exercise.id, name: exercise.name }, date);
        let we: WorkoutExercise;
        if (exercise.kind === "cardio") {
          const p = prev && prev.kind === "cardio" ? prev : undefined;
          we = {
            id: uid(),
            exerciseId: exercise.id,
            name: exercise.name,
            // Cardio always lives in the cardio category.
            category: "cardio",
            kind: "cardio",
            intensity: p?.intensity ?? "medium",
            hours: p?.hours,
          };
        } else {
          const p = prev && prev.kind === "strength" ? prev : undefined;
          we = {
            id: uid(),
            exerciseId: exercise.id,
            name: exercise.name,
            category: exercise.category,
            kind: "strength",
            weight: p?.weight,
            sets: p?.sets ?? 3,
            reps: 8,
          };
        }
        const idx = d.workouts.findIndex((w) => w.date === date);
        const workouts =
          idx === -1
            ? [...d.workouts, { id: uid(), date, exercises: [we], createdAt: Date.now() }]
            : d.workouts.map((w, i) => (i === idx ? { ...w, exercises: [...w.exercises, we] } : w));
        return { ...d, workouts, updatedAt: Date.now() };
      });
    },
    [],
  );

  const updateWorkoutExercise = useCallback((date: string, workoutExerciseId: string, patch: WorkoutExercisePatch) => {
    setData((d) => ({
      ...d,
      workouts: d.workouts.map((w) =>
        w.date !== date
          ? w
          : {
              ...w,
              exercises: w.exercises.map((e) => (e.id === workoutExerciseId ? applyWorkoutPatch(e, patch) : e)),
            },
      ),
      updatedAt: Date.now(),
    }));
  }, []);

  // Removing the last exercise also drops the (now empty) workout — unless a
  // body weight is still logged for that day, which is a valid entry on its own.
  const deleteWorkoutExercise = useCallback((date: string, workoutExerciseId: string) => {
    setData((d) => ({
      ...d,
      workouts: d.workouts
        .map((w) => (w.date !== date ? w : { ...w, exercises: w.exercises.filter((e) => e.id !== workoutExerciseId) }))
        .filter((w) => w.exercises.length > 0 || w.bodyWeight != null),
      updatedAt: Date.now(),
    }));
  }, []);

  // Find-or-create the day's workout to hold a weigh-in; clearing it back to
  // empty drops the workout too, unless exercises are still logged that day.
  const setBodyWeight = useCallback((date: string, weight: number | undefined) => {
    const clean = weight != null && Number.isFinite(weight) && weight > 0 ? Math.round(weight * 10) / 10 : undefined;
    setData((d) => {
      const idx = d.workouts.findIndex((w) => w.date === date);
      let workouts: Workout[];
      if (idx === -1) {
        if (clean == null) return d;
        workouts = [...d.workouts, { id: uid(), date, exercises: [], bodyWeight: clean, createdAt: Date.now() }];
      } else {
        workouts = d.workouts
          .map((w, i) => (i === idx ? { ...w, bodyWeight: clean } : w))
          .filter((w) => w.exercises.length > 0 || w.bodyWeight != null);
      }
      return { ...d, workouts, updatedAt: Date.now() };
    });
  }, []);

  const replaceAll = useCallback((next: AppData) => setData({ ...next, updatedAt: Date.now() }), []);
  const clearAll = useCallback(() => setData({ ...emptyData(), updatedAt: Date.now() }), []);
  const exportJSON = () => JSON.stringify(data, null, 2);

  // Linking to a code that already has data adopts that data (it's the other
  // device's log); a brand-new code is seeded with what's on this device.
  const linkSync = useCallback(async (rawCode: string): Promise<SyncResult> => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return { ok: false, error: "Enter a code." };
    setSyncStatus("syncing");
    try {
      const cloud = await pullSnapshot(code);
      persistSyncCode(code);
      setSyncCodeState(code);
      if (cloud) {
        const next = normalize(cloud.data);
        dataRef.current = next;
        setData(next);
        setSyncBase(cloud.updatedAt);
      } else {
        const local = dataRef.current;
        await pushSnapshot(code, local, local.updatedAt);
        setSyncBase(local.updatedAt);
      }
      setSyncStatus("synced");
      setSyncError(null);
      setLastSyncedAt(Date.now());
      return { ok: true };
    } catch (e) {
      const message = (e as Error).message;
      setSyncStatus("error");
      setSyncError(message);
      return { ok: false, error: message };
    }
  }, []);

  const startNewSync = useCallback(() => linkSync(generateSyncCode()), [linkSync]);

  const syncNow = useCallback(
    async (): Promise<SyncResult> => (syncCode ? reconcile(syncCode) : { ok: false, error: "Sync is off." }),
    [syncCode, reconcile],
  );

  const unlinkSync = useCallback(() => {
    clearSyncCode();
    setSyncCodeState(null);
    setSyncStatus("idle");
    setSyncError(null);
    setLastSyncedAt(null);
  }, []);

  const value: StoreValue = {
    hydrated,
    foods: data.foods,
    entries: data.entries,
    settings: data.settings,
    addFood,
    updateFood,
    deleteFood,
    addEntry,
    deleteEntry,
    updateSettings,
    exercises: data.exercises,
    workouts: data.workouts,
    addExercise,
    updateExercise,
    deleteExercise,
    addExerciseToWorkout,
    updateWorkoutExercise,
    deleteWorkoutExercise,
    setBodyWeight,
    closedDays: data.closedDays,
    isDayClosed,
    closeDay,
    reopenDay,
    replaceAll,
    clearAll,
    exportJSON,
    syncCode,
    syncStatus,
    syncError,
    lastSyncedAt,
    syncNow,
    startNewSync,
    linkSync,
    unlinkSync,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
