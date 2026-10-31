import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Fit Analyzer",
  description: "See how well you fit a job posting, based on your own career history.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <header className="border-b border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
          <nav className="mx-auto flex h-14 max-w-4xl items-center gap-6 px-4 text-sm">
            <Link href="/" className="font-semibold text-teal-800 dark:text-teal-400">
              Job Fit Analyzer
            </Link>
            <Link href="/bank" className="text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white">
              Career bank
            </Link>
            <Link
              href="/settings"
              className="ml-auto text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
            >
              Settings
            </Link>
          </nav>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
      </body>
    </html>
  );
}
