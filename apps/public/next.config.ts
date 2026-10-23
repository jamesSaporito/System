import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site for S3 + CloudFront: no server runtime.
  output: "export",
  // Emit /about/index.html instead of /about.html.
  trailingSlash: true,
  // No image optimization server in a static export.
  images: { unoptimized: true },
  transpilePackages: ["@portfolio/ui"],
};

export default nextConfig;
