"use client";

import type { MeResponse } from "@portfolio/access/api";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, type ReactNode, type Ref, useRef, useState } from "react";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CloseIcon,
  CollapseIcon,
  ExpandIcon,
  type Icon,
  SignOutIcon,
} from "@/components/icons";
import { isActive, isSection, visibleNav } from "@/lib/tabs";

const COLLAPSED_KEY = "admin.sidebar.collapsed";

/**
 * Whether the desktop sidebar is collapsed, remembered per browser. Storage can be missing or
 * blocked (private windows), so it falls back to expanded. The sidebar only renders in the
 * browser, after the session loads, so reading storage up front can't cause a hydration mismatch.
 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return window.localStorage.getItem(COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });

  function toggle() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      window.localStorage.setItem(COLLAPSED_KEY, String(next));
    } catch {
      // Not remembered; it still toggles for this visit.
    }
  }

  return [collapsed, toggle];
}

type SidebarProps = {
  me: MeResponse;
  collapsed: boolean;
  onSignOut: () => void;
  /** Desktop: collapses or expands the sidebar. */
  onToggleCollapsed?: () => void;
  /** Phones: closes the drawer, after following a link too. */
  onClose?: () => void;
};

/** The main navigation: the tabs `me` can open, then who's signed in. */
export function Sidebar({ me, collapsed, onSignOut, onToggleCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-4">
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent/15 font-mono text-sm font-bold text-accent"
        >
          A
        </span>
        <span className={collapsed ? "sr-only" : "font-semibold tracking-tight"}>Admin</span>
        {onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close menu"
            className="ml-auto rounded-md p-1.5 text-muted transition-colors hover:bg-raised hover:text-fg"
          >
            <CloseIcon className="size-5" />
          </button>
        ) : null}
      </div>

      <SlidingNav me={me} pathname={pathname} collapsed={collapsed} onClose={onClose} />

      <div className="grid shrink-0 gap-1 border-t border-line p-2">
        <div
          className={`flex items-center gap-3 px-3 py-2 ${collapsed ? "justify-center px-0" : ""}`}
          title={collapsed ? me.user.name : undefined}
        >
          <Avatar name={me.user.name} image={me.user.image} />
          <span className={collapsed ? "sr-only" : "min-w-0 truncate text-sm"}>{me.user.name}</span>
        </div>
        <SidebarButton
          label="Sign out"
          icon={SignOutIcon}
          collapsed={collapsed}
          onClick={onSignOut}
        />
        {onToggleCollapsed ? (
          <SidebarButton
            label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            icon={collapsed ? ExpandIcon : CollapseIcon}
            collapsed={collapsed}
            onClick={onToggleCollapsed}
            expanded={!collapsed}
          />
        ) : null}
      </div>
    </div>
  );
}

/** Moves focus once the slide has rendered, so keyboard users land in the panel they see. */
function focusAfterSlide(target: { current: HTMLElement | null }) {
  requestAnimationFrame(() => target.current?.focus());
}

/**
 * The main nav, and beside it the pages of the section you're in (Settings), which slides in over
 * it. "Back" slides the main nav back without leaving the page you're on.
 */
