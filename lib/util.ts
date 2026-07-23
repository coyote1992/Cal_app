// Small shared utilities.

import type { CalorieBasis, Food } from "./types";

export function uid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

/** 1 -> "1", 1.5 -> "1.5", 2 -> "2" (trims trailing zeros). */
export function formatQty(q: number): string {
  return Number.isInteger(q) ? String(q) : String(Math.round(q * 100) / 100);
}

/** Rounded, thousands-separated kcal, e.g. 1234 -> "1,234". */
export function formatKcal(n: number): string {
  return Math.round(n).toLocaleString();
}

/** True for volume/weight bases where the rate is defined per 100 units. */
export function isPer100(basis: CalorieBasis): boolean {
  return basis === "per100g" || basis === "per100ml";
}

/** Total kcal for an amount, honoring the calorie basis. */
export function computeCalories(basis: CalorieBasis, rate: number, amount: number): number {
  return Math.round(isPer100(basis) ? (rate * amount) / 100 : rate * amount);
}

/** Sensible starting amount: 1 serving, or 100 g / 100 ml. */
export function defaultAmount(basis: CalorieBasis): number {
  return isPer100(basis) ? 100 : 1;
}

/** Unit suffix shown next to an amount. */
export function amountUnit(basis: CalorieBasis): string {
  if (basis === "per100g") return "g";
  if (basis === "per100ml") return "ml";
  return "×";
}

/** Quick-pick amounts offered for a basis. */
export function quickAmounts(basis: CalorieBasis): number[] {
  if (basis === "per100g") return [50, 100, 150, 200, 250];
  if (basis === "per100ml") return [100, 200, 250, 330, 500];
  return [0.5, 1, 1.5, 2, 3];
}

/** "105 kcal / medium", "165 kcal / 100 g", or "50 kcal / 100 ml", with a
 *  "· 31 g protein" suffix when the food has a protein value. */
export function rateLabel(food: Pick<Food, "basis" | "calories" | "unit" | "protein">): string {
  const per =
    food.basis === "per100g" ? "100 g" : food.basis === "per100ml" ? "100 ml" : food.unit || "serving";
  const base = `${formatKcal(food.calories)} kcal / ${per}`;
  return food.protein != null && food.protein > 0 ? `${base} · ${formatQty(food.protein)} g protein` : base;
}
