import { z } from "zod";

/**
 * The structured shape we extract from a raw job posting.
 * Field descriptions are sent to the model, so they double as instructions.
 */
export const JobPostingSchema = z.object({
  title: z.string().describe("Job title as written in the posting."),
  company: z.string().nullable().describe("Hiring company, or null if not stated."),
  location: z.string().nullable().describe("City/region/country, or null if not stated."),
  workArrangement: z
    .enum(["remote", "hybrid", "onsite", "unknown"])
    .describe("Where the work happens. Use 'unknown' if the posting does not say."),
  employmentType: z
    .enum(["full-time", "part-time", "contract", "internship", "temporary", "unknown"])
    .describe("Type of employment."),
  seniority: z
    .enum(["intern", "entry", "mid", "senior", "lead", "unknown"])
    .describe("Seniority level implied by the title and requirements."),
  minYearsExperience: z
    .number()
    .nullable()
    .describe("Minimum years of experience required, or null if not stated."),
  salary: z
    .object({
      min: z.number().nullable(),
      max: z.number().nullable(),
      currency: z.string().nullable().describe("ISO currency code such as USD."),
      period: z.enum(["hour", "year", "unknown"]),
    })
    .nullable()
    .describe("Compensation range, or null if the posting gives no pay information."),
  requiredSkills: z
    .array(z.string())
    .describe("Skills, tools, or qualifications the posting says are required. Short phrases."),
  preferredSkills: z
    .array(z.string())
    .describe("Nice-to-have skills (\"preferred\", \"bonus\", \"plus\"). Short phrases."),
  responsibilities: z.array(z.string()).describe("Main duties of the role, one short phrase each."),
  applicationDeadline: z
    .string()
    .nullable()
    .describe("Deadline in YYYY-MM-DD format, or null if not stated."),
  summary: z.string().describe("Two-sentence plain-English summary of the role."),
});

export type JobPosting = z.infer<typeof JobPostingSchema>;
