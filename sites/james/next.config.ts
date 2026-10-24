import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Fully static site for S3 + CloudFront: no server runtime.
  output: "export",
  // Emit /motorcycle/index.html instead of /motorcycle.html.
  trailingSlash: true,
  // No image optimization server in a static export.
  images: { unoptimized: true },
};

export default nextConfig;
