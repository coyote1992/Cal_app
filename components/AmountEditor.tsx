"use client";

// Fast amount control: quick-pick chips + a free decimal input (1.4, 0.7, grams
// for per-100g foods), a live total, and one Add tap. Kept intentionally shallow
// on taps. Remount via a `key` prop to reset when the selected food changes.

import { useState } from "react";
import type { CalorieBasis } from "@/lib/types";
import { amountUnit, computeCalories, defaultAmount, formatKcal, formatQty, quickAmounts } from "@/lib/util";

export default function AmountEditor({
  name,
  sub,
  basis,
  rate,
  onAdd,
  addLabel = "Add",
}: {
  name: string;
  sub?: string;
  basis: CalorieBasis;
  rate: number;
  onAdd: (amount: number) => void;
  addLabel?: string;
}) {
  const [raw, setRaw] = useState<string>(() => String(defaultAmount(basis)));
  const amount = Math.max(0, Number(raw) || 0);
  const total = computeCalories(basis, rate, amount);
  const unit = amountUnit(basis);

  return (
    <div className="amount-editor">
      <div className="ae-head">
        <div className="ae-name">
          {name}
          {sub && <small>{sub}</small>}
        </div>
        <div className="ae-total">
          {formatKcal(total)} <small>kcal</small>
        </div>
      </div>

      <div className="ae-quick">
        {quickAmounts(basis).map((q) => (
          <button key={q} className={amount === q ? "active" : ""} onClick={() => setRaw(String(q))}>
            {basis === "per100g" ? `${q} g` : `${formatQty(q)}×`}
          </button>
        ))}
      </div>

      <div className="ae-row">
        <div className="ae-input-wrap">
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step={basis === "per100g" ? 10 : 0.1}
            value={raw}
            onChange={(e) => setRaw(e.target.value)}
            aria-label="Amount"
          />
          <span className="ae-unit">{unit}</span>
        </div>
        <button className="btn btn-primary ae-add" disabled={!(amount > 0)} onClick={() => onAdd(amount)}>
          {addLabel}
        </button>
      </div>
    </div>
  );
}
