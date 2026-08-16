# Open Writer — Architecture Overview

**Updated:** 2026-08-16 (Phase 1)
Decision records: `docs/architecture/adr/` · Research: `docs/research/architecture-study.md`

## Current architecture (verified in Phase 0)

```
Web (GitHub Pages) ─┐
Electron (Windows)  ─┤  one static bundle (out/) via next export
                    ▼
        fetch('/api/*') → local-api-bootstrap → router.ts (fetch shim)
                            │
                 ┌──────────┴───────────┐
                 │                      │
            services.ts          exports / imports / ai
                 │                      │
                 ▼                      ▼
      IndexedDB "open-writer"    blobs / user AI endpoint
      (15 object stores)              │
                             ┌────────┴─────────┐
                             │                  │
                      github-sync engine → GitHub API (optional)
```

- 77 static + 6 dynamic routes, all client-side; data shapes preserved
  from the former Prisma models.
- Sync: device-flow OAuth → private `open-writer-storage` repo → chunked,
  deduplicated, verified snapshots (30/30 tests, live device flow).
- Desktop: Electron serves the identical bundle (tray, IPC, installer).

## Target architecture (ADR-indexed)

```
        Open Writer shared domain/core (local-api + types)   [ADR-0006]
        │               │                │
   Web (Pages)     Windows (Electron)    Optional services
   IndexedDB [1]   same bundle [10]      GitHub sync [7,8]
   PWA later [5]   tray/installer        remote AI (user) [9]
```

| ADR | Decision | Status |
| --- | -------- | ------ |
| 0001 | Browser-local storage: direct IndexedDB behind a storage seam | ✅ implemented |
| 0002 | Schema versioning; never destructively migrate | ✅ implemented |
| 0003 | Static export deployment (`output: "export"`, basePath) | ✅ implemented |
| 0004 | GitHub Pages hosting; no SAB/COOP-COEP-dependent strategies | ✅ implemented |
| 0005 | PWA (manifest + SW) — deferred | 🔶 planned |
| 0006 | Web/Windows shared core = one bundle + thin shells | ✅ implemented |
| 0007 | Sync: optional GitHub-backed cloud storage, local-first | ✅ implemented |
| 0008 | GitHub storage format: content-addressed chunks, one repo | ✅ implemented |
| 0009 | AI: optional, user-configured OpenAI-compatible client, privacy-gated | ✅ implemented |
| 0010 | Desktop: Electron + electron-builder (NSIS + portable) | ✅ implemented |

## Migration plan

1. ✅ Static export + IndexedDB migration (all former API routes → local-api)
2. ✅ GitHub sync engine + mock-server test suite + live device flow
3. ✅ Electron desktop + tray + installers
4. 🔶 Remaining: PWA (ADR-0005), Phase 0 cleanup items, comments e2e,
   responsive/accessibility audits — none are architectural

## Data model

IndexedDB `open-writer`, 15 stores: `projects`, `chapters`, `scenes`,
`characters`, `locations`, `storyObjects`, `worldElements`,
`timelineEvents`, `relationships`, `notes`, `comments`, `versions`,
`goals`, `sessions`, `agentTasks`. Dates are ISO-8601 strings.

## Key files

| File | Role |
| ---- | ---- |
| `src/lib/local-api/storage.ts` | Promise IndexedDB wrapper (the storage seam) |
| `src/lib/local-api/services.ts` | Domain services (CRUD, cascades, versions, backups) |
| `src/lib/local-api/router.ts` | Fetch shim + 77-route table |
| `src/lib/local-api/exports.ts` / `imports.ts` | 6 export / 4 import formats |
| `src/lib/local-api/ai.ts` | Opt-in OpenAI-compatible AI client |
| `src/lib/github-sync/` | Device-flow auth, engine, snapshot/chunk format |
| `electron/main.js` + `preload.js` | Desktop shell (loopback server, tray, IPC) |

## Risks & tradeoffs

See `docs/research/architecture-study.md` §11–12 (full table). Headline:
IndexedDB simplicity vs SQLite WASM (Pages header constraint), browser
storage eviction (mitigated by backup/sync), GitHub sync quotas (dedup +
batching), multi-tab writes (single-tab assumption), feature loss: **none** —
every former feature is client-side or optional/external by design.
