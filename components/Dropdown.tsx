"use client";

// A collapsible section: a tappable title row (with a count and a chevron) that
// reveals its content. Used for the saved-food categories and the exercise
// categories on the Log page.

import type { ReactNode } from "react";
import { IconChevron } from "./icons";

export default function Dropdown({
  title,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  count?: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <div className={"dd" + (open ? " open" : "")}>
      <button className="dd-head" onClick={onToggle} aria-expanded={open}>
        <span className="dd-title">{title}</span>
        {count != null && <span className="cat-count">{count}</span>}
        <IconChevron className="dd-chev" width={18} height={18} />
      </button>
      {open && <div className="dd-body">{children}</div>}
    </div>
  );
}
