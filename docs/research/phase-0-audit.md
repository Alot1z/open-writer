# Open Writer — Phase 0 Forensic Audit

**Date:** 2026-08-16
**Auditor:** Autonomous engineering agent (Freebuff)
**Method:** Direct inspection of every source file, config, workflow, and
artifact — no previous AI report was trusted without code-level evidence.

---

## 1. Scope and method

- Repository: `E:\E-github-repos\open-writer` (branch `main`)
- Remote: `https://github.com/Alot1z/open-writer` (public)
- Working tree at audit start: **clean**
- Everything below was verified by reading code and/or executing it
  (`tsc --noEmit`, `eslint .`, `next build`, `scripts/test-sync.ts`,
  live `curl` against the deployed Pages site).

## 2. Repository baseline

| Item | Value |
| ---- | ----- |
| Last commits | `314e5bb` (env for CI), `2a61297` (GitHub App registration), `b80b930`/`49d152c` (tray), `0731125` (GitHub sync) |
| Branch | `main` (up to date with `origin/main`); `experiment/zustand-localstore` preserved as a remote branch |
| Source size | 69 source files, ≈19,900 lines (src/ + electron/) |
| Package manager | Bun (`bun.lock`); Node v26.5.0, Bun 1.3.14 |
| Framework | Next.js 16 (App Router), **static export** (`output: "export"`) |
| Data layer | IndexedDB via `src/lib/local-api/` (fetch shim, **77 routes**) |
| Cloud sync | `src/lib/github-sync/` (device-flow OAuth, content-addressed chunks) |
| Desktop | Electron wrapper (`electron/main.js` + `preload.js`) |
| CI/CD | `.github/workflows/ci.yml` (lint+typecheck+build) and `deploy-pages.yml` (build+validate+deploy `out/`) |

## 3. What is real (verified, not claimed)

### 3.1 Build toolchain — VERIFIED GREEN at audit time

| Check | Result |
| ----- | ------ |
| `bunx tsc --noEmit` | ✅ exit 0, zero errors (strict mode) |
| `bun run lint` (eslint 9) | ✅ zero warnings/errors |
| `next build` (static export) | ✅ `out/` produced; basePath-aware assets |
| `scripts/test-sync.ts` (vs mock GitHub) | ✅ **30 passed, 0 failed** |
| Live site `https://Alot1z.github.io/open-writer/` | ✅ HTTP 200 |
| Windows artifacts | ✅ `dist/Open-Writer-Setup-1.0.0-x64.exe`, `Open-Writer-Portable-1.0.0-x64.exe` (verified launching earlier) |

### 3.2 Local-first data layer (`src/lib/local-api/`, 4,700+ lines)

- `storage.ts` — IndexedDB wrapper with typed stores, transactions,
  `replaceStore` primitive (fixes wipe/cascade bugs), resilient `count()`.
- `router.ts` — **77 REST-style routes** served through a fetch shim with the
  same contracts the former server API had. Includes `/api/search`,
  `/api/backup*`, `/api/import/*` (markdown/json/text/docx),
  `/api/export/*` (markdown/json/docx/epub/html/txt), `/api/agent*`,
  `/api/ai/chat`, `/api/sessions`, `/api/versions`.
- `services.ts` — domain services; **auto-versioning throttled to 1 per
  5 minutes per scene**; cascade deletes via `replaceStore`; backups with
  SHA-256 checksums + verified restore.
- `imports.ts` — real browser ZIP/deflate parser for DOCX (round-trip
  verified: DOCX export → re-import).
- `exports.ts` — 6 formats incl. self-contained EPUB writer (validated).

### 3.3 Panels — all 18 sidebar panels + supporting UI

Every panel was inspected for real state/fetch/create/edit/persist logic.
No empty or placeholder panels were found.

| Panel | Status | Evidence |
| ----- | ------ | -------- |
| Chapters/Scenes | COMPLETE | CRUD, context menus, auto-order, word counts |
| Editor | COMPLETE | TipTap 3, 15+ extensions, word count, autosave (1.5 s debounce) |
| Characters / Locations / Objects / World / Timeline / Notes | COMPLETE | CRUD + detail views, search/filter, tags |
| Relationships | COMPLETE | real names (fixed `Entity <id>` bug), delete, strength |
| Comments | COMPLETE* | full API + UI; *not re-tested e2e in this audit |
| Analytics | COMPLETE | sessions fetched from `/api/sessions`, words, streak, goals |
| Versions | COMPLETE | auto snapshots (5-min throttle), milestones, restore |
| Goals / Sprints | COMPLETE | goals CRUD; sprint timer, WPM, target tracking |
| Health | COMPLETE | real checks incl. **computed** dangling refs + timeline contradictions |
| Export / Import / Backup | COMPLETE | see 3.2 |
| AI Agent | PARTIAL | full UI + deterministic fallback; live AI needs user credentials |
| Docs | COMPLETE | built-in help (7 sections) |
| Search | COMPLETE | global cross-entity; opens the actual entity (fixed) |
| Command palette | COMPLETE | opens correct tabs/panels (fixed no-op commands) |
| Settings | COMPLETE | 11 tabs, all wired to runtime (see 3.4) |
| Flow widget | COMPLETE | session recording fixed (word deltas, streak) |

### 3.4 Settings — every tab has UI, state, storage, and a runtime effect

Storage: `localStorage` under `openwriter-*` keys via `src/lib/settings.ts`
(typed loaders + `subscribeSettings` change events). `handleSave` persists
all groups and fires `notifySettingsChanged()`; consumers re-read live:

