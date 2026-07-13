"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useStore } from "@/app/store";
import { parseImport } from "@/lib/storage";
import { todayISO } from "@/lib/date";

export default function SettingsPage() {
  const { hydrated, settings, updateSettings, foods, entries, exportJSON, replaceAll, clearAll } = useStore();
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [budgetStr, setBudgetStr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (!hydrated) return <div className="loading">Loading…</div>;

  const budgetValue = budgetStr ?? String(settings.dailyBudget);

  function commitBudget(v: string) {
    const n = Math.round(Number(v));
    if (Number.isFinite(n) && n >= 0) updateSettings({ dailyBudget: n });
  }

  function doExport() {
    const blob = new Blob([exportJSON()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `calorie-tracker-backup-${todayISO()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setMsg({ kind: "ok", text: "Backup downloaded." });
  }

  async function doImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const text = await file.text();
    const data = parseImport(text);
    if (!data) {
      setMsg({ kind: "err", text: "That file didn't look like a valid backup." });
      return;
    }
    if (confirm(`Import ${data.foods.length} foods and ${data.entries.length} entries? This replaces your current data.`)) {
      replaceAll(data);
      setMsg({ kind: "ok", text: "Backup imported." });
    }
  }

  function doClear() {
    if (confirm("Delete ALL foods and entries on this device? This can't be undone.")) {
      clearAll();
      setMsg({ kind: "ok", text: "All data cleared." });
    }
  }

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <h2 className="section-title">Daily budget</h2>
      <div className="card">
        <div className="field" style={{ marginBottom: 0 }}>
          <label htmlFor="budget">Calorie target per day</label>
          <input
            id="budget"
            className="input"
            type="number"
            inputMode="numeric"
            value={budgetValue}
            onChange={(e) => {
              setBudgetStr(e.target.value);
              commitBudget(e.target.value);
            }}
            onBlur={() => setBudgetStr(null)}
          />
          <div className="hint">Used for the ring and the “over budget” markers.</div>
        </div>
      </div>

      <h2 className="section-title">Week starts on</h2>
      <div className="segmented">
        <button className={settings.weekStartsOn === 1 ? "active" : ""} onClick={() => updateSettings({ weekStartsOn: 1 })}>
          Monday
        </button>
        <button className={settings.weekStartsOn === 0 ? "active" : ""} onClick={() => updateSettings({ weekStartsOn: 0 })}>
          Sunday
        </button>
      </div>

      <h2 className="section-title">Your data</h2>
      <div className="card">
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontWeight: 600 }}>
            {foods.length} foods · {entries.length} entries
          </div>
          <div className="hint">Stored on this device, in your browser.</div>
        </div>
        <div className="stack">
          <button className="btn btn-ghost btn-block" onClick={doExport}>
            Export backup (.json)
          </button>
          <button className="btn btn-ghost btn-block" onClick={() => fileRef.current?.click()}>
            Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={doImport} />
          <button className="btn btn-danger btn-block" onClick={doClear}>
            Clear all data
          </button>
        </div>
        {msg && <div className={"msg " + msg.kind}>{msg.text}</div>}
      </div>

      <h2 className="section-title">Photo estimates</h2>
      <div className="note">
        The photo → calorie feature is the next step. It’ll send an uploaded photo to a vision model through
        OpenRouter from a secure server route. You’ll add your <code>OPENROUTER_API_KEY</code> in{" "}
        <code>.env.local</code> (and in Vercel) and pick a model — nothing above needs a key.
      </div>

      <p className="hint" style={{ textAlign: "center", marginTop: 20 }}>
        Tip: “Export backup” is also how you move your log to another device — export here, import there.
      </p>
    </div>
  );
}
