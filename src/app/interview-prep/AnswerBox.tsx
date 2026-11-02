"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Grade } from "@/lib/schemas/answerGrade";
import type { ActionResult, GradeResult } from "./actions";
import { GradeBadge } from "./GradeBadge";
import { useReportProgress } from "./progress";

const SAVE_DELAY_MS = 800;

export type SavedAnswer = {
  answer: string;
  grade: Grade | null;
  feedback: string | null;
  gradedAnswer: string | null;
  gradedFor: string | null;
};

type GradeState = { grade: Grade; feedback: string; gradedAnswer: string; gradedFor: string | null };

/**
 * One answer box, used by every Interview Prep section: saves automatically while you type, and grades on
 * request. Without `grade` (Skills Deep Dive notes) it's a compact, ungraded one-line box.
 * The page passes in `save` and `grade` already bound to the item, so this box works for any section.
 */
export function AnswerBox({
  progress,
  save,
  grade: gradeAction,
  target,
  targetLabel,
  placeholder,
  initial,
}: {
  /** Which card counter this box counts toward: the card's ID and this item's ID within it. */
  progress: { group: string; item: string | number };
  save: (text: string) => Promise<ActionResult>;
  grade?: () => Promise<GradeResult>;
  /** What the answer is about (bullet, role details, or question) as shown now, to spot outdated grades. */
  target: string;
  /** Names `target` in "… changed since grading": "Bullet", "Role details", or "Question". */
  targetLabel: string;
  placeholder: string;
  initial?: SavedAnswer;
}) {
  const gradable = gradeAction !== undefined;
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  useReportProgress(progress.group, progress.item, answer);
  // The page may pass a new `save` function on re-render; always use the latest one.
  const saveRef = useRef(save);
  saveRef.current = save;
  const [graded, setGraded] = useState<GradeState | null>(
    initial?.grade && initial.feedback && initial.gradedAnswer !== null
      ? {
          grade: initial.grade,
          feedback: initial.feedback,
          gradedAnswer: initial.gradedAnswer,
          gradedFor: initial.gradedFor,
        }
      : null,
  );
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "failed">("idle");
  const [error, setError] = useState<string | null>(null);
  const [isGrading, startGrading] = useTransition();

  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const lastSaved = useRef(initial?.answer ?? "");
  const pending = useRef<string | null>(null);
  // Saves run one at a time, in order, so an older save can never overwrite a newer one.
  const queue = useRef<Promise<boolean>>(Promise.resolve(true));

  /** Saves now (if anything changed). Resolves to whether the latest text is saved. */
  function flush(text: string): Promise<boolean> {
    clearTimeout(timer.current);
    pending.current = null;
    queue.current = queue.current.then(async () => {
      if (text === lastSaved.current) return true;
      setStatus("saving");
      const result = await saveRef.current(text);
      if (!result.ok) {
        setStatus("failed");
        setError(result.error);
        return false;
      }
      lastSaved.current = text;
      setStatus("saved");
      setError(null);
      if (!text.trim()) setGraded(null); // An empty answer is deleted, along with its grade.
      return true;
    });
    return queue.current;
  }

  function onChange(text: string) {
    setAnswer(text);
    clearTimeout(timer.current);
    pending.current = text;
    timer.current = setTimeout(() => void flush(text), SAVE_DELAY_MS);
  }

  // If the page is left before the timer fires, save what's pending.
  useEffect(
    () => () => {
      clearTimeout(timer.current);
      if (pending.current !== null && pending.current !== lastSaved.current) {
        void saveRef.current(pending.current);
      }
    },
    [],
  );

  function grade() {
    if (!gradeAction) return;
    setError(null);
    startGrading(async () => {
      if (!(await flush(answer))) return;
      const result = await gradeAction();
      if (result.ok) {
        setGraded({
          grade: result.grade,
          feedback: result.feedback,
          gradedAnswer: result.gradedAnswer,
          gradedFor: result.gradedFor,
        });
      }
      else setError(result.error);
    });
  }

  const hasAnswer = answer.trim().length > 0;
  // Why the grade may no longer apply. Older grades (before this was tracked) have no gradedFor.
  const outdatedReason = !graded
    ? null
    : graded.gradedAnswer.trim() !== answer.trim()
      ? "Answer changed since grading"
      : graded.gradedFor !== null && graded.gradedFor !== target
        ? `${targetLabel} changed since grading`
        : null;
  const statusText = { idle: "", saving: "Saving…", saved: "Saved", failed: "Not saved" }[status];

  const textarea = (
    <textarea
      value={answer}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => void flush(answer)}
      rows={gradable ? 2 : 1}
      maxLength={5000}
      placeholder={placeholder}
      aria-label={placeholder}
      className={`input resize-y [field-sizing:content] ${gradable ? "min-h-16" : "min-h-9 py-1.5"}`}
    />
  );
  const statusLine = (
    <span className={`text-xs ${status === "failed" ? "text-error" : "text-fg-muted"}`} aria-live="polite">
      {statusText}
    </span>
  );

  if (!gradable) {
    return (
      <div>
        <div className="flex items-center gap-2">
          {textarea}
          <span className="w-14 shrink-0">{statusLine}</span>
        </div>
        {error && <p className="alert-error mt-2">{error}</p>}
      </div>
    );
  }

  return (
    <div>
      {textarea}
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn btn-sm"
          onClick={grade}
          disabled={!hasAnswer || isGrading}
          title={hasAnswer ? undefined : "Write an answer first"}
        >
          {isGrading ? "Grading…" : graded ? "Grade again" : "Grade"}
        </button>
        {graded && hasAnswer && (
          <GradeBadge grade={graded.grade} feedback={graded.feedback} outdatedReason={outdatedReason} />
        )}
        <span className="ml-auto">{statusLine}</span>
      </div>
      {error && <p className="alert-error mt-2">{error}</p>}
    </div>
  );
}
