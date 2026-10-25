"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
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

// The active tab is underlined; the line is inset by the tab's padding so it spans just the label.
// Every tab keeps the same weight, so switching tabs doesn't shift the row.
const TAB =
  "relative rounded-md px-2 py-2 text-sm font-light transition-colors after:absolute after:inset-x-2 after:bottom-0.5 after:h-px after:transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-400 sm:px-4 sm:text-base sm:after:inset-x-4";
const TAB_ACTIVE =
  "text-neutral-900 after:bg-neutral-900 dark:text-neutral-100 dark:after:bg-neutral-100";
const TAB_IDLE =
  "text-neutral-600 hover:text-neutral-900 hover:after:bg-neutral-300 dark:text-neutral-400 dark:hover:text-neutral-100 dark:hover:after:bg-neutral-700";

const MENU_ROW = "relative block w-full px-5 py-2.5 text-left font-light transition-colors";
const MENU_IDLE =
  "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/60 dark:hover:text-neutral-100";

/** A dropdown row linking to a page. `nested` indents it under its group. */
function MenuLink({
  item,
  pathname,
  nested = false,
}: {
  item: NavItem;
  pathname: string;
  nested?: boolean;
}) {
  // Exact match: each row is one page, and "Overview" (/time/) shouldn't light up on its children.
  const active = normalize(item.href) === normalize(pathname);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        // Square rows; the current page gets a hairline at its left edge, echoing the tabs'
        // underline.
        className={`${MENU_ROW} before:absolute before:inset-y-2 before:left-0 before:w-px ${nested ? "pl-9" : ""} ${
          active
            ? "text-neutral-900 before:bg-neutral-900 dark:text-neutral-100 dark:before:bg-neutral-100"
            : MENU_IDLE
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

// The tab bar is for `md` screens and up; smaller screens get the MobileMenu drawer instead. There,
// dropdowns open on hover when a mouse (or trackpad) can hover, and otherwise (e.g. a tablet) by
// tapping, with groups expanding inline. The keyboard works the same everywhere.
const HOVER_MENUS = "(hover: hover) and (pointer: fine) and (min-width: 768px)";

function useHoverMenus(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(HOVER_MENUS);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(HOVER_MENUS).matches,
    () => false,
  );
}

const SUBMENU =
  "border border-neutral-200 bg-white py-2 text-sm shadow-[0_12px_32px_-16px_rgb(0_0_0/0.2)] dark:border-neutral-800 dark:bg-neutral-900 dark:shadow-[0_12px_32px_-16px_rgb(0_0_0/0.6)]";

/**
 * Records the pointer behind the next click. With hover menus, a mouse click on an already-hovered
 * button is ignored so it doesn't snap shut.
 */
function useClickPointer() {
  const pointer = useRef("");
  return {
    onPointerDown: (event: { pointerType: string }) => {
      pointer.current = event.pointerType;
    },
    /** True if the click being handled came from a mouse (then resets). */
    takeMouse: () => {
      const mouse = pointer.current === "mouse";
      pointer.current = "";
      return mouse;
    },
  };
}

/**
 * A dropdown row with its own sub-pages. With hover menus, hovering opens them in a flyout beside
 * the menu; tapping (or the keyboard) expands them inline, which is also how the current page's
 * group starts.
 */
function MenuGroup({
  item,
  pathname,
  hoverMenus,
}: {
  item: NavItem;
  pathname: string;
  hoverMenus: boolean;
}) {
  const active = isActive(item.href, pathname);
  const [expanded, setExpanded] = useState(active);
  const [hovered, setHovered] = useState(false);
  const click = useClickPointer();
  const listId = useId();
  const flyout = hoverMenus && hovered && !expanded;

  return (
    <li
      className="relative"
      onPointerEnter={(event) => event.pointerType === "mouse" && setHovered(true)}
      onPointerLeave={(event) => event.pointerType === "mouse" && setHovered(false)}
    >
      <button
        type="button"
        aria-expanded={expanded || flyout}
        aria-controls={listId}
        onPointerDown={click.onPointerDown}
        onClick={() => {
          if (!(click.takeMouse() && hoverMenus)) setExpanded(!expanded);
        }}
        className={`flex items-center justify-between gap-4 ${MENU_ROW} ${
          active || flyout ? "text-neutral-900 dark:text-neutral-100" : MENU_IDLE
        } ${flyout ? "bg-neutral-50 dark:bg-neutral-800/60" : ""}`}
      >
        {item.label}
        <svg
          aria-hidden="true"
          viewBox="0 0 16 16"
          className={`size-3 transition-transform ${expanded ? "rotate-180" : flyout ? "-rotate-90" : ""}`}
        >
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      {expanded ? (
        <ul id={listId}>
          {item.children?.map((child) => (
            <MenuLink key={child.href} item={child} pathname={pathname} nested />
          ))}
        </ul>
      ) : null}
      {flyout ? (
        // Beside the row, its first item level with the group (offset by the border and padding).
        <ul id={listId} className={`absolute top-[-9px] left-full z-10 min-w-40 ${SUBMENU}`}>
          {item.children?.map((child) => (
            <MenuLink key={child.href} item={child} pathname={pathname} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/** A tab that opens a list of sub-projects. Closes on outside click, Escape, or navigation. */
function DropdownTab({ item, pathname }: { item: NavItem; pathname: string }) {
  // Remembers which page the menu was opened on, so navigating anywhere closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const ref = useRef<HTMLLIElement>(null);
  const menuId = useId();
  const active = isActive(item.href, pathname);
  const hoverMenus = useHoverMenus();
  const click = useClickPointer();
  // A short delay before a hover-opened menu closes, so a pointer that strays off it briefly
  // doesn't lose it.
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

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
    <li
      ref={ref}
      className="relative"
      onPointerEnter={(event) => {
        if (!hoverMenus || event.pointerType !== "mouse") return;
        clearTimeout(closeTimer.current);
        setOpenOn(pathname);
      }}
      onPointerLeave={(event) => {
        if (!hoverMenus || event.pointerType !== "mouse") return;
        closeTimer.current = setTimeout(() => setOpenOn(null), 200);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={menuId}
        onPointerDown={click.onPointerDown}
        onClick={() => setOpenOn((click.takeMouse() && hoverMenus) || !open ? pathname : null)}
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
        // Left edge lines up with the tab's label (inset by the tab's padding, like the underline).
        // The gap above the menu is padding rather than margin, so the pointer stays "inside" while
        // crossing it.
        <div className="absolute top-full left-4 z-10 pt-3">
          <ul id={menuId} className={`min-w-48 ${SUBMENU}`}>
            {item.children?.length ? (
              item.children.map((child) =>
                child.children ? (
                  <MenuGroup
                    key={child.href}
                    item={child}
                    pathname={pathname}
                    hoverMenus={hoverMenus}
                  />
                ) : (
                  <MenuLink key={child.href} item={child} pathname={pathname} />
                ),
              )
            ) : (
              <li className="px-5 py-2.5 font-light text-neutral-400 dark:text-neutral-500">
                No projects yet
              </li>
            )}
          </ul>
        </div>
      ) : null}
    </li>
  );
}

const DRAWER_LINK = "relative block py-3 font-light transition-colors";

/** A link in the mobile drawer; the current page gets the same left hairline as the dropdown. */
function DrawerLink({
  item,
  pathname,
  nested = false,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  nested?: boolean;
  onNavigate: () => void;
}) {
  const active = normalize(item.href) === normalize(pathname);
  return (
    <li>
      <Link
        href={item.href}
        aria-current={active ? "page" : undefined}
        onClick={onNavigate}
        className={`${DRAWER_LINK} before:absolute before:inset-y-2.5 before:left-0 before:w-px ${
          nested ? "pl-8 text-base" : "pl-4 text-lg"
        } ${
          active
            ? "text-neutral-900 before:bg-neutral-900 dark:text-neutral-100 dark:before:bg-neutral-100"
            : "text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100"
        }`}
      >
        {item.label}
      </Link>
    </li>
  );
}

/**
 * Below `md`, a menu button that slides in a panel listing every page at once: dropdown tabs
 * become headed sections and their groups become sub-headings, so nothing needs expanding.
 */
function MobileMenu({ items, pathname }: { items: NavItem[]; pathname: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const dialogId = useId();
  const close = () => dialogRef.current?.close();

  return (
    <>
      <button
        type="button"
        aria-label="Open menu"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={dialogId}
        onClick={() => {
          dialogRef.current?.showModal();
          setOpen(true);
        }}
        className="absolute top-1/2 right-3 -translate-y-1/2 rounded-md p-2 text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-400 md:hidden dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </svg>
      </button>

      {/* Native modal: Escape closes it, focus is trapped inside and returns to the button, and
          globals.css stops the page scrolling behind it. It fills the screen: the dimmed area is a
          button that closes it, beside the panel that slides in from the right. */}
      <dialog
        ref={dialogRef}
        id={dialogId}
        aria-label="Menu"
        onClose={() => setOpen(false)}
        className="group m-0 h-dvh max-h-none w-full max-w-none bg-transparent p-0 transition-[display,overlay] transition-discrete duration-300 backdrop:bg-transparent motion-reduce:transition-none md:hidden"
      >
        <div className="flex h-full">
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close menu"
            onClick={close}
            className="flex-1 bg-black/40 opacity-0 transition-opacity duration-300 group-open:opacity-100 motion-reduce:transition-none starting:group-open:opacity-0"
          />
          <div className="flex h-full w-[min(20rem,85vw)] translate-x-full flex-col overflow-y-auto border-l border-neutral-200 bg-white px-6 pt-4 pb-10 text-neutral-900 transition-transform duration-300 ease-out group-open:translate-x-0 motion-reduce:transition-none starting:group-open:translate-x-full dark:border-neutral-800 dark:bg-[oklch(17%_0_0)] dark:text-neutral-100">
            <button
              type="button"
              aria-label="Close menu"
              onClick={close}
              className="-mr-2 self-end rounded-md p-2 text-neutral-600 transition-colors hover:text-neutral-900 focus-visible:outline-2 focus-visible:outline-neutral-400 dark:text-neutral-400 dark:hover:text-neutral-100"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="size-6">
                <path
                  d="M6 6l12 12M18 6L6 18"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                />
              </svg>
            </button>
            <nav aria-label="Main" className="mt-2">
              <ul>
                {items.map((item) =>
                  item.children ? (
                    <li key={item.href} className="mt-6">
                      <p className="pb-1 pl-4 text-xs tracking-widest text-neutral-500 uppercase dark:text-neutral-400">
                        {item.label}
                      </p>
                      <ul>
                        {item.children.map((child) =>
                          child.children ? (
                            <li key={child.href}>
                              <p className="pt-3 pl-4 text-sm font-light text-neutral-500 dark:text-neutral-400">
                                {child.label}
                              </p>
                              <ul>
                                {child.children.map((grandchild) => (
                                  <DrawerLink
                                    key={grandchild.href}
                                    item={grandchild}
                                    pathname={pathname}
                                    nested
                                    onNavigate={close}
                                  />
                                ))}
                              </ul>
                            </li>
                          ) : (
                            <DrawerLink
                              key={child.href}
                              item={child}
                              pathname={pathname}
                              onNavigate={close}
                            />
                          ),
                        )}
                      </ul>
                    </li>
                  ) : (
                    <DrawerLink
                      key={item.href}
                      item={item}
                      pathname={pathname}
                      onNavigate={close}
                    />
                  ),
                )}
              </ul>
            </nav>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** The site header. `items` come from the server (lib/nav.ts) with drafts already removed. */
export function SiteNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    // The border is the separator between the nav and the page content.
    <header className="border-b border-neutral-200 dark:border-neutral-800">
      <div className="relative flex justify-center pt-6 pb-6 sm:pt-8 sm:pb-8 md:pb-0">
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
        <MobileMenu items={items} pathname={pathname} />
      </div>
      <nav aria-label="Main" className="mx-auto hidden max-w-4xl px-4 md:block">
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
