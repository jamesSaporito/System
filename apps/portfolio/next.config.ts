import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

export default function config(phase: string): NextConfig {
  return {
    // Fully static site for S3 + CloudFront: no server runtime.
    output: "export",
    // Emit /motorcycle/index.html instead of /motorcycle.html.
    trailingSlash: true,
    // No image optimization server in a static export.
    images: { unoptimized: true },
    // Draft pages (page.draft.tsx) are routes in `next dev` only; builds skip them (lib/drafts.ts).
    pageExtensions: phase === PHASE_DEVELOPMENT_SERVER ? ["draft.tsx", "tsx", "ts"] : ["tsx", "ts"],
  };
}
