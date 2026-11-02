import { z } from "zod";

/** Worst to best. Shown as red, orange, green, blue. */
export const GRADES = ["bad", "poor", "good", "great"] as const;
export type Grade = (typeof GRADES)[number];

/**
 * What Claude returns when grading a prepared interview answer.
 * Feedback comes first so Claude explains its reasoning before picking the grade.
 * Field descriptions are sent to the model, so they double as instructions.
 */
export const AnswerGradeSchema = z.object({
  feedback: z
    .string()
    .describe(
      "One or two short sentences, speaking to the person as 'you'. For poor or good, the single most " +
        "useful thing to add. For great, what makes it work. For bad, what the question is actually asking.",
    ),
  grade: z.enum(GRADES).describe("See the grading rules in the instructions."),
});
export type AnswerGrade = z.infer<typeof AnswerGradeSchema>;
