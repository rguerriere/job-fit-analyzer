import { ChatPromptTemplate } from "@langchain/core/prompts";
import { RunnableLambda } from "@langchain/core/runnables";
import type { BankEntry } from "../db/schema";
import { formatBank } from "./fitAnalyzer";
import { createModel } from "./llm";
import { AnswerGradeSchema } from "./schemas/answerGrade";

const SYSTEM_PROMPT = `You grade a job seeker's prepared answer to a common interview question. These are notes
they will speak from; about a minute out loud is plenty. Be lenient but fair.

You also see their career bank: their real background. Use it to check that the answer is believable
for this person, and to make feedback specific (for example, suggest a real project from the bank that
would make a stronger example). Mentioning something that isn't in the bank is fine unless it's clearly
implausible.

{rubric}

Explaining the "what" is a big part of the substance grade. The interviewer doesn't know their
company's systems, so when the answer involves a platform, module, product, or project (for example an
internal "Vessel Reporting Platform"), a strong answer says in plain words what it is and what it does or
who uses it. An answer that dives into details without ever saying what the thing is cannot be great.

Grades:
- bad: nonsense, off topic, or clearly made up or absurd. This is rare. A weak but on-topic answer is poor.
- poor: on topic but vague or generic, or doesn't really answer the question.
- good: answers the question directly, with at least one concrete, relevant detail.
- great: specific, well organized, and memorable, and explains in plain words what any system or project
  it mentions is. Ready to say out loud.

Do not lower a grade for informal tone, or for being brief if the answer is complete.`;

const SUBSTANCE_ONLY =
  "Grade on substance: does it answer the question directly, with specific and relevant detail, and does " +
  "it sound credible and confident?";

const WITH_STAR =
  "This is a behavioral question. Grade about 75% on substance: does it answer the question directly, with " +
  "specific and relevant detail, and does it sound credible and confident? Grade about 25% on structure: does " +
  "it roughly follow STAR (the Situation, their Task, the Actions they took, and the Result)? Don't require " +
  "labels or a strict format; a clear story missing one piece can still be good. If a piece is missing, " +
  "the feedback can mention it.";

const prompt = ChatPromptTemplate.fromMessages([
  ["system", SYSTEM_PROMPT],
  [
    "human",
    "<career_bank>\n{bank}\n</career_bank>\n\nInterview question: {question}\n\n<answer>\n{answer}\n</answer>",
  ],
]);

export type QaGradeInput = { question: string; star: boolean; answer: string; entries: BankEntry[] };

/** A chain that grades one Interview Q&A answer. Output: { feedback, grade }. */
export function createQaGradeChain(apiKey: string) {
  const structuredModel = createModel(apiKey).withStructuredOutput(AnswerGradeSchema, {
    name: "answer_grade",
    method: "jsonSchema",
  });
  const toPromptVariables = RunnableLambda.from((input: QaGradeInput) => ({
    rubric: input.star ? WITH_STAR : SUBSTANCE_ONLY,
    bank: input.entries.length > 0 ? formatBank(input.entries) : "(empty)",
    question: input.question,
    answer: input.answer,
  }));
  return toPromptVariables.pipe(prompt).pipe(structuredModel).withConfig({ runName: "grade_qa_answer" });
}
