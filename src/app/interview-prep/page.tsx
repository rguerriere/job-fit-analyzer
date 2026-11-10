import Link from "next/link";
import type { ReactNode } from "react";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { type DeepDiveAnswer, type DeepDivePosition, ROLE_ANSWER, techGroups, techQuestions } from "@/db/schema";
import { getCurrentUser } from "@/lib/currentUser";
import { loadDeepDive, roleText } from "@/lib/deepDive";
import { loadQuestions } from "@/lib/interviewQA";
import { QUESTION_GROUPS } from "@/lib/interviewQuestions";
import { gradeAnswer, saveAnswer } from "./actions";
import { AnswerBox, type SavedAnswer } from "./AnswerBox";
import { BankChangedBanner } from "./BankChangedBanner";
import { PrepTabs, SectionHeader } from "./PrepTabs";
import { ProgressChip } from "./progress";
import { gradeQaAnswer, saveQaAnswer } from "./qaActions";
import { saveTechAnswer } from "./techActions";
import { AddTechGroup, AddTechQuestion, TechGroupToolbar, TechQuestionHeader } from "./TechQA";
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
  open,
  children,
}: {
  positionId: string;
  title: string;
  subtitle?: string | null;
  total: number;
  label: string;
  /** Start expanded (used for empty Tech Q&A groups, so you can add questions right away). */
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details open={open} className="group rounded-xl border border-outline bg-surface">
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
  const [{ jobs, skillGroups, answers, version, bankChanged }, questions, techGroupRows, techQuestionRows] =
    await Promise.all([
      loadDeepDive(user.id),
      loadQuestions(user.id),
      db.select().from(techGroups).where(eq(techGroups.userId, user.id)).orderBy(asc(techGroups.sortOrder)),
      db.select().from(techQuestions).where(eq(techQuestions.userId, user.id)).orderBy(asc(techQuestions.sortOrder)),
    ]);

  const tabInfo = (positions: DeepDivePosition[], boxesPerPosition: (p: DeepDivePosition) => number) => ({
    positionIds: positions.map((p) => p.id),
    total: positions.reduce((n, p) => n + boxesPerPosition(p), 0),
  });
  const initiallyFilled = [
    ...answers.filter((a) => a.answer.trim()).map((a) => `${a.positionId}:${a.bulletIndex}`),
    ...questions.filter((q) => q.answer.trim()).map((q) => `qa:${q.groupId}:${q.id}`),
    ...techQuestionRows.filter((q) => q.answer.trim()).map((q) => `tech:${q.groupId}:${q.id}`),
  ];

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
                        progress={{ group: position.id, item: ROLE_ANSWER }}
                        save={saveAnswer.bind(null, position.id, ROLE_ANSWER)}
                        grade={gradeAnswer.bind(null, position.id, ROLE_ANSWER)}
                        target={roleText(position)}
                        targetLabel="Role details"
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
                              progress={{ group: position.id, item: b }}
                              save={saveAnswer.bind(null, position.id, b)}
                              grade={gradeAnswer.bind(null, position.id, b)}
                              target={bullet}
                              targetLabel="Bullet"
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
                          progress={{ group: group.id, item: s }}
                          save={saveAnswer.bind(null, group.id, s)}
                          target={skill}
                          targetLabel="Skill"
                          compact
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
    <section className="space-y-4">
      <SectionHeader title="Interview Q&A">
        Prepare answers to the questions most interviews include. Behavioral questions are graded partly on STAR
        structure: the Situation, your Task, the Actions you took, and the Result.
      </SectionHeader>
      <ul className="space-y-3">
        {QUESTION_GROUPS.map((group) => {
          const items = questions.filter((q) => q.groupId === group.id);
          if (items.length === 0) return null;
          return (
            <li key={group.id}>
              <Card positionId={`qa:${group.id}`} title={group.title} total={items.length} label="answered">
                <div className="space-y-6">
                  {items.map((q) => (
                    <div key={q.id} className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-medium">{q.text}</h3>
                        {q.star && (
                          <span className="chip chip-importance" title="Graded partly on STAR structure">
                            STAR
                          </span>
                        )}
                      </div>
                      {q.hint && <p className="text-sm text-fg-muted italic">{q.hint}</p>}
                      <AnswerBox
                        progress={{ group: `qa:${group.id}`, item: q.id }}
                        save={saveQaAnswer.bind(null, q.id)}
                        grade={gradeQaAnswer.bind(null, q.id)}
                        target={q.text}
                        targetLabel="Question"
                        initial={{
                          answer: q.answer,
                          grade: q.grade,
                          feedback: q.feedback,
                          gradedAnswer: q.gradedAnswer,
                          gradedFor: q.gradedFor,
                        }}
                        placeholder="Your answer, in your own words…"
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );

  const techPanel = (
    <section className="space-y-4">
      <SectionHeader title="Tech Q&A">
        Your own technical questions, grouped by topic. Add a question, write your answer, and edit or delete
        either anytime. Nothing here is graded.
      </SectionHeader>
      {techGroupRows.length === 0 ? (
        <div className="card space-y-3">
          <div className="text-center">
            <p className="font-medium">No groups yet</p>
            <p className="mt-1 text-sm text-fg-muted">
              Start with a topic you expect to be asked about, then add questions to it.
            </p>
          </div>
          <AddTechGroup first />
        </div>
      ) : (
        <>
          <ul className="space-y-3">
            {techGroupRows.map((group) => {
              const items = techQuestionRows.filter((q) => q.groupId === group.id);
              return (
                <li key={group.id}>
                  <Card
                    positionId={`tech:${group.id}`}
                    title={group.title}
                    total={items.length}
                    label="answered"
                    open={items.length === 0}
                  >
                    <div className="space-y-5">
                      <TechGroupToolbar id={group.id} title={group.title} questionCount={items.length} />
                      {items.length === 0 && (
                        <p className="text-sm text-fg-muted">No questions in this group yet. Add one below.</p>
                      )}
                      {items.map((q) => (
                        <div key={q.id} className="space-y-2">
                          <TechQuestionHeader id={q.id} groupId={group.id} text={q.text} />
                          <AnswerBox
                            progress={{ group: `tech:${group.id}`, item: q.id }}
                            save={saveTechAnswer.bind(null, q.id)}
                            target={q.text}
                            targetLabel="Question"
                            initial={{ answer: q.answer, grade: null, feedback: null, gradedAnswer: null, gradedFor: null }}
                            placeholder="Your answer…"
                          />
                        </div>
                      ))}
                      <AddTechQuestion groupId={group.id} />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
          <AddTechGroup first={false} />
        </>
      )}
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
          {
            id: "qa",
            label: "Interview Q&A",
            positionIds: QUESTION_GROUPS.map((g) => `qa:${g.id}`),
            total: questions.length,
          },
          {
            id: "tech",
            label: "Tech Q&A",
            positionIds: techGroupRows.map((g) => `tech:${g.id}`),
            total: techQuestionRows.length,
          },
        ]}
        initiallyFilled={initiallyFilled}
        version={version}
        panels={{ resume: resumePanel, skills: skillsPanel, qa: qaPanel, tech: techPanel }}
      />
    </div>
  );
}
