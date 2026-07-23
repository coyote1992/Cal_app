"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { useStore } from "@/app/store";
import type { Entry } from "@/lib/types";
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
import { summarizeRange, totalsByDate } from "@/lib/calc";
import { formatKcal } from "@/lib/util";

type View = "week" | "month";

export default function StatsPage() {
  const { hydrated, entries, settings } = useStore();
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
          budget={settings.dailyBudget}
          weekStartsOn={settings.weekStartsOn}
          anchor={anchor}
          setAnchor={setAnchor}
        />
      ) : (
        <MonthView
          entries={entries}
          budget={settings.dailyBudget}
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
  budget: number;
  weekStartsOn: 0 | 1;
  anchor: string;
  setAnchor: (iso: string) => void;
}

function WeekView({ entries, budget, weekStartsOn, anchor, setAnchor }: ViewProps) {
  const today = todayISO();
  const days = weekDays(anchor, weekStartsOn);
  const byDate = totalsByDate(entries);
  const totals = days.map((d) => byDate.get(d) ?? 0);
  const summary = summarizeRange(entries, days, budget);
  const maxVal = Math.max(budget, ...totals, 1);
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

      <div className="card">
        <div className="bars">
          {budget > 0 && (
            <div className="budget-line" style={{ bottom: `${(budget / maxVal) * 100}%` }}>
              <span className="budget-tag">{formatKcal(budget)}</span>
            </div>
          )}
          {days.map((d, i) => {
            const t = totals[i];
            const pct = (t / maxVal) * 100;
            const over = budget > 0 && t > budget;
            return (
              <div className="bar-track" key={d}>
                <div
                  className={"bar" + (over ? " over" : "")}
                  style={{ height: `${pct}%` }}
                  title={`${formatKcal(t)} kcal`}
                />
              </div>
            );
          })}
        </div>
        <div className="bar-labels">
          {days.map((d) => {
            const t = byDate.get(d) ?? 0;
            return (
              <div className={"bar-label" + (d === today ? " today" : "")} key={d}>
                {shortDow(d)}
                <span className="bar-value">{t > 0 ? formatKcal(t) : "–"}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tiles" style={{ marginTop: 14 }}>
        <div className="tile">
          <div className="tile-num">{summary.loggedDays > 0 ? formatKcal(summary.avgPerLoggedDay) : "–"}</div>
          <div className="tile-lbl">Avg kcal / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {summary.loggedDays > 0 ? formatKcal(summary.avgProteinPerLoggedDay) : "–"}
            {summary.loggedDays > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}> g</span>}
          </div>
          <div className="tile-lbl">Avg protein / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {summary.loggedDays}
            <span style={{ fontSize: 13, color: "var(--muted)" }}>/7</span>
          </div>
          <div className="tile-lbl">Days logged</div>
        </div>
      </div>

      {budget > 0 && summary.daysOver > 0 && (
        <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
          {summary.daysOver} {summary.daysOver === 1 ? "day" : "days"} over budget this week.
        </p>
      )}
    </div>
  );
}

function MonthView({ entries, budget, weekStartsOn, anchor, setAnchor }: ViewProps) {
  const today = todayISO();
  const days = monthDays(anchor);
  const byDate = totalsByDate(entries);
  const summary = summarizeRange(entries, days, budget);
  const blanks = monthLeadingBlanks(anchor, weekStartsOn);
  const headers = dowHeaders(weekStartsOn);

  const a = fromISO(anchor);
  const n = fromISO(today);
  const nextDisabled =
    a.getFullYear() > n.getFullYear() || (a.getFullYear() === n.getFullYear() && a.getMonth() >= n.getMonth());

  function cellStyle(t: number): CSSProperties {
    if (t <= 0) return {};
    if (budget > 0 && t > budget) {
      return { background: "color-mix(in srgb, var(--danger) 24%, transparent)", borderColor: "transparent" };
    }
    const ratio = budget > 0 ? Math.min(t / budget, 1) : 0.5;
    const mix = 12 + Math.round(ratio * 26); // 12%..38%
    return { background: `color-mix(in srgb, var(--accent) ${mix}%, transparent)`, borderColor: "transparent" };
  }

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

      <div className="tiles">
        <div className="tile">
          <div className="tile-num">{summary.loggedDays > 0 ? formatKcal(summary.avgPerLoggedDay) : "–"}</div>
          <div className="tile-lbl">Avg kcal / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {summary.loggedDays > 0 ? formatKcal(summary.avgProteinPerLoggedDay) : "–"}
            {summary.loggedDays > 0 && <span style={{ fontSize: 13, color: "var(--muted)" }}> g</span>}
          </div>
          <div className="tile-lbl">Avg protein / day</div>
        </div>
        <div className="tile">
          <div className="tile-num">
            {summary.loggedDays}
            <span style={{ fontSize: 13, color: "var(--muted)" }}>/{days.length}</span>
          </div>
          <div className="tile-lbl">Days logged</div>
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
            <div className="cal-cell blank" key={"b" + i} />
          ))}
          {days.map((d) => {
            const t = byDate.get(d) ?? 0;
            return (
              <div key={d} className={"cal-cell" + (d === today ? " today" : "")} style={cellStyle(t)}>
                <span className="d">{dayNumber(d)}</span>
                <span className="k">{t > 0 ? formatKcal(t) : ""}</span>
              </div>
            );
          })}
        </div>
      </div>

      {budget > 0 && summary.daysOver > 0 && (
        <p className="hint" style={{ textAlign: "center", marginTop: 10 }}>
          {summary.daysOver} {summary.daysOver === 1 ? "day" : "days"} over budget this month.
        </p>
      )}
    </div>
  );
}
