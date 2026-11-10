"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { techGroups, techQuestions } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import type { ActionResult } from "./actions";

const MAX_TITLE_CHARS = 100;
const MAX_QUESTION_CHARS = 500;
const MAX_ANSWER_CHARS = 5_000;

/** Trims and checks a group title or question. Returns the cleaned text, or an error. */
function clean(text: string, maxChars: number, what: string): { ok: true; text: string } | { ok: false; error: string } {
  const trimmed = text.trim();
  if (!trimmed) return { ok: false, error: `Enter a ${what} first.` };
  if (trimmed.length > maxChars) return { ok: false, error: `That ${what} is too long (max ${maxChars} characters).` };
  return { ok: true, text: trimmed };
}

const ownGroup = (userId: string, id: string) => and(eq(techGroups.id, id), eq(techGroups.userId, userId));
const ownQuestion = (userId: string, id: string) => and(eq(techQuestions.id, id), eq(techQuestions.userId, userId));

/** Refreshes the page so added, renamed, or deleted items show up. */
const refresh = () => revalidatePath("/interview-prep");

export async function addTechGroup(title: string): Promise<ActionResult> {
  const cleaned = clean(title, MAX_TITLE_CHARS, "group name");
  if (!cleaned.ok) return cleaned;
  const user = await getCurrentUser();
  const [last] = await db.select({ n: max(techGroups.sortOrder) }).from(techGroups).where(eq(techGroups.userId, user.id));
  await db.insert(techGroups).values({ userId: user.id, title: cleaned.text, sortOrder: (last?.n ?? -1) + 1 });
  refresh();
  return { ok: true };
}

export async function renameTechGroup(id: string, title: string): Promise<ActionResult> {
  const cleaned = clean(title, MAX_TITLE_CHARS, "group name");
  if (!cleaned.ok) return cleaned;
  const user = await getCurrentUser();
  await db.update(techGroups).set({ title: cleaned.text }).where(ownGroup(user.id, id));
  refresh();
  return { ok: true };
}

/** Deletes a group and every question in it (the database cascades the delete). */
export async function deleteTechGroup(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await db.delete(techGroups).where(ownGroup(user.id, id));
  refresh();
  return { ok: true };
}

export async function addTechQuestion(groupId: string, text: string): Promise<ActionResult> {
  const cleaned = clean(text, MAX_QUESTION_CHARS, "question");
  if (!cleaned.ok) return cleaned;
  const user = await getCurrentUser();
  if (!(await db.query.techGroups.findFirst({ where: ownGroup(user.id, groupId) }))) {
    return { ok: false, error: "That group no longer exists. Reload the page." };
  }
  const [last] = await db
    .select({ n: max(techQuestions.sortOrder) })
    .from(techQuestions)
    .where(eq(techQuestions.groupId, groupId));
  await db
    .insert(techQuestions)
    .values({ userId: user.id, groupId, text: cleaned.text, sortOrder: (last?.n ?? -1) + 1 });
  refresh();
  return { ok: true };
}

export async function editTechQuestion(id: string, text: string): Promise<ActionResult> {
  const cleaned = clean(text, MAX_QUESTION_CHARS, "question");
  if (!cleaned.ok) return cleaned;
  const user = await getCurrentUser();
  await db.update(techQuestions).set({ text: cleaned.text }).where(ownQuestion(user.id, id));
  refresh();
  return { ok: true };
}

export async function deleteTechQuestion(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await db.delete(techQuestions).where(ownQuestion(user.id, id));
  refresh();
  return { ok: true };
}

/** Autosave for one answer. No refresh needed: the page already shows what was typed. */
export async function saveTechAnswer(id: string, answer: string): Promise<ActionResult> {
  if (answer.length > MAX_ANSWER_CHARS) return { ok: false, error: "That answer is too long to save." };
  const user = await getCurrentUser();
  const result = await db.update(techQuestions).set({ answer }).where(ownQuestion(user.id, id));
  if (result.rowsAffected === 0) return { ok: false, error: "This question was deleted. Reload the page." };
  return { ok: true };
}
