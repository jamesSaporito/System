import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Client-rendered static export: all data comes from apps/backend in the browser.
  output: "export",
  trailingSlash: true,
  images: { unoptimized: true },
  transpilePackages: ["@portfolio/ui"],
};

export default nextConfig;
