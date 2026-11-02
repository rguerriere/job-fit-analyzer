"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import type { Grade } from "@/lib/schemas/answerGrade";
import { gradeAnswer, saveAnswer } from "./actions";
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
 * One answer box: saves automatically while you type, and grades on request (unless `gradable` is false,
 * as for Skills Deep Dive notes, which get a compact one-line box instead).
 * `bulletIndex` is ROLE_ANSWER (-1) for the question about the position as a whole.
 */
export function AnswerBox({
  positionId,
  bulletIndex,
  target,
  kind,
  placeholder,
  initial,
  gradable = true,
}: {
  positionId: string;
  bulletIndex: number;
  /** The bullet (or role details) as shown now, to tell whether a grade was for older text. */
  target: string;
  kind: "role" | "bullet";
  placeholder: string;
  initial?: SavedAnswer;
  gradable?: boolean;
}) {
  const [answer, setAnswer] = useState(initial?.answer ?? "");
  useReportProgress(positionId, bulletIndex, answer);
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
      const result = await saveAnswer(positionId, bulletIndex, text);
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
        void saveAnswer(positionId, bulletIndex, pending.current);
      }
    },
    [positionId, bulletIndex],
  );

  function grade() {
    setError(null);
    startGrading(async () => {
      if (!(await flush(answer))) return;
      const result = await gradeAnswer(positionId, bulletIndex);
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
  const what = kind === "role" ? "Role details" : "Bullet";
  // Why the grade may no longer apply. Older grades (before this was tracked) have no gradedFor.
  const outdatedReason = !graded
    ? null
    : graded.gradedAnswer.trim() !== answer.trim()
      ? "Answer changed since grading"
      : graded.gradedFor !== null && graded.gradedFor !== target
        ? `${what} changed since grading`
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
