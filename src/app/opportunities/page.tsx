import { desc, eq, max } from "drizzle-orm";
import Link from "next/link";
import { FitDetails, scoreLabel } from "@/components/FitDetails";
import { PostingFacts, whereLabel } from "@/components/PostingFacts";
import { db } from "@/db/client";
import { analyses, bankEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { OpportunityActions } from "./OpportunityActions";

export const dynamic = "force-dynamic";

const formatDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export default async function OpportunitiesPage({ searchParams }: { searchParams: Promise<{ open?: string }> }) {
  const { open } = await searchParams;
  const user = await getCurrentUser();
  const items = await db
    .select()
    .from(analyses)
    .where(eq(analyses.userId, user.id))
    .orderBy(desc(analyses.createdAt));
  // Used to flag analyses that are older than the latest career bank change.
  const [bank] = await db
    .select({ changedAt: max(bankEntries.updatedAt) })
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id));
  const bankChangedAt = bank?.changedAt ?? null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Opportunities</h1>
          <p className="mt-1 text-sm text-fg-muted">
            Every job posting you&apos;ve analyzed. Re-analyze one after updating your career bank.
          </p>
        </div>
        <Link href="/analyze" className="btn btn-primary">
          Analyze a job
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="card text-center">
          <p className="font-medium">No opportunities yet</p>
          <p className="mt-1 text-sm text-fg-muted">
            Paste a job posting to see how well you fit. It&apos;ll be saved here.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const label = item.score === null ? null : scoreLabel(item.score);
            const stale = bankChangedAt !== null && bankChangedAt > item.analyzedAt;
            return (
              <li key={item.id}>
                <details open={item.id === open} className="card group">
                  <summary className="flex cursor-pointer list-none items-center gap-4 select-none [&::-webkit-details-marker]:hidden">
                    <span className="text-fg-muted transition-transform group-open:rotate-90" aria-hidden>
                      ▸
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{item.jobTitle}</p>
                      <p className="truncate text-sm text-fg-muted">
                        {[item.company, whereLabel(item.details), `Analyzed ${formatDate(item.analyzedAt)}`]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    {label && (
                      <div className="score-color shrink-0 text-right" style={label.style}>
                        <p className="text-2xl font-semibold tabular-nums">
                          {item.score}
                          <span className="text-sm text-fg-muted"> / 100</span>
                        </p>
                        <p className="text-xs font-medium">{label.text}</p>
                      </div>
                    )}
                  </summary>

                  <div className="mt-4 space-y-4 border-t border-outline pt-4">
                    {stale && (
                      <p className="alert-warn">
                        Your career bank has changed since this was analyzed. Re-analyze to update the score.
                      </p>
                    )}
                    {item.details && <PostingFacts details={item.details} />}
                    <FitDetails requirements={item.requirements} entryTitles={item.entryTitles} />
                    <details>
                      <summary className="cursor-pointer text-sm font-semibold select-none">Job posting</summary>
                      <p className="mt-2 max-h-96 overflow-y-auto text-sm whitespace-pre-wrap text-fg">
                        {item.postingText}
                      </p>
                    </details>
                    <OpportunityActions id={item.id} jobTitle={item.jobTitle} />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
