// Category helpers. Categories are just strings on foods — a seeded default set
// plus anything the user types. These helpers keep ordering consistent.

import type { Food } from "./types";

export const DEFAULT_CATEGORIES = [
  "Fruits",
  "Vegetables",
  "Drinks",
  "Meat",
  "Ready foods",
  "Snacks",
  "Sweets",
  "Other",
];

function rank(cat: string): number {
  if (cat === "Other") return 1000; // always last
  const i = DEFAULT_CATEGORIES.indexOf(cat);
  return i === -1 ? 500 : i; // custom categories sit between defaults and "Other"
}

/** De-duplicate + order: default order first, custom alphabetical, "Other" last. */
export function orderedCategories(cats: string[]): string[] {
  const uniq = Array.from(new Set(cats.map((c) => c || "Other")));
  return uniq.sort((a, b) => {
    const d = rank(a) - rank(b);
    return d !== 0 ? d : a.localeCompare(b);
  });
}

/** Category options offered when adding/editing a food (defaults + any custom). */
export function allCategoryOptions(foods: Food[]): string[] {
  return orderedCategories([...DEFAULT_CATEGORIES, ...foods.map((f) => f.category)]);
}

/** Foods grouped by category, in display order, each group sorted by name. */
export function foodsByCategory(foods: Food[]): Array<{ category: string; foods: Food[] }> {
  const map = new Map<string, Food[]>();
  for (const f of foods) {
    const c = f.category || "Other";
    if (!map.has(c)) map.set(c, []);
    map.get(c)!.push(f);
  }
  return orderedCategories([...map.keys()]).map((category) => ({
    category,
    foods: map.get(category)!.slice().sort((a, b) => a.name.localeCompare(b.name)),
  }));
}
