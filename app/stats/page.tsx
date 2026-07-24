"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "@/app/store";
import type { Entry, Workout } from "@/lib/types";
import {
  addDays,
  addMonths,
  dayNumber,
  dowHeaders,
  fromISO,
  monthDays,
  monthLabel,
  monthLeadingBlanks,
  shortDow,
  todayISO,
  weekDays,
  weekRangeLabel,
} from "@/lib/date";
import { closedSummary, proteinByDate, totalsByDate } from "@/lib/calc";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  cardioMinutesOnDays,
  categorySetsOnDays,
  distinctWeeks,
  gymDaySet,
  gymSummary,
} from "@/lib/gym";
import type { ExerciseCategory } from "@/lib/types";
import { IconDumbbell } from "@/components/icons";
import { formatKcal } from "@/lib/util";

type View = "week" | "month";

export default function StatsPage() {
  const { hydrated, entries, workouts, closedDays, settings } = useStore();
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState<string>(todayISO());

  if (!hydrated) return <div className="loading">Loading…</div>;

  return (
    <div>
      <h1 className="page-title">Stats</h1>
      <div className="segmented" style={{ marginBottom: 16 }}>
        <button
          className={view === "week" ? "active" : ""}
          onClick={() => {
            setView("week");
            setAnchor(todayISO());
          }}
        >
          Week
        </button>
        <button
          className={view === "month" ? "active" : ""}
          onClick={() => {
            setView("month");
            setAnchor(todayISO());
          }}
        >
          Month
        </button>
      </div>

      {view === "week" ? (
        <WeekView
          entries={entries}
          workouts={workouts}
          closedDays={closedDays}
          budget={settings.dailyBudget}
          proteinGoal={settings.proteinGoal}
          categoryGoals={settings.categoryGoals}
          weekStartsOn={settings.weekStartsOn}
          anchor={anchor}
          setAnchor={setAnchor}
        />
      ) : (
        <MonthView
          entries={entries}
          workouts={workouts}
          closedDays={closedDays}
          budget={settings.dailyBudget}
          proteinGoal={settings.proteinGoal}
          categoryGoals={settings.categoryGoals}
          weekStartsOn={settings.weekStartsOn}
          anchor={anchor}
          setAnchor={setAnchor}
        />
      )}
    </div>
  );
}

interface ViewProps {
  entries: Entry[];
  workouts: Workout[];
  closedDays: string[];
  budget: number;
  proteinGoal: number;
  categoryGoals: Record<ExerciseCategory, number>;
  weekStartsOn: 0 | 1;
  anchor: string;
  setAnchor: (iso: string) => void;
}

/** Gym stats for the week: gym days, sets-vs-goal bars for the week, sets per
 *  movement pattern with every lift logged and its contribution, and cardio. */
