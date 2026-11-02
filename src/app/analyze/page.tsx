import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { bankEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { AnalyzeForm } from "./AnalyzeForm";

export const dynamic = "force-dynamic";

export default async function AnalyzePage() {
  const user = await getCurrentUser();
  const [row] = await db
    .select({ total: count() })
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id));
  const entryCount = row?.total ?? 0;

  const blocker = !user.anthropicApiKey
    ? {
        title: "Add your API key first",
        detail: "Analyzing a posting uses Claude, which needs your Anthropic API key.",
        href: "/settings",
        action: "Go to Settings",
      }
    : entryCount === 0
      ? {
          title: "Build your career bank first",
          detail: "The analysis compares the posting to your career bank, so it needs at least one entry.",
          href: "/bank/import",
          action: "Add from resume or text",
        }
      : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Analyze a job posting</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Paste a posting to get a fit score and the requirements your career bank doesn&apos;t cover yet.
        </p>
      </div>

      {blocker ? (
        <div className="card">
          <p className="font-medium">{blocker.title}</p>
          <p className="mt-1 text-sm text-fg-muted">{blocker.detail}</p>
          <Link href={blocker.href} className="btn btn-primary mt-3">
            {blocker.action}
          </Link>
        </div>
      ) : (
        <AnalyzeForm />
      )}
    </div>
  );
}
