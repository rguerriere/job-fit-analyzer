import Link from "next/link";
import type { ReactNode } from "react";
import { type DeepDiveAnswer, type DeepDivePosition, ROLE_ANSWER } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { loadDeepDive, roleText } from "@/lib/deepDive";
import { AnswerBox, type SavedAnswer } from "./AnswerBox";
import { BankChangedBanner } from "./BankChangedBanner";
import { PrepTabs, SectionHeader } from "./PrepTabs";
import { ProgressChip } from "./progress";
import { PREP_TABS, type PrepTab } from "./tabs";

export const dynamic = "force-dynamic";

const toSaved = (a: DeepDiveAnswer | undefined): SavedAnswer | undefined =>
  a && {
    answer: a.answer,
    grade: a.grade,
    feedback: a.feedback,
    gradedAnswer: a.gradedAnswer,
    gradedFor: a.gradedFor,
  };

function dateRange(position: DeepDivePosition): string | null {
  if (!position.startDate && !position.endDate) return null;
  return `${position.startDate ?? "?"} – ${position.endDate ?? "?"}`;
}

/** One position's or skill group's answers, by item index (ROLE_ANSWER for the role). */
function answersByIndex(answers: DeepDiveAnswer[], positionId: string) {
  return new Map(answers.filter((a) => a.positionId === positionId && a.answer.trim()).map((a) => [a.bulletIndex, a]));
}

/**
 * A collapsible card. Its header sticks below the tab bar while you scroll through it,
 * so you always know which job or skill group you're in, and can click it to collapse.
 */
function Card({
  positionId,
  title,
  subtitle,
  total,
  label,
  children,
}: {
  positionId: string;
  title: string;
  subtitle?: string | null;
  total: number;
  label: string;
  children: ReactNode;
}) {
  return (
    <details className="group rounded-xl border border-outline bg-surface">
      <summary className="sticky top-14 z-10 flex cursor-pointer list-none items-center gap-4 rounded-xl bg-surface px-5 py-4 select-none group-open:rounded-b-none group-open:border-b group-open:border-outline [&::-webkit-details-marker]:hidden">
        <span className="text-fg-muted transition-transform group-open:rotate-90" aria-hidden>
          ▸
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-medium">{title}</p>
          {subtitle && <p className="text-sm text-fg-muted">{subtitle}</p>}
        </div>
        <ProgressChip positionId={positionId} total={total} label={label} />
      </summary>
      <div className="px-5 pt-4 pb-5">{children}</div>
    </details>
  );
}

function EmptyCard({ title, what }: { title: string; what: string }) {
  return (
    <div className="card text-center">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-fg-muted">
        Add your {what} to the{" "}
        <Link href="/bank" className="text-primary hover:underline">
          career bank
        </Link>
        , then update this page from the banner that appears.
      </p>
    </div>
  );
}

