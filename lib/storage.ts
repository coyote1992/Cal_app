// Persistence layer. Isolated behind a tiny API (load/save/parse) so a cloud
// backend (e.g. Vercel KV) can replace localStorage later without touching the
// UI or the store. Also handles migration of older saved data.

import type { AppData, CalorieBasis, Entry, Food, Settings } from "./types";
import { computeCalories, uid } from "./util";

const STORAGE_KEY = "calorie-tracker:v1";
export const DATA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = { dailyBudget: 2000, weekStartsOn: 1 };

// Categories for known starter items, so foods saved before categories existed
// upgrade to sensible groups instead of all landing in "Other".
const SEED_CATEGORIES: Record<string, string> = {
  Apple: "Fruits",
  Banana: "Fruits",
  "Coffee with milk": "Drinks",
  "Slice of bread": "Snacks",
  Egg: "Other",
  "Greek yogurt": "Other",
  "Chicken breast, cooked": "Ready foods",
  "White rice, cooked": "Ready foods",
};

export function emptyData(): AppData {
  return { version: DATA_VERSION, foods: [], entries: [], settings: { ...DEFAULT_SETTINGS } };
}

/** Common items seeded on the very first run (all editable/deletable). */
export function seededData(): AppData {
  const now = Date.now();
  const seeds: Array<{ name: string; category: string; basis: CalorieBasis; calories: number; unit?: string }> = [
    { name: "Apple", category: "Fruits", basis: "serving", calories: 95, unit: "medium" },
    { name: "Banana", category: "Fruits", basis: "serving", calories: 105, unit: "medium" },
    { name: "Coffee with milk", category: "Drinks", basis: "serving", calories: 40, unit: "cup" },
    { name: "Slice of bread", category: "Snacks", basis: "serving", calories: 80, unit: "slice" },
    { name: "Egg", category: "Other", basis: "serving", calories: 78, unit: "large" },
    { name: "Chicken breast, cooked", category: "Ready foods", basis: "per100g", calories: 165 },
    { name: "White rice, cooked", category: "Ready foods", basis: "per100g", calories: 130 },
  ];
  return {
    version: DATA_VERSION,
    foods: seeds.map((s, i) => ({ id: uid(), createdAt: now + i, ...s })),
    entries: [],
    settings: { ...DEFAULT_SETTINGS },
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFood(f: any): Food {
  const basis: CalorieBasis = f.basis === "per100g" ? "per100g" : "serving";
  const name = String(f.name ?? "Food");
  const category =
    typeof f.category === "string" && f.category.trim() ? f.category : SEED_CATEGORIES[name] ?? "Other";
  return {
    id: (f.id as string) ?? uid(),
    name,
    category,
    basis,
    calories: Number(f.calories) || 0,
    unit: (f.unit as string) || undefined,
    createdAt: (f.createdAt as number) ?? Date.now(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(e: any): Entry {
  const basis: CalorieBasis = e.basis === "per100g" ? "per100g" : "serving";
  const perUnit = Number(e.perUnit) || 0;
  const quantity = Number(e.quantity) || 0;
  const calories = Number.isFinite(Number(e.calories)) ? Number(e.calories) : computeCalories(basis, perUnit, quantity);
  return {
    id: (e.id as string) ?? uid(),
    date: String(e.date ?? ""),
    name: String(e.name ?? "Food"),
    category: (e.category as string) || undefined,
    basis,
    perUnit,
    quantity,
    calories,
    foodId: (e.foodId as string) || undefined,
    source: (e.source as Entry["source"]) ?? "manual",
    note: (e.note as string) || undefined,
    createdAt: (e.createdAt as number) ?? Date.now(),
  };
}

function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<AppData>;
  return {
    version: DATA_VERSION,
    foods: Array.isArray(d.foods) ? d.foods.map((f) => normalizeFood(f)) : base.foods,
    entries: Array.isArray(d.entries) ? d.entries.map((e) => normalizeEntry(e)) : base.entries,
    settings: { ...base.settings, ...(d.settings ?? {}) },
  };
}

export function loadData(): AppData {
  if (typeof window === "undefined") return emptyData();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return seededData();
    return normalize(JSON.parse(raw));
  } catch {
    return seededData();
  }
}

export function saveData(data: AppData): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore quota / privacy-mode errors — nothing actionable at runtime.
  }
}

/** Validate + normalize an imported backup file. Returns null if unusable. */
export function parseImport(text: string): AppData | null {
  try {
    const parsed = JSON.parse(text);
    if (!parsed || typeof parsed !== "object") return null;
    if (!Array.isArray(parsed.foods) && !Array.isArray(parsed.entries)) return null;
    return normalize(parsed);
  } catch {
    return null;
  }
}
