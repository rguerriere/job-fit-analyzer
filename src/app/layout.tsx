import type { Metadata } from "next";
import Link from "next/link";
import { NavLink } from "@/components/NavLink";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Fit Analyzer",
  description: "See how well you fit a job posting, based on your own career history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // Browser extensions like Dark Reader add attributes to <html> before React loads.
    // This only silences mismatched attributes on this one tag, not on the rest of the page.
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen">
        <header className="border-b border-outline bg-surface">
          <nav className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4 text-sm">
            <Link href="/" className="font-semibold text-primary">
              Job Fit Analyzer
            </Link>
            <NavLink href="/opportunities">Opportunities</NavLink>
            <NavLink href="/analyze">Analyze a job</NavLink>
            <NavLink href="/bank">Career bank</NavLink>
            <NavLink href="/interview-prep">Interview Prep</NavLink>
            <NavLink href="/settings" className="ml-auto">
              Settings
            </NavLink>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
