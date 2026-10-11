"use client";

// The "movement" half of the Log page: the exercise library as dropdowns, then
// the day's workout, editable in place.

import { useStore } from "@/app/store";
import { workoutForDate } from "@/lib/gym";
import ExerciseBrowser from "./ExerciseBrowser";
import WorkoutLog from "./WorkoutLog";

export default function MovementSection({ date, locked }: { date: string; locked: boolean }) {
  const { workouts } = useStore();
  const count = workoutForDate(workouts, date)?.exercises.length ?? 0;

  return (
    <>
      {!locked && <ExerciseBrowser date={date} />}

      <h2 className="section-title">
        Logged <span className="count">{count}</span>
      </h2>
      <WorkoutLog date={date} locked={locked} />
    </>
  );
}
