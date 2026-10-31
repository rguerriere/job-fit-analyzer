import { z } from "zod";

export const ENTRY_KINDS = [
  "experience",
  "project",
  "education",
  "skill",
  "certification",
  "accomplishment",
  "other",
] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];

export const KIND_LABELS: Record<EntryKind, string> = {
  experience: "Work experience",
  project: "Projects",
  education: "Education",
  skill: "Skills",
  certification: "Certifications",
  accomplishment: "Accomplishments",
  other: "Other",
};

/**
 * One item in a user's career bank: a job, project, degree, skill group, etc.
 * Field descriptions are sent to the model, so they double as instructions.
 */
export const BankEntryDraftSchema = z.object({
  kind: z
    .enum(ENTRY_KINDS)
    .describe(
      "experience = a job or role; project = something built; education = degree or course; " +
        "skill = a group of related skills; certification; accomplishment = award or notable result " +
        "not tied to one job; other.",
    ),
  title: z
    .string()
    .min(1)
    .max(200)
    .describe(
      "Role title, project name, degree, certification name, or skill group name " +
        "(e.g. 'Programming languages').",
    ),
  organization: z
    .string()
    .max(200)
    .nullable()
    .describe("Company, school, or issuer. Null if there is none."),
  startDate: z.string().max(20).nullable().describe("YYYY-MM or YYYY. Null if not stated."),
  endDate: z
    .string()
    .max(20)
    .nullable()
    .describe("YYYY-MM, YYYY, or 'present'. Null if not stated."),
  description: z
    .string()
    .max(2000)
    .nullable()
    .describe("One or two sentences describing the entry, based only on the source. Null if nothing to say."),
  highlights: z
    .array(z.string().max(1000))
    .max(30)
    .describe(
      "Specific accomplishments or resume bullets, kept close to the original wording. " +
        "Keep every number and metric exactly as written.",
    ),
  skills: z
    .array(z.string().max(100))
    .max(50)
    .describe(
      "Skills and tools this entry shows, as short phrases. For a skill entry, the skills in the group.",
    ),
});
export type BankEntryDraft = z.infer<typeof BankEntryDraftSchema>;

/** Trims text, turns blank optional fields into null, and drops empty list items. */
export function cleanDraft(draft: BankEntryDraft): BankEntryDraft {
  const optional = (value: string | null) => (value && value.trim() ? value.trim() : null);
  const list = (items: string[]) => items.map((item) => item.trim()).filter(Boolean);
  return {
    kind: draft.kind,
    title: draft.title.trim(),
    organization: optional(draft.organization),
    startDate: optional(draft.startDate),
    endDate: optional(draft.endDate),
    description: optional(draft.description),
    highlights: list(draft.highlights),
    skills: list(draft.skills),
  };
}

export const BankImportSchema = z.object({
  entries: z.array(BankEntryDraftSchema),
});
