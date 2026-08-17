# Open Writer — Project Status

**Last Updated:** 2026-08-16 (Phase 2 product core)

## Headline status ✅

- **Live:** https://Alot1z.github.io/open-writer/ — HTTP 200
- **CI + Pages:** green on every push (`ci.yml`, `deploy-pages.yml`)
- **Typecheck / lint / build / sync tests:** all green at audit time
  (`tsc --noEmit` 0 errors, `eslint .` clean, static export builds,
  **30/30** sync tests pass)
- **Windows:** NSIS installer + portable EXE built and verified
- **One-click Connect GitHub:** GitHub App "Open Writer Storage"
  (App ID `4612293`, Client ID `Iv23lizL3yc23wougOmX`) registered,
  Device Flow enabled and verified live; client id deployed in the bundle

## Architecture

```
GitHub Pages / Electron (same static bundle)
        ↓
    local-first domain/data layer (src/lib/local-api/, 77 routes)
        ↓
    IndexedDB (all manuscript data, per browser profile)
        ↓
    optional: GitHub sync (src/lib/github-sync/) — private repo backup/sync
    optional: AI (src/lib/local-api/ai.ts) — user-configured endpoint
```

- Static export (`output: "export"`, basePath `/open-writer`, trailingSlash)
- No server, no Prisma, no SQLite, no next-auth, no secrets in the bundle
- Electron desktop loads the identical `out/` bundle over a loopback server

## Verified at Phase 0 audit (code-level evidence)

| Area | Status |
| ---- | ------ |
| Projects / chapters / scenes CRUD + editor + autosave | COMPLETE (browser-verified earlier; code verified) |
| Entity panels: characters (knowledge/appearances), locations (ownership), objects, world, timeline, notes | COMPLETE |
| Relationships (10 spec types), comments (create/edit/resolve/delete), health, analytics, versions, goals, sprints | COMPLETE |
| Continuity engine (evidence-based findings: confidence, evidence, affected) | COMPLETE (browser-verified with real findings) |
| Global search, command palette, docs panel, flow widget | COMPLETE |
| Export (6 formats incl. self-contained EPUB) / Import (incl. DOCX) | COMPLETE (round-trip verified) |
| Backups: checksum + verified restore (replaceStore fix) | COMPLETE |
| Settings: 11 tabs, all wired to runtime effects, live updates | COMPLETE |
| GitHub sync: device flow, auto repo, dedup, conflicts, encryption, offline | COMPLETE (30/30 tests + browser mock flow; Device Flow live) |
| Electron: tray, IPC, hide-to-tray, installer, portable | COMPLETE (EXE verified) |
| GitHub App registration | COMPLETE (live) |

## PARTIAL / UNVERIFIED

| Item | Note |
| ---- | ---- |
| Live AI inference (Z.ai / Ollama) | Code follows verified OpenAI-compatible contract; needs the user's own key/endpoint |
| Real GitHub cross-device sync round-trip | Engine tested vs mock; needs one-time user authorization |

## Phase 2 (product core) — verified in browser

| Item | Evidence |
| ---- | ---- |
| Continuity panel (new) | Real findings rendered: severity, confidence %, evidence, affected IDs; re-run works |
| Character knowledge/appearances | UI fields persist end-to-end (input → debounced PUT → IndexedDB → reload) |
| Location ownership + parent select | Persists via API; select-based parent picker |
| Comments edit + delete | Edit dialog + delete confirm both persist to storage |
| Relationship types | All 10 spec types in the panel's type select |
| Router field whitelist bug (Phase 2) | `COLLECTION_FIELDS` dropped `knowledge`/`appearances`/`ownership` on PUT — fixed and re-verified |

## Phase 3 (GitHub Pages) — verified live

- Live site `https://Alot1z.github.io/open-writer/` HTTP 200; client-id chunk byte-identical to local build (SHA-256 match)
- Fresh-browser session: create project → chapter → scene → write → autosave → reload → prose restored
- Export Markdown, 6 formats, backup (checksum), search, auto-versions, all 11 settings tabs — all pass on the static build
- Report: `docs/release/web-verification.md`

## Phase 4 (PWA + offline + performance) — verified

| Item | Evidence |
| ---- | ---- |
| PWA manifest + icons | `manifest.webmanifest` + 192/512 regular & maskable PNGs + apple-touch-icon; linked with correct basePath |
| Service worker | Build-generated precache (51 entries) of every artifact; scope-relative; build-stamped cache invalidation |
| SW install | Active, controls the page, precache complete (0 missing of 17 index-referenced resources) |
| Offline (server killed) | Launch, create chapter/scene, write, save, search, auto-version, checksummed backup — all pass with zero network; data survives offline reloads and network restore |
| 100k / 250k+ words | 100,541 then 351,561 words: save 5–23 ms, search 11–32 ms, story-index 30–93 ms, exports 19–480 ms, backup 43–133 ms, heap 26–35 MB; cold load 202 ms DOM / 440 ms load |
| Performance engineering | None required — all ops within budget at 3.5× target; heaviest op (DOCX export) 480 ms |
| Reports | `docs/release/offline-verification.md`, `docs/release/performance-report.md` |

