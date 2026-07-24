// Core data model. Everything the app stores lives in `AppData`.

export type ID = string;

/**
 * How a food's calories are defined:
 *  - "serving": a fixed kcal per serving/unit (e.g. 1 banana = 105).
 *  - "per100g": kcal per 100 g, for cooked/"ready" foods you weigh before eating.
 *  - "per100ml": kcal per 100 ml, for drinks you measure by volume.
 */
export type CalorieBasis = "serving" | "per100g" | "per100ml";

/** A saved item the user defines once and reuses, grouped under a category. */
export interface Food {
  id: ID;
  name: string;
  /** Category label, e.g. "Fruits", "Drinks", "Ready foods". */
  category: string;
  basis: CalorieBasis;
  /** kcal per serving (basis "serving") OR per 100 g (basis "per100g"). */
  calories: number;
  /** Grams of protein on the same basis as `calories`. Optional (older foods lack it). */
  protein?: number;
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
  /** TOTAL grams of protein for this entry, pre-computed. Optional. */
  protein?: number;
  foodId?: ID;
  source: EntrySource;
  /** Free-form note, e.g. an LLM's reasoning for a photo estimate. */
  note?: string;
  createdAt: number;
}

export type WeightUnit = "kg" | "lb";

export interface Settings {
  /** Daily calorie budget/target. */
  dailyBudget: number;
  /** Daily protein target in grams. */
  proteinGoal: number;
  /** 0 = week starts Sunday, 1 = week starts Monday. */
  weekStartsOn: 0 | 1;
  /** Unit weights are entered/shown in for the gym log. */
  weightUnit: WeightUnit;
  /** Target sets per week for each movement pattern. */
  categoryGoals: Record<ExerciseCategory, number>;
}

// ── Gym ────────────────────────────────────────────────────
/** Movement pattern the exercise trains. */
export type ExerciseCategory = "push" | "pull" | "lower" | "other";
/** Strength lifts log weight+sets; cardio logs intensity+time. */
export type ExerciseKind = "strength" | "cardio";
export type CardioIntensity = "low" | "medium" | "high";

/** A reusable exercise definition in the library (like Food, but for training). */
export interface Exercise {
  id: ID;
  name: string;
  category: ExerciseCategory;
  kind: ExerciseKind;
  createdAt: number;
}

interface WorkoutExerciseBase {
  id: ID;
  exerciseId?: ID;
  /** Snapshots so history stays stable if the library entry changes/deletes. */
  name: string;
  category: ExerciseCategory;
}

/** A strength lift as performed: one working weight, a 2-or-3 set count, reps
 *  fixed at 8. Deliberately simple — one entry per exercise per day. */
export interface StrengthLog extends WorkoutExerciseBase {
  kind: "strength";
  /** Working weight in the user's unit; undefined until entered. */
  weight?: number;
  /** Number of sets (2 or 3). */
  sets: number;
  /** Reps per set — fixed at 8. */
  reps: number;
}

/** A cardio bout: an intensity and a duration. */
export interface CardioLog extends WorkoutExerciseBase {
  kind: "cardio";
  intensity: CardioIntensity;
  /** Duration in minutes; undefined until entered. */
  minutes?: number;
}

export type WorkoutExercise = StrengthLog | CardioLog;

/** A gym session on a given day. */
export interface Workout {
  id: ID;
  /** Local calendar day, YYYY-MM-DD. */
  date: string;
  exercises: WorkoutExercise[];
  note?: string;
  createdAt: number;
}

export interface AppData {
  version: number;
  foods: Food[];
  entries: Entry[];
  /** Gym exercise library (reusable definitions). */
  exercises: Exercise[];
  /** Logged gym sessions. */
  workouts: Workout[];
  settings: Settings;
  /** ISO days (YYYY-MM-DD) the user has "closed" — locked from further edits. */
  closedDays: string[];
  /** Last-modified time (ms). Used to resolve conflicts when cloud-syncing across devices. */
  updatedAt: number;
}
