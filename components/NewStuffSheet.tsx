"use client";

// "New stuff": log something not in your saved list. Choose serving vs per-100g,
// pick/create a category, set the amount (decimals ok), and optionally save it
// for reuse. The photo estimator will later live at the bottom of this sheet.

import { useEffect, useState } from "react";
import type { CalorieBasis } from "@/lib/types";
import { useStore } from "@/app/store";
import { allCategoryOptions } from "@/lib/categories";
import { amountUnit, computeCalories, defaultAmount, formatKcal, formatQty, quickAmounts } from "@/lib/util";
import CategoryPicker from "./CategoryPicker";
import { IconCamera } from "./icons";

export default function NewStuffSheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { foods, addFood, addEntry } = useStore();
  const [name, setName] = useState("");
  const [basis, setBasis] = useState<CalorieBasis>("serving");
  const [rate, setRate] = useState("");
  const [unit, setUnit] = useState("");
  const [category, setCategory] = useState("Other");
  const [amountRaw, setAmountRaw] = useState("1");
  const [save, setSave] = useState(true);

  useEffect(() => {
    if (open) {
      setName("");
      setBasis("serving");
      setRate("");
      setUnit("");
      setCategory("Other");
      setAmountRaw("1");
      setSave(true);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Reset the amount to a sensible default when switching basis.
  useEffect(() => {
    setAmountRaw(String(defaultAmount(basis)));
  }, [basis]);

  if (!open) return null;

  const rateNum = Number(rate);
  const amount = Math.max(0, Number(amountRaw) || 0);
  const valid = name.trim().length > 0 && Number.isFinite(rateNum) && rateNum > 0 && amount > 0;
  const total = valid ? computeCalories(basis, rateNum, amount) : 0;
  const options = allCategoryOptions(foods);

  function commit() {
    if (!valid) return;
    let foodId: string | undefined;
    if (save) {
      const f = addFood({ name, category, basis, calories: rateNum, unit: basis === "serving" ? unit : undefined });
      foodId = f.id;
    }
    addEntry({ date, name, category, basis, perUnit: rateNum, quantity: amount, source: "manual", foodId });
    onClose();
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="New food">
        <div className="sheet-grip" />
        <div className="sheet-head">
          <div className="sheet-title">New stuff</div>
          <button className="link" onClick={onClose}>
            Cancel
          </button>
        </div>

        <div className="field">
          <label htmlFor="ns-name">What did you eat?</label>
          <input
            id="ns-name"
            className="input"
            placeholder="e.g. Homemade lasagna"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>

        <div className="field">
          <label>How are its calories measured?</label>
          <div className="segmented">
            <button className={basis === "serving" ? "active" : ""} onClick={() => setBasis("serving")}>
              Per serving
            </button>
            <button className={basis === "per100g" ? "active" : ""} onClick={() => setBasis("per100g")}>
              Per 100 g
            </button>
          </div>
        </div>

        <div className="field">
          <label htmlFor="ns-rate">{basis === "per100g" ? "Calories per 100 g" : "Calories per serving"}</label>
          <input
            id="ns-rate"
            className="input"
            type="number"
            inputMode="numeric"
            placeholder={basis === "per100g" ? "e.g. 180" : "e.g. 450"}
            value={rate}
            onChange={(e) => setRate(e.target.value)}
          />
        </div>

        {basis === "serving" && (
          <div className="field">
            <label htmlFor="ns-unit">Serving label (optional)</label>
            <input
              id="ns-unit"
              className="input"
              placeholder="e.g. plate, bowl, slice"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        )}

        <div className="field">
          <label>Category</label>
          <CategoryPicker value={category} onChange={setCategory} options={options} />
        </div>

        <div className="field">
          <label>How much did you eat? ({basis === "per100g" ? "grams" : "servings"})</label>
          <div className="ae-quick">
            {quickAmounts(basis).map((qv) => (
              <button key={qv} className={amount === qv ? "active" : ""} onClick={() => setAmountRaw(String(qv))}>
                {basis === "per100g" ? `${qv} g` : `${formatQty(qv)}×`}
              </button>
            ))}
          </div>
          <div className="ae-input-wrap">
            <input
              type="number"
              inputMode="decimal"
              step={basis === "per100g" ? 10 : 0.1}
              value={amountRaw}
              onChange={(e) => setAmountRaw(e.target.value)}
              aria-label="Amount"
            />
            <span className="ae-unit">{amountUnit(basis)}</span>
          </div>
        </div>

        <div className="toggle-row">
          <div>
            <div style={{ fontWeight: 600 }}>Save to my foods</div>
            <div className="hint" style={{ marginTop: 0 }}>
              Reuse it later from “Saved stuff”.
            </div>
          </div>
          <button
            className={"switch" + (save ? " on" : "")}
            onClick={() => setSave((s) => !s)}
            role="switch"
            aria-checked={save}
            aria-label="Save to my foods"
          />
        </div>

        <button className="btn btn-primary" style={{ marginTop: 8 }} disabled={!valid} onClick={commit}>
          Add{valid ? ` · ${formatKcal(total)} kcal` : ""}
        </button>

        <div className="note" style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "center" }}>
          <IconCamera width={20} height={20} />
          <span>Coming soon: snap a photo here and let AI estimate the calories.</span>
        </div>
      </div>
    </div>
  );
}
