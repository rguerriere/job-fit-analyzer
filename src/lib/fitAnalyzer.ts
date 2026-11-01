import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import type { BankEntry } from "../db/schema";
import { createModel } from "./llm";
import { FitAssessmentSchema, type FitAssessment } from "./schemas/fitAnalysis";

const SYSTEM_PROMPT = `You compare a job posting against a person's career bank and judge, requirement by
requirement, whether their background shows it. The person uses this to decide whether to apply,
so an honest gap is more useful than a generous match.

Rules:
- List every distinct skill, qualification, and experience requirement in the posting. Split
  combined items ("React and Node.js") into separate requirements. Skip duties that aren't
  requirements, benefits, and boilerplate such as equal-opportunity statements.
- Judge only from the career bank. Do not assume skills it doesn't show, even common ones.
- Reasonable equivalents count: a Bachelor's in Computer Science meets "degree in a related field",
  and using PostgreSQL shows "SQL". A different tool in the same family (e.g. Vue for React) is partial.
- For years of experience, add up the dates of relevant entries. "present" means today.
- Cite entries by their ID, like E3.`;

/** Writes the career bank as plain text with short IDs, so Claude can cite entries. */
function formatBank(entries: BankEntry[]): string {
  return entries
    .map((e, i) => {
      const dates = e.startDate || e.endDate ? ` (${e.startDate ?? "?"} to ${e.endDate ?? "?"})` : "";
      const lines = [`E${i + 1} [${e.kind}] ${e.title}${e.organization ? `, ${e.organization}` : ""}${dates}`];
      if (e.description) lines.push(e.description);
      for (const h of e.highlights) lines.push(`- ${h}`);
      if (e.skills.length > 0) lines.push(`Skills: ${e.skills.join(", ")}`);
      return lines.join("\n");
    })
    .join("\n\n");
}

export type FitAnalysis = FitAssessment & {
  /** Maps each entry ID Claude may cite (E1, E2, ...) to the entry's title. */
  entryTitles: Record<string, string>;
};

/** Asks Claude how well the career bank covers each requirement in the posting. */
export async function analyzeFit(
  apiKey: string,
  postingText: string,
  entries: BankEntry[],
): Promise<FitAnalysis> {
  const today = new Date().toISOString().slice(0, 10);
  const structuredModel = createModel(apiKey).withStructuredOutput(FitAssessmentSchema, {
    name: "fit_assessment",
    method: "jsonSchema",
  });
  const result = await structuredModel.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage(
      `Today is ${today}.\n\n<career_bank>\n${formatBank(entries)}\n</career_bank>\n\n` +
        `<job_posting>\n${postingText}\n</job_posting>`,
    ),
  ]);

  const entryTitles = Object.fromEntries(
    entries.map((e, i) => [`E${i + 1}`, e.organization ? `${e.title}, ${e.organization}` : e.title]),
  );
  return { ...result, entryTitles };
}
