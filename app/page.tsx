"use client";

import { useState } from "react";
import { useStore } from "./store";
import CalorieRing from "@/components/CalorieRing";
import SavedSheet from "@/components/SavedSheet";
import PhotoSheet from "@/components/PhotoSheet";
import QuickCaloriesSheet from "@/components/QuickCaloriesSheet";
import { IconBookmark, IconCamera, IconHash, IconTrash } from "@/components/icons";
import { addDays, dayLabel, todayISO } from "@/lib/date";
import { caloriesForDate, entriesForDate } from "@/lib/calc";
import { formatKcal, formatQty } from "@/lib/util";

export default function TodayPage() {
  const { hydrated, entries, settings, deleteEntry } = useStore();
  const [date, setDate] = useState<string>(todayISO());
  const [savedOpen, setSavedOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  if (!hydrated) return <div className="loading">Loading…</div>;

  const dayEntries = entriesForDate(entries, date);
  const consumed = caloriesForDate(entries, date);
  const budget = settings.dailyBudget;
  const remaining = budget - consumed;
  const isToday = date === todayISO();

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
        <button
          className="icon-btn"
          onClick={() => setDate(addDays(date, 1))}
          aria-label="Next day"
          disabled={isToday}
        >
          ›
        </button>
      </header>

      <section className="card ring-card">
        <CalorieRing consumed={consumed} budget={budget} />
        <div className="stat-row">
          <div className="stat">
            <span className="stat-num">{formatKcal(budget)}</span>
            <span className="stat-lbl">Budget</span>
          </div>
          <div className="stat">
            <span className="stat-num">{formatKcal(consumed)}</span>
            <span className="stat-lbl">Food</span>
          </div>
          <div className="stat">
            <span className={"stat-num" + (remaining < 0 ? " neg" : "")}>{formatKcal(remaining)}</span>
            <span className="stat-lbl">Remaining</span>
          </div>
        </div>
      </section>

      <div className="today-actions">
        <button className="action-btn accent" onClick={() => setSavedOpen(true)}>
          <IconBookmark className="action-ic" width={22} height={22} />
          <span className="action-title">Saved</span>
          <span className="action-sub">your foods</span>
        </button>
        <button className="action-btn" onClick={() => setPhotoOpen(true)}>
          <IconCamera className="action-ic" width={22} height={22} />
          <span className="action-title">Photo</span>
          <span className="action-sub">AI estimate</span>
        </button>
        <button className="action-btn" onClick={() => setQuickOpen(true)}>
          <IconHash className="action-ic" width={22} height={22} />
          <span className="action-title">Calories</span>
          <span className="action-sub">type a number</span>
        </button>
      </div>

      <h2 className="section-title">
        Log <span className="count">{dayEntries.length}</span>
      </h2>
      {dayEntries.length === 0 ? (
        <div className="empty">
          Nothing logged yet.
          <br />
          Tap a button above to start.
        </div>
      ) : (
        <ul className="entry-list">
          {dayEntries.map((e) => {
            const meta =
              e.basis === "per100g"
                ? `${formatQty(e.quantity)} g · ${formatKcal(e.perUnit)} kcal/100g`
                : e.basis === "per100ml"
                  ? `${formatQty(e.quantity)} ml · ${formatKcal(e.perUnit)} kcal/100ml`
                  : `${formatQty(e.quantity)} × ${formatKcal(e.perUnit)} kcal`;
            return (
              <li key={e.id} className="entry-row">
                <div className="entry-main">
                  <div className="entry-name">
                    {e.name}
                    {e.source === "photo" ? " 📷" : ""}
                  </div>
                  <div className="entry-meta">{meta}</div>
                </div>
                <div className="entry-cal">{formatKcal(e.calories)}</div>
                <button className="icon-btn danger" onClick={() => deleteEntry(e.id)} aria-label={`Delete ${e.name}`}>
                  <IconTrash width={18} height={18} />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <SavedSheet open={savedOpen} onClose={() => setSavedOpen(false)} date={date} />
      <PhotoSheet open={photoOpen} onClose={() => setPhotoOpen(false)} date={date} />
      <QuickCaloriesSheet open={quickOpen} onClose={() => setQuickOpen(false)} date={date} />
    </div>
  );
}
