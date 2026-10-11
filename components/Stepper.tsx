"use client";

// − [number] + control for small whole numbers (sets, reps). The middle is a
// real input so a value can also be typed; the buttons are big tap targets.

import { useState } from "react";

export default function Stepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  label,
  disabled,
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  /** How much − / + move the value. */
  step?: number;
  label: string;
  disabled?: boolean;
}) {
  // Local text so the field can be briefly empty while typing a new number.
  const [str, setStr] = useState(String(value));

  function commit(n: number) {
    const v = Math.min(Math.max(Math.round(n), min), max);
    setStr(String(v));
    onChange(v);
  }

  return (
    <div className="stepper" role="group" aria-label={label}>
      <span className="stepper-label">{label}</span>
      <div className="stepper-ctl">
        <button disabled={disabled || value <= min} onClick={() => commit(value - step)} aria-label={`Fewer ${label.toLowerCase()}`}>
          −
        </button>
        <input
          type="number"
          inputMode="numeric"
          min={min}
          max={max}
          readOnly={disabled}
          value={str}
          onChange={(e) => {
            setStr(e.target.value);
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n) && n >= min) onChange(Math.min(Math.round(n), max));
          }}
          onBlur={() => setStr(String(value))}
          aria-label={label}
        />
        <button disabled={disabled || value >= max} onClick={() => commit(value + step)} aria-label={`More ${label.toLowerCase()}`}>
          +
        </button>
      </div>
    </div>
  );
}
