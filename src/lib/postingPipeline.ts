import { OutputParserException } from "@langchain/core/output_parsers";
import { RunnableLambda, RunnablePassthrough } from "@langchain/core/runnables";
import type { BankEntry } from "../db/schema";
import { createExtractChain } from "./extractor";
import { createFitChain, entryTitlesFor, type FitInput } from "./fitAnalyzer";
import { scoreFit } from "./schemas/fitAnalysis";
import type { JobPosting, PostingDetails } from "./schemas/jobPosting";

/**
 * Retry a step once if Claude's answer didn't match the schema (for example, it was cut off,
 * or it returned the wrong number of verdicts). Other errors, like a bad API key, stop right away.
 * ChatAnthropic already retries temporary API errors such as rate limits on its own.
 */
const retryBadOutput = {
  stopAfterAttempt: 2,
  onFailedAttempt: (error: unknown) => {
    if (!(error instanceof OutputParserException)) throw error;
  },
};

/**
 * Step 2 on its own: judge a requirement list against the career bank, then score it in code.
 * Input: { entries, requirements }. Used by both Analyze and Re-analyze.
 */
export function createJudgeChain(apiKey: string) {
  const fit = createFitChain(apiKey).withRetry(retryBadOutput);
  return RunnableLambda.from(async (input: FitInput, config) => {
    const requirements = await fit.invoke(input, config);
    return { requirements, score: scoreFit(requirements), entryTitles: entryTitlesFor(input.entries) };
  }).withConfig({ runName: "judge_requirements" });
}

/** Splits the extractor's output into the facts we save and the list we judge. */
function splitExtraction({ requirements, ...details }: JobPosting): {
  details: PostingDetails;
  requirements: JobPosting["requirements"];
} {
  return { details, requirements };
}

/**
 * The full Analyze pipeline, for a posting seen for the first time. Input: { posting, entries }.
 *
 *   input ──► 1. extract (posting → facts + requirement list) ──► 2. judge (list + bank → verdicts) ──► result
 *
 * The steps run in order because step 2 needs step 1's list. RunnablePassthrough.assign runs a
 * step and adds its output to the input under a new key, so each step can see everything before it.
 */
export function createAnalyzePipeline(apiKey: string) {
  const extract = RunnableLambda.from((input: { posting: string }) => ({ posting: input.posting }))
    .pipe(createExtractChain(apiKey))
    .withRetry(retryBadOutput)
    .pipe(RunnableLambda.from(splitExtraction));

  const judge = RunnableLambda.from((input: { entries: BankEntry[]; extracted: ReturnType<typeof splitExtraction> }) => ({
    entries: input.entries,
    requirements: input.extracted.requirements,
  })).pipe(createJudgeChain(apiKey));

  return RunnablePassthrough.assign({ extracted: extract }) // { posting, entries, extracted }
    .pipe(RunnablePassthrough.assign({ judged: judge })) //     + judged
    .pipe(
      RunnableLambda.from(
        (input: { extracted: ReturnType<typeof splitExtraction>; judged: Awaited<ReturnType<ReturnType<typeof createJudgeChain>["invoke"]>> }) => ({
          details: input.extracted.details,
          ...input.judged,
        }),
      ),
    )
    .withConfig({ runName: "analyze_posting" });
}

export type JudgeResult = Awaited<ReturnType<ReturnType<typeof createJudgeChain>["invoke"]>>;
export type PostingAnalysis = { details: PostingDetails } & JudgeResult;
