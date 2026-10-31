"use client";

import { useState, useTransition } from "react";
import { EntryFields } from "@/components/EntryFields";
import type { BankEntryDraft } from "@/lib/schemas/bankEntry";
import { deleteEntry, updateEntry } from "./actions";

function dateRange(entry: BankEntryDraft): string | null {
  if (entry.startDate && entry.endDate) return `${entry.startDate} – ${entry.endDate}`;
  return entry.startDate ?? entry.endDate;
}

export function EntryCard({ id, entry }: { id: string; entry: BankEntryDraft }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await updateEntry(id, draft);
      if (result.ok) setEditing(false);
      else setError(result.error);
    });
  }

  function remove() {
    if (!confirm(`Delete "${entry.title}" from your career bank?`)) return;
    startTransition(async () => {
      const result = await deleteEntry(id);
      if (!result.ok) setError(result.error);
    });
  }

  if (editing) {
    return (
      <div className="card space-y-4">
        <EntryFields value={draft} onChange={setDraft} />
        {error && <p className="alert-error">{error}</p>}
        <div className="flex gap-2">
          <button type="button" className="btn btn-primary" onClick={save} disabled={isPending}>
            {isPending ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            className="btn"
            disabled={isPending}
            onClick={() => {
              setDraft(entry);
              setEditing(false);
              setError(null);
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const meta = [entry.organization, dateRange(entry)].filter(Boolean).join(" · ");

  return (
    <article className={`card ${isPending ? "opacity-50" : ""}`}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="font-medium">{entry.title}</h3>
          {meta && <p className="text-sm text-stone-600 dark:text-stone-400">{meta}</p>}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" className="btn px-2.5 py-1 text-xs" onClick={() => setEditing(true)}>
            Edit
          </button>
          <button type="button" className="btn btn-danger px-2.5 py-1 text-xs" onClick={remove} disabled={isPending}>
            Delete
          </button>
        </div>
      </div>
      {entry.description && <p className="mt-2 text-sm">{entry.description}</p>}
      {entry.highlights.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
          {entry.highlights.map((h, i) => (
            <li key={i}>{h}</li>
          ))}
        </ul>
      )}
      {entry.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entry.skills.map((s) => (
            <span key={s} className="chip">
              {s}
            </span>
          ))}
        </div>
      )}
      {error && <p className="alert-error mt-3">{error}</p>}
    </article>
  );
}
