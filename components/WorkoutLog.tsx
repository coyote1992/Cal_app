"use client";

// The day's movement log: one card per logged exercise, edited right there —
// sets and reps (any number), weight or bodyweight, cardio intensity + hours,
// stretching minutes. The bin removes it.

import { useState } from "react";
import type { CardioIntensity, CardioLog, StrengthLog, StretchLog, WorkoutExercise } from "@/lib/types";
import type { WorkoutExercisePatch } from "@/app/store";
import { useStore } from "@/app/store";
import { CATEGORY_LABEL, INTENSITY_LABEL, workoutForDate } from "@/lib/gym";
import Stepper from "./Stepper";
import { IconPulse, IconTrash } from "./icons";

const INTENSITIES: CardioIntensity[] = ["low", "medium", "high"];

export default function WorkoutLog({ date, locked }: { date: string; locked: boolean }) {
  const { workouts, settings, updateWorkoutExercise, deleteWorkoutExercise } = useStore();
  const exercises = workoutForDate(workouts, date)?.exercises ?? [];

  if (exercises.length === 0) {
    return (
      <div className="empty">
        No movement logged yet.
        <br />
        {locked ? "This day was closed with no workout." : "Pick an exercise above to start."}
      </div>
    );
  }

  return (
    <div className="exercise-list">
      {exercises.map((we) => (
        <ExerciseCard
          key={we.id}
          we={we}
          unit={settings.weightUnit}
          locked={locked}
          onPatch={(patch) => updateWorkoutExercise(date, we.id, patch)}
          onRemove={() => deleteWorkoutExercise(date, we.id)}
        />
      ))}
    </div>
  );
}

function ExerciseCard({
  we,
  unit,
  locked,
  onPatch,
  onRemove,
}: {
  we: WorkoutExercise;
  unit: string;
  locked: boolean;
  onPatch: (patch: WorkoutExercisePatch) => void;
  onRemove: () => void;
}) {
  return (
    <div className="exercise-card">
      <div className="exercise-head">
        <div className="exercise-title">
          {we.kind === "cardio" && <IconPulse className="ex-cardio-ic" width={15} height={15} />}
          <span className="exercise-name">{we.name}</span>
          <span className="muscle-badge">{CATEGORY_LABEL[we.category]}</span>
        </div>
        {!locked && (
          <button className="icon-btn danger" onClick={onRemove} aria-label={`Remove ${we.name}`}>
            <IconTrash width={18} height={18} />
          </button>
        )}
      </div>
      {we.kind === "strength" ? (
        <StrengthBody we={we} unit={unit} locked={locked} onPatch={onPatch} />
      ) : we.kind === "cardio" ? (
        <CardioBody we={we} locked={locked} onPatch={onPatch} />
      ) : (
        <StretchBody we={we} locked={locked} onPatch={onPatch} />
      )}
    </div>
  );
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
  const [minStr, setMinStr] = useState(we.minutes != null ? String(we.minutes) : "");

  return (
    <div className="log-row">
      <div className="set-field log-minutes">
        <input
          type="number"
          inputMode="decimal"
          step={1}
          min={0}
          placeholder="0"
          readOnly={locked}
          value={minStr}
          onChange={(e) => {
            setMinStr(e.target.value);
            const m = Number(e.target.value.replace(",", "."));
            onPatch({ minutes: Number.isFinite(m) && m > 0 ? m : null });
          }}
          aria-label="Minutes"
        />
        <span className="set-unit">min</span>
      </div>
    </div>
  );
}
