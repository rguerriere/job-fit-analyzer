import type { RequirementResult } from "@/lib/schemas/fitAnalysis";

export function scoreLabel(score: number) {
  if (score >= 75) return { text: "Strong fit", color: "text-teal-700 dark:text-teal-400" };
  if (score >= 50) return { text: "Partial fit", color: "text-amber-700 dark:text-amber-400" };
  return { text: "Weak fit", color: "text-red-700 dark:text-red-400" };
}

// Required gaps first, then missing before partial.
const gapOrder = (r: RequirementResult) => (r.importance === "required" ? 0 : 2) + (r.match === "none" ? 0 : 1);

/** The gaps list and the collapsed "What you matched" list for one analysis. */
export function FitDetails({
  requirements,
  entryTitles,
}: {
  requirements: RequirementResult[];
  entryTitles: Record<string, string>;
}) {
  const gaps = requirements.filter((r) => r.match !== "strong").sort((a, b) => gapOrder(a) - gapOrder(b));
  const matched = requirements.filter((r) => r.match === "strong");

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Gaps ({gaps.length})</h3>
        {gaps.length === 0 ? (
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            No gaps. Your career bank covers every requirement in this posting.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {gaps.map((gap, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{gap.requirement}</span>
                  <span className="chip">{gap.importance === "required" ? "Required" : "Nice to have"}</span>
                  {gap.match === "partial" && (
                    <span className="chip bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      Partial
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-stone-600 dark:text-stone-400">{gap.note}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {matched.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold select-none">
            What you matched ({matched.length})
          </summary>
          <ul className="mt-2 space-y-1.5 text-sm">
            {matched.map((m, i) => {
              const sources = m.entryIds.map((id) => entryTitles[id]).filter(Boolean);
              return (
                <li key={i}>
                  <span className="font-medium">{m.requirement}</span>
                  {sources.length > 0 && (
                    <span className="text-stone-600 dark:text-stone-400"> · {sources.join("; ")}</span>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
