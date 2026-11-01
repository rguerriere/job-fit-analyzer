"use client";

import { useState, useTransition } from "react";
import { deleteOpportunity, reanalyzeOpportunity } from "./actions";

export function OpportunityActions({ id, jobTitle }: { id: string; jobTitle: string }) {
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<"reanalyze" | "delete" | null>(null);
  const [isPending, startTransition] = useTransition();

  function reanalyze() {
    setError(null);
    setAction("reanalyze");
    startTransition(async () => {
      const result = await reanalyzeOpportunity(id);
      if (!result.ok) setError(result.error);
    });
  }

  function remove() {
    if (!confirm(`Delete "${jobTitle}" from your opportunities?`)) return;
    setError(null);
    setAction("delete");
    startTransition(async () => {
      const result = await deleteOpportunity(id);
      if (!result.ok) setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn btn-primary" onClick={reanalyze} disabled={isPending}>
          {isPending && action === "reanalyze" ? "Re-analyzing…" : "Re-analyze"}
        </button>
        <button type="button" className="btn btn-danger" onClick={remove} disabled={isPending}>
          {isPending && action === "delete" ? "Deleting…" : "Delete"}
        </button>
        {isPending && action === "reanalyze" && (
          <span className="text-sm text-stone-600 dark:text-stone-400">
            Comparing it to your current career bank. This usually takes 20–60 seconds.
          </span>
        )}
      </div>
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}
