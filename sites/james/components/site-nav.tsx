"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/motorcycle/", label: "Motorcycle" },
  { href: "/nixie/", label: "Nixie" },
  { href: "/freeform/", label: "Freeform" },
  { href: "/watch/", label: "Watch" },
];

/** "/projects/" and "/projects" compare equal; the root stays "/". */
function normalize(path: string): string {
  return path.replace(/\/+$/, "") || "/";
}

/** Home matches only itself; other tabs also match pages below them (e.g. a project). */
function isActive(href: string, pathname: string): boolean {
  const target = normalize(href);
  const current = normalize(pathname);
  return target === "/" ? current === "/" : current === target || current.startsWith(`${target}/`);
}

export function SiteNav() {
  const pathname = usePathname();

  return (
    // The border is the separator between the nav and the page content.
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <nav aria-label="Main" className="mx-auto max-w-4xl px-4">
        <ul className="flex flex-wrap justify-center gap-0.5 py-3 sm:gap-4">
          {NAV_ITEMS.map(({ href, label }) => {
            const active = isActive(href, pathname);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-4 sm:text-base ${
                    active
                      ? "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100"
                  }`}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
