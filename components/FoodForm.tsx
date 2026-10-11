"use client";

// Inline create/edit form for a saved food — rendered in place inside a
// category dropdown on the Log page (no separate screen or sheet).

import { useState } from "react";
import type { CalorieBasis, Food } from "@/lib/types";
import type { FoodInput } from "@/app/store";
import CategoryPicker from "./CategoryPicker";
import { IconTrash } from "./icons";

export default function FoodForm({
  food,
  defaultCategory,
  options,
  onSave,
  onCancel,
  onDelete,
}: {
  /** The food being edited, or null to create a new one. */
  food: Food | null;
  defaultCategory?: string;
  options: string[];
  onSave: (input: FoodInput) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [basis, setBasis] = useState<CalorieBasis>(food?.basis ?? "serving");
  const [rate, setRate] = useState(food ? String(food.calories) : "");
  const [protein, setProtein] = useState(food?.protein != null ? String(food.protein) : "");
  const [unit, setUnit] = useState(food?.unit ?? "");
  const [category, setCategory] = useState(food?.category ?? (defaultCategory || "Other"));

  const r = Number(rate);
  const valid = name.trim().length > 0 && Number.isFinite(r) && r > 0;
  const per = basis === "per100g" ? "100 g" : basis === "per100ml" ? "100 ml" : "serving";

  return (
    <div className="inline-form">
      <div className="field">
        <label htmlFor="ff-name">Name</label>
        <input
          id="ff-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Latte"
          autoFocus={!food}
        />
      </div>

      <div className="segmented" style={{ marginBottom: 14 }}>
        <button className={basis === "serving" ? "active" : ""} onClick={() => setBasis("serving")}>
          Serving
        </button>
        <button className={basis === "per100g" ? "active" : ""} onClick={() => setBasis("per100g")}>
          100 g
        </button>
        <button className={basis === "per100ml" ? "active" : ""} onClick={() => setBasis("per100ml")}>
          100 ml
        </button>
      </div>

      <div className="ph-macros">
        <div className="field">
          <label htmlFor="ff-rate">kcal / {per}</label>
          <input
            id="ff-rate"
            className="input"
            type="number"
            inputMode="numeric"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="field">
          <label htmlFor="ff-protein">Protein g / {per}</label>
          <input
            id="ff-protein"
            className="input"
            type="number"
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="optional"
          />
        </div>
      </div>

      {basis === "serving" && (
        <div className="field">
          <label htmlFor="ff-unit">Serving label (optional)</label>
          <input
            id="ff-unit"
            className="input"
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            placeholder="e.g. cup, slice, medium"
          />
        </div>
      )}

      <div className="field">
        <label>Category</label>
        <CategoryPicker value={category} onChange={setCategory} options={options} />
      </div>

      <div className="ae-row">
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1.4 }}
          disabled={!valid}
          onClick={() =>
            onSave({
              name,
              category,
              basis,
              calories: r,
              protein: protein.trim() ? Number(protein) : undefined,
              unit: basis === "serving" ? unit : undefined,
            })
          }
        >
          {food ? "Save" : "Add food"}
        </button>
      </div>

      {onDelete && (
        <button
          className="btn-link-danger"
          onClick={() => {
            if (confirm(`Delete “${food?.name}”? Days you've already logged won't change.`)) onDelete();
          }}
        >
          <IconTrash width={15} height={15} /> Delete food
        </button>
      )}
    </div>
  );
}
