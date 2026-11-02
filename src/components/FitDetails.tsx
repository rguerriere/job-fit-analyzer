import type { CSSProperties } from "react";
import type { RequirementResult } from "@/lib/schemas/fitAnalysis";

/**
 * Score bands. Within each band the color shifts smoothly from `from` to `to`
 * (hues on the OKLCH color wheel: ~25 red, ~55 orange, ~95 yellow, ~145 green, ~255 blue, ~305 purple).
 */
const BANDS = [
  { max: 20, text: "Weak fit", from: 25, to: 30 }, // red
  { max: 40, text: "Low fit", from: 42, to: 80 }, // deep orange → almost yellow
  { max: 60, text: "Partial fit", from: 88, to: 105 }, // yellow
  { max: 80, text: "Good fit", from: 135, to: 155 }, // green
  { max: 100, text: "Strong fit", from: 245, to: 305 }, // blue → purple
] as const;

/** The label and color for a 0–100 score. Use `style` with the `score-color` class. */
export function scoreLabel(score: number): { text: string; style: CSSProperties } {
  const clamped = Math.min(100, Math.max(0, score));
  const i = BANDS.findIndex((b) => clamped <= b.max);
  const band = BANDS[i]!;
  const min = i === 0 ? 0 : BANDS[i - 1]!.max + 1;
  const t = band.max === min ? 0 : (clamped - min) / (band.max - min);
  const hue = band.from + t * (band.to - band.from);
  return { text: band.text, style: { "--score-hue": hue.toFixed(1) } as CSSProperties };
}

/**
 * A gap is a requirement you don't really show yet: partial (listed or similar, not backed by work)
 * or none. Strong and close matches both count as matched.
 */
const isGap = (r: RequirementResult) => r.match === "partial" || r.match === "none";

// Required first; within each, missing before partial (and strong before close in the matched list).
const MATCH_ORDER = { none: 0, partial: 1, strong: 0, close: 1 } as const;
const order = (r: RequirementResult) => (r.importance === "required" ? 0 : 2) + MATCH_ORDER[r.match];

function ImportanceChip({ importance }: { importance: RequirementResult["importance"] }) {
  return <span className="chip chip-importance">{importance === "required" ? "Required" : "Preferred"}</span>;
}

/** The gaps list and the collapsed "What you matched" list for one analysis. */
export function FitDetails({
  requirements,
  entryTitles,
}: {
  requirements: RequirementResult[];
  entryTitles: Record<string, string>;
}) {
  const byOrder = (a: RequirementResult, b: RequirementResult) => order(a) - order(b);
  const gaps = requirements.filter(isGap).sort(byOrder);
  const matched = requirements.filter((r) => !isGap(r)).sort(byOrder);

  return (
    <div className="space-y-4">
      {/* Starts open, since gaps are the main thing to read. */}
      <details open>
        <summary className="cursor-pointer text-sm font-semibold select-none">Gaps ({gaps.length})</summary>
        {gaps.length === 0 ? (
          <p className="mt-1 text-sm text-fg-muted">
            No gaps. Your career bank covers every requirement in this posting.
          </p>
        ) : (
          <ul className="mt-2 space-y-3">
            {gaps.map((gap, i) => (
              <li key={i} className="text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{gap.requirement}</span>
                  <ImportanceChip importance={gap.importance} />
                  {gap.match === "none" && (
                    <span className="chip chip-missing">Missing</span>
                  )}
                  {gap.match === "partial" && (
                    <span className="chip chip-partial">
                      Partial
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-fg-muted">{gap.note}</p>
              </li>
            ))}
          </ul>
        )}
      </details>

      {matched.length > 0 && (
        <details>
          <summary className="cursor-pointer text-sm font-semibold select-none">
            What you matched ({matched.length})
          </summary>
          <ul className="mt-2 space-y-3 text-sm">
            {matched.map((m, i) => {
              const sources = m.entryIds.map((id) => entryTitles[id]).filter(Boolean);
              return (
                <li key={i}>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{m.requirement}</span>
                    <ImportanceChip importance={m.importance} />
                    {m.match === "close" && (
                      <span className="chip chip-close">Close</span>
                    )}
                  </div>
                  {sources.length > 0 && (
                    <p className="mt-0.5 text-xs font-medium text-primary">{sources.join(" · ")}</p>
                  )}
                  <p className="mt-0.5 text-fg-muted">{m.note}</p>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}
