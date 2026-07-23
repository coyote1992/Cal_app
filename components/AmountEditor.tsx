"use client";

// Fast amount control: quick-pick chips + a free decimal input (1.4, 0.7, grams
// for per-100g foods), a live total, and one Add tap. Kept intentionally shallow
// on taps. Remount via a `key` prop to reset when the selected food changes.

import { useState } from "react";
import type { CalorieBasis } from "@/lib/types";
import { amountUnit, computeCalories, defaultAmount, formatKcal, formatQty, isPer100, quickAmounts } from "@/lib/util";

export default function AmountEditor({
  name,
  sub,
  basis,
  rate,
  proteinRate,
  onAdd,
  addLabel = "Add",
}: {
  name: string;
  sub?: string;
  basis: CalorieBasis;
  rate: number;
  /** Protein grams on the same basis; when set, a live protein total is shown. */
  proteinRate?: number;
  onAdd: (amount: number) => void;
  addLabel?: string;
}) {
  const [raw, setRaw] = useState<string>(() => String(defaultAmount(basis)));
  const amount = Math.max(0, Number(raw) || 0);
  const total = computeCalories(basis, rate, amount);
  const proteinTotal = proteinRate != null ? computeCalories(basis, proteinRate, amount) : null;
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
          {proteinTotal != null && proteinTotal > 0 && (
            <span className="ae-protein">{formatQty(proteinTotal)} g protein</span>
          )}
        </div>
      </div>

      <div className="ae-quick">
        {quickAmounts(basis).map((q) => (
          <button key={q} className={amount === q ? "active" : ""} onClick={() => setRaw(String(q))}>
            {isPer100(basis) ? `${q} ${unit}` : `${formatQty(q)}×`}
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
