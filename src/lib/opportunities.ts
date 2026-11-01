import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { bankEntries, type User } from "../db/schema";
import { describeApiError } from "./anthropicKey";
import { analyzeFit } from "./fitAnalyzer";
import { scoreFit } from "./schemas/fitAnalysis";

export type FitRun =
  | {
      ok: true;
      fields: {
        jobTitle: string;
        company: string | null;
        score: number | null;
        requirements: Awaited<ReturnType<typeof analyzeFit>>["requirements"];
        entryTitles: Record<string, string>;
        analyzedAt: Date;
      };
    }
  | { ok: false; error: string };

/** Compares a posting against the user's current career bank. Used by analyze and re-analyze. */
export async function runFitAnalysis(user: User, postingText: string): Promise<FitRun> {
  if (!user.anthropicApiKey) return { ok: false, error: "Add your Anthropic API key in Settings first." };

  const entries = await db
    .select()
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id))
    .orderBy(asc(bankEntries.createdAt));
  if (entries.length === 0) return { ok: false, error: "Add some entries to your career bank first." };

  try {
    const result = await analyzeFit(user.anthropicApiKey, postingText, entries);
    if (result.requirements.length === 0) {
      return {
        ok: false,
        error: "Claude couldn't find any requirements in that. Check that you pasted the full job posting.",
      };
    }
    return {
      ok: true,
      fields: {
        jobTitle: result.jobTitle,
        company: result.company,
        score: scoreFit(result.requirements),
        requirements: result.requirements,
        entryTitles: result.entryTitles,
        analyzedAt: new Date(),
      },
    };
  } catch (err) {
    console.error("Fit analysis failed:", err);
    return { ok: false, error: describeApiError(err) };
  }
}
