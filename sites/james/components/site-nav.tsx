"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import type { NavItem } from "@/lib/nav";

// The logo is a design asset, so it's committed: put it at sites/james/public/logo.svg (or .png),
// set `src` to "/logo.svg", and set width/height to its intrinsic size. It's displayed 56px tall
// on phones and 64px on larger screens.
// The logo is black on transparent, so dark mode inverts it to white (`dark:invert` below).
const LOGO: { src: string | null; alt: string; width: number; height: number } = {
  src: "/logo.png",
  alt: "James",
  width: 2270,
  height: 1152,
};

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

const TAB =
  "rounded-md px-2 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-4 sm:text-base";
const TAB_ACTIVE =
  "bg-neutral-100 font-medium text-neutral-900 dark:bg-neutral-800 dark:text-neutral-100";
const TAB_IDLE =
  "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-900 dark:hover:text-neutral-100";

/** A tab that opens a list of sub-projects. Closes on outside click, Escape, or navigation. */
function DropdownTab({ item, pathname }: { item: NavItem; pathname: string }) {
  // Remembers which page the menu was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const ref = useRef<HTMLLIElement>(null);
  const menuId = useId();
  const active = isActive(item.href, pathname);

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (event: PointerEvent) => {
      if (!(event.target instanceof Node) || !ref.current?.contains(event.target)) setOpenOn(null);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenOn(null);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <li ref={ref} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpenOn(open ? null : pathname)}
        className={`flex items-center gap-1 ${TAB} ${active ? TAB_ACTIVE : TAB_IDLE}`}
      >
        {item.label}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`size-3.5 transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {open ? (
        <ul
          id={menuId}
          className="absolute top-full left-1/2 z-10 mt-2 min-w-44 -translate-x-1/2 rounded-lg border border-neutral-200 bg-white p-1 text-sm shadow-lg dark:border-neutral-800 dark:bg-neutral-900"
        >
          {item.children?.length ? (
            item.children.map((child) => (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={isActive(child.href, pathname) ? "page" : undefined}
                  className={`block rounded-md px-3 py-2 ${
                    isActive(child.href, pathname)
                      ? "bg-neutral-100 font-medium dark:bg-neutral-800"
                      : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100"
                  }`}
                >
                  {child.label}
                </Link>
              </li>
            ))
          ) : (
            <li className="px-3 py-2 text-neutral-400 dark:text-neutral-500">No projects yet</li>
          )}
        </ul>
      ) : null}
    </li>
  );
}

/** The site header. `items` come from the server (lib/nav.ts) with drafts already removed. */
export function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    // The border is the separator between the nav and the page content.
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="flex justify-center pt-6 sm:pt-8">
        <Link
          href="/"
          aria-label={`${LOGO.alt}, home`}
          className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-neutral-400"
        >
          {LOGO.src ? (
            <Image
              src={LOGO.src}
              alt=""
              width={LOGO.width}
              height={LOGO.height}
              loading="eager"
              className="h-14 w-auto sm:h-16 dark:invert"
            />
          ) : (
            // Holds the logo's space until a file is added (see LOGO above).
            <span className="grid h-14 w-28 place-items-center rounded-md border border-dashed border-neutral-300 text-xs tracking-widest text-neutral-400 uppercase sm:h-16 sm:w-32 dark:border-neutral-700 dark:text-neutral-500">
              Logo
            </span>
          )}
        </Link>
      </div>
      <nav aria-label="Main" className="mx-auto max-w-4xl px-4">
        <ul className="flex flex-wrap justify-center gap-0.5 pt-4 pb-3 sm:gap-4">
          {items.map((item) => {
            if (item.children) {
              return <DropdownTab key={item.href} item={item} pathname={pathname} />;
            }
            const active = isActive(item.href, pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`block ${TAB} ${active ? TAB_ACTIVE : TAB_IDLE}`}
                >
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
