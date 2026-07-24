"use client";

import { useState } from "react";
import { useStore } from "../store";
import type { CardioIntensity, StrengthLog, CardioLog, WorkoutExercise } from "@/lib/types";
import ExercisePicker from "@/components/ExercisePicker";
import { IconLock, IconPlus, IconPulse, IconTrash } from "@/components/icons";
import { addDays, dayLabel, todayISO } from "@/lib/date";
import { CATEGORIES, CATEGORY_LABEL, INTENSITY_LABEL, cardioMinutes, categorySets, workoutForDate } from "@/lib/gym";

const INTENSITIES: CardioIntensity[] = ["low", "medium", "high"];

export default function GymPage() {
  const { hydrated, workouts, settings, isDayClosed, addExerciseToWorkout, updateWorkoutExercise, deleteWorkoutExercise } =
    useStore();
  const [date, setDate] = useState<string>(todayISO());
  const [pickerOpen, setPickerOpen] = useState(false);

  if (!hydrated) return <div className="loading">Loading…</div>;

  const unit = settings.weightUnit;
  const workout = workoutForDate(workouts, date);
  const exercises = workout?.exercises ?? [];
  const isToday = date === todayISO();
  const closed = isDayClosed(date);
  const cats = categorySets(exercises);
  const cardioMin = cardioMinutes(exercises);

  return (
    <div>
      <header className="day-nav">
        <button className="icon-btn" onClick={() => setDate(addDays(date, -1))} aria-label="Previous day">
          ‹
        </button>
        <div className="day-nav-center">
          <div className="day-title">{dayLabel(date)}</div>
          {!isToday && (
            <button className="link" onClick={() => setDate(todayISO())}>
              Jump to today
            </button>
          )}
        </div>
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day" disabled={isToday}>
          ›
        </button>
      </header>

      {exercises.length > 0 && (
        <section className="card">
          <div className="cat-tally">
            {CATEGORIES.map((c) => (
              <div className="cat-tally-item" key={c}>
                <span className={"cat-tally-num" + (cats[c] >= 3 ? " hit" : "")}>{cats[c]}</span>
                <span className="cat-tally-lbl">{CATEGORY_LABEL[c]}</span>
              </div>
            ))}
          </div>
          <div className="cat-tally-sub">
            sets per pattern today{cardioMin > 0 ? ` · ${cardioMin} min cardio` : ""}
          </div>
        </section>
      )}

      {closed && (
        <div className="day-closed" style={{ marginTop: exercises.length > 0 ? 14 : 16 }}>
          <IconLock width={18} height={18} />
          <div className="day-closed-text">
            <strong>Day closed</strong>
            <span>Locked — reopen it on the Today tab to make changes.</span>
          </div>
        </div>
      )}

      {exercises.length === 0 ? (
        <div className="empty" style={{ marginTop: 16 }}>
          {closed ? "This day was closed with no workout." : isToday ? "No workout logged yet." : "No workout on this day."}
          {!closed && (
            <>
              <br />
              Tap “Add exercise” to start.
            </>
          )}
        </div>
      ) : (
        <div className="exercise-list">
          {exercises.map((we) => (
            <ExerciseCard
              key={we.id}
              we={we}
              unit={unit}
              locked={closed}
              onPatch={(patch) => updateWorkoutExercise(date, we.id, patch)}
              onRemove={() => deleteWorkoutExercise(date, we.id)}
            />
          ))}
        </div>
      )}

      {!closed && (
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => setPickerOpen(true)}>
          <IconPlus width={20} height={20} /> Add exercise
        </button>
      )}

      <ExercisePicker open={pickerOpen} onClose={() => setPickerOpen(false)} onPick={(ex) => addExerciseToWorkout(date, ex)} />
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
  onPatch: (patch: { weight?: number; sets?: number; intensity?: CardioIntensity; minutes?: number }) => void;
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
      ) : (
        <CardioBody we={we} locked={locked} onPatch={onPatch} />
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
  onPatch: (patch: { weight?: number; sets?: number }) => void;
}) {
  const [weightStr, setWeightStr] = useState(we.weight != null ? String(we.weight) : "");

  return (
    <div className="log-row">
      <div className="seg-mini" role="group" aria-label="Sets">
        {[2, 3].map((n) => (
          <button key={n} className={we.sets === n ? "active" : ""} disabled={locked} onClick={() => onPatch({ sets: n })}>
            {n} sets
          </button>
        ))}
      </div>
      <div className="log-weight">
        <div className="set-field">
          <input
            type="number"
            inputMode="decimal"
            step={unit === "lb" ? 5 : 2.5}
            min={0}
            placeholder="0"
            readOnly={locked}
            value={weightStr}
            onChange={(e) => {
              setWeightStr(e.target.value);
              const w = Number(e.target.value);
              onPatch({ weight: Number.isFinite(w) && w > 0 ? w : undefined });
            }}
            aria-label="Weight"
          />
          <span className="set-unit">{unit}</span>
        </div>
        <span className="log-reps">× 8</span>
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
  onPatch: (patch: { intensity?: CardioIntensity; minutes?: number }) => void;
}) {
  const [minStr, setMinStr] = useState(we.minutes != null ? String(we.minutes) : "");

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
          inputMode="numeric"
          min={0}
          placeholder="0"
          readOnly={locked}
          value={minStr}
          onChange={(e) => {
            setMinStr(e.target.value);
            const m = Number(e.target.value);
            onPatch({ minutes: Number.isFinite(m) && m > 0 ? m : undefined });
          }}
          aria-label="Minutes"
        />
        <span className="set-unit">min</span>
      </div>
    </div>
  );
}
