"use client";

// "Photo": snap or choose a photo, let a vision model estimate the calories, then
// add the (editable) result straight to today's log. The estimate call lives in
// /api/estimate — until an API key is set it returns a labeled demo number so the
// whole flow works. This replaces the old manual "New stuff" form (that job now
// belongs to the Foods tab).

import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useStore } from "@/app/store";
import { formatKcal, formatQty } from "@/lib/util";
import { IconCamera } from "./icons";

interface Estimate {
  name: string;
  kcal: number;
  protein: number;
  items: { name: string; kcal: number; protein: number }[];
  sources: number;
  note: string;
  mock: boolean;
}

type Status = "idle" | "loading" | "done" | "error";

// Phone photos are 3–8 MB, and base64 inflates them by ~33%. Vercel's
// serverless request-body cap is ~4.5 MB, so a raw camera photo would 413 in
// production (it only "works" locally because there's no such limit). Downscale
// in the browser before upload — it also cuts vision-token cost and latency.
// 1024px on the long edge is plenty for a model to identify food.
const MAX_DIM = 1024;
const JPEG_QUALITY = 0.8;

function downscaleToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file."));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error("That file isn't a readable image."));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Could not process that image."));
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", JPEG_QUALITY));
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

export default function PhotoSheet({
  open,
  onClose,
  date,
}: {
  open: boolean;
  onClose: () => void;
  date: string;
}) {
  const { addEntry } = useStore();
  const [image, setImage] = useState<string | null>(null);
  const [hint, setHint] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<Estimate | null>(null);
  const [name, setName] = useState("");
  const [kcal, setKcal] = useState("");
  const [protein, setProtein] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setImage(null);
      setHint("");
      setStatus("idle");
      setError("");
      setResult(null);
      setName("");
      setKcal("");
      setProtein("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const dataUrl = await downscaleToDataUrl(file);
      setImage(dataUrl);
      setStatus("idle");
      setResult(null);
      setError("");
    } catch (err) {
      setError((err as Error).message || "Could not read that image.");
      setStatus("error");
    }
  }

  async function estimate() {
    if (!image) return;
    setStatus("loading");
    setError("");
    try {
      const resp = await fetch("/api/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image, hint }),
      });
      const data = await resp.json();
      if (!data.ok) {
        setError(data.error || "Estimation failed.");
        setStatus("error");
        return;
      }
      setResult(data as Estimate);
      setName(data.name);
      setKcal(String(data.kcal));
      setProtein(String(data.protein ?? 0));
      setStatus("done");
    } catch (err) {
      setError((err as Error).message || "Network error.");
      setStatus("error");
    }
  }

  function addToLog() {
    const k = Math.round(Number(kcal));
    if (!Number.isFinite(k) || k <= 0) return;
    const p = Math.round(Number(protein));
    addEntry({
      date,
      name: name.trim() || "Photo estimate",
      category: "Other",
      basis: "serving",
      perUnit: k,
      proteinPerUnit: Number.isFinite(p) && p > 0 ? p : undefined,
      quantity: 1,
      source: "photo",
      note: result?.note,
    });
    onClose();
  }

  const kNum = Number(kcal);

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Estimate from photo">
        <div className="sheet-head">
          <div className="sheet-title">Photo estimate</div>
          <button className="link" onClick={onClose}>
            Cancel
          </button>
        </div>

        {/* No `capture` attribute: that would force the camera and hide the
            photo library on mobile. Without it the user gets both options. */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />

        {!image ? (
          <button className="photo-drop" onClick={() => fileRef.current?.click()}>
            <IconCamera width={30} height={30} />
            <span className="photo-drop-title">Take or choose a photo</span>
            <span className="photo-drop-sub">AI will estimate the calories</span>
          </button>
        ) : (
          <>
            <div className="photo-preview">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image} alt="Food to estimate" />
              <button className="photo-change" onClick={() => fileRef.current?.click()}>
                Change
              </button>
            </div>

            <div className="field" style={{ marginTop: 12 }}>
              <label htmlFor="ph-hint">Add a hint (optional)</label>
              <input
                id="ph-hint"
                className="input"
                placeholder="e.g. large plate, cooked in oil"
                value={hint}
                onChange={(e) => setHint(e.target.value)}
              />
            </div>

            {status !== "done" && (
              <button className="btn btn-primary" disabled={status === "loading"} onClick={estimate}>
                {status === "loading" ? (
                  <>
                    <span className="spinner" /> Estimating…
                  </>
                ) : (
                  "Estimate calories"
                )}
              </button>
            )}

            {status === "error" && <div className="msg err">{error}</div>}

            {status === "done" && result && (
              <div className="estimate-result">
                {result.mock && <span className="demo-badge">Demo estimate</span>}
                <div className="field">
                  <label htmlFor="ph-name">Name</label>
                  <input id="ph-name" className="input" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="ph-macros">
                  <div className="field">
                    <label htmlFor="ph-kcal">Calories</label>
                    <div className="ae-input-wrap wide">
                      <input id="ph-kcal" type="number" inputMode="numeric" value={kcal} onChange={(e) => setKcal(e.target.value)} />
                      <span className="ae-unit">kcal</span>
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="ph-protein">Protein</label>
                    <div className="ae-input-wrap wide">
                      <input id="ph-protein" type="number" inputMode="numeric" value={protein} onChange={(e) => setProtein(e.target.value)} />
                      <span className="ae-unit">g</span>
                    </div>
                  </div>
                </div>
                {result.items.length > 1 && (
                  <div className="est-items">
                    {result.items.map((it, i) => (
                      <div key={i} className="est-item">
                        <span>{it.name}</span>
                        <span>
                          {formatKcal(it.kcal)} kcal{it.protein > 0 ? ` · ${formatQty(it.protein)} g` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {result.note && (
                  <div className="hint" style={{ marginTop: 2 }}>
                    {result.note}
                  </div>
                )}
                {result.sources > 0 && (
                  <div className="sources-line">
                    Cross-checked {result.sources} {result.sources === 1 ? "source" : "sources"} for calories & protein
                  </div>
                )}
                <button className="btn btn-primary" style={{ marginTop: 12 }} disabled={!(kNum > 0)} onClick={addToLog}>
                  Add to today{kNum > 0 ? ` · ${formatKcal(kNum)} kcal` : ""}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
