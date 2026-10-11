"use client";

// The day's movement log: one card per logged exercise, edited right there —
// sets and reps (any number), weight or bodyweight, cardio intensity + hours,
// stretching sets × seconds. The bin removes it.

import { useState } from "react";
import type { WorkoutExercise } from "@/lib/types";
import { useStore } from "@/app/store";
import { CATEGORY_LABEL, workoutForDate } from "@/lib/gym";
import type { WorkoutExercisePatch } from "@/lib/gym";
import ExerciseFields from "./ExerciseFields";
import { IconPulse, IconTrash } from "./icons";

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
      <ExerciseFields we={we} unit={unit} locked={locked} onPatch={onPatch} />
    </div>
  );
}
