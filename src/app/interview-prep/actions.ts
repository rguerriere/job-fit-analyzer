"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { deepDiveAnswers, deepDivePositions, ROLE_ANSWER } from "@/db/schema";
import { describeApiError } from "@/lib/anthropicKey";
import { createGradeChain } from "@/lib/answerGrader";
import { getCurrentUser } from "@/lib/currentUser";
import {
  answerTarget,
  applyUpdate,
  dismissBankChange,
  previewUpdate,
  resetDeepDive,
  type UpdateSummary,
} from "@/lib/deepDive";
import type { AnswerGrade } from "@/lib/schemas/answerGrade";

const MAX_ANSWER_CHARS = 5_000;

export type ActionResult = { ok: true } | { ok: false; error: string };
export type GradeResult =
  | ({ ok: true } & AnswerGrade & { gradedAnswer: string; gradedFor: string })
  | { ok: false; error: string };
export type PreviewResult = { ok: true; summary: UpdateSummary; token: string };

const GONE = "This was removed when Interview Prep was updated. Reload the page.";

/** One of the user's snapshot positions, if the bullet index is valid for it. */
async function findPosition(userId: string, positionId: string, bulletIndex: number) {
  const position = await db.query.deepDivePositions.findFirst({
    where: and(eq(deepDivePositions.id, positionId), eq(deepDivePositions.userId, userId)),
  });
  if (!position || bulletIndex < ROLE_ANSWER || bulletIndex >= position.bullets.length) return null;
  return position;
}

/** Matches the row for one answer box. */
const target = (positionId: string, bulletIndex: number) =>
  and(eq(deepDiveAnswers.positionId, positionId), eq(deepDiveAnswers.bulletIndex, bulletIndex));

/**
 * Autosave for one answer box. An empty answer deletes the row (and its grade).
 * No revalidatePath: the page already shows what was typed, and re-rendering on every save is wasted work.
 */
export async function saveAnswer(positionId: string, bulletIndex: number, answer: string): Promise<ActionResult> {
  if (answer.length > MAX_ANSWER_CHARS) return { ok: false, error: "That answer is too long to save." };
  const user = await getCurrentUser();
  if (!(await findPosition(user.id, positionId, bulletIndex))) return { ok: false, error: GONE };

  if (!answer.trim()) {
    await db.delete(deepDiveAnswers).where(target(positionId, bulletIndex));
    return { ok: true };
  }
  await db
    .insert(deepDiveAnswers)
    .values({ userId: user.id, positionId, bulletIndex, answer })
    .onConflictDoUpdate({
      target: [deepDiveAnswers.positionId, deepDiveAnswers.bulletIndex],
      set: { answer, updatedAt: new Date() },
    });
  return { ok: true };
}

/** Grades the saved answer for one box against its bullet (or the role) and stores the result. */
export async function gradeAnswer(positionId: string, bulletIndex: number): Promise<GradeResult> {
  const user = await getCurrentUser();
  if (!user.anthropicApiKey) return { ok: false, error: "Add your Anthropic API key in Settings first." };

  const [position, saved] = await Promise.all([
    findPosition(user.id, positionId, bulletIndex),
    db.query.deepDiveAnswers.findFirst({ where: target(positionId, bulletIndex) }),
  ]);
  if (!position) return { ok: false, error: GONE };
  if (position.section !== "experience") return { ok: false, error: "Skills notes aren't graded." };
  if (!saved?.answer.trim()) return { ok: false, error: "Write an answer first." };

  try {
    const result = await createGradeChain(user.anthropicApiKey).invoke({
      entry: position,
      bullet: bulletIndex === ROLE_ANSWER ? null : position.bullets[bulletIndex]!,
      answer: saved.answer,
    });
    await db
      .update(deepDiveAnswers)
      .set({
        grade: result.grade,
        feedback: result.feedback,
        gradedAnswer: saved.answer,
        gradedFor: answerTarget(position, bulletIndex),
      })
      .where(eq(deepDiveAnswers.id, saved.id));
    return { ok: true, ...result, gradedAnswer: saved.answer, gradedFor: answerTarget(position, bulletIndex) };
  } catch (err) {
    console.error("Grading failed:", err);
    return { ok: false, error: describeApiError(err) };
  }
}

/** Banner → Dismiss. */
export async function dismissBankChangeAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  await dismissBankChange(user.id);
  revalidatePath("/interview-prep");
  return { ok: true };
}

/** Banner → Update, step 1: what would change. Nothing is saved. */
export async function previewUpdateAction(): Promise<PreviewResult> {
  const user = await getCurrentUser();
  return { ok: true, ...(await previewUpdate(user.id)) };
}

/** Banner → Update, step 2: apply exactly what the preview showed. */
export async function applyUpdateAction(token: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!(await applyUpdate(user.id, token))) {
    return { ok: false, error: "Your career bank changed again since this summary. Click Update to review it." };
  }
  revalidatePath("/interview-prep");
  return { ok: true };
}

/** Banner → Reset. Deletes every Resume Deep Dive answer and rebuilds from the current career bank. */
export async function resetDeepDiveAction(): Promise<ActionResult> {
  const user = await getCurrentUser();
  await resetDeepDive(user.id);
  revalidatePath("/interview-prep");
  return { ok: true };
}
