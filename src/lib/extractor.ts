import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "./llm";
import { JobPostingSchema, type JobPosting } from "./schemas/jobPosting";

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You extract structured data from job postings for a job seeker's tracking tool.

Only record what the posting actually says. If a field is not stated, use null or "unknown"
rather than guessing; the user relies on this data to decide where to apply, so an invented
salary or requirement is worse than a missing one.

Keep skills as short, specific phrases (e.g. "TypeScript", "REST API design", "3+ years React")
and split combined items into separate entries. Ignore boilerplate such as equal-opportunity
statements and generic company marketing.`,
  ],
  ["human", "Job posting:\n\n<posting>\n{posting}\n</posting>"],
]);

/** Turns raw job-posting text into a validated JobPosting object. */
export async function extractJobPosting(apiKey: string, postingText: string): Promise<JobPosting> {
  // "jsonSchema" uses Claude's native structured outputs. The default
  // ("functionCalling") relies on forced tool use, which current Claude models reject.
  const structuredModel = createModel(apiKey).withStructuredOutput(JobPostingSchema, {
    name: "job_posting",
    method: "jsonSchema",
  });
  const chain = prompt.pipe(structuredModel);
  return chain.invoke({ posting: postingText });
}
