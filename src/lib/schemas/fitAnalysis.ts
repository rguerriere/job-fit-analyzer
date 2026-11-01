import { z } from "zod";

/**
 * What Claude returns when comparing a job posting to a career bank.
 * Field descriptions are sent to the model, so they double as instructions.
 * Claude judges each requirement; the score itself is calculated in code (see scoreFit).
 */
export const FitAssessmentSchema = z.object({
  jobTitle: z.string().describe("Job title as written in the posting."),
  company: z.string().nullable().describe("Hiring company, or null if not stated."),
  requirements: z
    .array(
      z.object({
        requirement: z
          .string()
          .describe("One requirement from the posting as a short phrase, e.g. '3+ years React' or 'AWS'."),
        importance: z
          .enum(["required", "preferred"])
          .describe("preferred = the posting calls it preferred, a bonus, a plus, or nice to have."),
        match: z
          .enum(["strong", "partial", "none"])
          .describe(
            "strong = the career bank clearly shows it; partial = related or less than asked " +
              "(e.g. 2 years when 4 are required, or a similar tool); none = nothing in the bank shows it.",
          ),
        entryIds: z
          .array(z.string())
          .describe("IDs (like E3) of the bank entries that show this. Empty when match is none."),
        note: z
          .string()
          .describe(
            "One short sentence. For partial or none, say what is missing. For strong, say what shows it.",
          ),
      }),
    )
    .describe("Every distinct skill, qualification, and experience requirement in the posting."),
});
export type FitAssessment = z.infer<typeof FitAssessmentSchema>;
export type RequirementResult = FitAssessment["requirements"][number];

const IMPORTANCE_WEIGHT = { required: 3, preferred: 1 } as const;
const MATCH_CREDIT = { strong: 1, partial: 0.5, none: 0 } as const;

/**
 * Turns Claude's per-requirement verdicts into a 0–100 score.
 * Required items count three times as much as preferred ones; a partial match earns half.
 * Doing this in code keeps the score consistent and explainable.
 */
export function scoreFit(requirements: RequirementResult[]): number | null {
  let earned = 0;
  let possible = 0;
  for (const r of requirements) {
    const weight = IMPORTANCE_WEIGHT[r.importance];
    possible += weight;
    earned += weight * MATCH_CREDIT[r.match];
  }
  return possible === 0 ? null : Math.round((earned / possible) * 100);
}
