"use client";

// The inline "add" panel that opens under an exercise: fill in the details
// (pre-filled from the last time) and add it to the day — no scrolling down to
// the log to finish the job.

import { useState } from "react";
import type { ExerciseCategory, ExerciseKind, WorkoutExercise } from "@/lib/types";
import { applyWorkoutPatch, describeLog, exerciseLogged, newWorkoutExercise } from "@/lib/gym";
import ExerciseFields from "./ExerciseFields";

export default function ExerciseAdder({
  exercise,
  prev,
  unit,
  onAdd,
}: {
  exercise: { id?: string; name: string; category: ExerciseCategory; kind: ExerciseKind };
  /** The last logged entry for this exercise, to pre-fill from. */
  prev?: WorkoutExercise;
  unit: string;
  onAdd: (we: WorkoutExercise) => void;
}) {
  const [draft, setDraft] = useState(() => newWorkoutExercise(exercise, prev));
  const ready = exerciseLogged(draft);
  const summary = describeLog(draft, unit);

  return (
    <div className="adder">
      <ExerciseFields
        we={draft}
        unit={unit}
        locked={false}
        onPatch={(patch) => setDraft((d) => applyWorkoutPatch(d, patch))}
      />
      <button className="btn btn-primary adder-add" disabled={!ready} onClick={() => onAdd(draft)}>
        Add{ready && summary ? ` · ${summary}` : ""}
      </button>
    </div>
  );
}
