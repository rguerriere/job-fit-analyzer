import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { createModel } from "./llm";
import { BankImportSchema, type BankEntryDraft } from "./schemas/bankEntry";

const SYSTEM_PROMPT = `You turn a person's resume or notes into entries for their career bank.
The career bank is later used to match them against job postings and to draft
application materials, so accuracy matters more than polish.

Rules:
- Use only what the source says. Do not add skills, results, or responsibilities that
  are not written there, and do not upgrade wording (e.g. "helped with" stays "helped with").
- Keep every number, percentage, and metric exactly as written.
- Make one entry per job or role, project, degree, certification, or standalone accomplishment.
  If one employer lists two roles, make two entries.
- Group a skills section into a few skill entries by category (e.g. "Languages", "Frameworks").
- Leave out contact details (name, email, phone, address, links) and generic objective statements.
- If the source contains no career information, return an empty list.`;

export type ImportSource =
  | { type: "pdf"; base64: string }
  | { type: "text"; text: string };

/** Asks Claude to split a resume (PDF) or free text into draft career bank entries. */
export async function importBankEntries(
  apiKey: string,
  source: ImportSource,
): Promise<BankEntryDraft[]> {
  const content =
    source.type === "pdf"
      ? [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: source.base64 },
          },
          { type: "text", text: "Split this resume into career bank entries." },
        ]
      : [
          {
            type: "text",
            text: `Split this into career bank entries.\n\n<background>\n${source.text}\n</background>`,
          },
        ];

  const structuredModel = createModel(apiKey).withStructuredOutput(BankImportSchema, {
    name: "career_bank",
    method: "jsonSchema",
  });
  const result = await structuredModel.invoke([
    new SystemMessage(SYSTEM_PROMPT),
    new HumanMessage({ content }),
  ]);
  return result.entries;
}
