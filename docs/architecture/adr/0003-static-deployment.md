# ADR 0003 — Static deployment (Next.js static export)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

The app must run on GitHub Pages (static hosting) and inside an Electron
shell. A server (Node runtime, API routes, Prisma) cannot run on Pages.

## Decision

- `next.config.ts`: `output: "export"`, `basePath` from
  `NEXT_PUBLIC_BASE_PATH` (`/open-writer` on Pages, empty locally),
  `trailingSlash: true`, `images.unoptimized: true`,
  `reactStrictMode: false` (as deployed today).
- `out/` is the single deployable artifact used by BOTH Pages and the
  Electron shell — zero divergence between web and desktop.
- CI validates the artifact (index.html, `_next` present, no bare
  `/_next` paths) before upload (`.github/workflows/deploy-pages.yml`).

## Consequences

- ✅ One bundle, three targets (Pages, Electron, local preview).
- ✅ No server to maintain; deep links handled via `404.html`.
- ⚠️ No server-side dynamic behavior — by design; every feature is
  client-side (see ADR-0001) or optional/external.
