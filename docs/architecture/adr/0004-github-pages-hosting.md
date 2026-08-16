# ADR 0004 — GitHub Pages hosting (and its hard constraints)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

Hosting is GitHub Pages (https://Alot1z.github.io/open-writer/), a static
host with no configurable security headers (COOP/COEP are **not**
settable), no server, and no server-side processing.

## Decision

- Host the static export as-is; the app is fully client-side.
- Design constraint recorded for future work: **no SharedArrayBuffer-based
  strategy** (worker + COOP/COEP) may be assumed — any WASM/worker
  approach must work header-free (e.g. wa-sqlite's IDBBatchAtomic VFS,
  plain service workers).
- Keep the app usable with zero network: all data is local; GitHub sync
  and AI are optional and user-initiated.

## Consequences

- ✅ The Pages version is the real application (not a landing page).
- ✅ Works offline once loaded.
- ⚠️ Cannot set caching headers precisely; mitigated by hashed asset names
  and network-first navigation.
- ⚠️ SQLite WASM "fast path" (SAB) is unavailable — acceptable per ADR-0001.
