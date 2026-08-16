# Open Writer — Architecture Study

**Phase 1 · 2026-08-16**
Decision inputs for the ADRs in `docs/architecture/adr/`. All claims about
the current implementation were verified in Phase 0 (typecheck, lint, build,
30/30 sync tests, live site). External facts were checked against primary
sources (links at the end).

---

## 1. Current architecture (verified)

```
Web (GitHub Pages)  ─┐
Electron (Windows)   ─┤  same static bundle (out/)
                     │
                     ▼
   fetch('/api/*')  ──▶ local-api-bootstrap → router.ts (fetch shim)
                             │
                    ┌────────┴──────────────┐
                    │                       │
              services.ts             exports/imports/ai
                    │                       │
                    ▼                       ▼
         IndexedDB "open-writer"    blob downloads / user-configured AI
         (15 object stores)              endpoint
                             │
                    ┌────────┴──────────────┐
                    │                       │
            github-sync engine ──▶ GitHub API (optional, private repo)
```

- 77 static routes + 6 dynamic export routes, all client-side.
- Data shapes preserved from the former Prisma models (ISO-8601 dates).
- Sync: device-flow OAuth → private `open-writer-storage` repo →
  gzip + SHA-256 chunked snapshots, dedup, delta uploads, conflicts.
- Desktop: Electron loads the identical `out/` bundle over a loopback
  HTTP server (basePath `/open-writer`), tray + IPC bridge.

**No server-only responsibilities remain in the current product** — every
route's work runs in the browser. The only genuinely server-dependent
features are *optional* by design: remote AI inference and (multi-user)
sync/collaboration.

## 2. Storage research: IndexedDB vs OPFS vs SQLite WASM

