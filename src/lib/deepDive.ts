import { createHash } from "node:crypto";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "../db/client";
import {
  bankEntries,
  type BankEntry,
  type DeepDiveAnswer,
  deepDiveAnswers,
  type DeepDivePosition,
  deepDivePositions,
  type DeepDiveSection,
  interviewPrepState,
  ROLE_ANSWER,
} from "../db/schema";
import { byRecency } from "./bankOrder";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** A career bank entry a section is built from: a job, or a skill group. */
type Source = { section: DeepDiveSection; entry: BankEntry };

/** A job's bullets, or a skill group's skills. */
const itemsOf = ({ section, entry }: Source) => (section === "experience" ? entry.highlights : entry.skills);

/** The career bank's jobs, then its skill groups, each in the order the career bank shows them. */
async function currentSources(userId: string): Promise<Source[]> {
  const entries = await db.select().from(bankEntries).where(eq(bankEntries.userId, userId));
  const of = (kind: BankEntry["kind"], section: DeepDiveSection) =>
    entries
      .filter((e) => e.kind === kind)
      .sort(byRecency)
      .map((entry) => ({ section, entry }));
  return [...of("experience", "experience"), ...of("skill", "skills")];
}

/**
 * A short ID for the content both sections are built from. Adding, removing, or editing a job or
 * skill group changes it. Edits to other parts of the career bank (education, projects...) don't.
 */
function fingerprint(sources: Source[]): string {
  const content = sources.map((s) => {
    const e = s.entry;
    return [s.section, e.title, e.organization, e.startDate, e.endDate, e.description, itemsOf(s)];
  });
  return createHash("sha256").update(JSON.stringify(content)).digest("hex");
}

type RoleFields = Pick<DeepDivePosition, "title" | "organization" | "startDate" | "endDate" | "description">;

/** The role's details as one readable string. Used to detect changes and as the grading target. */
export function roleText(r: RoleFields): string {
  const dates = r.startDate || r.endDate ? ` · ${r.startDate ?? "?"} – ${r.endDate ?? "?"}` : "";
  const header = `${r.title}${r.organization ? `, ${r.organization}` : ""}${dates}`;
  return r.description ? `${header}\n${r.description}` : header;
}

/** What an answer box is about, as text: the bullet, or the role details for ROLE_ANSWER. */
export function answerTarget(position: DeepDivePosition, bulletIndex: number): string {
  return bulletIndex === ROLE_ANSWER ? roleText(position) : (position.bullets[bulletIndex] ?? "");
}

const positionFields = (source: Source, sortOrder: number) => ({
  section: source.section,
  sourceEntryId: source.entry.id,
  sortOrder,
  title: source.entry.title,
  organization: source.entry.organization,
  startDate: source.entry.startDate,
  endDate: source.entry.endDate,
  description: source.entry.description,
  bullets: itemsOf(source),
});

/** Records that the user has seen the career bank as it is now (build, Update, Reset, or Dismiss). */
async function acknowledge(tx: Pick<typeof db, "insert">, userId: string, print: string) {
  const now = new Date();
  await tx
    .insert(interviewPrepState)
    .values({ userId, acknowledgedFingerprint: print, acknowledgedAt: now })
    .onConflictDoUpdate({
      target: interviewPrepState.userId,
      set: { acknowledgedFingerprint: print, acknowledgedAt: now, updatedAt: now },
    });
}

/** "Reset" (and the first build): replace both sections, deleting every answer. */
async function rebuild(userId: string, sources: Source[]) {
  await db.transaction(async (tx) => {
    await tx.delete(deepDivePositions).where(eq(deepDivePositions.userId, userId));
    if (sources.length > 0) {
      await tx.insert(deepDivePositions).values(sources.map((s, i) => ({ userId, ...positionFields(s, i) })));
    }
    await acknowledge(tx, userId, fingerprint(sources));
  });
}

export async function resetDeepDive(userId: string) {
  await rebuild(userId, await currentSources(userId));
}

/** "Dismiss": hide the banner until a job or skill group is saved, added, or deleted again. */
export async function dismissBankChange(userId: string) {
  await acknowledge(db, userId, fingerprint(await currentSources(userId)));
}

// ---------------------------------------------------------------------------------------------
// Update: keep everything that still matches; add and remove the rest.
// ---------------------------------------------------------------------------------------------

/** How similar two bullets are, 0–1, by shared words. A typo fix or small rewording scores high. */
function similarity(a: string, b: string): number {
  const words = (s: string) => new Set(s.toLowerCase().match(/[a-z0-9]+/g) ?? []);
  const wa = words(a);
  const wb = words(b);
  const shared = [...wa].filter((w) => wb.has(w)).length;
  const total = new Set([...wa, ...wb]).size;
  return total === 0 ? 1 : shared / total;
}

