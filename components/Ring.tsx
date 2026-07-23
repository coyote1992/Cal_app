"use client";

import { formatKcal } from "@/lib/util";

/**
 * Circular progress ring (green gradient), filling from 0 up to `goal`. Used for
 * both the calorie budget and the protein goal on the Today dashboard.
 *
 * `overIsBad` distinguishes the two: calories are a ceiling (going over is bad →
 * the ring turns red), protein is a floor (going over is good → the ring just
 * stays full and reads "reached").
 */
export default function Ring({
  value,
  goal,
  unit,
  size = 176,
  stroke = 15,
  overIsBad = false,
  gradId = "ringGrad",
}: {
  value: number;
  goal: number;
  unit: string;
  size?: number;
  stroke?: number;
  overIsBad?: boolean;
  gradId?: string;
}) {
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const ratio = goal > 0 ? value / goal : 0;
  const dash = circumference * Math.min(Math.max(ratio, 0), 1);
  const over = goal > 0 && value > goal;
  const bad = over && overIsBad;
  const percentText = goal > 0 ? `${Math.round(ratio * 100)}%` : "—";
  // Scale the centre number with the ring so the small protein ring stays tidy.
  const valueSize = Math.round(size * 0.23);

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent-2)" />
            <stop offset="100%" stopColor="var(--accent)" />
          </linearGradient>
        </defs>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--ring-track)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={bad ? "var(--danger)" : `url(#${gradId})`}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-value" style={{ fontSize: valueSize }}>
          {formatKcal(value)}
          <span className="ring-unit">{unit}</span>
        </div>
        <div className={"ring-percent" + (bad ? " over" : "")}>{percentText}</div>
      </div>
    </div>
  );
}
