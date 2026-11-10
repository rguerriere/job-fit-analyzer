"use client";

import { type FormEvent, type ReactNode, useRef, useState, useTransition } from "react";
import type { ActionResult } from "./actions";
import { useHasText } from "./progress";
import {
  addTechGroup,
  addTechQuestion,
  deleteTechGroup,
  deleteTechQuestion,
  editTechQuestion,
  renameTechGroup,
} from "./techActions";

/** Runs a server action with a pending flag and an error message. */
function useAction() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  function run(action: () => Promise<ActionResult>, onSuccess?: () => void) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.ok) onSuccess?.();
      else setError(result.error);
    });
  }
  return { run, isPending, error };
}

/** A one-line form: text input and a button. Enter submits; the input clears on success. */
function AddForm({
  placeholder,
  button,
  onAdd,
}: {
  placeholder: string;
  button: string;
  onAdd: (text: string) => Promise<ActionResult>;
}) {
  const [text, setText] = useState("");
  const { run, isPending, error } = useAction();
  function submit(e: FormEvent) {
    e.preventDefault();
    if (text.trim()) run(() => onAdd(text), () => setText(""));
  }
  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={placeholder}
          aria-label={placeholder}
          maxLength={500}
          className="input min-w-0 flex-1 py-1.5"
        />
        <button type="submit" className="btn btn-sm shrink-0" disabled={!text.trim() || isPending}>
          {isPending ? "Adding…" : button}
        </button>
      </div>
      {error && <p className="alert-error">{error}</p>}
    </form>
  );
}

/**
 * Text with a pencil button. Editing shows an input: Enter or clicking away saves, Escape cancels.
 * `children` is how the text looks when not editing.
 */
function EditableText({
  value,
  label,
  onSave,
  children,
}: {
  value: string;
  label: string;
  onSave: (text: string) => Promise<ActionResult>;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const { run, isPending, error } = useAction();
  // Enter saves, and the input then loses focus, which would save again. Only save once.
  const saving = useRef(false);

  function start() {
    setDraft(value);
    setEditing(true);
  }
  function save() {
    if (saving.current) return;
    if (!draft.trim() || draft.trim() === value) return setEditing(false);
    saving.current = true;
    run(
      async () => {
        const result = await onSave(draft);
        saving.current = false;
        return result;
      },
      () => setEditing(false),
    );
  }

  if (editing) {
    return (
      <div className="min-w-0 flex-1 space-y-2">
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          disabled={isPending}
          aria-label={label}
          maxLength={500}
          className="input py-1.5"
        />
        {error && <p className="alert-error">{error}</p>}
      </div>
    );
  }
  return (
    <div className="flex min-w-0 flex-1 items-start gap-1">
      <div className="min-w-0">{children}</div>
      <button
        type="button"
        onClick={start}
        title={label}
        aria-label={label}
        className="shrink-0 rounded px-1.5 text-fg-muted hover:bg-surface-high hover:text-fg"
      >
        ✎
      </button>
    </div>
  );
}

/** A small "×" delete button. */
function DeleteButton({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className="shrink-0 rounded px-1.5 text-fg-muted hover:bg-error-container hover:text-on-error-container disabled:opacity-50"
    >
      ✕
    </button>
  );
}

/** One question's header: its text (editable) and a delete button. The answer box goes below it. */
export function TechQuestionHeader({ id, groupId, text }: { id: string; groupId: string; text: string }) {
  const { run, isPending, error } = useAction();
  const hasAnswer = useHasText(`tech:${groupId}`, id);
  function remove() {
    // Empty questions go right away; ones with an answer ask first.
    if (hasAnswer && !confirm(`Delete this question and its answer?\n\n"${text}"`)) return;
    run(() => deleteTechQuestion(id));
  }
  return (
    <div className="space-y-2">
      <div className="flex items-start gap-2">
        <EditableText value={text} label="Edit question" onSave={(t) => editTechQuestion(id, t)}>
          <h3 className="font-medium">{text}</h3>
        </EditableText>
        <DeleteButton label="Delete question" onClick={remove} disabled={isPending} />
      </div>
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}

/** Inside an open group: rename and delete the group. */
export function TechGroupToolbar({ id, title, questionCount }: { id: string; title: string; questionCount: number }) {
  const { run, isPending, error } = useAction();
  function remove() {
    const what = questionCount === 0 ? "" : ` and its ${questionCount === 1 ? "question" : `${questionCount} questions`}`;
    if (!confirm(`Delete the "${title}" group${what}? This can't be undone.`)) return;
    run(() => deleteTechGroup(id));
  }
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <EditableText value={title} label="Rename group" onSave={(t) => renameTechGroup(id, t)}>
          <span className="text-sm text-fg-muted">Group: {title}</span>
        </EditableText>
        <button type="button" className="btn btn-sm btn-danger" onClick={remove} disabled={isPending}>
          {isPending ? "Deleting…" : "Delete group"}
        </button>
      </div>
      {error && <p className="alert-error">{error}</p>}
    </div>
  );
}

export function AddTechQuestion({ groupId }: { groupId: string }) {
  return <AddForm placeholder="Add a question, e.g. What's a closure?" button="Add question" onAdd={(t) => addTechQuestion(groupId, t)} />;
}

export function AddTechGroup({ first }: { first: boolean }) {
  return (
    <AddForm
      placeholder={first ? "Name your first group, e.g. JavaScript" : "Add a group, e.g. SQL or System design"}
      button="Add group"
      onAdd={addTechGroup}
    />
  );
}
