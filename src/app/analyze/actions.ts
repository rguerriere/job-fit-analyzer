"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import { analyses } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { analyzeNewPosting } from "@/lib/opportunities";

const MAX_POSTING_CHARS = 30_000;

export type AnalyzeResult = { ok: true; id: string } | { ok: false; error: string };

/** Compares a pasted job posting to the user's career bank and saves it to Opportunities. */
export async function analyzePosting(formData: FormData): Promise<AnalyzeResult> {
  const posting = String(formData.get("posting") ?? "").trim();
  if (!posting) return { ok: false, error: "Paste a job posting first." };
  if (posting.length > MAX_POSTING_CHARS) {
    return { ok: false, error: "That posting is very long. Paste just the job description and requirements." };
  }

  const user = await getCurrentUser();
  const run = await analyzeNewPosting(user, posting);
  if (!run.ok) return run;

  const [saved] = await db
    .insert(analyses)
    .values({ ...run.fields, userId: user.id, postingText: posting })
    .returning({ id: analyses.id });

  if (!saved) return { ok: false, error: "Couldn't save the analysis. Try again." };

  revalidatePath("/opportunities");
  return { ok: true, id: saved.id };
}
