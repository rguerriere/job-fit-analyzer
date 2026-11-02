import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import { db } from "../db/client";
import { qaQuestions } from "../db/schema";
import { DEFAULT_QUESTIONS } from "./interviewQuestions";

/**
 * Brings the user's default questions in line with DEFAULT_QUESTIONS: adds new ones, rewrites changed
 * ones (keeping the answer; a reworded question dims its grade), and deletes removed ones with their answers.
 * Custom questions (no defaultKey) are never touched.
 */
async function syncDefaults(userId: string) {
  const existing = await db
    .select()
    .from(qaQuestions)
    .where(and(eq(qaQuestions.userId, userId), isNotNull(qaQuestions.defaultKey)));
  const byKey = new Map(existing.map((q) => [q.defaultKey!, q]));
  const wanted = new Set(DEFAULT_QUESTIONS.map((q) => q.key));

  const removed = existing.filter((q) => !wanted.has(q.defaultKey!)).map((q) => q.id);
  if (removed.length > 0) await db.delete(qaQuestions).where(inArray(qaQuestions.id, removed));

  for (const [sortOrder, d] of DEFAULT_QUESTIONS.entries()) {
    const fields = { groupId: d.group, sortOrder, text: d.text, hint: d.hint, star: d.star };
    const current = byKey.get(d.key);
    if (!current) {
      await db.insert(qaQuestions).values({ userId, defaultKey: d.key, ...fields });
    } else if (
      current.groupId !== fields.groupId ||
      current.sortOrder !== fields.sortOrder ||
      current.text !== fields.text ||
      current.hint !== fields.hint ||
      current.star !== fields.star
    ) {
      await db.update(qaQuestions).set(fields).where(eq(qaQuestions.id, current.id));
    }
  }
}

/** The user's Interview Q&A questions with their answers, after syncing the defaults. */
export async function loadQuestions(userId: string) {
  await syncDefaults(userId);
  return db.select().from(qaQuestions).where(eq(qaQuestions.userId, userId)).orderBy(asc(qaQuestions.sortOrder));
}
