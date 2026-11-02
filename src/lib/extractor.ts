import { ChatPromptTemplate } from "@langchain/core/prompts";
import { createModel } from "./llm";
import { JobPostingSchema, type JobPosting } from "./schemas/jobPosting";

/**
 * Bump this when the extraction instructions change in a way that affects results.
 * It's saved with each opportunity, so you can tell which ones used older rules.
 */
export const EXTRACTION_VERSION = 2; // 2: one item per qualification bullet, responsibilities ignored

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `You extract structured data from job postings for a job seeker's tracking tool.

Only record what the posting actually says. If a field is not stated, use null or "unknown"
rather than guessing; the user relies on this data to decide where to apply, so an invented
salary or requirement is worse than a missing one. Ignore boilerplate such as equal-opportunity
statements and generic company marketing.

Building the requirement list (the person is later scored against exactly this list):
- Where items come from:
  - Only the bullets in the posting's qualification sections (required and preferred).
  - Ignore the responsibilities, duties, overview paragraphs, and benefits, even when they name tools.
  - Exception: if the posting has no qualification sections at all, use the responsibilities bullets
    instead, treated as required.
- One item per bullet. Never split a bullet, even when it names several tools or languages:
  "Python and C++ for data analysis" is one item, and "TensorFlow and Scikit-Learn for deep learning"
  is one item.
- No overlap. If two bullets would be judged on the same evidence, merge them into one item.
- Write each item as a short phrase that makes sense without the posting.
- The list should have as many items as the qualification sections have bullets, or fewer after merging.

Importance comes from the posting's own sections, not from how central a skill seems:
- required: items under headings like "Requirements", "Minimum qualifications", "What you must have",
  or worded as a must ("must have", "required").
- preferred: items under headings like "Preferred", "Nice to have", "Bonus", "What sets you apart",
  or worded as a plus.`,
  ],
  ["human", "Job posting:\n\n<posting>\n{posting}\n</posting>"],
]);

/**
 * A chain that turns raw job-posting text into a validated JobPosting object,
 * including the requirement list. Input: { posting }.
 */
export function createExtractChain(apiKey: string) {
  // "jsonSchema" uses Claude's native structured outputs. The default
  // ("functionCalling") asks Claude to call a tool with the data instead, which is less strict.
  const structuredModel = createModel(apiKey).withStructuredOutput(JobPostingSchema, {
    name: "job_posting",
    method: "jsonSchema",
  });
  return prompt.pipe(structuredModel).withConfig({ runName: "extract_posting" });
}

/** Turns raw job-posting text into a validated JobPosting object. Used by the command-line tool. */
export async function extractJobPosting(apiKey: string, postingText: string): Promise<JobPosting> {
  return createExtractChain(apiKey).invoke({ posting: postingText });
}
