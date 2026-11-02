import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { ENTRY_KINDS } from "../lib/schemas/bankEntry";
import { GRADES } from "../lib/schemas/answerGrade";
import type { RequirementResult } from "../lib/schemas/fitAnalysis";
import type { PostingDetails } from "../lib/schemas/jobPosting";

const timestamps = {
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`)
    .$onUpdate(() => new Date()),
};

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email"),
  // Stored as plain text while the app runs locally. Encrypt this before deploying online.
  anthropicApiKey: text("anthropic_api_key"),
  ...timestamps,
});

export const bankEntries = sqliteTable(
  "bank_entries",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", { enum: ENTRY_KINDS }).notNull(),
    title: text("title").notNull(),
    organization: text("organization"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    description: text("description"),
    highlights: text("highlights", { mode: "json" }).$type<string[]>().notNull().default([]),
    skills: text("skills", { mode: "json" }).$type<string[]>().notNull().default([]),
    source: text("source", { enum: ["resume", "text", "manual"] }).notNull(),
    ...timestamps,
  },
  (t) => [index("bank_entries_user_idx").on(t.userId)],
);

/** A job posting the user analyzed, with Claude's verdicts. Shown on the Opportunities page. */
export const analyses = sqliteTable(
  "analyses",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    jobTitle: text("job_title").notNull(),
    company: text("company"),
    postingText: text("posting_text").notNull(),
    // Salary, location, work arrangement, etc. from the extractor. Extracted once per posting and kept.
    // Null for analyses made before it was added; Re-analyze fills it in.
    details: text("details", { mode: "json" }).$type<PostingDetails>(),
    // Which version of the extraction instructions produced details and the requirement list (EXTRACTION_VERSION).
    extractionVersion: integer("extraction_version"),
    score: integer("score"),
    // Score before the most recent re-analysis, to show how it changed.
    previousScore: integer("previous_score"),
    requirements: text("requirements", { mode: "json" }).$type<RequirementResult[]>().notNull(),
    // Entry titles as they were when analyzed, so results still read right if the bank changes.
    entryTitles: text("entry_titles", { mode: "json" }).$type<Record<string, string>>().notNull(),
    analyzedAt: integer("analyzed_at", { mode: "timestamp" }).notNull(),
    // When the user dismissed the "career bank has changed" banner. A later career bank edit shows it again.
    staleDismissedAt: integer("stale_dismissed_at", { mode: "timestamp" }),
    ...timestamps,
  },
  (t) => [index("analyses_user_idx").on(t.userId)],
);

/** The Interview Prep sections built from the career bank: jobs (Resume Deep Dive) and skill groups (Skills Deep Dive). */
export const DEEP_DIVE_SECTIONS = ["experience", "skills"] as const;
export type DeepDiveSection = (typeof DEEP_DIVE_SECTIONS)[number];

/**
 * Interview Prep's Resume and Skills Deep Dive are built from a snapshot of the career bank, so later
 * career bank edits never change them until the user chooses Update or Reset.
 * A row is a job (items = its bullets) or a skill group (items = its skills).
 */
export const deepDivePositions = sqliteTable(
  "deep_dive_positions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // The career bank job this was copied from, so Update can match it even after a title change.
    // Not a foreign key: deleting the job must not touch the snapshot until the user chooses Update.
    sourceEntryId: text("source_entry_id"),
    section: text("section", { enum: DEEP_DIVE_SECTIONS }).notNull().default("experience"),
    sortOrder: integer("sort_order").notNull(),
    title: text("title").notNull(),
    organization: text("organization"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    description: text("description"),
    // A job's bullets, or a skill group's skills.
    bullets: text("bullets", { mode: "json" }).$type<string[]>().notNull(),
    ...timestamps,
  },
  (t) => [index("deep_dive_positions_user_idx").on(t.userId)],
);

/** Bullet index used for the answer about the role as a whole. */
export const ROLE_ANSWER = -1;

/** A prepared answer about a snapshotted position (ROLE_ANSWER) or one of its bullets (0, 1, 2...). */
export const deepDiveAnswers = sqliteTable(
  "deep_dive_answers",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    positionId: text("position_id")
      .notNull()
      .references(() => deepDivePositions.id, { onDelete: "cascade" }),
    bulletIndex: integer("bullet_index").notNull(),
    answer: text("answer").notNull(),
    grade: text("grade", { enum: GRADES }),
    feedback: text("feedback"),
    // The answer as it was when graded. If the answer has changed since, the grade is out of date.
    gradedAnswer: text("graded_answer"),
    // The bullet (or role details) as it was when graded. If Update changed it, the grade is dimmed.
    gradedFor: text("graded_for"),
    ...timestamps,
  },
  (t) => [uniqueIndex("deep_dive_answers_target_idx").on(t.positionId, t.bulletIndex)],
);

/**
 * Per-user Interview Prep bookkeeping. "Acknowledged" means the user has seen the career bank as it was
 * at that moment: Resume Deep Dive was built from it (first visit or Overwrite), or they clicked Dismiss.
 * Any job saved, added, or deleted after that shows the "career bank updated" banner.
 */
export const interviewPrepState = sqliteTable("interview_prep_state", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  // Fingerprint of the career bank's jobs when acknowledged. Catches deletions, which leave no timestamp.
  acknowledgedFingerprint: text("acknowledged_fingerprint").notNull(),
  // When acknowledged. Catches any job saved or added later, even if its text ends up the same.
  acknowledgedAt: integer("acknowledged_at", { mode: "timestamp" }).notNull(),
  ...timestamps,
});

export type User = typeof users.$inferSelect;
export type BankEntry = typeof bankEntries.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
export type DeepDivePosition = typeof deepDivePositions.$inferSelect;
export type DeepDiveAnswer = typeof deepDiveAnswers.$inferSelect;
