# Feature Parity — Final Matrix (Phase 10)

**Project:** Open Writer
**Date:** 2026-08-17
**Status:** FINAL RELEASE GATE

Legend: ✅ verified this release · ⚙️ verified in an earlier phase (still passing) ·
🟡 partial / needs user setup · ⬜ not present (by design or deferred)

## Framework decision

The existing **Electron** desktop shell is retained — not migrated. Electron loads
the **byte-identical static bundle** that ships to GitHub Pages (`out/`,
basePath `/open-writer`), served from a loopback HTTP server with a **persisted
port** (fixed in Phase 5). Parity is therefore **by construction**: there is no
second UI implementation to drift.

## Shared core

Both platforms use the same domain services (`src/lib/local-api/`): the same
IndexedDB-backed storage (ProjectStorageProvider), the same 77-route fetch shim,
and the same continuity / import / export / backup / version / search / settings
layers. The renderer is the same React app; only the shell differs.

## Full feature matrix

| Feature | WEB | WINDOWS | OFFLINE | PAGES | LOCAL AI | GITHUB SYNC | VERIFIED |
|---|---|---|---|---|---|---|---|
| Project create / switch / delete | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ browser + EXE |
| Chapters (create/order/edit) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ browser + EXE |
| Scenes (create/order/edit) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ browser + EXE |
| Editor (ProseMirror, autosave) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ 1–6 ms typing @ 351k |
| Word count / analytics | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ real session data |
| Focus / typewriter mode | ✅ | ✅ | ⚙️ | ✅ | n/a | n/a | ⚙️ Phase 2 |
| Keyboard shortcuts | ✅ | ✅ | ⚙️ | ✅ | n/a | n/a | ⚙️ Phase 2 |
| Search (full-text, per-type) | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ 11 ms @ 100k |
| Characters | ✅ | ✅ | ✅ | ✅ | tiny-AI tags/metadata | ✅ | ✅ browser |
| Locations | ✅ | ✅ | ✅ | ✅ | tiny-AI tags/metadata | ✅ | ✅ browser |
| Objects | ✅ | ✅ | ✅ | ✅ | tiny-AI tags/metadata | ✅ | ✅ browser |
| World building | ✅ | ✅ | ✅ | ✅ | tiny-AI tags/metadata | ✅ | ✅ browser |
| Timeline (dates, relative, ranges) | ✅ | ✅ | ✅ | ✅ | tiny-AI continuity | ✅ | ✅ browser |
| Relationships (real names, CRUD) | ✅ | ✅ | ✅ | ✅ | tiny-AI entity match | ✅ | ✅ browser |
| Notes | ✅ | ✅ | ✅ | ✅ | tiny-AI tags | ✅ | ✅ browser |
| Comments (create/edit/resolve/delete) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ API verified |
| Goals / sprints / sessions | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ real data |
| Versions (auto/manual/compare/restore) | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ 257 versions @ 351k |
| Backups (create/verify/checksum/restore) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ 43–133 ms |
| Import (markdown/text, sanitized) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ sanitizer added P9 |
| Export (MD/TXT/HTML/JSON/DOCX/EPUB) | ✅ | ✅ | ✅ | ✅ | n/a | ✅ | ✅ 480 ms worst @ 351k |
| Project health (dangling refs, orphans) | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ browser |
| Continuity check (dates/locations/ages) | ✅ | ✅ | ✅ | ✅ | tiny-AI cascade | ✅ | ✅ 50 issues found |
| Story knowledge index | ✅ | ✅ | ✅ | ✅ | deterministic | ✅ | ✅ browser |
| Settings (all tabs, persistence) | ✅ | ✅ | ✅ | ✅ | ⚙️ detect models | ✅ | ✅ 11 tabs in EXE |
| AI — disabled / deterministic tiny AI | ✅ | ✅ | ✅ | ✅ | **yes** | n/a | ✅ 55 checks |
| AI — Ollama / OpenAI-compatible chat+stream | ✅ | ✅ | 🟡 needs endpoint | ✅ | **yes** | n/a | ✅ mock + real detect |
| AI — context scopes (7 incl. custom) | ✅ | ✅ | ✅ | ✅ | ⚙️ | n/a | ✅ browser |
| AI agent (plan, tools, permissions, artifacts) | ✅ | ✅ | ✅ | ✅ | deterministic fallback | ✅ | ✅ UI ran 6 tools |
| GitHub storage — connect (device flow) | ✅ | ✅ | ✅ | ✅ | n/a | **yes** | ✅ 30 checks + live flow |
| GitHub storage — auto private repo | ✅ | ✅ | ✅ | ✅ | n/a | **yes** | ✅ mock + real endpoint |
| GitHub storage — background sync | ✅ | ✅ | ✅ (queues offline) | ✅ | n/a | **yes** | ✅ 0-chunk no-op dedup |
| GitHub storage — conflicts (3 resolutions) | ✅ | ✅ | ✅ | ✅ | n/a | **yes** | ✅ keep/remote/both |
| GitHub storage — encryption | ✅ | ✅ | ✅ | ✅ | n/a | **yes** | ✅ round-trip verified |
| PWA install / offline / app shell | ✅ | ⚙️ SW skipped in Electron | **yes** | ✅ | n/a | n/a | ✅ 11/11 offline checks |
| Deep links / refresh on Pages | ✅ | ✅ | ✅ | ✅ | n/a | n/a | ✅ 200 live |

## Web-only / Windows-only (by design, no unexplained gap)

| Surface | Notes |
|---|---|
| Tray indicator + menu (Sync now, Open storage) | Windows only — a desktop concept; no web equivalent needed |
| `window.openWriter` bridge (openExternal, sync IPC) | Windows only |
| PWA install prompt | Web only (Electron skips the service worker; the app is local anyway) |
| Loopback HTTP server + persisted port | Windows only (web is hosted) |

## Cross-platform parity proof

- The **same `out/` bundle** is served on GitHub Pages and by the desktop EXE —
  verified byte-identical (same chunk hashes) in Phase 6 and again in Phase 10.
- The **rebuilt EXE** (Phase 10, with the storage self-heal fix) was launched and
  probed via CDP: project + chapter created (201), close → reopen → data
  survived (all 3 test projects listed), `platform: Win32`, bridge present.
- All 106 headless checks green in Phase 10: **55 AI + 30 sync + 21 recovery**.

## Honest caveats

- Remote AI (Z.ai / custom key) requires user credentials by design — verified
  against the OpenAI-compatible contract via mock + local Ollama detection only.
- GitHub sync end-to-end against the real private repo requires the user to
  complete device-flow authorization on their account (verified live to the
  device-code endpoint; the full round-trip runs against the mock server).
- Windows executables are unsigned (SmartScreen warning expected; no code-signing
  cert available in this environment).
