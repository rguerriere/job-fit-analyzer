"use client";

import { useState } from "react";
import type { Grade } from "@/lib/schemas/answerGrade";

const LABELS: Record<Grade, string> = { bad: "Bad", poor: "Poor", good: "Good", great: "Great" };

/** The grade chip. Clicking it shows or hides the feedback below it. */
export function GradeBadge({
  grade,
  feedback,
  outdatedReason,
}: {
  grade: Grade;
  feedback: string;
  /** Set when the grade may no longer apply; the badge is dimmed and the reason shown. */
  outdatedReason?: string | null;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        title={open ? "Hide feedback" : "Show feedback"}
        className={`chip grade-${grade} inline-flex cursor-pointer items-center gap-1 hover:brightness-125 ${
          outdatedReason ? "opacity-60" : ""
        }`}
      >
        {LABELS[grade]}
        <span aria-hidden className={`text-[0.6rem] transition-transform ${open ? "rotate-180" : ""}`}>
          ▼
        </span>
      </button>
      {outdatedReason && <span className="text-xs text-fg-muted">{outdatedReason}</span>}
      {open && (
        <p className="order-last basis-full rounded-md border border-outline bg-surface-high px-3 py-2 text-sm text-fg">
          {feedback}
        </p>
      )}
    </>
  );
}
