import type { NextConfig } from "next";

/**
 * Open Writer ships as a fully static application on GitHub Pages.
 *
 * - output: "export"  → `next build` produces a static site in `out/`
 * - basePath          → the Pages project lives at /open-writer/
 *   (set via NEXT_PUBLIC_BASE_PATH in the Pages workflow; empty locally)
 * - images            → unoptimized (no server-side image optimizer on Pages)
 * - trailingSlash     → canonical /open-writer/ URLs
 *
 * There is no Node.js server, no Prisma, no SQLite: every feature runs
 * in the browser against IndexedDB (see src/lib/local-api/).
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  reactStrictMode: false,
};

export default nextConfig;
