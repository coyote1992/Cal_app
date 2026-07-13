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

/** Total kcal for an amount, honoring the calorie basis. */
export function computeCalories(basis: CalorieBasis, rate: number, amount: number): number {
  return Math.round(basis === "per100g" ? (rate * amount) / 100 : rate * amount);
}

/** Sensible starting amount: 1 serving, or 100 g. */
export function defaultAmount(basis: CalorieBasis): number {
  return basis === "per100g" ? 100 : 1;
}

/** Unit suffix shown next to an amount. */
export function amountUnit(basis: CalorieBasis): string {
  return basis === "per100g" ? "g" : "×";
}

/** Quick-pick amounts offered for a basis. */
export function quickAmounts(basis: CalorieBasis): number[] {
  return basis === "per100g" ? [50, 100, 150, 200, 250] : [0.5, 1, 1.5, 2, 3];
}

/** "105 kcal / medium" or "165 kcal / 100 g". */
export function rateLabel(food: Pick<Food, "basis" | "calories" | "unit">): string {
  if (food.basis === "per100g") return `${formatKcal(food.calories)} kcal / 100 g`;
  return `${formatKcal(food.calories)} kcal / ${food.unit || "serving"}`;
}
