"use client";

// Saved foods, right on the Log page: a stacked "Recent" list on top, then one
// dropdown per category. Tap a food to open its amount editor in place; the
// pencil edits it (and deletes it) in place; "New food" adds one in place.

import { useEffect, useMemo, useState } from "react";
import type { Food } from "@/lib/types";
import { useStore } from "@/app/store";
import { allCategoryOptions, foodsByCategory } from "@/lib/categories";
import { rateLabel } from "@/lib/util";
import AmountEditor from "./AmountEditor";
import Dropdown from "./Dropdown";
import FoodForm from "./FoodForm";
import { IconPencil, IconPlus } from "./icons";

export default function FoodBrowser({ date }: { date: string }) {
  const { foods, entries, addEntry, addFood, updateFood, deleteFood } = useStore();
  const [openCats, setOpenCats] = useState<Set<string>>(new Set());
  // Which row has its amount editor open: "recent:<id>" or "cat:<id>" so a food
  // listed in both places doesn't open twice.
  const [sel, setSel] = useState<string | null>(null);
  // "edit:<id>" for a food being edited, "new:<category>" for a new one.
  const [form, setForm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const groups = useMemo(() => foodsByCategory(foods), [foods]);
  const options = useMemo(() => allCategoryOptions(foods), [foods]);

  const recents = useMemo(() => {
    const byRecency = [...entries].filter((e) => e.foodId).sort((a, b) => b.createdAt - a.createdAt);
    const seen = new Set<string>();
    const out: Food[] = [];
    for (const e of byRecency) {
      if (seen.has(e.foodId!)) continue;
      const f = foods.find((x) => x.id === e.foodId);
      if (!f) continue;
      seen.add(f.id);
      out.push(f);
      if (out.length >= 5) break;
    }
    return out;
  }, [entries, foods]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function toggleCat(c: string) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
    setSel(null);
    setForm(null);
  }

  function add(f: Food, amount: number) {
    addEntry({
      date,
      name: f.name,
      category: f.category,
      basis: f.basis,
      perUnit: f.calories,
      proteinPerUnit: f.protein,
      quantity: amount,
      source: "quick",
      foodId: f.id,
    });
    setToast(`Added ${f.name}`);
    setSel(null);
  }

  function row(f: Food, scope: "recent" | "cat") {
    const key = `${scope}:${f.id}`;
    const editKey = `edit:${f.id}`;
    if (scope === "cat" && form === editKey) {
      return (
        <FoodForm
          key={key}
          food={f}
          options={options}
          onCancel={() => setForm(null)}
          onSave={(input) => {
            updateFood(f.id, input);
            setForm(null);
          }}
          onDelete={() => {
            deleteFood(f.id);
            setForm(null);
            setSel(null);
          }}
        />
      );
    }
    return (
      <div key={key}>
        <div className={"pick-row" + (sel === key ? " selected" : "")}>
          <button className="pick-main" onClick={() => setSel(sel === key ? null : key)} aria-expanded={sel === key}>
            <span className="pick-name">{f.name}</span>
            <span className="pick-sub">{rateLabel(f)}</span>
          </button>
          {scope === "cat" && (
            <button
              className="icon-btn muted"
              onClick={() => {
                setForm(editKey);
                setSel(null);
              }}
              aria-label={`Edit ${f.name}`}
            >
              <IconPencil width={17} height={17} />
            </button>
          )}
        </div>
        {sel === key && (
          <div className="inline-editor">
            <AmountEditor
              key={f.id}
              name={f.name}
              sub={rateLabel(f)}
              basis={f.basis}
              rate={f.calories}
              proteinRate={f.protein}
              onAdd={(amount) => add(f, amount)}
            />
          </div>
        )}
      </div>
    );
  }

  function newFood(category: string) {
    const key = `new:${category}`;
    if (form === key) {
      return (
        <FoodForm
          defaultCategory={category}
          food={null}
          options={options}
          onCancel={() => setForm(null)}
          onSave={(input) => {
            addFood(input);
            setForm(null);
            setOpenCats((prev) => new Set(prev).add(input.category.trim() || "Other"));
            setToast(`Saved ${input.name.trim()}`);
          }}
        />
      );
    }
    return (
      <button
        className="add-row"
        onClick={() => {
          setForm(key);
          setSel(null);
        }}
      >
        <IconPlus width={15} height={15} /> New food
      </button>
    );
  }

  return (
    <div className="browser">
      {toast && <div className="added-toast">{toast} ✓</div>}

      {recents.length > 0 && (
        <div className="recent-block">
          <div className="mini-title">Recent</div>
          <div className="pick-list">{recents.map((f) => row(f, "recent"))}</div>
        </div>
      )}

      {foods.length === 0 && <div className="empty">No saved foods yet.</div>}

      <div className="dd-list">
        {groups.map((g) => (
          <Dropdown
            key={g.category}
            title={g.category}
            count={g.foods.length}
            open={openCats.has(g.category)}
            onToggle={() => toggleCat(g.category)}
          >
            <div className="pick-list">
              {g.foods.map((f) => row(f, "cat"))}
              {newFood(g.category)}
            </div>
          </Dropdown>
        ))}
      </div>

      {form === "new:" ? (
        newFood("")
      ) : (
        <button
          className="add-row standalone"
          onClick={() => {
            setForm("new:");
            setSel(null);
          }}
        >
          <IconPlus width={15} height={15} /> New food or category
        </button>
      )}
    </div>
  );
}
