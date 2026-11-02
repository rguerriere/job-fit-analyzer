"use client";

import { type ReactNode, useRef, useState } from "react";
import { ProgressProvider, useFilledCount } from "./progress";
import { PREP_TABS, type PrepTab } from "./tabs";

/** A tab, and the boxes its progress counts (none for a tab that isn't built yet). */
type TabInfo = {
  id: PrepTab;
  label: string;
  positionIds: string[];
  total: number;
  soon?: boolean;
};

/** The progress chip on a tab: "done/total", or "Soon". */
function TabMeta({ tab, selected }: { tab: TabInfo; selected: boolean }) {
  const done = useFilledCount(tab.positionIds);
  if (tab.soon) return <span className="chip chip-importance">Soon</span>;
  return (
    <span className={`chip ${selected ? "grade-great" : ""}`}>
      {done}/{tab.total}
    </span>
  );
}

/**
 * The Interview Prep layout: a sticky tab bar that stays at the top while you scroll, and one section
 * at a time below it. All sections stay mounted (just hidden), so switching tabs never loses typing.
 */
export function PrepTabs({
  initialTab,
  tabs,
  panels,
  initiallyFilled,
  version,
}: {
  initialTab: PrepTab;
  tabs: TabInfo[];
  panels: Record<PrepTab, ReactNode>;
  /** Boxes that already have text, as "positionId:itemIndex", to start the live counters. */
  initiallyFilled: string[];
  /** Changes after Update, Reset, or Dismiss, so the counters restart from what was saved. */
  version: number;
}) {
  const [active, setActive] = useState<PrepTab>(initialTab);
  const barRef = useRef<HTMLDivElement>(null);

  function select(tab: PrepTab) {
    setActive(tab);
    // Remember the tab in the URL (for reloads and links) without a server round trip.
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState(window.history.state, "", url);
    // If you've scrolled down, start the new section at the top instead of mid-page.
    const bar = barRef.current;
    if (bar) {
      const barTop = bar.parentElement!.getBoundingClientRect().top + window.scrollY;
      if (window.scrollY > barTop) window.scrollTo({ top: barTop });
    }
  }

  return (
    <ProgressProvider key={version} initiallyFilled={initiallyFilled}>
      <div>
        <div ref={barRef} className="sticky top-0 z-20 -mx-4 border-b border-outline bg-canvas/95 px-4 backdrop-blur">
          <div role="tablist" aria-label="Interview Prep sections" className="flex h-14 gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const selected = tab.id === active;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  id={`tab-${tab.id}`}
                  aria-selected={selected}
                  aria-controls={`panel-${tab.id}`}
                  onClick={() => select(tab.id)}
                  className={`flex shrink-0 items-center gap-2 border-b-2 px-3 text-sm transition-colors ${
                    selected ? "border-primary font-semibold text-fg" : "border-transparent text-fg-muted hover:text-fg"
                  }`}
                >
                  {tab.label}
                  <TabMeta tab={tab} selected={selected} />
                </button>
              );
            })}
          </div>
        </div>

        {PREP_TABS.map((id) => (
          <div
            key={id}
            role="tabpanel"
            id={`panel-${id}`}
            aria-labelledby={`tab-${id}`}
            hidden={id !== active}
            className="pt-6"
          >
            {panels[id]}
          </div>
        ))}
      </div>
    </ProgressProvider>
  );
}

/** A section's title and description, with a button that expands or collapses all of its cards. */
export function SectionHeader({ title, children }: { title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [allOpen, setAllOpen] = useState(false);

  function toggleAll() {
    const next = !allOpen;
    ref.current?.parentElement?.querySelectorAll("details").forEach((d) => (d.open = next));
    setAllOpen(next);
  }

  return (
    <div ref={ref} className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="mt-1 text-sm text-fg-muted">{children}</p>
      </div>
      <button type="button" className="btn btn-sm shrink-0" onClick={toggleAll}>
        {allOpen ? "Collapse all" : "Expand all"}
      </button>
    </div>
  );
}
