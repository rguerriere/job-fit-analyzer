"use server";

import { and, eq } from "drizzle-orm";
import mammoth from "mammoth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db/client";
import { bankEntries } from "@/db/schema";
import { describeApiError } from "@/lib/anthropicKey";
import { importBankEntries, type ImportSource } from "@/lib/bankImporter";
import { getCurrentUser } from "@/lib/currentUser";
import { BankEntryDraftSchema, cleanDraft, type BankEntryDraft } from "@/lib/schemas/bankEntry";

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const MAX_TEXT_CHARS = 50_000;

const SourceSchema = z.enum(["resume", "text", "manual"]);
type EntrySource = z.infer<typeof SourceSchema>;

export type ExtractResult =
  | { ok: true; entries: BankEntryDraft[]; source: EntrySource }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

/** Reads an uploaded resume or pasted text and asks Claude for draft entries. Saves nothing. */
export async function extractEntries(formData: FormData): Promise<ExtractResult> {
  const user = await getCurrentUser();
  if (!user.anthropicApiKey) {
    return { ok: false, error: "Add your Anthropic API key in Settings first." };
  }

  let input: ImportSource;
  let source: EntrySource;
  const file = formData.get("file");

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: "That file is over 10 MB." };
    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    source = "resume";

    if (name.endsWith(".pdf")) {
      // Claude reads PDFs directly, including layout, so no text extraction is needed.
      input = { type: "pdf", base64: buffer.toString("base64") };
    } else if (name.endsWith(".docx")) {
      const { value } = await mammoth.extractRawText({ buffer });
      input = { type: "text", text: value };
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      input = { type: "text", text: buffer.toString("utf8") };
    } else {
      return { ok: false, error: "Upload a PDF, Word (.docx), or text file." };
    }
  } else {
    const text = String(formData.get("text") ?? "").trim();
    if (!text) return { ok: false, error: "Upload a resume or paste some text first." };
    input = { type: "text", text };
    source = "text";
  }

  if (input.type === "text") {
    if (!input.text.trim()) return { ok: false, error: "Couldn't find any text in that file." };
    if (input.text.length > MAX_TEXT_CHARS) {
      return { ok: false, error: "That's too much text at once. Try splitting it into smaller pieces." };
    }
  }

  try {
    const entries = await importBankEntries(user.anthropicApiKey, input);
    if (entries.length === 0) {
      return {
        ok: false,
        error: "Claude didn't find any career information in that. Try a different file or add more detail.",
      };
    }
    return { ok: true, entries, source };
  } catch (err) {
    console.error("Career bank import failed:", err);
    return { ok: false, error: describeApiError(err) };
  }
}

/** Saves the entries the user approved on the review screen. */
export async function saveEntries(drafts: unknown, source: unknown): Promise<ActionResult> {
  const parsedDrafts = z.array(BankEntryDraftSchema).max(200).safeParse(drafts);
  const parsedSource = SourceSchema.safeParse(source);
  const cleaned = parsedDrafts.success ? parsedDrafts.data.map(cleanDraft) : [];
  if (!parsedDrafts.success || !parsedSource.success || cleaned.some((d) => !d.title)) {
    return { ok: false, error: "Some entries are incomplete. Every entry needs a title." };
  }

  const user = await getCurrentUser();
  const rows = cleaned.map((draft) => ({ ...draft, userId: user.id, source: parsedSource.data }));
  if (rows.length > 0) await db.insert(bankEntries).values(rows);

  revalidatePath("/bank");
  revalidatePath("/");
  return { ok: true };
}

export async function updateEntry(id: string, draft: unknown): Promise<ActionResult> {
  const parsed = BankEntryDraftSchema.safeParse(draft);
  const cleaned = parsed.success ? cleanDraft(parsed.data) : null;
  if (!cleaned?.title) return { ok: false, error: "Every entry needs a title." };

  const user = await getCurrentUser();
  await db
    .update(bankEntries)
    .set(cleaned)
    .where(and(eq(bankEntries.id, id), eq(bankEntries.userId, user.id)));

  revalidatePath("/bank");
  return { ok: true };
}

export async function deleteEntry(id: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  await db.delete(bankEntries).where(and(eq(bankEntries.id, id), eq(bankEntries.userId, user.id)));

  revalidatePath("/bank");
  revalidatePath("/");
  return { ok: true };
}
