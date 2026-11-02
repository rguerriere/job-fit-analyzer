import type { PostingDetails } from "@/lib/schemas/jobPosting";

const WORK_LABELS = { remote: "Remote", hybrid: "Hybrid", onsite: "On-site", unknown: null } as const;
const TYPE_LABELS = {
  "full-time": "Full-time",
  "part-time": "Part-time",
  contract: "Contract",
  internship: "Internship",
  temporary: "Temporary",
  unknown: null,
} as const;
const SENIORITY_LABELS = { intern: "Intern", entry: "Entry level", mid: "Mid level", senior: "Senior", lead: "Lead", unknown: null } as const;

function formatSalary(salary: PostingDetails["salary"]): string | null {
  if (!salary || (salary.min === null && salary.max === null)) return null;
  const money = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: salary.currency ?? "USD",
      maximumFractionDigits: 0,
    }).format(n);
  const range =
    salary.min !== null && salary.max !== null && salary.min !== salary.max
      ? `${money(salary.min)}–${money(salary.max)}`
      : money((salary.min ?? salary.max)!);
  const period = salary.period === "year" ? " / yr" : salary.period === "hour" ? " / hr" : "";
  return range + period;
}

/** Location and work arrangement, for the one-line summary of an opportunity. */
export function whereLabel(details: PostingDetails | null): string | null {
  if (!details) return null;
  return [details.location, WORK_LABELS[details.workArrangement]].filter(Boolean).join(" · ") || null;
}

/** Salary, job type, level, deadline, and summary pulled from the posting. */
export function PostingFacts({ details }: { details: PostingDetails }) {
  const facts = [
    formatSalary(details.salary),
    TYPE_LABELS[details.employmentType],
    SENIORITY_LABELS[details.seniority],
    details.minYearsExperience !== null ? `${details.minYearsExperience}+ years` : null,
    details.applicationDeadline ? `Apply by ${details.applicationDeadline}` : null,
  ].filter((f): f is string => Boolean(f));

  return (
    <div className="space-y-2">
      {facts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {facts.map((fact) => (
            <span key={fact} className="chip">
              {fact}
            </span>
          ))}
        </div>
      )}
      <p className="text-sm text-fg">{details.summary}</p>
    </div>
  );
}
