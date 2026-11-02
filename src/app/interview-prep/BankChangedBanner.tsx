"use client";

import { useState, useTransition } from "react";
import type { UpdateSummary } from "@/lib/deepDive";
import {
  applyUpdateAction,
  dismissBankChangeAction,
  previewUpdateAction,
  resetDeepDiveAction,
} from "./actions";

type Busy = "dismiss" | "preview" | "apply" | "reset" | null;

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Turns the Update summary into short lines. Deleted answers are listed separately, as a warning. */
function describe(s: UpdateSummary): { changes: string[]; deleted: string | null } {
  const j = s.experience;
  const k = s.skills;
  const changes = [
    j.added && plural(j.added, "new job"),
    j.removed && `${plural(j.removed, "job")} removed`,
    j.changed && `${plural(j.changed, "job")} with edited details`,
    j.itemsAdded && plural(j.itemsAdded, "new bullet"),
    j.itemsChanged && `${plural(j.itemsChanged, "bullet")} edited`,
    j.itemsRemoved && `${plural(j.itemsRemoved, "bullet")} removed`,
    k.added && plural(k.added, "new skill group"),
    k.removed && `${plural(k.removed, "skill group")} removed`,
    k.changed && `${plural(k.changed, "skill group")} renamed`,
    k.itemsAdded && plural(k.itemsAdded, "new skill"),
    k.itemsChanged && `${plural(k.itemsChanged, "skill")} renamed`,
    k.itemsRemoved && `${plural(k.itemsRemoved, "skill")} removed`,
    s.answersKeptOnEdits && `${plural(s.answersKeptOnEdits, "answer")} on edited items kept`,
  ].filter((line): line is string => Boolean(line));
  const deleted = s.answersDeleted
    ? `${plural(s.answersDeleted, "answer")} will be deleted, because ${s.answersDeleted === 1 ? "what it was about was" : "what they were about was"} removed.`
    : null;
  return { changes, deleted };
}

/** Shown when a job or skill group in the career bank changed. Nothing on the page changes until you choose. */
export function BankChangedBanner() {
  const [busy, setBusy] = useState<Busy>(null);
  const [preview, setPreview] = useState<{ summary: UpdateSummary; token: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function run(which: Exclude<Busy, null>, work: () => Promise<void>) {
    setBusy(which);
    setError(null);
    startTransition(async () => {
      await work();
      setBusy(null);
    });
  }

  const dismiss = () => run("dismiss", async () => void (await dismissBankChangeAction()));
  const showPreview = () =>
    run("preview", async () => {
      const result = await previewUpdateAction();
      setPreview({ summary: result.summary, token: result.token });
    });
  const apply = () =>
    run("apply", async () => {
      const result = await applyUpdateAction(preview!.token);
      if (result.ok) setPreview(null);
      else {
        setPreview(null);
        setError(result.error);
      }
    });
  const reset = () => {
    const sure = confirm(
      "Reset Interview Prep?\n\nThis deletes ALL of your answers, notes, and grades, then rebuilds Resume and Skills " +
        "Deep Dive from your current career bank. This can't be undone.\n\nTo keep your answers, use Update instead.",
    );
    if (sure) run("reset", async () => void (await resetDeepDiveAction()));
  };

  const disabled = busy !== null;
  const described = preview && describe(preview.summary);

  return (
    <div role="status" className="alert-warn space-y-3">
      {!preview ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="min-w-0 flex-1">
            <span className="font-semibold">Your career bank has been updated.</span> Interview Prep still shows your
            jobs and skills as they were. Update it to bring in the changes and keep your answers.
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button type="button" className="btn btn-sm" onClick={dismiss} disabled={disabled}>
              {busy === "dismiss" ? "Dismissing…" : "Dismiss"}
            </button>
            <button type="button" className="btn btn-sm btn-primary" onClick={showPreview} disabled={disabled}>
              {busy === "preview" ? "Checking…" : "Update"}
            </button>
            <button type="button" className="btn btn-sm btn-danger" onClick={reset} disabled={disabled}>
              {busy === "reset" ? "Resetting…" : "Reset"}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="font-semibold">Update Interview Prep?</p>
          {described!.changes.length === 0 && !described!.deleted ? (
            <p>No differences: your jobs and skills already match your career bank.</p>
          ) : (
            <ul className="list-disc space-y-0.5 pl-5">
              {described!.changes.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          {described!.deleted && <p className="alert-error">{described!.deleted}</p>}
          <p className="text-on-warn-container/80">Everything else stays exactly as it is.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn btn-sm btn-primary" onClick={apply} disabled={disabled}>
              {busy === "apply" ? "Updating…" : "Confirm update"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setPreview(null)} disabled={disabled}>
              Cancel
            </button>
          </div>
        </div>
      )}
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
