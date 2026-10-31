import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { ENTRY_KINDS } from "../lib/schemas/bankEntry";

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

export type User = typeof users.$inferSelect;
export type BankEntry = typeof bankEntries.$inferSelect;
