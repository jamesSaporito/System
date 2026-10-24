"use client";

import type { MeResponse, SiteWithRole } from "@portfolio/contracts";
import { createContext, use } from "react";

export type Workspace = {
  me: MeResponse;
  /** The selected site, or null when the user has no sites yet. */
  site: SiteWithRole | null;
  /** Adds ?site=<slug> so links keep the current site selected. */
  href: (path: string) => string;
  reloadMe: () => Promise<void>;
};

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const workspace = use(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside the dashboard layout");
  return workspace;
}