/** Bullets at least this similar count as the same bullet, edited. Below it: one removed, one added. */
const SAME_BULLET = 0.5;

/**
 * Pairs old items with new ones. Returns, for each old index, the new index it became (missing if removed).
 * Identical text always matches. Job bullets can also match by similar wording (an edited bullet);
 * skills only match by name, ignoring capitalization, since "React" and "React Native" are different skills.
 */
function matchItems(section: DeepDiveSection, oldItems: string[], newItems: string[]): Map<number, number> {
  const match = new Map<number, number>();
  const usedNew = new Set<number>();
  const pairUp = (same: (a: string, b: string) => boolean) =>
    oldItems.forEach((text, o) => {
      if (match.has(o)) return;
      const n = newItems.findIndex((t, i) => !usedNew.has(i) && same(text, t));
      if (n >= 0) {
        match.set(o, n);
        usedNew.add(n);
      }
    });
  pairUp((a, b) => a === b);
  if (section === "skills") {
    pairUp((a, b) => a.trim().toLowerCase() === b.trim().toLowerCase());
    return match;
  }

  const candidates: { o: number; n: number; score: number }[] = [];
  oldItems.forEach((a, o) => {
    if (match.has(o)) return;
    newItems.forEach((b, n) => {
      if (usedNew.has(n)) return;
      const score = similarity(a, b);
      if (score >= SAME_BULLET) candidates.push({ o, n, score });
    });
  });
  for (const { o, n } of candidates.sort((x, y) => y.score - x.score)) {
    if (match.has(o) || usedNew.has(n)) continue;
    match.set(o, n);
    usedNew.add(n);
  }
  return match;
}

/** What Update changes in one section. For skills: groups and skills instead of jobs and bullets. */
export type SectionChanges = {
  added: number;
  removed: number;
  /** Jobs whose title, company, dates, or description changed (or skill groups that were renamed). */
  changed: number;
  itemsAdded: number;
  itemsChanged: number;
  itemsRemoved: number;
};

export type UpdateSummary = {
  experience: SectionChanges;
  skills: SectionChanges;
  answersKeptOnEdits: number;
  answersDeleted: number;
};

type KeptPosition = { position: DeepDivePosition; source: Source; sortOrder: number; itemMap: Map<number, number> };

const noChanges = (): SectionChanges => ({
  added: 0,
  removed: 0,
  changed: 0,
  itemsAdded: 0,
  itemsChanged: 0,
  itemsRemoved: 0,
});

/** Works out what Update would do, without changing anything. */
async function planUpdate(userId: string) {
  const [sources, positions, answers] = await Promise.all([
    currentSources(userId),
    db.select().from(deepDivePositions).where(eq(deepDivePositions.userId, userId)),
    db.select().from(deepDiveAnswers).where(eq(deepDiveAnswers.userId, userId)),
  ]);

  // Match positions to career bank entries by the entry they were copied from (and the same section).
  const byEntry = new Map(positions.filter((p) => p.sourceEntryId).map((p) => [`${p.section}:${p.sourceEntryId}`, p]));
  const kept: KeptPosition[] = [];
  const added: { source: Source; sortOrder: number }[] = [];
  sources.forEach((source, sortOrder) => {
    const position = byEntry.get(`${source.section}:${source.entry.id}`);
    if (position) {
      kept.push({ position, source, sortOrder, itemMap: matchItems(source.section, position.bullets, itemsOf(source)) });
    } else {
      added.push({ source, sortOrder });
    }
  });
  const keptIds = new Set(kept.map((k) => k.position.id));
  const removed = positions.filter((p) => !keptIds.has(p.id));

  const summary: UpdateSummary = {
    experience: noChanges(),
    skills: noChanges(),
    answersKeptOnEdits: 0,
    answersDeleted: answers.filter((a) => removed.some((p) => p.id === a.positionId)).length,
  };
  for (const { source } of added) {
    summary[source.section].added++;
    summary[source.section].itemsAdded += itemsOf(source).length;
  }
  for (const p of removed) {
    summary[p.section].removed++;
    summary[p.section].itemsRemoved += p.bullets.length;
  }
  for (const { position, source, itemMap } of kept) {
    const changes = summary[source.section];
    const items = itemsOf(source);
    const mine = answers.filter((a) => a.positionId === position.id);
    if (roleText(position) !== roleText(source.entry)) {
      changes.changed++;
      if (mine.some((a) => a.bulletIndex === ROLE_ANSWER)) summary.answersKeptOnEdits++;
    }
    position.bullets.forEach((text, o) => {
      const n = itemMap.get(o);
      const hasAnswer = mine.some((a) => a.bulletIndex === o);
      if (n === undefined) {
        changes.itemsRemoved++;
        if (hasAnswer) summary.answersDeleted++;
      } else if (items[n] !== text) {
        changes.itemsChanged++;
        if (hasAnswer) summary.answersKeptOnEdits++;
      }
    });
    changes.itemsAdded += items.length - itemMap.size;
  }
  return { kept, added, removed, answers, summary, print: fingerprint(sources) };
}

