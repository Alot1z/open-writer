# ADR 0001 — Browser-local storage: direct IndexedDB

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

Open Writer must be fully functional on GitHub Pages (static, no server).
All manuscript data must persist in the browser. Candidates: IndexedDB
(direct), OPFS, SQLite WASM (official build, wa-sqlite, sql.js, PGlite),
Dexie, RxDB.

Data volumes are small (a novel = hundreds of records, a few MB). Workloads
are simple CRUD + linear search — no joins, no FTS today.

## Decision

Keep **direct IndexedDB** (15 object stores) as the storage layer, behind a
thin Promise wrapper (`src/lib/local-api/storage.ts`) that exposes the
domain operations needed by services (getAll/get/put/bulkPut/replaceStore/
transaction helpers).

## Consequences

- ✅ No wasm bundle, no worker plumbing, no COOP/COEP dependency (which
  GitHub Pages cannot serve).
- ✅ Transactions and durability are native; `replaceStore` gives atomic
  wipe-and-replace semantics (fixes cascade/restore correctness).
- ⚠️ No SQL / FTS — acceptable; search is a debounced linear scan.
- 🔄 The `storage.ts` interface is the seam: if a measured need appears
  (≥1–2 GB, FTS over a large corpus), swap the implementation to
  **wa-sqlite with its IDBBatchAtomic VFS** (header-free, unlike the
  official SAB-based OPFS path) without touching services.

## Links

- `docs/research/architecture-study.md` §2 (comparison + triggers)
