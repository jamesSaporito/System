"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { canOpen, SETTINGS } from "@/lib/tabs";
import { useWorkspace } from "@/lib/workspace";

/** "/settings/members/" and "/settings/members" compare equal. */
const normalize = (path: string) => path.replace(/\/+$/, "");

/** Settings' pages share a sidebar listing the ones you can open; on phones it sits on top. */
export default function SettingsLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { me } = useWorkspace();
  const tabs = SETTINGS.tabs.filter((tab) => canOpen(me, tab.access));

  return (
    <div className="flex flex-col gap-6 md:flex-row md:gap-10">
      <nav aria-label="Settings" className="shrink-0 md:w-44">
        <ul className="flex gap-1 md:flex-col">
          {tabs.map((tab) => {
            const active = normalize(tab.href) === normalize(pathname);
            return (
              <li key={tab.href}>
                <Link
                  href={tab.href}
                  aria-current={active ? "page" : undefined}
                  className={`block rounded-md px-3 py-1.5 text-sm ${
                    active
                      ? "bg-neutral-100 font-medium dark:bg-neutral-800"
                      : "text-neutral-600 hover:bg-neutral-50 dark:text-neutral-400 dark:hover:bg-neutral-900"
                  }`}
                >
                  {tab.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