export default async function InterviewPrepPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab } = await searchParams;
  const initialTab: PrepTab = PREP_TABS.includes(tab as PrepTab) ? (tab as PrepTab) : "resume";
  const user = await getCurrentUser();
  const { jobs, skillGroups, answers, version, bankChanged } = await loadDeepDive(user.id);

  const tabInfo = (positions: DeepDivePosition[], boxesPerPosition: (p: DeepDivePosition) => number) => ({
    positionIds: positions.map((p) => p.id),
    total: positions.reduce((n, p) => n + boxesPerPosition(p), 0),
  });
  const initiallyFilled = answers.filter((a) => a.answer.trim()).map((a) => `${a.positionId}:${a.bulletIndex}`);

  const resumePanel = (
    <section className="space-y-4">
      <SectionHeader title="Resume Deep Dive">
        For each position, jot down what you&apos;d say if asked about the role or any bullet. A sentence or two is
        enough. Click <span className="font-medium text-fg">Grade</span> for a quick check, then click the grade to see
        feedback.
      </SectionHeader>
      {jobs.length === 0 ? (
        <EmptyCard title="No work experience yet" what="jobs" />
      ) : (
        <ul key={version} className="space-y-3">
          {jobs.map((position) => {
            const mine = answersByIndex(answers, position.id);
            return (
              <li key={position.id}>
                <Card
                  positionId={position.id}
                  title={position.title}
                  subtitle={[position.organization, dateRange(position)].filter(Boolean).join(" · ")}
                  total={position.bullets.length + 1}
                  label="answered"
                >
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold">About this role</h3>
                      <p className="text-sm text-fg-muted italic">
                        &ldquo;Tell me about your time{position.organization ? ` at ${position.organization}` : ""}. What
                        did you do there?&rdquo;
                      </p>
                      <AnswerBox
                        positionId={position.id}
                        bulletIndex={ROLE_ANSWER}
                        target={roleText(position)}
                        kind="role"
                        initial={toSaved(mine.get(ROLE_ANSWER))}
                        placeholder="What the role was, what you owned, what you worked with…"
                      />
                    </div>

                    {position.bullets.length > 0 && (
                      <div className="space-y-5">
                        <h3 className="text-sm font-semibold">Your bullets</h3>
                        {position.bullets.map((bullet, b) => (
                          <div key={b} className="space-y-2">
                            <p className="border-l-2 border-primary pl-3 text-sm">{bullet}</p>
                            <AnswerBox
                              positionId={position.id}
                              bulletIndex={b}
                              target={bullet}
                              kind="bullet"
                              initial={toSaved(mine.get(b))}
                              placeholder="How you did it, the tools, your part, what came of it…"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const skillsPanel = (
    <section className="space-y-4">
      <SectionHeader title="Skills Deep Dive">
        For each skill, note where you used it, like a class, project, or job, so you&apos;re ready for &ldquo;Where
        have you used that?&rdquo;
      </SectionHeader>
      {skillGroups.length === 0 ? (
        <EmptyCard title="No skills yet" what="skills" />
      ) : (
        <ul key={version} className="space-y-3">
          {skillGroups.map((group) => {
            const mine = answersByIndex(answers, group.id);
            return (
              <li key={group.id}>
                <Card positionId={group.id} title={group.title} total={group.bullets.length} label="noted">
                  <ul className="-my-2.5 divide-y divide-outline">
                    {group.bullets.map((skill, s) => (
                      <li
                        key={s}
                        className="grid gap-x-4 gap-y-1.5 py-2.5 sm:grid-cols-[minmax(0,12rem)_1fr] sm:items-center"
                      >
                        <span className="text-sm font-medium">{skill}</span>
                        <AnswerBox
                          positionId={group.id}
                          bulletIndex={s}
                          target={skill}
                          kind="bullet"
                          gradable={false}
                          initial={toSaved(mine.get(s))}
                          placeholder="Where you used it: a class, project, or job"
                        />
                      </li>
                    ))}
                  </ul>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );

  const qaPanel = (
    <section className="card flex flex-col items-center gap-3 py-12 text-center">
      <span className="chip chip-importance">Coming soon</span>
      <h2 className="text-lg font-semibold">Interview Q&amp;A</h2>
      <p className="max-w-md text-sm text-fg-muted">
        Common screening and behavioral questions, like &ldquo;Tell me about yourself&rdquo; and &ldquo;Describe a time
        you disagreed with a teammate,&rdquo; with space to prepare your answers.
      </p>
    </section>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Interview Prep</h1>
        <p className="mt-1 text-sm text-fg-muted">
          Prepare answers to the questions interviewers ask about your resume. Everything saves as you type.
        </p>
      </div>

      {bankChanged && <BankChangedBanner />}

      <PrepTabs
        initialTab={initialTab}
        tabs={[
          { id: "resume", label: "Resume Deep Dive", ...tabInfo(jobs, (p) => p.bullets.length + 1) },
          { id: "skills", label: "Skills Deep Dive", ...tabInfo(skillGroups, (p) => p.bullets.length) },
          { id: "qa", label: "Interview Q&A", positionIds: [], total: 0, soon: true },
        ]}
        initiallyFilled={initiallyFilled}
        version={version}
        panels={{ resume: resumePanel, skills: skillsPanel, qa: qaPanel }}
      />
    </div>
  );
}