function GymStats({
  workouts,
  isoDays,
  denom,
  categoryGoals,
}: {
  workouts: Workout[];
  isoDays: string[];
  denom: number;
  categoryGoals: Record<ExerciseCategory, number>;
}) {
  const g = gymSummary(workouts, isoDays);
  const c = g.cardio;
  return (
    <>
      <h2 className="section-title">Gym</h2>
      <div className="gym-days">
        <span className="gym-days-num">
          {g.gymDays}
          <span className="gym-days-den">/{denom}</span>
        </span>
        <span className="gym-days-lbl">gym days{c.sessions > 0 ? ` · ${c.sessions} cardio · ${c.minutes} min` : ""}</span>
      </div>

      <div className="card goal-card">
        <div className="goal-title">Sets this week</div>
        {CATEGORIES.map((cat) => {
          const sets = g.categorySets[cat];
          const goal = categoryGoals[cat] || 0;
          const pct = goal > 0 ? Math.min((sets / goal) * 100, 100) : 0;
          const met = goal > 0 && sets >= goal;
          return (
            <div className="goal-row" key={cat}>
              <div className="goal-row-head">
                <span>{CATEGORY_LABEL[cat]}</span>
                <span className="goal-row-val">
                  {sets}
                  <span className="goal-row-goal"> / {goal}</span>
                </span>
              </div>
              <div className="goal-bar">
                <div className={"goal-bar-fill" + (met ? " met" : "")} style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      <div className="cat-breakdown">
        {CATEGORIES.map((cat) => (
          <div className="cbd" key={cat}>
            <div className="cbd-head">
              <span>{CATEGORY_LABEL[cat]}</span>
              <span className="cbd-sets">{g.categorySets[cat]} sets</span>
            </div>
            {g.byCategory[cat].length > 0 ? (
              g.byCategory[cat].map((e) => (
                <div className="cbd-ex" key={e.name}>
                  <span className="cbd-ex-name">{e.name}</span>
                  <span className="cbd-ex-sets">{e.sets}</span>
                </div>
              ))
            ) : (
              <div className="cbd-empty">no sets</div>
            )}
          </div>
        ))}
      </div>

      {c.sessions > 0 && (
        <div className="card cardio-card">
          <div className="cbd-head">
            <span>Cardio</span>
            <span className="cbd-sets">{c.minutes} min</span>
          </div>
          <div className="cardio-split">
            <span>Low {c.byIntensity.low}′</span>
            <span>Med {c.byIntensity.medium}′</span>
            <span>High {c.byIntensity.high}′</span>
          </div>
        </div>
      )}
    </>
  );
}

function WeekView({ entries, workouts, closedDays, budget, proteinGoal, categoryGoals, weekStartsOn, anchor, setAnchor }: ViewProps) {
  const today = todayISO();
  const days = weekDays(anchor, weekStartsOn);
  const byDate = totalsByDate(entries);
  const proteinBy = proteinByDate(entries);
  const totals = days.map((d) => byDate.get(d) ?? 0);
  const proteins = days.map((d) => proteinBy.get(d) ?? 0);
  // "Days logged" and the averages count only days the user closed.
  const closedInWeek = days.filter((d) => closedDays.includes(d));
  const cs = closedSummary(entries, closedInWeek, budget);
  // Two scales sharing one chart: calories set the height, and the protein goal
  // line sits at half the calorie budget line's height, so each metric reads
  // against its own reference (bars scaled so hitting the goal reaches the line).
  const calMax = Math.max(budget, ...totals, 1);
  const budgetY = budget > 0 ? (budget / calMax) * 100 : 0;
  const proteinY = budgetY / 2;
  const calH = (c: number) => Math.min((c / calMax) * 100, 100);
  const proH = (p: number) => (proteinGoal > 0 && proteinY > 0 ? Math.min((p / proteinGoal) * proteinY, 100) : 0);
  const start = days[0];
  const end = days[6];

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setAnchor(addDays(anchor, -7))} aria-label="Previous week">
          ‹
        </button>
        <div style={{ fontWeight: 700 }}>{weekRangeLabel(start, end)}</div>
        <button
          className="icon-btn"
          onClick={() => setAnchor(addDays(anchor, 7))}
          aria-label="Next week"
          disabled={start > today}
        >
          ›
        </button>
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="legend-swatch cal" /> Calories
        </span>
        <span className="legend-item">
          <span className="legend-swatch pro" /> Protein
        </span>
      </div>

      <div className="card">
        <div className="bars dual">
          {budget > 0 && (
            <div className="ref-line cal" style={{ bottom: `${budgetY}%` }}>
              <span className="ref-tag">{formatKcal(budget)}</span>
            </div>
          )}
          {proteinGoal > 0 && proteinY > 0 && (
            <div className="ref-line pro" style={{ bottom: `${proteinY}%` }}>
              <span className="ref-tag">{proteinGoal} g</span>
            </div>
          )}
          {days.map((d, i) => {
            const over = budget > 0 && totals[i] > budget;
            return (
              <div className="bar-track dual" key={d}>
                <div
                  className={"bar cal" + (over ? " over" : "")}
                  style={{ height: `${calH(totals[i])}%` }}
                  title={`${formatKcal(totals[i])} kcal`}
                />
                <div className="bar pro" style={{ height: `${proH(proteins[i])}%` }} title={`${Math.round(proteins[i])} g protein`} />
              </div>
            );
          })}
        </div>
        <div className="bar-labels">
          {days.map((d) => (
            <div className={"bar-label" + (d === today ? " today" : "")} key={d}>
              {shortDow(d)}
            </div>
          ))}
        </div>
      </div>

      <div className="tiles" style={{ marginTop: 14 }}>
        <div className="tile">
          <div className="tile-num">{cs.closedDays > 0 ? formatKcal(cs.avgKcal) : "–"}</div>
          <div className="tile-lbl">Avg kcal / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {cs.closedDays > 0 ? formatKcal(cs.avgProtein) : "–"}
            {cs.closedDays > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}> g</span>}
          </div>
          <div className="tile-lbl">Avg protein / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {cs.closedDays}
            <span style={{ fontSize: 13, color: "var(--muted)" }}>/7</span>
          </div>
          <div className="tile-lbl">Days logged</div>
        </div>
      </div>

      {budget > 0 && cs.daysOver > 0 && (
        <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
          {cs.daysOver} {cs.daysOver === 1 ? "day" : "days"} over budget this week.
        </p>
      )}

      <GymStats workouts={workouts} isoDays={days} denom={7} categoryGoals={categoryGoals} />
    </div>
  );
}

function MonthView({ entries, workouts, closedDays, budget, proteinGoal, categoryGoals, weekStartsOn, anchor, setAnchor }: ViewProps) {
  const today = todayISO();
  const days = monthDays(anchor);
  const byDate = totalsByDate(entries);
  const proteinBy = proteinByDate(entries);
  const gymDays = gymDaySet(workouts);
  const blanks = monthLeadingBlanks(anchor, weekStartsOn);
  const headers = dowHeaders(weekStartsOn);

  // Everything "logged" is measured over closed days (close-button presses).
  const closedInMonth = days.filter((d) => closedDays.includes(d));
  const cs = closedSummary(entries, closedInMonth, budget);
  const closedWeeks = distinctWeeks(closedInMonth, weekStartsOn);
  const catSets = categorySetsOnDays(workouts, closedInMonth);
  const cardioMin = cardioMinutesOnDays(workouts, closedInMonth);

  const a = fromISO(anchor);
  const n = fromISO(today);
  const nextDisabled =
    a.getFullYear() > n.getFullYear() || (a.getFullYear() === n.getFullYear() && a.getMonth() >= n.getMonth());

  // Calendar colour: equal-weighted score of hitting the calorie target (at/under
  // budget) and the protein target (at/over goal). Green when both met, red when
  // both missed (over on kcal, under on protein).
  function cellStyle(kcal: number, protein: number): CSSProperties {
    if (kcal <= 0 && protein <= 0) return {};
    const calScore = budget > 0 ? (kcal <= budget ? 1 : Math.max(0, 1 - (kcal - budget) / budget)) : 0.5;
    const proScore = proteinGoal > 0 ? Math.min(protein / proteinGoal, 1) : 0.5;
    const s = (calScore + proScore) / 2;
    const blend = `color-mix(in srgb, var(--accent) ${Math.round(s * 100)}%, var(--danger))`;
    return { background: `color-mix(in srgb, ${blend} 26%, transparent)`, borderColor: "transparent" };
  }

  const fmtAvg = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1));

  return (
    <div>
      <div className="row-between" style={{ marginBottom: 12 }}>
        <button className="icon-btn" onClick={() => setAnchor(addMonths(anchor, -1))} aria-label="Previous month">
          ‹
        </button>
        <div style={{ fontWeight: 700 }}>{monthLabel(anchor)}</div>
        <button
          className="icon-btn"
          onClick={() => setAnchor(addMonths(anchor, 1))}
          aria-label="Next month"
          disabled={nextDisabled}
        >
          ›
        </button>
      </div>

      <div className="card logged-banner">
        <span className="logged-num">
          {cs.closedDays}
          <span className="logged-den">/{days.length}</span>
        </span>
        <span className="logged-lbl">days logged (closed) this month</span>
      </div>

      <div className="month-cols">
        <div className="month-col-left">
          <div className="tile">
            <div className="tile-num">{cs.closedDays > 0 ? formatKcal(cs.avgKcal) : "–"}</div>
            <div className="tile-lbl">kcal / day</div>
          </div>
          <div className="tile">
            <div className="tile-num">
              {cs.closedDays > 0 ? formatKcal(cs.avgProtein) : "–"}
              {cs.closedDays > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}> g</span>}
            </div>
            <div className="tile-lbl">protein / day</div>
          </div>
        </div>

        <div className="month-col-right card">
          <div className="goal-title">Avg sets / closed week</div>
          {CATEGORIES.map((cat) => {
            const avg = closedWeeks > 0 ? catSets[cat] / closedWeeks : 0;
            const goal = categoryGoals[cat] || 0;
            const pct = goal > 0 ? Math.min((avg / goal) * 100, 100) : 0;
            const met = goal > 0 && avg >= goal;
            return (
              <div className="goal-row" key={cat}>
                <div className="goal-row-head">
                  <span>{CATEGORY_LABEL[cat]}</span>
                  <span className="goal-row-val">
                    {fmtAvg(avg)}
                    <span className="goal-row-goal"> / {goal}</span>
                  </span>
                </div>
                <div className="goal-bar">
                  <div className={"goal-bar-fill" + (met ? " met" : "")} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
          {cardioMin > 0 && <div className="goal-cardio">Cardio · {cardioMin} min</div>}
        </div>
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <div className="cal-grid">
          {headers.map((h, i) => (
            <div className="cal-dow" key={i}>
              {h}
            </div>
          ))}
          {Array.from({ length: blanks }).map((_, i) => (
            <div className="cal-cell month blank" key={"b" + i} />
          ))}
          {days.map((d) => {
            const k = byDate.get(d) ?? 0;
            const p = proteinBy.get(d) ?? 0;
            return (
              <div key={d} className={"cal-cell month" + (d === today ? " today" : "")} style={cellStyle(k, p)}>
                <span className="cal-day">{dayNumber(d)}</span>
                {gymDays.has(d) && <IconDumbbell className="cal-gym-ic" width={11} height={11} />}
                {k > 0 && <span className="cal-k">{formatKcal(k)}</span>}
                {p > 0 && <span className="cal-p">{Math.round(p)}g</span>}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
