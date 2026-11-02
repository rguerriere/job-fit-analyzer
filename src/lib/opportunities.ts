import { asc, eq } from "drizzle-orm";
import { db } from "../db/client";
import { type Analysis, bankEntries, type User } from "../db/schema";
import { describeApiError } from "./anthropicKey";
import { createExtractChain, EXTRACTION_VERSION } from "./extractor";
import { createAnalyzePipeline, createJudgeChain, type JudgeResult } from "./postingPipeline";
import type { PostingDetails } from "./schemas/jobPosting";

type Result<T> = { ok: true; fields: T } | { ok: false; error: string };

/** Loads what every analysis needs, or explains what's missing. */
async function loadInputs(user: User): Promise<Result<{ apiKey: string; entries: (typeof bankEntries.$inferSelect)[] }>> {
  if (!user.anthropicApiKey) return { ok: false, error: "Add your Anthropic API key in Settings first." };
  const entries = await db
    .select()
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id))
    .orderBy(asc(bankEntries.createdAt));
  if (entries.length === 0) return { ok: false, error: "Add some entries to your career bank first." };
  return { ok: true, fields: { apiKey: user.anthropicApiKey, entries } };
}

/** The columns a judging run updates. */
function judgedFields(judged: JudgeResult) {
  return {
    score: judged.score,
    requirements: judged.requirements,
    entryTitles: judged.entryTitles,
    analyzedAt: new Date(),
  };
}

/**
 * Analyze: a posting seen for the first time. Runs both steps (extract, then judge).
 * Returns the columns to save as a new opportunity.
 */
export async function analyzeNewPosting(user: User, postingText: string) {
  const inputs = await loadInputs(user);
  if (!inputs.ok) return inputs;
  const { apiKey, entries } = inputs.fields;

  try {
    const result = await createAnalyzePipeline(apiKey).invoke({ posting: postingText, entries });
    if (result.requirements.length === 0) {
      return {
        ok: false as const,
        error: "Claude couldn't find any requirements in that. Check that you pasted the full job posting.",
      };
    }
    return {
      ok: true as const,
      fields: {
        jobTitle: result.details.title,
        company: result.details.company,
        details: result.details,
        extractionVersion: EXTRACTION_VERSION,
        ...judgedFields(result),
      },
    };
  } catch (err) {
    console.error("Analysis failed:", err);
    return { ok: false as const, error: describeApiError(err) };
  }
}

/**
 * Re-analyze: the posting was already extracted, so only the judging step runs, on the saved
 * requirement list. The list, title, company, and details never change.
 * Opportunities saved before details existed get them extracted once, here.
 */
export async function reanalyzeSaved(user: User, saved: Analysis) {
  const inputs = await loadInputs(user);
  if (!inputs.ok) return inputs;
  const { apiKey, entries } = inputs.fields;
  const requirements = saved.requirements.map(({ requirement, importance }) => ({ requirement, importance }));

  try {
    const [judged, details] = await Promise.all([
      createJudgeChain(apiKey).invoke({ entries, requirements }),
      saved.details ? saved.details : extractDetailsOnce(apiKey, saved.postingText),
    ]);
    return { ok: true as const, fields: { ...judgedFields(judged), details } };
  } catch (err) {
    console.error("Re-analysis failed:", err);
    return { ok: false as const, error: describeApiError(err) };
  }
}

/** Only for opportunities saved before details existed. The extracted list is ignored; the saved one is kept. */
async function extractDetailsOnce(apiKey: string, postingText: string): Promise<PostingDetails> {
  const { requirements: _ignored, ...details } = await createExtractChain(apiKey).invoke({ posting: postingText });
  return details;
}
