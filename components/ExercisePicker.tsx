"use client";

// Pick an exercise to add to the current workout: browse it in four columns
// (push / pull / lower / other), search, or create a new one — strength or
// cardio. Cardio exercises are flagged with a pulse mark.

import { useEffect, useMemo, useState } from "react";
import type { Exercise, ExerciseCategory, ExerciseKind } from "@/lib/types";
import { useStore } from "@/app/store";
import { CATEGORIES, CATEGORY_LABEL, exercisesByCategory } from "@/lib/gym";
import { IconPulse, IconTrash } from "./icons";

type PickedExercise = { id?: string; name: string; category: ExerciseCategory; kind: ExerciseKind };

export default function ExercisePicker({
  open,
  onClose,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (exercise: PickedExercise) => void;
}) {
  const { exercises, addExercise, deleteExercise } = useStore();
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<ExerciseCategory>("push");
  const [newKind, setNewKind] = useState<ExerciseKind>("strength");

  const groups = useMemo(() => exercisesByCategory(exercises), [exercises]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setCreating(false);
      setNewName("");
      setNewCategory("push");
      setNewKind("strength");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? exercises.filter((e) => e.name.toLowerCase().includes(q)).sort((a, b) => a.name.localeCompare(b.name)) : []),
    [exercises, q],
  );

  if (!open) return null;

  function pick(e: Exercise) {
    onPick({ id: e.id, name: e.name, category: e.category, kind: e.kind });
    onClose();
  }

  function createAndPick() {
    const name = newName.trim();
    if (!name) return;
    const ex = addExercise({ name, category: newCategory, kind: newKind });
    onPick({ id: ex.id, name: ex.name, category: ex.category, kind: ex.kind });
    onClose();
  }

  const ExItem = ({ e }: { e: Exercise }) => (
    <div className="ex-item-row">
      <button className="ex-item" onClick={() => pick(e)}>
        {e.kind === "cardio" && <IconPulse className="ex-cardio-ic" width={13} height={13} />}
        {e.name}
      </button>
      <button
        className="ex-item-del"
        onClick={(ev) => {
          ev.stopPropagation();
          if (confirm(`Delete "${e.name}"? This won't change workouts you've already logged.`)) deleteExercise(e.id);
        }}
        aria-label={`Delete ${e.name}`}
      >
        <IconTrash width={14} height={14} />
      </button>
    </div>
  );

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Add exercise">
        <div className="sheet-head">
          <div className="sheet-title">Add exercise</div>
          <button className="link" onClick={onClose}>
            Done
          </button>
        </div>

        {creating ? (
          <div className="new-exercise">
            <div className="field">
              <label htmlFor="ex-name">Exercise name</label>
              <input
                id="ex-name"
                className="input"
                autoFocus
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Bulgarian Split Squat"
              />
            </div>
            <div className="field">
              <label>Type</label>
              <div className="segmented">
                <button className={newKind === "strength" ? "active" : ""} onClick={() => setNewKind("strength")}>
                  Strength
                </button>
                <button className={newKind === "cardio" ? "active" : ""} onClick={() => setNewKind("cardio")}>
                  Cardio
                </button>
              </div>
            </div>
            <div className="field">
              <label>Category</label>
              <div className="cat-picker">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    className={"cat-opt" + (newCategory === c ? " active" : "")}
                    onClick={() => setNewCategory(c)}
                  >
                    {CATEGORY_LABEL[c]}
                  </button>
                ))}
              </div>
            </div>
            <div className="ae-row">
              <button className="btn btn-ghost" style={{ flex: 1 }} onClick={() => setCreating(false)}>
                Back
              </button>
              <button className="btn btn-primary" style={{ flex: 1 }} disabled={!newName.trim()} onClick={createAndPick}>
                Create & add
              </button>
            </div>
          </div>
        ) : (
          <>
            <input
              className="input search"
              placeholder="Search exercises…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-ghost btn-block" style={{ marginBottom: 12 }} onClick={() => setCreating(true)}>
              ＋ New exercise
            </button>

            {q ? (
              matches.length ? (
                <div className="ex-flat">
                  {matches.map((e) => (
                    <ExItem key={e.id} e={e} />
                  ))}
                </div>
              ) : (
                <div className="empty">No exercises match “{query}”.</div>
              )
            ) : exercises.length === 0 ? (
              <div className="empty">
                No exercises yet.
                <br />
                Tap “New exercise” to build your library.
              </div>
            ) : (
              <div className="ex-cats">
                {groups.map((g) => (
                  <div key={g.category} className="ex-cat">
                    <div className="ex-cat-head">{CATEGORY_LABEL[g.category]}</div>
                    <div className="ex-cat-list">
                      {g.exercises.length ? (
                        g.exercises.map((e) => <ExItem key={e.id} e={e} />)
                      ) : (
                        <div className="ex-cat-empty">—</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
