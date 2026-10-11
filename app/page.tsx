"use client";

import { useEffect, useState } from "react";
import { useStore } from "./store";
import Ring from "@/components/Ring";
import BodyWeight from "@/components/BodyWeight";
import CaloriesSection from "@/components/CaloriesSection";
import MovementSection from "@/components/MovementSection";
import { IconLock } from "@/components/icons";
import { addDays, dayLabel, todayISO } from "@/lib/date";
import { caloriesForDate, proteinForDate } from "@/lib/calc";
import { formatKcal, formatQty } from "@/lib/util";

type Mode = "calories" | "movement";
const MODE_KEY = "calorie-tracker:log-mode";

export default function LogPage() {
  const { hydrated, entries, settings, isDayClosed, closeDay, reopenDay } = useStore();
  const [date, setDate] = useState<string>(todayISO());
  const [mode, setMode] = useState<Mode>("calories");

  // Remember which half you were in (a per-device convenience, nothing more).
  useEffect(() => {
    try {
      if (window.localStorage.getItem(MODE_KEY) === "movement") setMode("movement");
    } catch {}
  }, []);
  function pickMode(m: Mode) {
    setMode(m);
    try {
      window.localStorage.setItem(MODE_KEY, m);
    } catch {}
  }

  if (!hydrated) return <div className="loading">Loading…</div>;

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
        <button className="icon-btn" onClick={() => setDate(addDays(date, 1))} aria-label="Next day" disabled={isToday}>
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
      )}

      <BodyWeight key={`bw-${date}`} date={date} locked={closed} />

      <div className="segmented mode-toggle" role="tablist" aria-label="What to log">
        <button role="tab" aria-selected={mode === "calories"} className={mode === "calories" ? "active" : ""} onClick={() => pickMode("calories")}>
          Calories
        </button>
        <button role="tab" aria-selected={mode === "movement"} className={mode === "movement" ? "active" : ""} onClick={() => pickMode("movement")}>
          Movement
        </button>
      </div>

      {/* Remount per day so open panels / forms never carry over between days. */}
      {mode === "calories" ? (
        <CaloriesSection key={`sec-${date}`} date={date} locked={closed} />
      ) : (
        <MovementSection key={`sec-${date}`} date={date} locked={closed} />
      )}
    </div>
  );
}
