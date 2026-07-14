"use client";

// "Calories": the fastest path — type a number you already know and it lands in
// today's log. Optional label. No category/basis fuss.

import { useEffect, useState } from "react";
import { useStore } from "@/app/store";
import { formatKcal } from "@/lib/util";

export default function QuickCaloriesSheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { addEntry } = useStore();
  const [kcal, setKcal] = useState("");
  const [name, setName] = useState("");

  useEffect(() => {
    if (open) {
      setKcal("");
      setName("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const k = Math.round(Number(kcal));
  const valid = Number.isFinite(k) && k > 0;

  function add() {
    if (!valid) return;
    addEntry({
      date,
      name: name.trim() || "Quick calories",
      category: "Other",
      basis: "serving",
      perUnit: k,
      quantity: 1,
      source: "manual",
    });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add calories">
        <div className="sheet-head">
          <div className="sheet-title">Add calories</div>
          <button className="link" onClick={onClose}>
            Cancel
          </button>
        </div>

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
    </div>
  );
}
