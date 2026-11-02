"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { EntryFields } from "@/components/EntryFields";
import { KIND_LABELS, type BankEntryDraft } from "@/lib/schemas/bankEntry";
import { extractEntries, saveEntries } from "../actions";

type ReviewItem = { key: string; include: boolean; draft: BankEntryDraft };

export function ImportForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"upload" | "paste">("upload");
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ReviewItem[] | null>(null);
  const [source, setSource] = useState<"resume" | "text" | "manual">("resume");
  const [isExtracting, startExtract] = useTransition();
  const [isSaving, startSave] = useTransition();

  function extract(formData: FormData) {
    setError(null);
    startExtract(async () => {
      const result = await extractEntries(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSource(result.source);
      setItems(result.entries.map((draft) => ({ key: crypto.randomUUID(), include: true, draft })));
    });
  }

  function save(selected: ReviewItem[]) {
    setError(null);
    startSave(async () => {
      const result = await saveEntries(
        selected.map((item) => item.draft),
        source,
      );
      if (result.ok) router.push("/bank");
      else setError(result.error);
    });
  }

  const update = (key: string, patch: Partial<ReviewItem>) =>
    setItems((current) => current?.map((item) => (item.key === key ? { ...item, ...patch } : item)) ?? null);

  // Step 2: review what Claude found.
  if (items) {
    const selected = items.filter((item) => item.include);
    return (
      <div className="space-y-4">
        <p className="text-sm text-fg-muted">
          Claude found {items.length} {items.length === 1 ? "entry" : "entries"}. Check each one, fix anything
          that&apos;s wrong, and untick any you don&apos;t want.
        </p>

        {items.map((item) => (
          <div key={item.key} className={`card space-y-4 ${item.include ? "" : "opacity-60"}`}>
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={item.include}
                onChange={(e) => update(item.key, { include: e.target.checked })}
              />
              Include · <span className="text-fg-muted">{KIND_LABELS[item.draft.kind]}</span>
            </label>
            {item.include && <EntryFields value={item.draft} onChange={(draft) => update(item.key, { draft })} />}
          </div>
        ))}

        {error && <p className="alert-error">{error}</p>}

        <div className="sticky bottom-0 -mx-4 flex flex-wrap gap-2 border-t border-outline bg-canvas/95 px-4 py-3 backdrop-blur">
          <button
            type="button"
            className="btn btn-primary"
            disabled={isSaving || selected.length === 0}
            onClick={() => save(selected)}
          >
            {isSaving ? "Saving…" : `Save ${selected.length} ${selected.length === 1 ? "entry" : "entries"}`}
          </button>
          <button type="button" className="btn" disabled={isSaving} onClick={() => setItems(null)}>
            Start over
          </button>
        </div>
      </div>
    );
  }

  // Step 1: upload or paste.
  return (
    <form action={extract} className="card space-y-4">
      <div className="flex gap-1 rounded-lg bg-surface-high p-1 text-sm" role="tablist">
        {(["upload", "paste"] as const).map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            onClick={() => setMode(m)}
            className={`flex-1 rounded-md px-3 py-1.5 font-medium ${
              mode === m
                ? "bg-surface font-medium text-fg shadow-sm"
                : "text-fg-muted hover:text-fg"
            }`}
          >
            {m === "upload" ? "Upload resume" : "Paste text"}
          </button>
        ))}
      </div>

      {mode === "upload" ? (
        <div>
          <label htmlFor="file" className="label">
            Resume file (PDF, Word, or text, up to 10 MB)
          </label>
          <input
            id="file"
            name="file"
            type="file"
            accept=".pdf,.docx,.txt,.md"
            required
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-primary-container file:px-3 file:py-2 file:text-sm file:font-medium file:text-on-primary-container hover:file:bg-primary-container-hover"
          />
        </div>
      ) : (
        <div>
          <label htmlFor="text" className="label">
            Notes, a LinkedIn summary, or anything about your experience
          </label>
          <textarea
            id="text"
            name="text"
            rows={10}
            required
            className="input"
            placeholder="e.g. Built a Discord bot in Node.js for my gaming group, 300 users. Did data entry at my uncle's shop in summer 2023, automated invoices with Excel macros..."
          />
        </div>
      )}

      {error && <p className="alert-error">{error}</p>}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn btn-primary" disabled={isExtracting}>
          {isExtracting ? "Reading…" : mode === "upload" ? "Upload" : "Submit"}
        </button>
        {isExtracting && (
          <span className="text-sm text-fg-muted">
            Claude is reading it. This usually takes 20–60 seconds.
          </span>
        )}
      </div>
    </form>
  );
}
