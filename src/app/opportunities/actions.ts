"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { analyses } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { runFitAnalysis } from "@/lib/opportunities";

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Re-runs a saved posting against the current career bank and keeps the old score for comparison. */
export async function reanalyzeOpportunity(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  const existing = await db.query.analyses.findFirst({
    where: and(eq(analyses.id, id), eq(analyses.userId, user.id)),
  });
  if (!existing) return { ok: false, error: "That opportunity no longer exists." };

  const run = await runFitAnalysis(user, existing.postingText);
  if (!run.ok) return run;

  await db
    .update(analyses)
    .set({ ...run.fields, previousScore: existing.score })
    .where(and(eq(analyses.id, id), eq(analyses.userId, user.id)));

  revalidatePath("/opportunities");
  return { ok: true };
}

export async function deleteOpportunity(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await db.delete(analyses).where(and(eq(analyses.id, id), eq(analyses.userId, user.id)));
  revalidatePath("/opportunities");
  return { ok: true };
}
