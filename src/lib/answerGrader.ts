import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import type { DeepDivePosition } from "../db/schema";
import { createModel } from "./llm";
import { AnswerGradeSchema } from "./schemas/answerGrade";

const SYSTEM_PROMPT = `You grade a job seeker's prepared answer to an interview question about their own resume.
These are notes they will speak from in interviews, so short is fine: one or two sentences can earn
the top grade. Be lenient but fair.

A strong answer supports the bullet (or, for a question about the role, describes the role) with
detail beyond what the resume already says: how they did it, the tools, their own part, the scale,
or what resulted.

Explaining the "what" is a big part of the grade. The interviewer doesn't know their company's
systems, so when the answer involves a platform, module, product, or project (for example an internal
"Vessel Reporting Platform"), a strong answer says in plain words what it is and what it does or who
uses it. An answer that dives into details without ever saying what the thing is cannot be great.

Grades:
- bad: nonsense, unrelated to the question, or clearly made up or absurd for this role. This is rare.
  An answer that is on topic but weak is poor, not bad.
- poor: on topic but vague, or mostly repeats the bullet without adding anything.
- good: adds at least one concrete detail, such as how they did it, the tools, their part, or the scale.
- great: specific and concise, explains in plain words what the thing is, and makes clear what they
  personally did and why it mattered or what resulted. Ready to say out loud.

Do not lower a grade for being short, informal, or missing numbers. Judge the substance only.`;

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  [
    "human",
    "<role>\n{role}\n</role>\n\nInterview question: {question}\n\n<answer>\n{answer}\n</answer>",
  ],
]);

/** The position as it was saved in Resume Deep Dive. */
type Role = Pick<DeepDivePosition, "title" | "organization" | "startDate" | "endDate" | "description" | "bullets">;

export type GradeInput = {
  entry: Role;
  /** The bullet being asked about, or null for the question about the role as a whole. */
  bullet: string | null;
  answer: string;
};

/** The role as it appears on the resume, so Claude knows what the answer should support. */
function formatRole(entry: Role): string {
  const dates = entry.startDate || entry.endDate ? ` (${entry.startDate ?? "?"} to ${entry.endDate ?? "?"})` : "";
  const lines = [`${entry.title}${entry.organization ? `, ${entry.organization}` : ""}${dates}`];
  if (entry.description) lines.push(entry.description);
  for (const h of entry.bullets) lines.push(`- ${h}`);
  return lines.join("\n");
}

function formatQuestion(entry: Role, bullet: string | null): string {
  if (bullet === null) {
    const where = entry.organization ? ` at ${entry.organization}` : "";
    return `"Tell me about your role as ${entry.title}${where}. What did you do there?"`;
  }
  return `"Your resume says: '${bullet}'. Can you elaborate on that?"`;
}

/** A chain that grades one prepared answer. Input: { entry, bullet, answer }. Output: { feedback, grade }. */
export function createGradeChain(apiKey: string) {
  const structuredModel = createModel(apiKey).withStructuredOutput(AnswerGradeSchema, {
    name: "answer_grade",
    method: "jsonSchema",
  });
  const toPromptVariables = RunnableLambda.from((input: GradeInput) => ({
    role: formatRole(input.entry),
    question: formatQuestion(input.entry, input.bullet),
    answer: input.answer,
  }));
  return toPromptVariables.pipe(prompt).pipe(structuredModel).withConfig({ runName: "grade_answer" });
}
