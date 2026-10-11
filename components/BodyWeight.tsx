"use client";

// Body weight for the day. The input starts empty — the last known weight is
// only a placeholder hint, so an old number never gets silently saved as
// today's without being typed. Remount via `key={date}` when the day changes.

import { useState } from "react";
import { useStore } from "@/app/store";
import { addDays } from "@/lib/date";
import { lastBodyWeight, workoutForDate } from "@/lib/gym";

export default function BodyWeight({ date, locked }: { date: string; locked: boolean }) {
  const { workouts, settings, setBodyWeight } = useStore();
  const unit = settings.weightUnit;
  const own = workoutForDate(workouts, date)?.bodyWeight;
  const [str, setStr] = useState(own != null ? String(own) : "");
  const lastKnown = lastBodyWeight(workouts, addDays(date, -1));

  return (
    <div className="card bw-card">
      <div className="bw-row">
        <label className="bw-label" htmlFor="bw-input">
          Body weight
        </label>
        <div className="set-field bw-field">
          <input
            id="bw-input"
            type="number"
            inputMode="decimal"
            step={unit === "lb" ? 0.5 : 0.1}
            min={0}
            placeholder={lastKnown != null ? String(lastKnown) : "0"}
            readOnly={locked}
            value={str}
            onChange={(e) => {
              setStr(e.target.value);
              const w = Number(e.target.value.replace(",", "."));
              setBodyWeight(date, Number.isFinite(w) && w > 0 ? w : undefined);
            }}
          />
          <span className="set-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}
