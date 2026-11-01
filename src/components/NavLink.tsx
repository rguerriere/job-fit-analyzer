"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** A top-bar link that's highlighted while you're on its page (or one of its sub-pages). */
export function NavLink({ href, children, className = "" }: { href: string; children: React.ReactNode; className?: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(`${href}/`);

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-full items-center border-b-2 ${
        active
          ? "border-teal-600 font-medium text-stone-900 dark:border-teal-400 dark:text-white"
          : "border-transparent text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-white"
      } ${className}`}
    >
      {children}
    </Link>
  );
}
