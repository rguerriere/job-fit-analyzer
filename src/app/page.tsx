import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { analyses, bankEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

const STEPS = [
  {
    title: "Build your career bank",
    detail: "Upload your resume or paste notes. Claude organizes them into entries you can review and edit.",
    href: "/bank",
  },
  {
    title: "Analyze a job",
    detail: "Paste a posting to get a fit score out of 100 and the requirements you don't cover yet.",
    href: "/analyze",
  },
  {
    title: "Track opportunities",
    detail: "Every analysis is saved. Re-analyze any of them after you update your career bank.",
    href: "/opportunities",
  },
];

export default async function HomePage() {
  const user = await getCurrentUser();
  const [[bank], [saved]] = await Promise.all([
    db.select({ total: count() }).from(bankEntries).where(eq(bankEntries.userId, user.id)),
    db.select({ total: count() }).from(analyses).where(eq(analyses.userId, user.id)),
  ]);

  // Point the main button at whatever the user should do next.
  const next = !user.anthropicApiKey
    ? { href: "/settings", label: "Add your API key to start" }
    : !bank?.total
      ? { href: "/bank/import", label: "Build your career bank" }
      : { href: "/analyze", label: "Analyze a job" };

  return (
    <div className="space-y-10 py-6">
      <div className="max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight">See how well you fit a job before you apply</h1>
        <p className="mt-3 text-fg-muted">
          Keep your experience in one place, then compare it against any job posting. Every match is backed by
          something you actually did, never invented.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link href={next.href} className="btn btn-primary">
            {next.label}
          </Link>
          {saved?.total ? (
            <Link href="/opportunities" className="btn">
              View {saved.total} {saved.total === 1 ? "opportunity" : "opportunities"}
            </Link>
          ) : null}
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold tracking-wide text-fg-muted uppercase">
          How it works
        </h2>
        <ol className="mt-3 grid gap-3 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.href}>
              <Link href={step.href} className="card block h-full hover:border-primary">
                <span className="text-sm font-semibold text-primary">{i + 1}</span>
                <p className="mt-1 font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-fg-muted">{step.detail}</p>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
