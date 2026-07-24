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
  getSyncCode,
  pullSnapshot,
  pushSnapshot,
  setSyncCode as persistSyncCode,
} from "@/lib/sync";

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
  minutes?: number;
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
    minutes:
      patch.minutes !== undefined
        ? Number.isFinite(patch.minutes) && patch.minutes! > 0
          ? Math.round(patch.minutes!)
          : undefined
        : e.minutes,
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
  const skipNextPush = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial hydrate: load local data, then if this device is linked, pull the
  // cloud snapshot and keep whichever copy was modified most recently.
  useEffect(() => {
    const local = loadData();
    const code = getSyncCode();
    setSyncCodeState(code);

    if (!code) {
      setData(local);
      setHydrated(true);
      return;
    }

    setSyncStatus("syncing");
    pullSnapshot(code)
      .then((cloud) => {
        if (cloud && cloud.updatedAt >= local.updatedAt) {
          skipNextPush.current = true;
          setData(normalize(cloud.data));
        } else {
          setData(local);
        }
        setSyncStatus("synced");
      })
      .catch((e) => {
        setData(local);
        setSyncStatus("error");
        setSyncError((e as Error).message);
      })
      .finally(() => setHydrated(true));
  }, []);

  // Persist locally on every change, and — if linked — push to the cloud on a
  // short debounce so rapid edits (e.g. typing a budget) don't spam requests.
  useEffect(() => {
    if (!hydrated) return;
    saveData(data);
    if (!syncCode) return;
    if (skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      setSyncStatus("syncing");
      pushSnapshot(syncCode, data, data.updatedAt)
        .then(() => setSyncStatus("synced"))
        .catch((e) => {
          setSyncStatus("error");
          setSyncError((e as Error).message);
        });
    }, 1000);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [data, hydrated, syncCode]);

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
    const ex: Exercise = { id: uid(), name: input.name.trim(), category: input.category, kind: input.kind, createdAt: Date.now() };
    setData((d) => ({ ...d, exercises: [...d.exercises, ex], updatedAt: Date.now() }));
    return ex;
  }, []);

  const updateExercise = useCallback((id: string, patch: ExerciseInput) => {
    setData((d) => ({
      ...d,
      exercises: d.exercises.map((e) =>
        e.id === id ? { ...e, name: patch.name.trim(), category: patch.category, kind: patch.kind } : e,
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
            category: exercise.category,
            kind: "cardio",
            intensity: p?.intensity ?? "medium",
            minutes: p?.minutes,
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

  // Removing the last exercise also drops the (now empty) workout, so an empty
  // session never lingers as a phantom gym day.
  const deleteWorkoutExercise = useCallback((date: string, workoutExerciseId: string) => {
    setData((d) => ({
      ...d,
      workouts: d.workouts
        .map((w) => (w.date !== date ? w : { ...w, exercises: w.exercises.filter((e) => e.id !== workoutExerciseId) }))
        .filter((w) => w.exercises.length > 0),
      updatedAt: Date.now(),
    }));
  }, []);

  const replaceAll = useCallback((next: AppData) => setData({ ...next, updatedAt: Date.now() }), []);
  const clearAll = useCallback(() => setData({ ...emptyData(), updatedAt: Date.now() }), []);
  const exportJSON = () => JSON.stringify(data, null, 2);

  // Pull first (in case the code already has cloud data), then push whatever
  // isn't overwritten by that pull — so linking never silently drops local work.
  const linkSync = useCallback(
    async (rawCode: string): Promise<SyncResult> => {
      const code = rawCode.trim().toUpperCase();
      if (!code) return { ok: false, error: "Enter a code." };
      setSyncStatus("syncing");
      try {
        const cloud = await pullSnapshot(code);
        persistSyncCode(code);
        setSyncCodeState(code);
        if (cloud) {
          skipNextPush.current = true;
          setData(normalize(cloud.data));
        } else {
          await pushSnapshot(code, data, data.updatedAt);
        }
        setSyncStatus("synced");
        setSyncError(null);
        return { ok: true };
      } catch (e) {
        const message = (e as Error).message;
        setSyncStatus("error");
        setSyncError(message);
        return { ok: false, error: message };
      }
    },
    [data],
  );

  const startNewSync = useCallback(() => linkSync(generateSyncCode()), [linkSync]);

  const unlinkSync = useCallback(() => {
    clearSyncCode();
    setSyncCodeState(null);
    setSyncStatus("idle");
    setSyncError(null);
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