/** Update, step 1: the summary to confirm, plus a token so step 2 applies exactly what was shown. */
export async function previewUpdate(userId: string) {
  const { summary, print } = await planUpdate(userId);
  return { summary, token: print };
}

/**
 * Update, step 2. Returns false if the career bank changed since the preview, so the user reviews
 * the new summary instead of applying something they didn't see.
 */
export async function applyUpdate(userId: string, token: string): Promise<boolean> {
  const plan = await planUpdate(userId);
  if (plan.print !== token) return false;

  await db.transaction(async (tx) => {
    if (plan.removed.length > 0) {
      await tx.delete(deepDivePositions).where(inArray(deepDivePositions.id, plan.removed.map((p) => p.id)));
    }
    for (const { source, sortOrder } of plan.added) {
      await tx.insert(deepDivePositions).values({ userId, ...positionFields(source, sortOrder) });
    }
    for (const k of plan.kept) await updatePosition(tx, k, plan.answers);
    await acknowledge(tx, userId, plan.print);
  });
  return true;
}

/** Copies an entry's new details into its position and moves, keeps, or deletes its answers. */
async function updatePosition(tx: Tx, { position, source, sortOrder, itemMap }: KeptPosition, all: DeepDiveAnswer[]) {
  await tx.update(deepDivePositions).set(positionFields(source, sortOrder)).where(eq(deepDivePositions.id, position.id));

  const answers = all.filter((a) => a.positionId === position.id);
  if (answers.length === 0) return;

  const next = answers.flatMap((a) => {
    if (a.bulletIndex === ROLE_ANSWER) return [a];
    const n = itemMap.get(a.bulletIndex);
    if (n === undefined) return []; // the bullet or skill was removed, so its answer goes too
    return [{ ...a, bulletIndex: n }];
  });
  // Items can swap places, so replace this position's answers all at once to avoid index collisions.
  await tx.delete(deepDiveAnswers).where(eq(deepDiveAnswers.positionId, position.id));
  if (next.length > 0) await tx.insert(deepDiveAnswers).values(next);
}

// ---------------------------------------------------------------------------------------------
// Loading the page
// ---------------------------------------------------------------------------------------------

/**
 * Everything both Deep Dive sections show. The first visit builds the snapshot; after that it only
 * changes through Update or Reset. `bankChanged` says whether to show the banner.
 */
export async function loadDeepDive(userId: string) {
  const sources = await currentSources(userId);
  const current = fingerprint(sources);
  const loadPositions = () =>
    db
      .select()
      .from(deepDivePositions)
      .where(eq(deepDivePositions.userId, userId))
      .orderBy(asc(deepDivePositions.sortOrder));

  let state = await db.query.interviewPrepState.findFirst({ where: eq(interviewPrepState.userId, userId) });
  let positions = await loadPositions();

  // Build automatically when there's nothing to lose: the first visit, or an empty snapshot.
  if (!state || (positions.length === 0 && state.acknowledgedFingerprint !== current)) {
    await rebuild(userId, sources);
    state = await db.query.interviewPrepState.findFirst({ where: eq(interviewPrepState.userId, userId) });
    positions = await loadPositions();
  }

  const answers = await db.select().from(deepDiveAnswers).where(eq(deepDiveAnswers.userId, userId));
  // Changes on every Update, Reset, and Dismiss. The page uses it to re-create the answer boxes, since
  // an Update can move answers between items and each box keeps its own state.
  const version = state?.acknowledgedAt.getTime() ?? 0;
  return {
    jobs: positions.filter((p) => p.section === "experience"),
    skillGroups: positions.filter((p) => p.section === "skills"),
    answers,
    version,
    bankChanged: showBanner(sources, current, state),
  };
}

/**
 * The banner shows if any job or skill group was saved, added, or deleted since the user last
 * acknowledged the career bank, even if the edit made it match the page again.
 */
function showBanner(
  sources: Source[],
  current: string,
  state: { acknowledgedFingerprint: string; acknowledgedAt: Date } | undefined,
): boolean {
  if (!state) return false;
  if (current !== state.acknowledgedFingerprint) return true; // something was added, deleted, or changed
  return sources.some((s) => s.entry.updatedAt > state.acknowledgedAt); // saved, even with the same text
}
