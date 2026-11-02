import { OutputParserException } from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import type { BankEntry } from "../db/schema";
import { createModel } from "./llm";
import { FitVerdictsSchema, type FitVerdicts, type RequirementResult } from "./schemas/fitAnalysis";
import type { RequirementItem } from "./schemas/jobPosting";

const SYSTEM_PROMPT = `You judge, requirement by requirement, whether a person's career bank shows each
item on a job's requirement list. The person uses this to decide whether to apply, so an honest gap
is more useful than a generous match.

Rules:
- Give exactly one verdict per requirement, in the order given, copying each requirement's text.
- Judge only from the career bank. Do not assume skills it doesn't show, even common ones.
- Reasonable equivalents count: a Bachelor's in Computer Science meets "degree in a related field",
  and using PostgreSQL shows "SQL". A different tool in the same family (e.g. Vue for React) is partial.
- A skill that is only listed (in a skills section) with no role or project showing it is partial.
  Hands-on work that covers most of a requirement in a different setting is close.
- An item that names several tools or languages is judged as a whole: strong if the bank shows
  most of them in real work, close or partial if it shows some, none if it shows none.
- For years of experience, add up the dates of relevant entries. "present" means today.
- Cite entries by their ID, like E3.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  [
    "human",
    "Today is {today}.\n\n<career_bank>\n{bank}\n</career_bank>\n\n<requirements>\n{requirements}\n</requirements>",
  ],
]);

export type FitInput = { entries: BankEntry[]; requirements: RequirementItem[] };

/** Writes the career bank as plain text with short IDs, so Claude can cite entries. */
export function formatBank(entries: BankEntry[]): string {
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

/** Maps each entry ID Claude may cite (E1, E2, ...) to the entry's title. Matches formatBank's numbering. */
export function entryTitlesFor(entries: BankEntry[]): Record<string, string> {
  return Object.fromEntries(
    entries.map((e, i) => [`E${i + 1}`, e.organization ? `${e.title}, ${e.organization}` : e.title]),
  );
}

/**
 * Pairs each requirement with its verdict. The requirement text and importance always come from
 * the saved list, never from Claude. A wrong count throws OutputParserException so withRetry retries.
 */
function attachVerdicts(requirements: RequirementItem[], { verdicts }: FitVerdicts): RequirementResult[] {
  if (verdicts.length !== requirements.length) {
    throw new OutputParserException(`Expected ${requirements.length} verdicts but got ${verdicts.length}.`);
  }
  return requirements.map((item, i) => {
    const { match, entryIds, note } = verdicts[i]!;
    return { ...item, match, entryIds, note };
  });
}

/**
 * A chain that judges a requirement list against the career bank.
 * Steps: fill in the prompt's variables → build the prompt → ask Claude for verdicts
 * → pair each verdict with its requirement.
 */
export function createFitChain(apiKey: string) {
  const structuredModel = createModel(apiKey).withStructuredOutput(FitVerdictsSchema, {
    name: "fit_verdicts",
    method: "jsonSchema",
  });
  const toPromptVariables = RunnableLambda.from((input: FitInput) => ({
    today: new Date().toISOString().slice(0, 10),
    bank: formatBank(input.entries),
    requirements: input.requirements.map((r) => `- [${r.importance}] ${r.requirement}`).join("\n"),
  }));
  const judge = toPromptVariables.pipe(prompt).pipe(structuredModel);

  // A lambda can call another chain. Passing `config` along keeps it in the same trace.
  return RunnableLambda.from(async (input: FitInput, config) =>
    attachVerdicts(input.requirements, await judge.invoke(input, config)),
  ).withConfig({ runName: "analyze_fit" });
}
