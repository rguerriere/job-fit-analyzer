"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { bankEntries, qaQuestions } from "@/db/schema";
import { describeApiError } from "@/lib/anthropicKey";
import { getCurrentUser } from "@/lib/currentUser";
import { createQaGradeChain } from "@/lib/qaGrader";
import type { ActionResult, GradeResult } from "./actions";

const MAX_ANSWER_CHARS = 5_000;
const GONE = "This question was removed. Reload the page.";

async function findQuestion(userId: string, questionId: string) {
  return db.query.qaQuestions.findFirst({
    where: and(eq(qaQuestions.id, questionId), eq(qaQuestions.userId, userId)),
  });
}

/** Autosave for one Interview Q&A answer. Clearing it also clears its grade. */
export async function saveQaAnswer(questionId: string, answer: string): Promise<ActionResult> {
  if (answer.length > MAX_ANSWER_CHARS) return { ok: false, error: "That answer is too long to save." };
  const user = await getCurrentUser();
  if (!(await findQuestion(user.id, questionId))) return { ok: false, error: GONE };

  const cleared = !answer.trim();
  await db
    .update(qaQuestions)
    .set(
      cleared
        ? { answer: "", grade: null, feedback: null, gradedAnswer: null, gradedFor: null }
        : { answer },
    )
    .where(eq(qaQuestions.id, questionId));
  return { ok: true };
}

/** Grades the saved answer against the question, with the career bank for context. */
export async function gradeQaAnswer(questionId: string): Promise<GradeResult> {
  const user = await getCurrentUser();
  if (!user.anthropicApiKey) return { ok: false, error: "Add your Anthropic API key in Settings first." };
  const question = await findQuestion(user.id, questionId);
  if (!question) return { ok: false, error: GONE };
  if (!question.answer.trim()) return { ok: false, error: "Write an answer first." };

  const entries = await db
    .select()
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id))
    .orderBy(asc(bankEntries.createdAt));

  try {
    const result = await createQaGradeChain(user.anthropicApiKey).invoke({
      question: question.text,
      star: question.star,
      answer: question.answer,
      entries,
    });
    await db
      .update(qaQuestions)
      .set({ grade: result.grade, feedback: result.feedback, gradedAnswer: question.answer, gradedFor: question.text })
      .where(eq(qaQuestions.id, questionId));
    return { ok: true, ...result, gradedAnswer: question.answer, gradedFor: question.text };
  } catch (err) {
    console.error("Grading failed:", err);
    return { ok: false, error: describeApiError(err) };
  }
}
