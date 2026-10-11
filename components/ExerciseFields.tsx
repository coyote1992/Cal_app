"use client";

// The detail fields for one exercise log, shared by the Log page's workout cards
// and the inline "add" panel under an exercise: sets × reps + weight/bodyweight
// (strength), intensity + hours (cardio), sets × seconds (stretching).

import { useState } from "react";
import type { CardioIntensity, CardioLog, StrengthLog, StretchLog, WorkoutExercise } from "@/lib/types";
import { INTENSITY_LABEL } from "@/lib/gym";
import type { WorkoutExercisePatch } from "@/lib/gym";
import Stepper from "./Stepper";

const INTENSITIES: CardioIntensity[] = ["low", "medium", "high"];

export default function ExerciseFields({
  we,
  unit,
  locked,
  onPatch,
}: {
  we: WorkoutExercise;
  unit: string;
  locked: boolean;
  onPatch: (patch: WorkoutExercisePatch) => void;
}) {
  if (we.kind === "strength") return <StrengthBody we={we} unit={unit} locked={locked} onPatch={onPatch} />;
  if (we.kind === "cardio") return <CardioBody we={we} locked={locked} onPatch={onPatch} />;
  return <StretchBody we={we} locked={locked} onPatch={onPatch} />;
}

function StrengthBody({
  we,
  unit,
  locked,
  onPatch,
}: {
  we: StrengthLog;
  unit: string;
  locked: boolean;
  onPatch: (patch: WorkoutExercisePatch) => void;
}) {
  const [weightStr, setWeightStr] = useState(we.weight != null ? String(we.weight) : "");
  const bw = we.isBodyweight === true;

  return (
    <div className="strength-body">
      <div className="stepper-row">
        <Stepper label="Sets" value={we.sets} disabled={locked} onChange={(n) => onPatch({ sets: n })} />
        <Stepper label="Reps" value={we.reps} max={999} disabled={locked} onChange={(n) => onPatch({ reps: n })} />
      </div>
      <div className="load-row">
        <button
          className={"bw-chip" + (bw ? " active" : "")}
          disabled={locked}
          aria-pressed={bw}
          onClick={() => onPatch({ isBodyweight: !bw })}
        >
          Bodyweight
        </button>
        <div className={"set-field load-field" + (bw ? " off" : "")}>
          <input
            type="number"
            inputMode="decimal"
            step={unit === "lb" ? 5 : 2.5}
            min={0}
            placeholder={bw ? "—" : "0"}
            readOnly={locked}
            disabled={bw}
            value={bw ? "" : weightStr}
            onChange={(e) => {
              setWeightStr(e.target.value);
              const w = Number(e.target.value.replace(",", "."));
              onPatch({ weight: Number.isFinite(w) && w > 0 ? w : null });
            }}
            aria-label="Weight"
          />
          <span className="set-unit">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function CardioBody({
  we,
  locked,
  onPatch,
}: {
  we: CardioLog;
  locked: boolean;
  onPatch: (patch: WorkoutExercisePatch) => void;
}) {
  const [hoursStr, setHoursStr] = useState(we.hours != null ? String(we.hours) : "");

  return (
    <div className="log-row">
      <div className="seg-mini" role="group" aria-label="Intensity">
        {INTENSITIES.map((i) => (
          <button key={i} className={we.intensity === i ? "active" : ""} disabled={locked} onClick={() => onPatch({ intensity: i })}>
            {INTENSITY_LABEL[i]}
          </button>
        ))}
      </div>
      <div className="set-field log-minutes">
        <input
          type="number"
          inputMode="decimal"
          step={0.25}
          min={0}
          placeholder="0"
          readOnly={locked}
          value={hoursStr}
          onChange={(e) => {
            // Accept a comma decimal separator (0,3) as well as a dot.
            setHoursStr(e.target.value);
            const h = Number(e.target.value.replace(",", "."));
            onPatch({ hours: Number.isFinite(h) && h > 0 ? h : null });
          }}
          aria-label="Hours"
        />
        <span className="set-unit">h</span>
      </div>
    </div>
  );
}

function StretchBody({
  we,
  locked,
  onPatch,
}: {
  we: StretchLog;
  locked: boolean;
  onPatch: (patch: WorkoutExercisePatch) => void;
}) {
  return (
    <div className="stepper-row">
      <Stepper label="Sets" value={we.sets} disabled={locked} onChange={(n) => onPatch({ sets: n })} />
      <Stepper label="Seconds" value={we.seconds} max={3600} step={5} disabled={locked} onChange={(n) => onPatch({ seconds: n })} />
    </div>
  );
}
