import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ENTRY_KINDS } from "../lib/schemas/bankEntry";
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
    ...timestamps,
  },
  (t) => [index("analyses_user_idx").on(t.userId)],
);

export type User = typeof users.$inferSelect;
export type BankEntry = typeof bankEntries.$inferSelect;
export type Analysis = typeof analyses.$inferSelect;
