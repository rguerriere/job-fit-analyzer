import { z } from "zod";
import type { RequirementItem } from "./jobPosting";

/**
 * What Claude returns when judging a requirement list against a career bank: one verdict per item,
 * in the same order. Field descriptions are sent to the model, so they double as instructions.
 * The list itself comes from the extractor; the score is calculated in code (see scoreFit).
 */
export const FitVerdictsSchema = z.object({
  verdicts: z
    .array(
      z.object({
        requirement: z.string().describe("The requirement, copied exactly from the list."),
        match: z
          .enum(["strong", "close", "partial", "none"])
          .describe(
            "strong = the career bank clearly shows it. " +
              "close = real hands-on work that covers most of it, in a somewhat different setting " +
              "(e.g. built data pipelines, but not inside an analytics framework; worked with internal " +
              "teams rather than external clients). " +
              "partial = only listed as a skill with no work showing it, a similar tool, or less than " +
              "asked (e.g. 2 years when 4 are required). " +
              "none = nothing in the bank shows it.",
          ),
        entryIds: z
          .array(z.string())
          .describe("IDs (like E3) of the bank entries that show this. Empty when match is none."),
        note: z
          .string()
          .describe(
            "One short sentence, at most about 15 words. For strong, name the specific work that shows it " +
              "(e.g. 'Moved the billing service to AWS Lambda.'). For close, partial, or none, " +
              "say what is missing.",
          ),
      }),
    )
    .describe("One verdict per requirement, in the order given."),
});
export type FitVerdicts = z.infer<typeof FitVerdictsSchema>;
type Verdict = FitVerdicts["verdicts"][number];

/** A requirement with its verdict. This is what gets saved and shown. */
export type RequirementResult = RequirementItem & Omit<Verdict, "requirement">;

/** How much of the score comes from required items; preferred items make up the rest. */
const REQUIRED_SHARE = 0.5;
/** Credit each match level earns. Analyses saved before "close" existed simply never use it. */
const MATCH_CREDIT = { strong: 1, close: 0.75, partial: 0.5, none: 0 } as const;

/** Average credit across a group of requirements (0–1), or null if the group is empty. */
function coverage(requirements: RequirementResult[]): number | null {
  if (requirements.length === 0) return null;
  return requirements.reduce((sum, r) => sum + MATCH_CREDIT[r.match], 0) / requirements.length;
}

/**
 * Turns Claude's per-requirement verdicts into a 0–100 score.
 * Required and preferred items are scored as two groups and blended by REQUIRED_SHARE, so a long
 * nice-to-have list can't outweigh a short must-have list. If a posting has only one group, that
 * group is the whole score. Doing this in code keeps the score consistent and explainable.
 */
export function scoreFit(requirements: RequirementResult[]): number | null {
  const required = coverage(requirements.filter((r) => r.importance === "required"));
  const preferred = coverage(requirements.filter((r) => r.importance === "preferred"));
  const blended =
    required !== null && preferred !== null
      ? REQUIRED_SHARE * required + (1 - REQUIRED_SHARE) * preferred
      : (required ?? preferred);
  return blended === null ? null : Math.round(blended * 100);
}
