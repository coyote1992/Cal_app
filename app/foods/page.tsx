"use client";

import { useEffect, useState } from "react";
import { useStore } from "@/app/store";
import type { CalorieBasis, Food } from "@/lib/types";
import type { FoodInput } from "@/app/store";
import { allCategoryOptions, foodsByCategory } from "@/lib/categories";
import { rateLabel } from "@/lib/util";
import CategoryPicker from "@/components/CategoryPicker";
import { IconPencil, IconPlus, IconTrash } from "@/components/icons";

export default function FoodsPage() {
  const { hydrated, foods, addFood, updateFood, deleteFood } = useStore();
  const [editing, setEditing] = useState<Food | "new" | null>(null);

  if (!hydrated) return <div className="loading">Loading…</div>;

  const groups = foodsByCategory(foods);
  const options = allCategoryOptions(foods);

  return (
    <div>
      <h1 className="page-title">Foods</h1>
      <p className="hint" style={{ margin: "0 2px 14px" }}>
        Your saved items, grouped by category. Tap one on the Today screen to log it in a second.
      </p>

      <button className="btn btn-primary" onClick={() => setEditing("new")}>
        <IconPlus width={20} height={20} /> New food
      </button>

      {foods.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          No foods yet.
          <br />
          Add your go-to items to log them fast.
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.category}>
            <h2 className="section-title">
              {g.category} <span className="count">{g.foods.length}</span>
            </h2>
            <ul className="food-list">
              {g.foods.map((f) => (
                <li key={f.id} className="food-row">
                  <div className="grow">
                    <div className="entry-name">{f.name}</div>
                    <div className="entry-meta">{rateLabel(f)}</div>
                  </div>
                  <button className="icon-btn muted" onClick={() => setEditing(f)} aria-label={`Edit ${f.name}`}>
                    <IconPencil width={18} height={18} />
                  </button>
                  <button
                    className="icon-btn danger"
                    onClick={() => {
                      if (confirm(`Delete “${f.name}”?`)) deleteFood(f.id);
                    }}
                    aria-label={`Delete ${f.name}`}
                  >
                    <IconTrash width={18} height={18} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))
      )}

      {editing && (
        <FoodEditor
          food={editing === "new" ? null : editing}
          options={options}
          onClose={() => setEditing(null)}
          onSave={(input) => {
            if (editing === "new") addFood(input);
            else updateFood(editing.id, input);
            setEditing(null);
          }}
          onDelete={
            editing !== "new"
              ? () => {
                  deleteFood(editing.id);
                  setEditing(null);
                }
              : undefined
          }
        />
      )}
    </div>
  );
}

function FoodEditor({
  food,
  options,
  onClose,
  onSave,
  onDelete,
}: {
  food: Food | null;
  options: string[];
  onClose: () => void;
  onSave: (input: FoodInput) => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(food?.name ?? "");
  const [basis, setBasis] = useState<CalorieBasis>(food?.basis ?? "serving");
  const [rate, setRate] = useState(food ? String(food.calories) : "");
  const [protein, setProtein] = useState(food?.protein != null ? String(food.protein) : "");
  const [unit, setUnit] = useState(food?.unit ?? "");
  const [category, setCategory] = useState(food?.category ?? "Other");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const r = Number(rate);
  const valid = name.trim().length > 0 && Number.isFinite(r) && r > 0;

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="sheet-title">{food ? "Edit food" : "New food"}</div>
          <button className="link" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="field">
          <label htmlFor="f-name">Name</label>
          <input
            id="f-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Latte"
            autoFocus
          />
        </div>

        <div className="field">
          <label>How are its calories measured?</label>
          <div className="segmented">
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
        </div>

        <div className="field">
          <label htmlFor="f-rate">
            {basis === "per100g" ? "Calories per 100 g" : basis === "per100ml" ? "Calories per 100 ml" : "Calories per serving"}
          </label>
          <input
            id="f-rate"
            className="input"
            type="number"
            inputMode="numeric"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            placeholder={basis === "serving" ? "e.g. 120" : basis === "per100ml" ? "e.g. 42" : "e.g. 165"}
          />
        </div>

        <div className="field">
          <label htmlFor="f-protein">
            {basis === "per100g"
              ? "Protein per 100 g (g)"
              : basis === "per100ml"
                ? "Protein per 100 ml (g)"
                : "Protein per serving (g)"}
          </label>
          <input
            id="f-protein"
            className="input"
            type="number"
            inputMode="decimal"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            placeholder="optional, e.g. 31"
          />
        </div>

        {basis === "serving" && (
          <div className="field">
            <label htmlFor="f-unit">Serving label (optional)</label>
            <input
              id="f-unit"
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

        <button
          className="btn btn-primary"
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
          {food ? "Save changes" : "Add food"}
        </button>

        {onDelete && (
          <button
            className="btn btn-danger btn-block"
            style={{ marginTop: 10 }}
            onClick={() => {
              if (confirm(`Delete “${food?.name}”? Days you've already logged won't change.`)) onDelete();
            }}
          >
            <IconTrash width={18} height={18} /> Delete food
          </button>
        )}
      </div>
    </div>
  );
}
