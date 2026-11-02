"use client";

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

/**
 * Live progress for the "N of M answered/noted" counters. Each answer box reports whether it has text,
 * so the counters on cards and tabs update as you type or clear a box, without reloading.
 * A box is identified as "group:item", where group is its card (a position, skill group, or question group).
 */
type Progress = { filled: Set<string>; report: (key: string, hasText: boolean) => void };

const ProgressContext = createContext<Progress | null>(null);

export function ProgressProvider({ initiallyFilled, children }: { initiallyFilled: string[]; children: ReactNode }) {
  const [filled, setFilled] = useState(() => new Set(initiallyFilled));
  const report = useCallback((key: string, hasText: boolean) => {
    setFilled((prev) => {
      if (prev.has(key) === hasText) return prev;
      const next = new Set(prev);
      if (hasText) next.add(key);
      else next.delete(key);
      return next;
    });
  }, []);
  const value = useMemo(() => ({ filled, report }), [filled, report]);
  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

/** Called by each answer box with its current text. `group` is the card it belongs to. */
export function useReportProgress(group: string, item: string | number, text: string) {
  const report = useContext(ProgressContext)?.report;
  const hasText = text.trim().length > 0;
  useEffect(() => report?.(`${group}:${item}`, hasText), [report, group, item, hasText]);
}

/** How many boxes in these positions have text. */
export function useFilledCount(positionIds: string[]): number {
  const filled = useContext(ProgressContext)?.filled;
  return useMemo(() => {
    if (!filled) return 0;
    const ids = new Set(positionIds);
    return [...filled].filter((key) => ids.has(key.slice(0, key.lastIndexOf(":")))).length;
  }, [filled, positionIds]);
}

/** The "N of M answered" chip on a card. Turns teal when every box has text. */
export function ProgressChip({ positionId, total, label }: { positionId: string; total: number; label: string }) {
  const done = useFilledCount(useMemo(() => [positionId], [positionId]));
  return (
    <span className={`chip shrink-0 ${total > 0 && done === total ? "chip-close" : ""}`}>
      {done} of {total} {label}
    </span>
  );
}
