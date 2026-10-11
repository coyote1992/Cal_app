"use client";

// The day's food log. Tap a row to correct it in place (amount for a saved
// food; name / calories / protein for one typed in by hand); the bin removes it.

import { useState } from "react";
import type { Entry } from "@/lib/types";
import { useStore } from "@/app/store";
import { entriesForDate } from "@/lib/calc";
import { formatKcal, formatQty, isPer100 } from "@/lib/util";
import AmountEditor from "./AmountEditor";
import { IconTrash } from "./icons";

function entryMeta(e: Entry): string {
  const base =
    e.basis === "per100g"
      ? `${formatQty(e.quantity)} g · ${formatKcal(e.perUnit)} kcal/100g`
      : e.basis === "per100ml"
        ? `${formatQty(e.quantity)} ml · ${formatKcal(e.perUnit)} kcal/100ml`
        : e.foodId
          ? `${formatQty(e.quantity)} × ${formatKcal(e.perUnit)} kcal`
          : "";
  const prot = e.protein != null && e.protein > 0 ? `${formatQty(e.protein)} g protein` : "";
  return [base, prot].filter(Boolean).join(" · ");
}

export default function EntryLog({ date, locked }: { date: string; locked: boolean }) {
  const { entries, deleteEntry, updateEntry } = useStore();
  const [openId, setOpenId] = useState<string | null>(null);
  const list = entriesForDate(entries, date);

  if (list.length === 0) {
    return (
      <div className="empty">
        Nothing logged yet.
        <br />
        {locked ? "This day was closed empty." : "Add something above to start."}
      </div>
    );
  }

  return (
    <ul className="entry-list">
      {list.map((e) => {
        const open = openId === e.id && !locked;
        const meta = entryMeta(e);
        return (
          <li key={e.id} className={"entry-item" + (open ? " open" : "")}>
            <div className="entry-row">
              <button
                className="entry-main entry-tap"
                disabled={locked}
                onClick={() => setOpenId(open ? null : e.id)}
                aria-expanded={open}
              >
                <div className="entry-name">
                  {e.name}
                  {e.source === "photo" ? " 📷" : ""}
                </div>
                {meta && <div className="entry-meta">{meta}</div>}
              </button>
              <div className="entry-cal">{formatKcal(e.calories)}</div>
              {!locked && (
                <button className="icon-btn danger" onClick={() => deleteEntry(e.id)} aria-label={`Delete ${e.name}`}>
                  <IconTrash width={18} height={18} />
                </button>
              )}
            </div>
            {open && (
              <div className="inline-editor">
                {e.foodId ? (
                  <AmountEditor
                    name={e.name}
                    basis={e.basis}
                    rate={e.perUnit}
                    proteinRate={
                      e.protein != null && e.quantity > 0
                        ? isPer100(e.basis)
                          ? (e.protein * 100) / e.quantity
                          : e.protein / e.quantity
                        : undefined
                    }
                    initial={e.quantity}
                    addLabel="Save"
                    onAdd={(q) => {
                      updateEntry(e.id, { quantity: q });
                      setOpenId(null);
                    }}
                  />
                ) : (
                  <ManualEdit
                    entry={e}
                    onSave={(patch) => {
                      updateEntry(e.id, patch);
                      setOpenId(null);
                    }}
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function ManualEdit({
  entry,
  onSave,
}: {
  entry: Entry;
  onSave: (patch: { name: string; calories: number; protein: number | null }) => void;
}) {
  const [name, setName] = useState(entry.name);
  const [kcal, setKcal] = useState(String(entry.calories));
  const [protein, setProtein] = useState(entry.protein != null ? String(entry.protein) : "");
  const k = Math.round(Number(kcal));
  const valid = Number.isFinite(k) && k > 0;
  const p = Math.round(Number(protein));

  return (
    <div className="inline-form tight">
      <input className="input" value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" placeholder="Label" />
      <div className="ph-macros">
        <div className="ae-input-wrap wide">
          <input type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} aria-label="Calories" />
          <span className="ae-unit">kcal</span>
        </div>
        <div className="ae-input-wrap wide">
          <input
            type="number"
            inputMode="numeric"
            placeholder="0"
            value={protein}
            onChange={(e) => setProtein(e.target.value)}
            aria-label="Protein"
          />
          <span className="ae-unit">g P</span>
        </div>
      </div>
      <button
        className="btn btn-primary"
        disabled={!valid}
        onClick={() => onSave({ name, calories: k, protein: Number.isFinite(p) && p > 0 ? p : null })}
      >
        Save
      </button>
    </div>
  );
}
