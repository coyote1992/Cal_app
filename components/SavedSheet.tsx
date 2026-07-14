"use client";

// "Saved stuff": find a saved food fast. Search across all, a Recent row, then
// every category as its own always-visible section (title, bubbles, divider) —
// no dropdowns to tap open. Pick a food, set the amount, add.

import { useEffect, useMemo, useState } from "react";
import type { Food } from "@/lib/types";
import { useStore } from "@/app/store";
import { foodsByCategory } from "@/lib/categories";
import { rateLabel } from "@/lib/util";
import AmountEditor from "./AmountEditor";

function FoodChip({ f, selected, onClick }: { f: Food; selected: boolean; onClick: () => void }) {
  return (
    <button className={"food-chip" + (selected ? " selected" : "")} onClick={onClick}>
      <span className="fc-name">{f.name}</span>
      <span className="fc-rate">{rateLabel(f)}</span>
    </button>
  );
}

export default function SavedSheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { foods, entries, addEntry } = useStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Food | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const groups = useMemo(() => foodsByCategory(foods), [foods]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(null);
      setToast(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const recents = useMemo(() => {
    const seen = new Set<string>();
    const out: Food[] = [];
    for (let i = entries.length - 1; i >= 0 && out.length < 8; i--) {
      const fid = entries[i].foodId;
      if (!fid || seen.has(fid)) continue;
      const f = foods.find((x) => x.id === fid);
      if (f) {
        seen.add(fid);
        out.push(f);
      }
    }
    return out;
  }, [entries, foods]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () =>
      q
        ? foods
            .filter((f) => f.name.toLowerCase().includes(q) || f.category.toLowerCase().includes(q))
            .sort((a, b) => a.name.localeCompare(b.name))
        : [],
    [foods, q],
  );

  if (!open) return null;

  function add(amount: number) {
    if (!selected) return;
    addEntry({
      date,
      name: selected.name,
      category: selected.category,
      basis: selected.basis,
      perUnit: selected.calories,
      quantity: amount,
      source: "quick",
      foodId: selected.id,
    });
    setToast(`Added ${selected.name}`);
    setSelected(null);
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Saved foods">
        <div className="sheet-head">
          <div className="sheet-title">Saved stuff</div>
          <button className="link" onClick={onClose}>
            Done
          </button>
        </div>

        {toast && <div className="added-toast">{toast} ✓</div>}

        <input
          className="input search"
          placeholder="Search all foods…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
          }}
        />

        {q ? (
          matches.length ? (
            <div className="chip-grid">
              {matches.map((f) => (
                <FoodChip key={f.id} f={f} selected={selected?.id === f.id} onClick={() => setSelected(f)} />
              ))}
            </div>
          ) : (
            <div className="empty">No matches for “{query}”.</div>
          )
        ) : foods.length === 0 ? (
          <div className="empty">
            No saved foods yet.
            <br />
            Add them on the Foods tab.
          </div>
        ) : (
          <>
            {recents.length > 0 && (
              <div className="cat-section">
                <div className="cat-title">Recent</div>
                <div className="recents">
                  {recents.map((f) => (
                    <FoodChip key={f.id} f={f} selected={selected?.id === f.id} onClick={() => setSelected(f)} />
                  ))}
                </div>
              </div>
            )}
            {groups.map((g) => (
              <div key={g.category} className="cat-section">
                <div className="cat-title">
                  {g.category} <span className="cat-count">{g.foods.length}</span>
                </div>
                <div className="chip-grid">
                  {g.foods.map((f) => (
                    <FoodChip key={f.id} f={f} selected={selected?.id === f.id} onClick={() => setSelected(f)} />
                  ))}
                </div>
              </div>
            ))}
          </>
        )}

        {selected && (
          <AmountEditor
            key={selected.id}
            name={selected.name}
            sub={rateLabel(selected)}
            basis={selected.basis}
            rate={selected.calories}
            onAdd={add}
          />
        )}
      </div>
    </div>
  );
}
