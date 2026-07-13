// Core data model. Everything the app stores lives in `AppData`.

export type ID = string;

/**
 * How a food's calories are defined:
 *  - "serving": a fixed kcal per serving/unit (e.g. 1 banana = 105).
 *  - "per100g": kcal per 100 g, for cooked/"ready" foods you weigh before eating.
 */
export type CalorieBasis = "serving" | "per100g";

/** A saved item the user defines once and reuses, grouped under a category. */
export interface Food {
  id: ID;
  name: string;
  /** Category label, e.g. "Fruits", "Drinks", "Ready foods". */
  category: string;
  basis: CalorieBasis;
  /** kcal per serving (basis "serving") OR per 100 g (basis "per100g"). */
  calories: number;
  /** Serving label for "serving" basis, e.g. "medium", "cup", "slice". */
  unit?: string;
  createdAt: number;
}

export type EntrySource = "quick" | "manual" | "photo";

/** A single logged consumption on a given day. */
export interface Entry {
  id: ID;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  /** Display name captured at log time. */
  name: string;
  category?: string;
  basis: CalorieBasis;
  /** Rate snapshot: kcal per serving, or per 100 g. */
  perUnit: number;
  /** Amount consumed: servings ("serving") or grams ("per100g"). Supports decimals. */
  quantity: number;
  /** TOTAL calories for this entry, pre-computed. */
  calories: number;
  foodId?: ID;
  source: EntrySource;
  /** Free-form note, e.g. an LLM's reasoning for a photo estimate. */
  note?: string;
  createdAt: number;
}

export interface Settings {
  /** Daily calorie budget/target. */
  dailyBudget: number;
  /** 0 = week starts Sunday, 1 = week starts Monday. */
  weekStartsOn: 0 | 1;
}

export interface AppData {
  version: number;
  foods: Food[];
  entries: Entry[];
  settings: Settings;
}
