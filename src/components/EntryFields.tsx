"use client";

import { useId, useState } from "react";
import { ENTRY_KINDS, KIND_LABELS, type BankEntryDraft, type EntryKind } from "@/lib/schemas/bankEntry";

type Props = {
  value: BankEntryDraft;
  onChange: (value: BankEntryDraft) => void;
};

/** Editable fields for one career bank entry. Used on the review screen and when editing. */
export function EntryFields({ value, onChange }: Props) {
  const id = useId();
  // Lists are edited as text so typing a new line or comma isn't undone mid-keystroke.
  const [highlightsText, setHighlightsText] = useState(value.highlights.join("\n"));
  const [skillsText, setSkillsText] = useState(value.skills.join(", "));

  const set = <K extends keyof BankEntryDraft>(key: K, v: BankEntryDraft[K]) => onChange({ ...value, [key]: v });

  return (
    <div className="grid gap-3 sm:grid-cols-6">
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-kind`} className="label">
          Type
        </label>
        <select
          id={`${id}-kind`}
          className="input"
          value={value.kind}
          onChange={(e) => set("kind", e.target.value as EntryKind)}
        >
          {ENTRY_KINDS.map((kind) => (
            <option key={kind} value={kind}>
              {KIND_LABELS[kind]}
            </option>
          ))}
        </select>
      </div>
      <div className="sm:col-span-4">
        <label htmlFor={`${id}-title`} className="label">
          Title
        </label>
        <input
          id={`${id}-title`}
          className="input"
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-org`} className="label">
          Organization
        </label>
        <input
          id={`${id}-org`}
          className="input"
          value={value.organization ?? ""}
          onChange={(e) => set("organization", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-start`} className="label">
          Start
        </label>
        <input
          id={`${id}-start`}
          className="input"
          placeholder="YYYY-MM"
          value={value.startDate ?? ""}
          onChange={(e) => set("startDate", e.target.value)}
        />
      </div>
      <div className="sm:col-span-2">
        <label htmlFor={`${id}-end`} className="label">
          End
        </label>
        <input
          id={`${id}-end`}
          className="input"
          placeholder="YYYY-MM or present"
          value={value.endDate ?? ""}
          onChange={(e) => set("endDate", e.target.value)}
        />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={`${id}-desc`} className="label">
          Description
        </label>
        <textarea
          id={`${id}-desc`}
          className="input"
          rows={2}
          value={value.description ?? ""}
          onChange={(e) => set("description", e.target.value)}
        />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={`${id}-highlights`} className="label">
          Highlights (one per line)
        </label>
        <textarea
          id={`${id}-highlights`}
          className="input"
          rows={Math.min(8, Math.max(3, value.highlights.length + 1))}
          value={highlightsText}
          onChange={(e) => {
            setHighlightsText(e.target.value);
            set("highlights", e.target.value.split("\n"));
          }}
        />
      </div>
      <div className="sm:col-span-6">
        <label htmlFor={`${id}-skills`} className="label">
          Skills (comma separated)
        </label>
        <input
          id={`${id}-skills`}
          className="input"
          value={skillsText}
          onChange={(e) => {
            setSkillsText(e.target.value);
            set("skills", e.target.value.split(","));
          }}
        />
      </div>
    </div>
  );
}
