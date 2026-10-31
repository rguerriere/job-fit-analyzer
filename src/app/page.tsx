import { count, eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db/client";
import { bankEntries } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const user = await getCurrentUser();
  const [row] = await db
    .select({ total: count() })
    .from(bankEntries)
    .where(eq(bankEntries.userId, user.id));
  const entryCount = row?.total ?? 0;

  const steps = [
    {
      title: "Add your Anthropic API key",
      detail: "The app uses your own key, so AI usage is billed to your Anthropic account.",
      done: Boolean(user.anthropicApiKey),
      href: "/settings",
      action: user.anthropicApiKey ? "Change key" : "Add key",
    },
    {
      title: "Build your career bank",
      detail:
        entryCount > 0
          ? `${entryCount} ${entryCount === 1 ? "entry" : "entries"} saved.`
          : "Upload your resume or paste notes about your experience.",
      done: entryCount > 0,
      href: "/bank",
      action: entryCount > 0 ? "View bank" : "Start",
    },
    {
      title: "Analyze a job posting",
      detail: "Get a fit score, matched requirements with evidence, and gaps. Coming in the next stage.",
      done: false,
      href: null,
      action: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">See how well you fit a job before you apply</h1>
        <p className="mt-2 max-w-2xl text-stone-600 dark:text-stone-400">
          Keep your experience in one place, then compare it against any job posting. Every match is backed by
          something you actually did, never invented.
        </p>
      </div>

      <ol className="space-y-3">
        {steps.map((step, i) => (
          <li key={step.title} className="card flex items-center gap-4">
            <span
              className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                step.done
                  ? "bg-teal-700 text-white dark:bg-teal-600"
                  : "bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-300"
              }`}
            >
              {step.done ? "✓" : i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium">{step.title}</p>
              <p className="text-sm text-stone-600 dark:text-stone-400">{step.detail}</p>
            </div>
            {step.href && (
              <Link href={step.href} className={`btn ${step.done ? "" : "btn-primary"}`}>
                {step.action}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