function SlidingNav({
  me,
  pathname,
  collapsed,
  onClose,
}: {
  me: MeResponse;
  pathname: string;
  collapsed: boolean;
  onClose: (() => void) | undefined;
}) {
  const nav = visibleNav(me);
  const section = nav.filter(isSection).find((item) => isActive(item.href, pathname));
  const [backedOut, setBackedOut] = useState(false);
  const backRef = useRef<HTMLButtonElement>(null);
  const sectionLinkRef = useRef<HTMLAnchorElement>(null);

  // Each navigation shows the section's pages again, even after "Back" (React's pattern for
  // resetting state when a value changes, without an effect).
  const [shownFor, setShownFor] = useState(pathname);
  if (shownFor !== pathname) {
    setShownFor(pathname);
    setBackedOut(false);
  }

  const inSection = section !== undefined && !backedOut;

  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={`flex h-full w-[200%] transition-transform duration-300 ease-out motion-reduce:transition-none ${
          inSection ? "-translate-x-1/2" : "translate-x-0"
        }`}
      >
        <nav aria-label="Main" inert={inSection} className="h-full w-1/2 overflow-y-auto p-2">
          <ul className="grid gap-1">
            {nav.map((item) => {
              const opensSection = isSection(item);
              const here = opensSection && item === section;
              return (
                <li key={item.href}>
                  <NavLink
                    ref={here ? sectionLinkRef : undefined}
                    href={item.href}
                    label={item.label}
                    icon={item.icon}
                    active={isActive(item.href, pathname)}
                    collapsed={collapsed}
                    trailing={opensSection ? <ChevronRightIcon className="size-4" /> : null}
                    onClick={(event) => {
                      // Already on one of its pages: just slide back in.
                      if (here) {
                        event.preventDefault();
                        setBackedOut(false);
                        focusAfterSlide(backRef);
                      } else if (!opensSection) {
                        // A section's pages open in the drawer, so it stays open for them.
                        onClose?.();
                      }
                    }}
                  />
                </li>
              );
            })}
          </ul>
        </nav>

        <nav
          aria-label={section?.label ?? "Section"}
          inert={!inSection}
          className="h-full w-1/2 overflow-y-auto p-2"
        >
          {section ? (
            <>
              <button
                ref={backRef}
                type="button"
                onClick={() => {
                  setBackedOut(true);
                  focusAfterSlide(sectionLinkRef);
                }}
                title={collapsed ? "Back to main menu" : undefined}
                className={`${rowClass(collapsed)} mb-1 border border-line bg-raised/60 font-medium text-fg hover:border-line-strong hover:bg-raised`}
              >
                <ChevronLeftIcon className="size-5 shrink-0 text-accent" />
                <span className={collapsed ? "sr-only" : "truncate"}>Back to main menu</span>
              </button>
              <p
                className={
                  collapsed
                    ? "sr-only"
                    : "px-3 pt-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-muted uppercase"
                }
              >
                {section.label}
              </p>
              <ul className="grid gap-1">
                {section.tabs.map((tab) => (
                  <li key={tab.href}>
                    <NavLink
                      href={tab.href}
                      label={tab.label}
                      icon={tab.icon}
                      active={isActive(tab.href, pathname)}
                      collapsed={collapsed}
                      onClick={onClose}
                    />
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </nav>
      </div>
    </div>
  );
}

/** Shared by links and buttons: hover lifts to `raised`, never darker than the sidebar. */
function rowClass(collapsed: boolean) {
  return `relative flex w-full items-center gap-3 rounded-lg py-2 text-sm transition-colors ${
    collapsed ? "justify-center px-0" : "px-3"
  }`;
}

function NavLink({
  ref,
  href,
  label,
  icon: ItemIcon,
  active,
  collapsed,
  trailing = null,
  onClick,
}: {
  ref?: Ref<HTMLAnchorElement>;
  href: string;
  label: string;
  icon: Icon | undefined;
  active: boolean;
  collapsed: boolean;
  /** Shown after the label, e.g. a chevron for a link that opens a section's pages. */
  trailing?: ReactNode;
  onClick: ((event: MouseEvent<HTMLAnchorElement>) => void) | undefined;
}) {
  return (
    <Link
      ref={ref}
      href={href}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={`${rowClass(collapsed)} ${
        active
          ? "bg-accent/10 font-medium text-fg before:absolute before:inset-y-1.5 before:left-0 before:w-0.5 before:rounded-full before:bg-accent"
          : "text-muted hover:bg-raised hover:text-fg"
      }`}
    >
      {ItemIcon ? (
        <ItemIcon className={`size-5 shrink-0 ${active ? "text-accent" : ""}`} />
      ) : (
        <span aria-hidden className="grid size-5 shrink-0 place-items-center text-xs font-semibold">
          {label.charAt(0)}
        </span>
      )}
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
      {trailing && !collapsed ? (
        <span aria-hidden className="ml-auto text-muted">
          {trailing}
        </span>
      ) : null}
    </Link>
  );
}

function SidebarButton({
  label,
  icon: ButtonIcon,
  collapsed,
  onClick,
  expanded,
}: {
  label: string;
  icon: Icon;
  collapsed: boolean;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={expanded}
      title={collapsed ? label : undefined}
      className={`${rowClass(collapsed)} text-muted hover:bg-raised hover:text-fg`}
    >
      <ButtonIcon className="size-5 shrink-0" />
      <span className={collapsed ? "sr-only" : "truncate"}>{label}</span>
    </button>
  );
}

function Avatar({ name, image }: { name: string; image: string | null }): ReactNode {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        width={28}
        height={28}
        className="size-7 shrink-0 rounded-full ring-1 ring-line"
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-7 shrink-0 place-items-center rounded-full bg-raised text-xs font-semibold text-muted"
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