## Phase 5 (Windows desktop) — verified on real packaged EXE

| Item | Evidence |
| ---- | ---- |
| Framework decision | Electron retained — loads the byte-identical Pages bundle (parity by construction), tray + IPC already present; no migration |
| Artifacts | NSIS installer + portable + win-unpacked built (custom icon), Windows CI workflow added |
| Runtime (packaged EXE) | Real renderer via CDP: bridge (win32), 18 panels, all 11 settings tabs, project/chapter/scene write, search, backup |
| Persistence fix | **Ephemeral port → persisted port** (`%APPDATA%/open-writer/port.json`); was silently losing all data between launches (7 orphan origins). Verified close→reopen data intact |
| Offline | Local server from bundled out/ — no network for core writing |
| Reports | `docs/release/feature-parity.md`, `docs/release/windows-verification.md` |

## Phase 6 (private GitHub storage) — verified

| Item | Evidence |
| ---- | ---- |
| GitHub App (device flow) | `open-writer-storage` (App ID 4612293) registered, Device Flow enabled; `POST github.com/login/device/code` → HTTP 200 with real device code; client id baked into the live deployed chunk (byte-identical to local build) |
| Zero-config UX | Settings → Storage → Connect GitHub → authorize → Synced; no PAT, no repo setup, no Git terms in default UI (Advanced diagnostics only) |
| Automatic private repo | Marker-protected (`open-writer-storage-v1`), create-or-discover, never attaches to unrelated repos |
| Sync engine | Debounce → compress → content-addressed 48 KB chunks → dedup → upload → verify; background, never blocks the editor |
| User states | All spec states: Local only · Syncing… · Synced · Offline · Sync paused · Needs attention · Conflict · Storage full · Unavailable — each with plain-language what/means/doing/can-do |
| Conflicts | Keep this version / Keep other / Save both — nothing deleted until the user chooses; verified all 3 resolutions |
| Recovery | Missing chunk, checksum mismatch, interrupted upload, offline, corrupt store — all handled without touching local data |
| E2E suite | `bun scripts/test-sync.ts` → **30 passed, 0 failed** (device flow, repo creation, dedup, delta, cross-device, conflicts, encryption, offline, disconnect) |
| Web + Windows | Same engine over the shared DataProvider; Electron on stable origin (port persistence from Phase 5) |
| Docs | `docs/architecture/github-storage.md`, `docs/release/github-storage-verification.md`, `docs/sync-github.md` (App registration record) |

## Phase 7 (Local AI + Ollama + Tiny AI + Agent) — verified

