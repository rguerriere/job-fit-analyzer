import type { BankEntry } from "../db/schema";

/** Sort key: ongoing ("present") entries first, then by end date, newest first. */
function recency(entry: BankEntry): string {
  if (entry.endDate?.toLowerCase() === "present") return "9999";
  return entry.endDate ?? entry.startDate ?? "";
}

/** Most recent first; ongoing ("present") entries at the top. */
export function byRecency(a: BankEntry, b: BankEntry): number {
  return recency(b).localeCompare(recency(a));
}
