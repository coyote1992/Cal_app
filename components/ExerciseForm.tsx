"use client";

// Inline create/edit form for a library exercise — rendered in place inside a
// category dropdown on the Log page. The category decides the kind of log
// (sets × reps, cardio hours, or stretching minutes).

import { useState } from "react";
import type { Exercise, ExerciseCategory } from "@/lib/types";
import { CATEGORY_LABEL, LOG_CATEGORIES } from "@/lib/gym";
import { IconTrash } from "./icons";

export default function ExerciseForm({
  exercise,
  defaultCategory,
  onSave,
  onCancel,
  onDelete,
}: {
  /** The exercise being edited, or null to create a new one. */
  exercise: Exercise | null;
  defaultCategory: ExerciseCategory;
  onSave: (input: { name: string; category: ExerciseCategory }) => void;
  onCancel: () => void;
  onDelete?: () => void;
}) {
  const [name, setName] = useState(exercise?.name ?? "");
  const [category, setCategory] = useState<ExerciseCategory>(exercise?.category ?? defaultCategory);

  return (
    <div className="inline-form">
      <div className="field">
        <label htmlFor="xf-name">Exercise name</label>
        <input
          id="xf-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Bulgarian Split Squat"
          autoFocus={!exercise}
        />
      </div>
      <div className="field">
        <label>Category</label>
        <div className="cat-picker">
          {LOG_CATEGORIES.map((c) => (
            <button key={c} className={"cat-opt" + (category === c ? " active" : "")} onClick={() => setCategory(c)}>
              {CATEGORY_LABEL[c]}
            </button>
          ))}
        </div>
      </div>
      <div className="ae-row">
        <button className="btn btn-ghost" style={{ flex: 1 }} onClick={onCancel}>
          Cancel
        </button>
        <button
          className="btn btn-primary"
          style={{ flex: 1.4 }}
          disabled={!name.trim()}
          onClick={() => onSave({ name, category })}
        >
          {exercise ? "Save" : "Create & add"}
        </button>
      </div>
      {onDelete && (
        <button
          className="btn-link-danger"
          onClick={() => {
            if (confirm(`Delete “${exercise?.name}”? Workouts you've already logged won't change.`)) onDelete();
          }}
        >
          <IconTrash width={15} height={15} /> Delete exercise
        </button>
      )}
    </div>
  );
}
