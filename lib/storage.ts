// Persistence layer. Isolated behind a tiny API (load/save/parse) so a cloud
// backend (e.g. Vercel KV) can replace localStorage later without touching the
// UI or the store. Also handles migration of older saved data.

import type { AppData, CalorieBasis, Entry, Food, Settings } from "./types";
import { computeCalories, uid } from "./util";

const STORAGE_KEY = "calorie-tracker:v1";
export const DATA_VERSION = 5;

export const DEFAULT_SETTINGS: Settings = { dailyBudget: 2000, proteinGoal: 160, weekStartsOn: 1 };

type PresetFood = { name: string; category: string; basis: CalorieBasis; calories: number; protein: number; unit?: string };

// The user's own food list (imported from Update1/Munkafüzet1.xlsx). Seeded on a
// fresh install and merged into existing data on upgrade to v3. Protein grams
// (same basis as calories) added in v5 from standard references; all editable.
const PRESET_FOODS: PresetFood[] = [
  // Drinks
  { name: "Milk", category: "Drinks", basis: "per100ml", calories: 50, protein: 3 },
  { name: "Alpro Rice Drink", category: "Drinks", basis: "per100ml", calories: 48, protein: 0 },
  { name: "Red bull", category: "Drinks", basis: "serving", calories: 110, protein: 0, unit: "250 ml" },
  { name: "White Wine", category: "Drinks", basis: "serving", calories: 80, protein: 0, unit: "1 dl" },
  { name: "Beer", category: "Drinks", basis: "serving", calories: 220, protein: 3, unit: "5 dl" },
  // Meat
  { name: "Cooked Chicken", category: "Meat", basis: "per100g", calories: 165, protein: 31 },
  { name: "Cooked Rice", category: "Meat", basis: "per100g", calories: 130, protein: 3 },
  { name: "Salmon", category: "Meat", basis: "per100g", calories: 208, protein: 22 },
  { name: "Bacon (with fat)", category: "Meat", basis: "per100g", calories: 540, protein: 12 },
  { name: "Mashed potatoes", category: "Meat", basis: "per100g", calories: 115, protein: 2 },
  { name: "Tonhal", category: "Meat", basis: "serving", calories: 110, protein: 20, unit: "80 g can" },
  { name: "Medium Egg", category: "Meat", basis: "serving", calories: 64, protein: 6, unit: "piece" },
  // Other
  { name: "Pasta (dry)", category: "Other", basis: "per100g", calories: 350, protein: 12 },
  { name: "Parmesan cheese", category: "Other", basis: "per100g", calories: 430, protein: 38 },
  { name: "Kenyér", category: "Other", basis: "per100g", calories: 266, protein: 9 },
  { name: "Yoghurt", category: "Other", basis: "per100g", calories: 100, protein: 5 },
  { name: "Pufi rizs", category: "Other", basis: "serving", calories: 25, protein: 1, unit: "piece" },
  { name: "Ketchup", category: "Other", basis: "serving", calories: 20, protein: 0, unit: "tbsp" },
  { name: "Mayonaise", category: "Other", basis: "serving", calories: 100, protein: 0, unit: "tbsp" },
  { name: "Olive Oil", category: "Other", basis: "serving", calories: 120, protein: 0, unit: "spoon" },
  { name: "Butter", category: "Other", basis: "serving", calories: 72, protein: 0, unit: "10 g" },
  // Fruits
  { name: "Banán", category: "Fruits", basis: "serving", calories: 90, protein: 1, unit: "piece" },
  { name: "Alma", category: "Fruits", basis: "serving", calories: 100, protein: 1, unit: "piece" },
  { name: "Mandarin", category: "Fruits", basis: "serving", calories: 40, protein: 1, unit: "piece" },
  { name: "Körte", category: "Fruits", basis: "serving", calories: 100, protein: 1, unit: "piece" },
  // Sweets
  { name: "Gelato", category: "Sweets", basis: "serving", calories: 130, protein: 2, unit: "scoop" },
  { name: "Monin syrup", category: "Sweets", basis: "serving", calories: 20, protein: 0, unit: "tsp" },
  { name: "Honey", category: "Sweets", basis: "serving", calories: 20, protein: 0, unit: "tsp" },
];

// Names of the original placeholder starter foods; removed on upgrade to v3 so
// they don't sit alongside the user's real list as duplicates.
const OLD_SEED_NAMES = new Set(
  [
    "Apple",
    "Banana",
    "Coffee with milk",
    "Slice of bread",
    "Egg",
    "Greek yogurt",
    "Chicken breast, cooked",
    "White rice, cooked",
  ].map((n) => n.toLowerCase()),
);

// v4: calorie values fact-checked against USDA/product sources. These were the
// only ones outside a ~15% tolerance, so they're corrected in already-saved data
// too (keyed by lowercased name).
const V4_CORRECTIONS: Record<string, { calories?: number; name?: string }> = {
  // Was 7 kcal/10 g — a 10x slip. USDA butter is 717 kcal/100 g, i.e. 72 per 10 g.
  butter: { calories: 72 },
  // Was 240. USDA cooked Atlantic salmon: 182 (wild) – 206 (farmed).
  salmon: { calories: 208 },
  // 350 kcal/100 g is DRY pasta (cooked is ~140–160); rename so it can't be
  // mistakenly applied to a cooked weight.
  pasta: { name: "Pasta (dry)" },
};