- **Editor** (font family/size, line height, max width, spacing) → consumed by `rich-text-editor.tsx`, `editor-area.tsx`, `page.tsx`
- **Writing** (default status, autosave interval, version retention) → consumed by `services.ts`, `chapter-tree.tsx`
- **Goals** (daily word goal, deadline) → consumed by `goals-panel.tsx`
- **Appearance** (theme, accent, focus-mode default) → consumed by `theme-sync.tsx`, `page.tsx`
- **AI** (provider, model, temperature, base URL, key, context scope, permission) → consumed by `ai.ts`, `use-ai-assistant.ts`, `agent-panel.tsx`
- **Privacy** (show transmission, local-only mode) → enforced in `ai.ts` (blocks remote providers in local-only mode)
- **Shortcuts / Export / Import / Storage / Backup** → wiring to their respective panels

### 3.5 GitHub sync (`src/lib/github-sync/`, ~2,300 lines)

- Device-flow OAuth (no secret in frontend), PAT one-time-token fallback,
  automatic private `open-writer-storage` repo creation/discovery.
- gzip + SHA-256 content-addressed chunks, dedup, delta uploads, verified
  restore, optional AES-256-GCM, exponential backoff, conflict handling
  (keep-local / keep-remote / save-both), cross-device restore ("From the cloud").
- **30/30 headless tests passed at audit time**; browser connect flow verified
  earlier against the mock; Device Flow **verified live** against
  `github.com/login/device/code` (HTTP 200) with the registered app.

### 3.6 GitHub App — registered and live

| | |
|---|---|
| App | **Open Writer Storage** (slug `open-writer-storage`) |
| App ID | `4612293` |
| Client ID | `Iv23lizL3yc23wougOmX` |
| Device Flow | **Enabled, verified live** |
| Deployed | client id confirmed inside live chunk `e3c4ac89c3c1946d.js` |

### 3.7 Electron desktop

- Loads the same static `out/` build via an embedded loopback HTTP server
  (identical behavior to Pages, works offline, IndexedDB per-user).
- Tray icon + menu (Show / Sync now / Open storage on GitHub / Quit),
  sandbox-safe preload bridge, hide-to-tray, second-instance re-show.
- All three artifacts built; installer verified via silent `/S` install.

## 4. Findings — issues, dead code, leftovers

| # | Finding | Severity | Evidence / Recommendation |
| - | ------- | -------- | ------------------------- |
| 1 | `src/lib/ai/zai-provider.ts` and `no-provider.ts` are **dead code** with a stale "server-side only" comment | Low | Nothing imports the `ZAIProvider`/`NoProvider` classes; real path is `local-api/ai.ts` → `chatWithAI`. Either delete or update the comment. |
| 2 | `.zscripts/` contains **legacy scripts** referencing removed subsystems (`database-runtime-build.sh`, `python-runtime-build.sh`, `mini-services-*`) | Low | Dead scripts; remove or archive. |
| 3 | `tests/` contains **legacy shell tests** for removed subsystems (`database-runtime-build.sh`, `python-runtime-build.sh`, `python-runtime-container.sh`) | Low | Dead tests; the real test is `scripts/test-sync.ts`. |
| 4 | `examples/` and `mini-services/` are **empty directories** | Low | Remove or populate. |
| 5 | `docs/status/current-audit.md` is **stale** (2025-08-13, pre-migration server architecture) | Low | Superseded by this audit; keep as history or archive. |
| 6 | `agent-ctx/` holds context docs from the original build (API route specs, panel specs) | Info | Historical reference only; not referenced by the app. |
| 7 | Comments panel e2e UI flow not re-verified in this audit (API + UI code present) | Low | Re-test in browser to confirm. |
| 8 | AI live calls unverifiable without user credentials (Z.ai key / Ollama endpoint) | By design | Deterministic fallbacks verified; OpenAI-compatible contract. |
| 9 | PWA manifest/service worker not present | Medium | App is offline-capable via static export; installability not yet added. |
| 10 | Mobile/tablet responsive + accessibility audits pending | Medium | Desktop verified. |

## 5. Feature classification (per the requested taxonomy)

**IMPLEMENTED (verified):** projects/chapters/scenes CRUD; rich-text editor +
autosave; all 8 entity panels (characters, locations, objects, world,
timeline, notes, relationships, comments); analytics; versions (auto +
milestone + restore); goals; sprints; health; global search; command
palette; export (6 formats); import (4 formats incl. DOCX); backup
(checksum + restore); 11-tab settings; storage/GitHub sync; flow widget;
docs; Electron desktop + tray; GitHub App registration.

**PARTIAL:** AI agent (complete UI + deterministic fallback; live inference
requires the user's own credentials); comments e2e re-verification.

**MISSING:** PWA installability; mobile responsive audit; accessibility
audit; import preview dialog (documented as a low-priority gap).

**BROKEN:** none found in the audited paths.

**EMPTY/PLACEHOLDER:** none found — zero-empty-surface sweep found no
empty tabs, no "coming soon", no no-op buttons, no fake metrics.

**UNVERIFIED (needs credentials/runtime):** live Z.ai/Ollama inference;
real cross-device sync round-trip with an actual GitHub account (engine
verified against the mock; Device Flow verified against real GitHub).

**BLOCKED/DEFERRED:** sync conflicts with external collaborators (single
writer assumed); server-required features are out of scope by design.

## 6. Conclusion

The repository is in a **genuinely functional, verified state**: typecheck,
lint, static build, 30/30 sync tests, live Pages site, and Windows EXEs all
pass. The claimed prior fixes (settings wiring, analytics fetch, versions
auto-creation, agent prop mismatch, command-palette no-ops, health dangling
refs, search open, DOCX import, replace-store wipe bug) were each confirmed
in the actual code. Remaining work is low-severity cleanup (dead files,
legacy scripts/tests) plus by-design gaps (live AI credentials, PWA,
responsive/accessibility audits).
