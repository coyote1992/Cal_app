"use client";

import { useState } from "react";
import { useStore } from "./store";
import Ring from "@/components/Ring";
import SavedSheet from "@/components/SavedSheet";
import PhotoSheet from "@/components/PhotoSheet";
import QuickCaloriesSheet from "@/components/QuickCaloriesSheet";
import { IconBookmark, IconCamera, IconHash, IconLock, IconTrash } from "@/components/icons";
import { addDays, dayLabel, todayISO } from "@/lib/date";
import { caloriesForDate, entriesForDate, proteinForDate } from "@/lib/calc";
import { formatKcal, formatQty } from "@/lib/util";

export default function TodayPage() {
  const { hydrated, entries, settings, deleteEntry, isDayClosed, closeDay, reopenDay } = useStore();
  const [date, setDate] = useState<string>(todayISO());
  const [savedOpen, setSavedOpen] = useState(false);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);

  if (!hydrated) return <div className="loading">Loading…</div>;

  const dayEntries = entriesForDate(entries, date);
  const consumed = caloriesForDate(entries, date);
  const protein = proteinForDate(entries, date);
  const budget = settings.dailyBudget;
  const proteinGoal = settings.proteinGoal;
  const calLeft = budget - consumed;
  const proteinLeft = proteinGoal - protein;
  const isToday = date === todayISO();
  const closed = isDayClosed(date);

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
        <div className="rings-row">
          <div className="ring-col">
            <Ring value={consumed} goal={budget} unit="kcal" size={176} stroke={15} overIsBad gradId="calGrad" />
            <div className="ring-cap">
              <div className={"ring-cap-main" + (calLeft < 0 ? " neg" : "")}>
                {calLeft >= 0 ? `${formatKcal(calLeft)} left` : `${formatKcal(-calLeft)} over`}
              </div>
              <div className="ring-cap-sub">of {formatKcal(budget)} kcal</div>
            </div>
          </div>
          <div className="ring-col">
            <Ring value={protein} goal={proteinGoal} unit="g" size={132} stroke={12} gradId="proGrad" />
            <div className="ring-cap">
              <div className="ring-cap-main">
                {proteinLeft > 0 ? `${formatQty(proteinLeft)} g to go` : "goal reached"}
              </div>
              <div className="ring-cap-sub">of {formatQty(proteinGoal)} g protein</div>
            </div>
          </div>
        </div>
      </section>

      {closed ? (
        <div className="day-closed">
          <IconLock width={18} height={18} />
          <div className="day-closed-text">
            <strong>Day closed</strong>
            <span>This day is locked — no more changes.</span>
          </div>
          <button
            className="link"
            onClick={() => {
              if (confirm("Reopen this day so it can be edited again?")) reopenDay(date);
            }}
          >
            Reopen
          </button>
        </div>
      ) : (
        <>
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

          <button
            className="close-day-btn"
            onClick={() => {
              if (confirm(`Close ${isToday ? "today" : "this day"}? You won't be able to change it afterwards (you can still reopen it).`)) {
                closeDay(date);
              }
            }}
          >
            <IconLock width={15} height={15} />
            Close {isToday ? "today" : "this day"}
          </button>
        </>
      )}

      <h2 className="section-title">
        Log <span className="count">{dayEntries.length}</span>
      </h2>
      {dayEntries.length === 0 ? (
        <div className="empty">
          Nothing logged yet.
          <br />
          {closed ? "This day was closed empty." : "Tap a button above to start."}
        </div>
      ) : (
        <ul className="entry-list">
          {dayEntries.map((e) => {
            const base =
              e.basis === "per100g"
                ? `${formatQty(e.quantity)} g · ${formatKcal(e.perUnit)} kcal/100g`
                : e.basis === "per100ml"
                  ? `${formatQty(e.quantity)} ml · ${formatKcal(e.perUnit)} kcal/100ml`
                  : `${formatQty(e.quantity)} × ${formatKcal(e.perUnit)} kcal`;
            const meta = e.protein != null && e.protein > 0 ? `${base} · ${formatQty(e.protein)} g P` : base;
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
                {!closed && (
                  <button className="icon-btn danger" onClick={() => deleteEntry(e.id)} aria-label={`Delete ${e.name}`}>
                    <IconTrash width={18} height={18} />
                  </button>
                )}
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
