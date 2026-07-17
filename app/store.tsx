"use client";

// Single source of truth for the whole app. Holds foods/entries/settings in
// React state, hydrates from (and persists to) the storage layer. Every screen
// reads and mutates data through useStore().

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, CalorieBasis, Entry, EntrySource, Food, Settings } from "@/lib/types";
import { emptyData, loadData, normalize, saveData } from "@/lib/storage";
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
  unit?: string;
}

export interface EntryInput {
  date: string;
  name: string;
  category?: string;
  basis: CalorieBasis;
  /** Rate: kcal per serving or per 100 g. */
  perUnit: number;
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

function makeFood(input: FoodInput): Food {
  return {
    id: uid(),
    name: input.name.trim(),
    category: input.category.trim() || "Other",
    basis: input.basis,
    calories: Math.max(0, Math.round(input.calories)),
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
