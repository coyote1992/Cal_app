"use client";

// Single source of truth for the whole app. Holds foods/entries/settings in
// React state, hydrates from (and persists to) the storage layer. Every screen
// reads and mutates data through useStore().

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type { AppData, CalorieBasis, Entry, EntrySource, Food, Settings } from "@/lib/types";
import { emptyData, loadData, saveData } from "@/lib/storage";
import { computeCalories, uid } from "@/lib/util";

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

  useEffect(() => {
    setData(loadData());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) saveData(data);
  }, [data, hydrated]);

  const addFood = useCallback((input: FoodInput): Food => {
    const food = makeFood(input);
    setData((d) => ({ ...d, foods: [...d.foods, food] }));
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
    }));
  }, []);

  const deleteFood = useCallback((id: string) => {
    setData((d) => ({ ...d, foods: d.foods.filter((f) => f.id !== id) }));
  }, []);

  const addEntry = useCallback((input: EntryInput) => {
    const quantity = input.quantity > 0 ? input.quantity : input.basis === "per100g" ? 100 : 1;
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
    }));
  }, []);

  const deleteEntry = useCallback((id: string) => {
    setData((d) => ({ ...d, entries: d.entries.filter((e) => e.id !== id) }));
  }, []);

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    setData((d) => ({ ...d, settings: { ...d.settings, ...patch } }));
  }, []);

  const replaceAll = useCallback((next: AppData) => setData(next), []);
  const clearAll = useCallback(() => setData(emptyData()), []);
  const exportJSON = () => JSON.stringify(data, null, 2);

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
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStore must be used within <StoreProvider>");
  return ctx;
}
