"use client";

import { useState, useTransition } from "react";
import { dismissAllStale, dismissStale } from "./actions";

/** "Your career bank has changed" on one opportunity, with Dismiss and (if others have it too) Dismiss all. */
export function StaleBanner({ id, staleCount }: { id: string; staleCount: number }) {
  const [busy, setBusy] = useState<"one" | "all" | null>(null);
  const [, startTransition] = useTransition();

  function run(which: "one" | "all") {
    setBusy(which);
    startTransition(async () => {
      await (which === "one" ? dismissStale(id) : dismissAllStale());
      setBusy(null);
    });
  }

  return (
    <div role="status" className="alert-warn flex flex-wrap items-center gap-3">
      <p className="min-w-0 flex-1">Your career bank has changed since this was analyzed. Re-analyze to update the score.</p>
      <div className="flex shrink-0 gap-2">
        <button type="button" className="btn btn-sm" onClick={() => run("one")} disabled={busy !== null}>
          {busy === "one" ? "Dismissing…" : "Dismiss"}
        </button>
        {staleCount > 1 && (
          <button type="button" className="btn btn-sm" onClick={() => run("all")} disabled={busy !== null}>
            {busy === "all" ? "Dismissing…" : `Dismiss all (${staleCount})`}
          </button>
        )}
      </div>
    </div>
  );
}