function applyV4Corrections(foods: Food[]): Food[] {
  return foods.map((f) => {
    const fix = V4_CORRECTIONS[f.name.trim().toLowerCase()];
    return fix ? { ...f, ...fix } : f;
  });
}

function coerceBasis(v: unknown): CalorieBasis {
  return v === "per100g" || v === "per100ml" ? v : "serving";
}

function presetToFood(p: PresetFood, i: number): Food {
  return { id: uid(), createdAt: Date.now() + i, ...p };
}

export function emptyData(): AppData {
  return { version: DATA_VERSION, foods: [], entries: [], settings: { ...DEFAULT_SETTINGS }, closedDays: [], updatedAt: 0 };
}

/** The user's food list, seeded on the very first run (all editable/deletable). */
export function seededData(): AppData {
  return {
    version: DATA_VERSION,
    foods: PRESET_FOODS.map(presetToFood),
    entries: [],
    settings: { ...DEFAULT_SETTINGS },
    closedDays: [],
    updatedAt: Date.now(),
  };
}

/** Preset protein by lowercased name, used to backfill existing foods on v5. */
const PRESET_PROTEIN = new Map(PRESET_FOODS.map((p) => [p.name.toLowerCase(), p.protein]));

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeFood(f: any): Food {
  const basis = coerceBasis(f.basis);
  const protein = Number(f.protein);
  return {
    id: (f.id as string) ?? uid(),
    name: String(f.name ?? "Food"),
    category: typeof f.category === "string" && f.category.trim() ? f.category : "Other",
    basis,
    calories: Number(f.calories) || 0,
    protein: Number.isFinite(protein) ? protein : undefined,
    unit: (f.unit as string) || undefined,
    createdAt: (f.createdAt as number) ?? Date.now(),
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizeEntry(e: any): Entry {
  const basis = coerceBasis(e.basis);
  const perUnit = Number(e.perUnit) || 0;
  const quantity = Number(e.quantity) || 0;
  const calories = Number.isFinite(Number(e.calories)) ? Number(e.calories) : computeCalories(basis, perUnit, quantity);
  const protein = Number(e.protein);
  return {
    id: (e.id as string) ?? uid(),
    date: String(e.date ?? ""),
    name: String(e.name ?? "Food"),
    category: (e.category as string) || undefined,
    basis,
    perUnit,
    quantity,
    calories,
    protein: Number.isFinite(protein) ? protein : undefined,
    foodId: (e.foodId as string) || undefined,
    source: (e.source as Entry["source"]) ?? "manual",
    note: (e.note as string) || undefined,
    createdAt: (e.createdAt as number) ?? Date.now(),
  };
}

/** Add any preset foods not already saved (matched case-insensitively by name). */
function mergePresets(foods: Food[]): Food[] {
  const have = new Set(foods.map((f) => f.name.trim().toLowerCase()));
  const additions = PRESET_FOODS.filter((p) => !have.has(p.name.toLowerCase())).map(presetToFood);
  return [...foods, ...additions];
}

export function normalize(raw: unknown): AppData {
  const base = emptyData();
  if (!raw || typeof raw !== "object") return base;
  const d = raw as Partial<AppData> & { version?: number };
  const incomingVersion = Number(d.version) || 1;

  let foods = Array.isArray(d.foods) ? d.foods.map((f) => normalizeFood(f)) : base.foods;
  // v3 upgrade: drop the old demo starters and fold in the user's preset list.
  if (incomingVersion < 3) {
    foods = mergePresets(foods.filter((f) => !OLD_SEED_NAMES.has(f.name.trim().toLowerCase())));
  }
  // v4 upgrade: apply the fact-checked calorie corrections to saved foods.
  if (incomingVersion < 4) {
    foods = applyV4Corrections(foods);
  }
  // v5 upgrade: backfill protein for foods matching a preset by name, but only
  // where the user hasn't already set one (never overwrites their own value).
  if (incomingVersion < 5) {
    foods = foods.map((f) =>
      f.protein == null && PRESET_PROTEIN.has(f.name.trim().toLowerCase())
        ? { ...f, protein: PRESET_PROTEIN.get(f.name.trim().toLowerCase()) }
        : f,
    );
  }

  const closedDays = Array.isArray(d.closedDays) ? d.closedDays.filter((x): x is string => typeof x === "string") : [];

  return {
    version: DATA_VERSION,
    foods,
    entries: Array.isArray(d.entries) ? d.entries.map((e) => normalizeEntry(e)) : base.entries,
    settings: { ...base.settings, ...(d.settings ?? {}) },
    closedDays,
    updatedAt: Number(d.updatedAt) || Date.now(),
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
