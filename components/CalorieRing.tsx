"use client";

import { formatKcal } from "@/lib/util";

/**
 * Circular progress ring (green gradient). The ring fills from 0 up to the
 * budget (a full circle = the whole budget). The big number counts up from 0
 * (calories eaten so far); the percentage of budget sits just under it.
 */
export default function CalorieRing({ consumed, budget }: { consumed: number; budget: number }) {
  const size = 208;
  const stroke = 16;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;

  const ratio = budget > 0 ? consumed / budget : 0;
  const pct = Math.min(ratio, 1);
  const over = budget > 0 && consumed > budget;
  const dash = circumference * pct;
  const percentText = budget > 0 ? `${Math.round(ratio * 100)}%` : "—";

  return (
    <div className="ring-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="ring">
        <defs>
          <linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1">
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
          stroke={over ? "var(--danger)" : "url(#ringGrad)"}
          strokeWidth={stroke}
          strokeDasharray={`${dash} ${circumference - dash}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-center">
        <div className="ring-value">{formatKcal(consumed)}</div>
        <div className={"ring-percent" + (over ? " over" : "")}>{percentText}</div>
        <div className="ring-sub">of {formatKcal(budget)} kcal</div>
      </div>
    </div>
  );
}
