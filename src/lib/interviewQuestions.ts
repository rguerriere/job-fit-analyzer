/**
 * The default Interview Q&A questions. Edit this list freely: on the next page load, each user's
 * questions sync to it. A reworded question keeps its answer (its grade is dimmed), a new question
 * appears empty, and a removed question is deleted along with its answer.
 *
 * `key` identifies a question across edits, so never reuse a key for a different question.
 * `star` marks behavioral questions, graded partly on STAR structure (Situation, Task, Action, Result).
 * `hint` is shown under the question to help you start.
 */

export const QUESTION_GROUPS = [
  { id: "screening", title: "Screening" },
  { id: "behavioral", title: "Behavioral" },
  { id: "strengths", title: "Strengths & growth" },
] as const;
export type QuestionGroup = (typeof QUESTION_GROUPS)[number]["id"];

export type DefaultQuestion = { key: string; group: QuestionGroup; text: string; star: boolean; hint: string };

export const DEFAULT_QUESTIONS: DefaultQuestion[] = [
  // Screening
  {
    key: "about-yourself",
    group: "screening",
    text: "Tell me about yourself.",
    star: false,
    hint: "Present, past, future: what you do now, how you got here, and what you want next.",
  },
  {
    key: "why-looking",
    group: "screening",
    text: "Why are you looking for a new role?",
    star: false,
    hint: "Keep it positive: what you're moving toward, not what you're leaving.",
  },
  {
    key: "why-company",
    group: "screening",
    text: "Why do you want to work here?",
    star: false,
    hint: "A general answer for now: the kind of team, product, or mission you're drawn to.",
  },
  {
    key: "salary",
    group: "screening",
    text: "What are your salary expectations?",
    star: false,
    hint: "A researched range, and how flexible you are.",
  },
  {
    key: "five-years",
    group: "screening",
    text: "Where do you see yourself in five years?",
    star: false,
    hint: "Growth you want, and how this kind of role leads there.",
  },

  // Behavioral
  {
    key: "tight-deadline",
    group: "behavioral",
    text: "Tell me about a time you worked under a tight deadline.",
    star: true,
    hint: "The situation, what you had to deliver, what you did, and how it turned out.",
  },
  {
    key: "disagreement",
    group: "behavioral",
    text: "Tell me about a time you disagreed with a teammate. How did you handle it?",
    star: true,
    hint: "Show how you listened, made your case, and moved forward together.",
  },
  {
    key: "mistake",
    group: "behavioral",
    text: "Tell me about a mistake you made and what you learned from it.",
    star: true,
    hint: "Own it briefly, then spend most of the answer on the fix and the lesson.",
  },
  {
    key: "learn-quickly",
    group: "behavioral",
    text: "Tell me about a time you had to learn something new quickly.",
    star: true,
    hint: "What you had to learn, how you learned it, and what you built with it.",
  },
  {
    key: "proudest-project",
    group: "behavioral",
    text: "What project are you most proud of, and why?",
    star: true,
    hint: "The problem, your part in solving it, and the impact.",
  },
  {
    key: "ambiguity",
    group: "behavioral",
    text: "Tell me about a time you worked with unclear or changing requirements.",
    star: true,
    hint: "How you got clarity, kept moving, and adapted when things changed.",
  },
  {
    key: "tradeoff",
    group: "behavioral",
    text: "Tell me about a time you had to make a tradeoff. How did you decide?",
    star: true,
    hint: "The options you weighed (e.g. speed vs. quality, cost vs. performance), what you chose and why, and how it turned out.",
  },

  // Strengths & growth
  {
    key: "greatest-strength",
    group: "strengths",
    text: "What's your greatest strength?",
    star: false,
    hint: "One strength, backed by a quick example.",
  },
  {
    key: "weakness",
    group: "strengths",
    text: "What's a weakness you're working on?",
    star: false,
    hint: "A real weakness, and the concrete steps you're taking to improve.",
  },
];
