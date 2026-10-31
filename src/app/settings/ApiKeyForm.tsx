"use client";

import { useActionState, useTransition } from "react";
import { removeApiKey, saveApiKey, type SettingsState } from "./actions";

export function ApiKeyForm({ maskedKey }: { maskedKey: string | null }) {
  const [state, formAction, isSaving] = useActionState<SettingsState, FormData>(saveApiKey, { status: "idle" });
  const [isRemoving, startRemove] = useTransition();

  return (
    <div className="space-y-3">
      {maskedKey && (
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span className="text-stone-600 dark:text-stone-400">Saved key:</span>
          <code className="rounded bg-stone-100 px-2 py-0.5 dark:bg-stone-800">{maskedKey}</code>
          <button
            type="button"
            className="btn btn-danger"
            disabled={isRemoving}
            onClick={() => startRemove(() => removeApiKey())}
          >
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        </div>
      )}

      <form action={formAction} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="apiKey" className="sr-only">
          API key
        </label>
        <input
          id="apiKey"
          name="apiKey"
          type="password"
          autoComplete="off"
          placeholder={maskedKey ? "Paste a new key to replace it" : "sk-ant-..."}
          className="input"
          required
        />
        <button type="submit" className="btn btn-primary shrink-0" disabled={isSaving}>
          {isSaving ? "Checking…" : "Save key"}
        </button>
      </form>

      {state.status === "error" && <p className="alert-error">{state.message}</p>}
      {state.status === "saved" && (
        <p className="text-sm text-teal-700 dark:text-teal-400">Key checked and saved.</p>
      )}
    </div>
  );
}
