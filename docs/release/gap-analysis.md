# Gap Analysis — Local-First Migration Release (2026-08-16)

## Closed by this release

| Gap | Resolution |
| --- | ---------- |
| GitHub Pages deploy was broken (uploaded `.next/static` of a standalone build) | `output: "export"` → deploy `out/` with basePath `/open-writer`; workflow validates artifact |
| All 41 API routes required a server | `src/lib/local-api/` serves the same contracts from IndexedDB |
| `typescript.ignoreBuildErrors = true` hid real errors | 20+ real type errors fixed; `tsc --noEmit` clean |
| Prisma/SQLite/next-auth/z-ai-sdk Node-only deps | Removed; browser equivalents implemented |
| EPUB depended on Node-only `epub-gen-memory` | Self-contained ZIP writer; validated with `unzip` |
| AI panel's provider always threw (server-only SDK) | Browser OpenAI-compatible client; user-configured endpoint/key |
| Analytics panel type errors (`never[]`) | Fixed; sessions/streak now computed from real IndexedDB data |
| Repo clutter | Removed stale `dev.pid`, debug screenshot, pasted prompt file; `.env` untracked |
| README/doc claims didn't match implementation (Prisma, PDF export, wrong repo URL) | Rewritten to match reality |

## Open gaps

| # | Gap | Severity | Notes |
| - | --- | -------- | ----- |
| 1 | AI live verification (Z.ai/Ollama) | Low | Requires user credentials by design; code path follows the verified OpenAI-compatible contract |
| 2 | Comments panel UI e2e | Low | API verified; UI flow untested |
| 3 | PWA manifest/service worker | Medium | App is already offline-capable; installability not yet added |
| 4 | Large-project performance | Medium | Not benchmarked beyond realistic single-project use |
| 5 | Mobile/tablet responsive audit | Medium | Desktop verified |
| 6 | Accessibility audit | Medium | Keyboard paths exist; screen-reader audit pending |
| 7 | Import preview dialog | Low | Importer works; no pre-import summary shown |
| 8 | Windows desktop (Tauri) | High (scope) | Not attempted in this migration; documented in PROJECT-PLAN |
| 9 | Sync/collaboration | High (scope) | Requires optional external service by design |
| 10 | Continuity engine | Medium | Project health exists; contradiction detection not built |

## Definition-of-done verdict

The non-negotiable requirement — **the GitHub Pages version is the real
application** — is met and verified: the live static site creates
projects, chapters, scenes, edits and autosaves prose, survives reloads,
searches, exports six formats, and creates/restores backups, entirely in
the browser, with zero console errors. Remaining gaps are enhancements,
not blockers.
