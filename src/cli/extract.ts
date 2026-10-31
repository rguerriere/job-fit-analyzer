/**
 * Usage:
 *   npm run extract -- path/to/posting.txt
 *   Get-Content posting.txt | npm run extract     (PowerShell)
 */
import { readFile } from "node:fs/promises";
import { extractJobPosting } from "../extractor.js";

async function readInput(): Promise<string> {
  const filePath = process.argv[2];
  if (filePath) return readFile(filePath, "utf8");

  if (process.stdin.isTTY) {
    throw new Error("Pass a file path (npm run extract -- samples/posting.txt) or pipe text in.");
  }
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString("utf8");
}

async function main() {
  const text = (await readInput()).trim();
  if (!text) throw new Error("The job posting is empty.");

  console.error("Extracting job posting...");
  const job = await extractJobPosting(text);
  console.log(JSON.stringify(job, null, 2));
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
