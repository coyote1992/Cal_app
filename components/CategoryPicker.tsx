"use client";

// Pick an existing category as a chip, or type a new one. Used when adding a
// new food and when editing saved foods.

import { useState } from "react";

export default function CategoryPicker({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (category: string) => void;
  options: string[];
}) {
  const [adding, setAdding] = useState(false);
  const [custom, setCustom] = useState("");
  const known = options.includes(value);

  function commitCustom() {
    const c = custom.trim();
    if (c) onChange(c);
    setAdding(false);
    setCustom("");
  }

  return (
    <div className="cat-picker">
      {options.map((c) => (
        <button
          key={c}
          type="button"
          className={"cat-opt" + (value === c ? " active" : "")}
          onClick={() => {
            setAdding(false);
            onChange(c);
          }}
        >
          {c}
        </button>
      ))}
      {!known && value && (
        <button type="button" className="cat-opt active">
          {value}
        </button>
      )}
      {adding ? (
        <input
          className="input"
          style={{ maxWidth: 170 }}
          autoFocus
          placeholder="New category"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitCustom();
            }
          }}
          onBlur={commitCustom}
        />
      ) : (
        <button type="button" className="cat-opt" onClick={() => setAdding(true)}>
          ＋ New
        </button>
      )}
    </div>
  );
}