| Option | Persistence | Transactions | FTS | Maturity | Notes |
| ------ | ----------- | ------------ | --- | -------- | ----- |
| **IndexedDB (direct)** | ✅ native | ✅ per-store transactional | ❌ manual | ✅ 15+ yrs, all engines | Current choice; good enough for CRUD over hundreds of records |
| **OPFS (raw)** | ✅ | ❌ none (raw files) | ❌ | ✅ all engines (sync handles in workers) | Building blocks, not a DB |
| **sqlite3.wasm (official)** | OPFS VFS / OPFS-SyncAccessHandle | ✅ full SQLite | ✅ FTS5 | ⚠️ stable wasm; persistence VFSes "not production-guaranteed" per sqlite.org | **Pages problem:** the fast worker path needs SharedArrayBuffer → requires COOP/COEP headers, which GitHub Pages cannot set; fallback paths are Asyncify (2× size, 2–5× slower) or JSPI (Chrome 137+, Firefox behind flag, Safari TP) |
| **wa-sqlite** | IDBBatchAtomic VFS (IndexedDB) or OPFS | ✅ | ✅ FTS5 | ⚠️ "no production stability claim", but used in production apps | **No SAB/headers needed** — uses SQLITE_BUSY retry trick; good Pages fit if SQLite is ever needed |
| **sql.js** | ❌ memory only (manual export/import of whole file) | ✅ in-memory | ✅ | ✅ but persistence is DIY | Not suitable for app data |
| **PGlite** | OPFS/IndexedDB | ✅ PostgreSQL | ✅ | ⚠️ heavier | Postgres-compatible; ~multi-MB wasm, slower than wa-sqlite; overkill here |
| **Dexie** | IndexedDB wrapper | ✅ | ✅ Dexie Cloud / manual | ✅ mature | Great DX; adds a dependency for what `storage.ts` already does |
| **RxDB** | IndexedDB/OPFS/others | ✅ | ✅ | ✅ | Replication + schemas; heavier; useful if offline-first sync were built in-app (it isn't — sync is repo-level) |

### Decision input: keep direct IndexedDB

- Data volumes are small (a novel: hundreds of scenes/entities; a few MB).
  Complex queries, joins and FTS are not needed — search is a linear scan
  with debounce (verified, opens entities).
- SQLite WASM would add: wasm bundle (~0.5–1.5 MB), worker plumbing,
  VFS quirks, and a **real constraint on Pages** (no COOP/COEP → no SAB
  fast path). The benefit (FTS5, SQL) has no current user-visible need.
- Keep the storage layer **interface-stable** (`storage.ts` is a thin
  Promise wrapper) so swapping to SQLite WASM later (e.g. for large
  projects or FTS search) is a contained change. See ADR-0001.
- **Trigger for revisiting:** measured pain at ≥ 1–2 GB of data, or a
  requirement for full-text search across a large corpus, or multi-tab
  concurrent write patterns that IDB handles poorly.

## 3. GitHub Pages constraints (researched)

- Static hosting only: no server, no headers you don't set via `_headers`
  (and Pages only honors a small subset; COOP/COEP are **not** settable).
- HTTPS + custom domain support; path-based projects live at `/open-writer/`.
- Consequence: the app must be fully client-side (it is) and any WASM
  worker strategy must not depend on COOP/COEP (see §2).

## 4. GitHub sync / storage analysis

| Limit | Value | Impact |
| ----- | ----- | ------ |
| Single file hard limit | 100 MB (API PUT contents max 100 MB; browser upload 25 MB; warning at 50 MB) | Chunks must stay well under; ours are ~tens of KB gzip — ✅ |
| Repo recommended size | < 1 GB (hard limit ~5 GB) | A writer's entire corpus is ~MBs; ✅ decades of headroom |
| API rate limits | 5,000 req/hr per authenticated token (device-flow token) | Engine batches + dedups; manifest updates are a few calls per sync; ✅ |
| Content-addressed dedup | — | Only changed chunks upload; verified in 30/30 tests |
| Compression | gzip before upload | Reduces remote bytes further |

The private-repo-as-cloud-storage design is comfortably inside every limit.
Snapshot pruning/compaction is the right long-term housekeeping (per the
product spec), not a near-term need.

## 5. PWA on GitHub Pages

- Service workers + manifest work on Pages (static HTTPS host).
- Strategy when implemented: cache-first for hashed `_next/static` assets,
  network-first for `index.html` (so deploys refresh), `404.html` handling
  for deep links, and a no-op/fallback so the app keeps working offline.
- No COOP/COEP needed for a plain SW. Add after the core audit items.

## 6. AI options

| Option | Where it runs | Key | Privacy | Status |
| ------ | ------------- | --- | ------- | ------ |
| OpenAI-compatible endpoint (Z.ai, custom) | remote | user-set baseUrl + key (browser-local) | user-controlled | ✅ implemented |
| Ollama | local machine | http://localhost:11434 | fully local | ✅ implemented (config), unverified without a running Ollama |
| Browser inference (Transformers.js / WebGPU / ONNX) | in-browser WASM/WebGPU | none | fully local | ❌ not implemented; would add ~50–100 MB model downloads; revisit only if offline AI becomes a requirement |
| Native (Electron) sidecar | desktop | — | local | possible future: Ollama bundled with the installer |

Current AI architecture (ADR-0009) is deliberately thin: one
OpenAI-compatible client + a local-only privacy gate. It needs no change.

## 7. Desktop: Electron vs Tauri

| | Electron (chosen) | Tauri 2 |
| --- | --- | --- |
| Bundle | reuses the exact static `out/` (zero web-code divergence) | same idea but needs Rust toolchain + system WebView2 |
| Tray/system integration | mature API | supported but more wiring |
| Installer | electron-builder NSIS/portable (verified working) | NSIS/WiX via tauri-bundler |
| Size | ~90 MB EXE | ~10–20 MB |
| Chosen because | zero re-architecture; same bundle as Pages; already verified | smaller binary at the cost of a new toolchain and re-verification |

Switching to Tauri later would not change the web layer at all (the shared
core is the bundle), so ADR-0010 records Electron with a low-cost migration
path.

## 8. API migration matrix

Every current route is **already** client-side (fetch shim). The matrix
records, per route family, what it does and where it lives, and confirms no
route carries a server-only responsibility.

| Route family | Purpose | Reads / Writes | Server-only? | Client impl | Migration state |
| ------------ | ------- | --------------- | ------------ | ----------- | --------------- |
| `GET/POST/PUT/DELETE /api/projects[/:id]` | project CRUD | projects store | no | services + router | ✅ client-side |
| `…/chapters`, `…/scenes` (+`:id`) | tree CRUD, ordering, cascade | chapters/scenes + versions | no | services | ✅ |
| `…/characters, locations, objects, world, timeline, notes` | entity CRUD (uniform collection handlers) | 6 stores | no | collection handlers | ✅ |
| `…/relationships` | link CRUD (type, strength, direction) | relationships | no | services | ✅ |
| `…/comments` | comment CRUD per scene | comments | no | services | ✅ |
| `…/goals` | goal upsert/read | goals | no | services | ✅ |
| `…/sessions` | writing-session tracking | sessions | no | use-writing-session → POST | ✅ |
| `…/versions` | list/create versions; auto snapshots | versions | no | services (5-min throttle) | ✅ |
| `…/agent`, `…/agent-tasks[/:id]` | agent plan/task CRUD | agentTasks | no (AI call itself is optional/external) | services + ai client | ✅ |
| `POST /api/ai/chat` | AI chat | none (forwards to user endpoint) | **optional** (remote inference) | ai.ts | ✅ browser client |
| `GET /api/search` | cross-entity search | all stores | no | services | ✅ |
| `POST/GET /api/backup[/:id]`, `PUT/DELETE` | backup create/list/get/restore/delete | backups (in-project) + checksum | no | services + storage | ✅ |
| `POST /api/import/{markdown,json,text,docx}` | import | target stores | no | imports.ts (browser ZIP/deflate) | ✅ |
| `GET /api/export/{markdown,json,docx,epub,html,txt}` | export | all stores → blob | no | exports.ts | ✅ |
| `GET /api` | API index | — | no | router | ✅ |

**Result:** 0 server-only responsibilities; the only external calls are the
optional AI endpoint and the optional GitHub API — both user-initiated.

## 9. Shared domain core (target)

The local-api layer *is* the shared domain core today:

```
src/lib/local-api/   ← domain (services, storage contract, types)
src/lib/github-sync/ ← optional sync service
src/lib/ai/          ← optional AI service
```

Consumed by web (components) and desktop (same bundle). Future consumers
(tests, CLI, a hypothetical server) can import the same modules — the
storage contract (`storage.ts`) is the seam; swap IndexedDB for sqlite/file
in a worker or Node by implementing the same interface. No re-architecture
required now; document the seam (ADR-0006).

## 10. Target architecture

```
            Open Writer shared domain/core (local-api + types)
             │            │             │
     Web (Pages)      Windows (Electron)   Optional services
     local-first IDB   same bundle          GitHub sync ✅
     PWA (later)       tray/installer       remote AI (user-configured)
```

## 11. Migration plan (already executed in earlier phases)

1. ✅ Static export + IndexedDB migration (Phase 4 of project plan)
2. ✅ GitHub sync (optional) — engine + tests + live device flow
3. ✅ Electron desktop + tray
4. Remaining (non-architectural): PWA, cleanup items from Phase 0 audit

## 12. Risks / tradeoffs

| Risk | Mitigation |
| ---- | ---------- |
| IndexedDB hits limits on very large projects | storage seam → SQLite WASM (wa-sqlite IDB VFS, no headers needed) if measured need |
| Browser storage eviction (Safari ITP, low disk) | app is export/backup-first; backups + GitHub sync are the durable copies |
| SQLite WASM on Pages (no COOP/COEP) | avoid SAB path; wa-sqlite IDBBatchAtomic works header-free |
| GitHub sync quota/rate | chunked dedup + batching + manifest-only updates (implemented) |
| AI key in localStorage | by-design browser-local; never committed; local-only mode |
| Multi-tab concurrent writes | single-tab assumption documented; IDB transactions are atomic per write |

## 13. Feature-loss risk

None identified: every former feature is implemented client-side; the only
capabilities that require external services are optional by design
(collaboration, remote AI).

## Sources

- sqlite.org — SQLite Wasm persistence docs (OPFS VFS, "no production
  stability claim" for persistence VFSes)
- PowerSync — *The Current State of SQLite Persistence on the Web* (Nov
  2025 / May 2026 update): wa-sqlite, sql.js, OPFS sync handles, SAB/JSPI/
  Asyncify paths, concurrency limits
- Chrome Developers — *SQLite Wasm in the browser backed by OPFS* (2023)
- GitHub Docs — *Repository limits* (100 MB file limit, 1 GB repo
  recommendation, API contents limit)
- GitHub community/discussions — API 100 MB PUT contents limit (2025)
- PGlite benchmarks — wa-sqlite vs PGlite sizing/performance
