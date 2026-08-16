# ADR 0006 — Web/Windows shared architecture

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

One product, two platforms: GitHub Pages web and a Windows desktop app.
Maximum reuse, minimal divergence, identical behavior.

## Decision

- **One static bundle.** The Electron shell serves the exact `out/` build
  over a loopback HTTP server rooted at `/open-writer/` (identical asset
  paths, basePath handling, and behavior to Pages).
- The shared core is `src/lib/local-api/` (domain/services/storage seam),
  `src/lib/github-sync/`, `src/lib/ai/`, and `src/store/writer-store.ts`.
  The platform-specific layer is only the shell:
  - Web: `local-api-bootstrap`, `sync-init`, `theme-sync`, bridge no-ops.
  - Windows: `electron/main.js` (window, tray, IPC), `electron/preload.js`
    (`window.openWriter` bridge), `electron-bridge.tsx` (no-ops on web).
- Persistence: IndexedDB in both (browser profile on web; per-user AppData
  browser profile in Electron).

## Consequences

- ✅ Zero web/desktop feature divergence; one place to test.
- ✅ Platform additions (tray, hide-to-tray) degrade gracefully on web.
- ⚠️ Electron bundles the full web runtime (~90 MB EXE) — accepted in
  exchange for zero re-architecture (ADR-0010).
