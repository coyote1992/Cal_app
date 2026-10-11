"use client";

// The "calories" half of the Log page: AI photo + typed calories (both open
// inline), the saved foods, and the day's food log.

import { useState } from "react";
import { useStore } from "@/app/store";
import { entriesForDate } from "@/lib/calc";
import EntryLog from "./EntryLog";
import FoodBrowser from "./FoodBrowser";
import PhotoPanel from "./PhotoPanel";
import QuickCaloriesPanel from "./QuickCaloriesPanel";
import { IconCamera, IconHash } from "./icons";

export default function CaloriesSection({ date, locked }: { date: string; locked: boolean }) {
  const { entries } = useStore();
  const [panel, setPanel] = useState<"photo" | "quick" | null>(null);
  const count = entriesForDate(entries, date).length;

  return (
    <>
      {!locked && (
        <>
          <div className="today-actions two">
            <button className={"action-btn" + (panel === "photo" ? " on" : "")} onClick={() => setPanel(panel === "photo" ? null : "photo")}>
              <IconCamera className="action-ic" width={22} height={22} />
              <span className="action-title">Photo</span>
              <span className="action-sub">AI estimate</span>
            </button>
            <button className={"action-btn" + (panel === "quick" ? " on" : "")} onClick={() => setPanel(panel === "quick" ? null : "quick")}>
              <IconHash className="action-ic" width={22} height={22} />
              <span className="action-title">Calories</span>
              <span className="action-sub">type a number</span>
            </button>
          </div>
          {panel === "photo" && <PhotoPanel date={date} onClose={() => setPanel(null)} />}
          {panel === "quick" && <QuickCaloriesPanel date={date} onClose={() => setPanel(null)} />}
          <FoodBrowser date={date} />
        </>
      )}

      <h2 className="section-title">
        Logged <span className="count">{count}</span>
      </h2>
      <EntryLog date={date} locked={locked} />
    </>
  );
}
