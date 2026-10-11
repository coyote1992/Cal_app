"use client";

// The exercise library, right on the Log page: a stacked "Recent" list, then
// one dropdown per category (push, pull, lower, arms & delt, cardio,
// stretching). Tap an exercise to add it to the day — pre-filled from the last
// time you did it — and adjust it in the log below. The pencil edits/deletes a
// library exercise in place; "New exercise" creates one in place.

import { useEffect, useMemo, useState } from "react";
import type { Exercise, ExerciseCategory } from "@/lib/types";
import { useStore } from "@/app/store";
import {
  CATEGORY_LABEL,
  describeLog,
  exercisesByCategory,
  kindForCategory,
  lastLogForExercise,
  recentExercises,
  workoutForDate,
} from "@/lib/gym";
import Dropdown from "./Dropdown";
import ExerciseForm from "./ExerciseForm";
import { IconPencil, IconPlus } from "./icons";

export default function ExerciseBrowser({ date }: { date: string }) {
  const { exercises, workouts, settings, addExercise, updateExercise, deleteExercise, addExerciseToWorkout } = useStore();
  const [openCats, setOpenCats] = useState<Set<ExerciseCategory>>(new Set());
  // "edit:<id>" for an exercise being edited, "new:<category>" for a new one.
  const [form, setForm] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const groups = useMemo(() => exercisesByCategory(exercises), [exercises]);
  const recents = useMemo(() => recentExercises(workouts, 5), [workouts]);
  const today = workoutForDate(workouts, date)?.exercises ?? [];

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2000);
    return () => clearTimeout(t);
  }, [toast]);

  const unit = settings.weightUnit;

  function toggle(c: ExerciseCategory) {
    setOpenCats((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });
    setForm(null);
  }

  function addToDay(ex: { id?: string; name: string; category: ExerciseCategory }) {
    addExerciseToWorkout(date, { ...ex, kind: kindForCategory(ex.category) });
    setToast(`Added ${ex.name}`);
  }

  function countToday(ex: { id?: string; name: string }): number {
    const key = ex.name.trim().toLowerCase();
    return today.filter((e) => (ex.id ? e.exerciseId === ex.id : e.name.trim().toLowerCase() === key)).length;
  }

  function sub(ex: { id?: string; name: string }): string {
    const last = lastLogForExercise(workouts, { exerciseId: ex.id, name: ex.name }, date);
    return last ? describeLog(last, unit) : "";
  }

  function pickRow(ex: { id?: string; name: string; category: ExerciseCategory }, key: string, editable: boolean) {
    const n = countToday(ex);
    const s = sub(ex);
    return (
      <div key={key} className="pick-row">
        <button className="pick-main" onClick={() => addToDay(ex)} aria-label={`Add ${ex.name}`}>
          <span className="pick-name">
            {ex.name}
            {n > 0 && <span className="pick-badge">{n}× today</span>}
          </span>
          {(s || !editable) && (
            <span className="pick-sub">{[!editable ? CATEGORY_LABEL[ex.category] : "", s].filter(Boolean).join(" · ")}</span>
          )}
        </button>
        {editable && ex.id && (
          <button className="icon-btn muted" onClick={() => setForm(`edit:${ex.id}`)} aria-label={`Edit ${ex.name}`}>
            <IconPencil width={17} height={17} />
          </button>
        )}
        <button className="pick-plus" onClick={() => addToDay(ex)} aria-hidden tabIndex={-1}>
          <IconPlus width={18} height={18} />
        </button>
      </div>
    );
  }

  function libraryRow(e: Exercise) {
    if (form === `edit:${e.id}`) {
      return (
        <ExerciseForm
          key={e.id}
          exercise={e}
          defaultCategory={e.category}
          onCancel={() => setForm(null)}
          onSave={({ name, category }) => {
            updateExercise(e.id, { name, category, kind: kindForCategory(category) });
            setForm(null);
            setOpenCats((prev) => new Set(prev).add(category));
          }}
          onDelete={() => {
            deleteExercise(e.id);
            setForm(null);
          }}
        />
      );
    }
    return pickRow(e, e.id, true);
  }

  function newRow(category: ExerciseCategory) {
    const key = `new:${category}`;
    if (form === key) {
      return (
        <ExerciseForm
          exercise={null}
          defaultCategory={category}
          onCancel={() => setForm(null)}
          onSave={({ name, category: cat }) => {
            const ex = addExercise({ name, category: cat, kind: kindForCategory(cat) });
            addToDay({ id: ex.id, name: ex.name, category: ex.category });
            setForm(null);
            setOpenCats((prev) => new Set(prev).add(ex.category));
          }}
        />
      );
    }
    return (
      <button className="add-row" onClick={() => setForm(key)}>
        <IconPlus width={15} height={15} /> New exercise
      </button>
    );
  }

  return (
    <div className="browser">
      {toast && <div className="added-toast">{toast} ✓</div>}

      {recents.length > 0 && (
        <div className="recent-block">
          <div className="mini-title">Recent</div>
          <div className="pick-list">
            {recents.map((e) =>
              pickRow({ id: e.exerciseId, name: e.name, category: e.category }, `r:${e.exerciseId ?? e.name}`, false),
            )}
          </div>
        </div>
      )}

      <div className="dd-list">
        {groups.map((g) => (
          <Dropdown
            key={g.category}
            title={CATEGORY_LABEL[g.category]}
            count={g.exercises.length}
            open={openCats.has(g.category)}
            onToggle={() => toggle(g.category)}
          >
            <div className="pick-list">
              {g.exercises.map(libraryRow)}
              {newRow(g.category)}
            </div>
          </Dropdown>
        ))}
      </div>
    </div>
  );
}
