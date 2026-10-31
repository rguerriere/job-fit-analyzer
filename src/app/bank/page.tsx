import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { bankEntries, type BankEntry } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { ENTRY_KINDS, KIND_LABELS } from "@/lib/schemas/bankEntry";
import { EntryCard } from "./EntryCard";

export const dynamic = "force-dynamic";

/** Most recent first; ongoing ("present") entries at the top. */
function recency(entry: BankEntry): string {
  if (entry.endDate?.toLowerCase() === "present") return "9999";
  return entry.endDate ?? entry.startDate ?? "";
}

export default async function BankPage() {
  const user = await getCurrentUser();
  const entries = await db.select().from(bankEntries).where(eq(bankEntries.userId, user.id));

  const groups = ENTRY_KINDS.map((kind) => ({
    kind,
    entries: entries.filter((e) => e.kind === kind).sort((a, b) => recency(b).localeCompare(recency(a))),
  })).filter((group) => group.entries.length > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Career bank</h1>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Everything the app knows about your experience. Job matches only use what&apos;s here.
          </p>
        </div>
        <Link href="/bank/import" className="btn btn-primary">
          Add from resume or text
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="card text-center">
          <p className="font-medium">Your career bank is empty</p>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Upload your resume or paste notes, and Claude will organize them into entries for you to review.
          </p>
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.kind} className="space-y-3">
            <h2 className="text-sm font-semibold tracking-wide text-stone-500 uppercase dark:text-stone-400">
              {KIND_LABELS[group.kind]}
            </h2>
            {group.entries.map((entry) => (
              <EntryCard
                key={entry.id}
                id={entry.id}
                entry={{
                  kind: entry.kind,
                  title: entry.title,
                  organization: entry.organization,
                  startDate: entry.startDate,
                  endDate: entry.endDate,
                  description: entry.description,
                  highlights: entry.highlights,
                  skills: entry.skills,
                }}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}
