/** The Interview Prep tabs, in order. Shared by the page (server) and the tab bar (client). */
export const PREP_TABS = ["resume", "skills", "qa", "tech"] as const;
export type PrepTab = (typeof PREP_TABS)[number];
