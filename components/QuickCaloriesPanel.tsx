"use client";

// "Calories": the fastest path — type a number you already know and it lands in
// the day's log. Optional label. No category/basis fuss. Renders inline on the
// Log page (mount it to open, unmount to close).

import { useState } from "react";
import { useStore } from "@/app/store";
import { formatKcal } from "@/lib/util";

export default function QuickCaloriesPanel({ onClose, date }: { onClose: () => void; date: string }) {
  const { addEntry } = useStore();
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const [name, setName] = useState("");

  const k = Math.round(Number(kcal));
  const valid = Number.isFinite(k) && k > 0;

  function add() {
    if (!valid) return;
    const p = Math.round(Number(protein));
    addEntry({
      date,
      name: name.trim() || "Quick calories",
      category: "Other",
      basis: "serving",
      perUnit: k,
      proteinPerUnit: Number.isFinite(p) && p > 0 ? p : undefined,
      quantity: 1,
      source: "manual",
    });
    onClose();
  }

  return (
    <div className="inline-panel" role="group" aria-label="Add calories">
      <div className="panel-head">
        <div className="panel-title">Add calories</div>
        <button className="link" onClick={onClose}>
          Cancel
        </button>
      </div>

        <div className="ph-macros">
          <div className="field">
            <label htmlFor="qc-kcal">Calories</label>
            <div className="ae-input-wrap wide">
              <input
                id="qc-kcal"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={kcal}
                onChange={(e) => setKcal(e.target.value)}
                autoFocus
              />
              <span className="ae-unit">kcal</span>
            </div>
          </div>
          <div className="field">
            <label htmlFor="qc-protein">Protein</label>
            <div className="ae-input-wrap wide">
              <input
                id="qc-protein"
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
              />
              <span className="ae-unit">g</span>
            </div>
          </div>
        </div>

        <div className="field">
          <label htmlFor="qc-name">Label (optional)</label>
          <input
            id="qc-name"
            className="input"
            placeholder="e.g. Snack"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <button className="btn btn-primary" disabled={!valid} onClick={add}>
          Add{valid ? ` · ${formatKcal(k)} kcal` : ""}
        </button>
    </div>
  );
}