| Item | Evidence |
| ---- | ---- |
| Providers | none / Z.ai / **Ollama (Local)** / custom (OpenAI-compatible — LM Studio, OpenAI, etc.) share one client; base URLs with or without `/v1` both resolve |
| Ollama detection | `detectAI` probes `/api/tags` + `/v1/models` across candidate roots; Settings → AI → **Detect models** → "Local AI detected — Ollama · 2 models …" (verified live against a mock; regression test for `/v1`-suffixed base) |
| Chat + streaming | `POST /api/ai/chat` and `/api/ai/stream` (SSE) verified end-to-end through the app's router |
| Tiny AI (model-free) | `tiny-ai.ts`: classify, tags, metadata, entity match, duplicates, proofread, continuity, rerank, summarize — all deterministic; 6 tools live in the agent panel; `/api/ai/tiny/analyze` (200 for all 6 kinds) |
| Agent executor | Real plan → tool-runner (13 deterministic tools over the user's data), permission gating (read-only/suggest block writes), retry, cancellation, artifacts, action log; UI run rendered Plan (4 steps) + Tool Calls (6) + Observations + agent-report + Result |
| Cascade | deterministic → tiny AI → LLM compose; empty compose falls back to deterministic report (never blank) |
| Context scopes | 7 scopes: current scene, current chapter, project summary, related entities, timeline, full project, custom (with custom-context textarea) |
| Privacy | local-only mode blocks remote providers; keys browser-only; privacy bar shows "Data sent to Z.ai / your custom AI endpoint"; transmission info toggle |
| Bugs fixed | fetch shim hijacked external `/api/*` URLs (broke Ollama detection + Z.ai chat) → same-origin only; detectAI `/v1` double-suffix; empty agent result when AI unconfigured; provider badge mislabeled "Z.ai" |
| Tests | `bun scripts/test-ai.ts` → **55 passed, 0 failed**; sync suite re-run **30/30**; tsc + eslint clean |
| Docs | `docs/architecture/ai.md`, `docs/release/ai-verification.md` |

## Phase 8 (visual design rebuild — Ink & Paper) — verified

| Item | Evidence |
| ---- | ---- |
| Design contract | `DESIGN.md` — brand, color, typography, spacing, hierarchy, components, motion, a11y, anti-patterns; inspired by DesignMD catalog + Linear's contract structure; Novlr as product/UX reference |
| Brand accent | Amber → **indigo** (one restrained chromatic accent); entire `amber-*` utility scale remapped to indigo at theme level (137 refs, 35 files converted in one stroke) |
| Palettes | Light `#faf7f2` warm paper / ink `#23201b`; dark `#15161b` cool ink / `#e9e7e1`; hairline borders; charts indigo/teal/violet/orange |
| Warnings | Re-pointed to **orange** (storage conflict/full, health + continuity severities, unsaved state) so semantics survive the remap |
| Typography | Serif display (Georgia/Source Serif 4) for wordmark, project names, dialog titles, editor headings; editor prose at 1.85 line-height |
| Accent options | Indigo (default) first, Amber last; `--writer-accent` applied at runtime by ThemeSync |
| QA | Computed-style verification in real browser (light + dark): tokens landed, `bg-amber-500` → `rgb(99,102,241)` indigo, serif applied, editor 1.85; tsc + eslint clean |
| Docs | `DESIGN.md`, `docs/design/design-research.md`, `docs/release/design-verification.md` |

## Phase 9 (hardening + adversarial QA) — verified

| Item | Evidence |
| ---- | ---- |
| Security | No secrets in repo/bundle/history; `.env.production` holds only the public client id; machine-path doc removed; `next-intl` (unused, 2 advisories) removed; token scan clean; import sanitizer added; SSRF: fetch shim is same-origin only (Phase 7 fix, regression-tested) |
| Performance | Re-benchmarked at 100k/250k: snapshot build ≤101 ms, incremental sync 5–14 ms with 0–1 new chunks, compression 92–97%; tiny-AI all <10 ms (see `performance-report.md` supplement) |
| Accessibility | All icon-only buttons labeled (rail, top bar, goals, relationships, flow widget); `prefers-reduced-motion` global guard added (WCAG 2.3.3); dialogs/focus/semantics audited |
| Recovery | **21/21 checks** (`scripts/test-recovery.ts`); fixed real silent-failure: exports crashed on corrupt project data → `sanitizeBook()` defense-in-depth; verified missing-chunk / checksum / tampered-backup / failed-write paths |
| Docs | `security-report.md`, `accessibility-report.md`, `recovery-report.md`, `performance-report.md` (supplemented) |

## MISSING / open gaps (non-blocking)

- Mobile/tablet responsive audit; automated axe/pa11y + screen-reader audit (Phase 9 a11y was code + live-DOM inspection)
- Import preview dialog
- PWA installation-prompt drive test (manifest/SW criteria verified; prompt not exercised in this environment)
- Windows executables unsigned (SmartScreen warning expected; no cert in this environment)
- `.github/workflows/windows.yml` written + locally validated but not pushed (token lacks `workflow` scope)

## Cleanup items (from audit)

- Dead code: `src/lib/ai/zai-provider.ts`, `no-provider.ts` (nothing imports them; stale "server-side" comment)
- Legacy: `.zscripts/` and `tests/` scripts referencing removed subsystems
  (database-runtime / python-runtime / mini-services)
- Empty dirs: `examples/`, `mini-services/`
- Stale doc: `docs/status/current-audit.md` (2025, pre-migration; superseded by `docs/research/phase-0-audit.md`)

## Recent commits

```
314e5bb build: commit NEXT_PUBLIC_SYNC_CLIENT_ID so CI ships one-click Connect
2a61297 feat: register the Open Writer GitHub App — one-click Connect GitHub
b80b930 docs: record tray indicator work in worklog
49d152c feat: native tray indicator + Sync now / Open storage menu (Electron)
0731125 feat: private GitHub storage — zero-config cloud sync for projects
a5ad252 feat: add Electron Windows desktop app; fix replace-store wipe bug
424181b fix: wire six dead/misleading code paths found in line-by-line audit
5a81f05 feat: wire all settings tabs to real runtime behavior
ebcad4e fix: commit the local-api layer that .gitignore was silently excluding
9bf855e feat: migrate Open Writer to local-first static app for GitHub Pages
```

## History note

`refs/heads/experiment/zustand-localstore` preserves a parallel session's
Zustand/localStorage data-store approach (its typecheck failed and export
path was broken); `main` carries the verified local-api architecture.
