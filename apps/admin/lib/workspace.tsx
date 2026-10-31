"use client";

import type { MeResponse } from "@portfolio/contracts";
import { createContext, use } from "react";

export type Workspace = {
  me: MeResponse;
  reloadMe: () => Promise<void>;
};

export const WorkspaceContext = createContext<Workspace | null>(null);

export function useWorkspace(): Workspace {
  const workspace = use(WorkspaceContext);
  if (!workspace) throw new Error("useWorkspace must be used inside the dashboard layout");
  return workspace;
}
