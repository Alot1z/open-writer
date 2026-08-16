# Open Writer — Feature Matrix (Web + Windows)

**Updated:** 2026-08-16 (Phase 2)
**Legend:** COMPLETE · PARTIAL · MISSING · BROKEN · EMPTY · PLACEHOLDER · UNVERIFIED · BLOCKED

The **web** and **Windows desktop** builds share one codebase: the desktop
app loads the exact static `out/` bundle that ships to GitHub Pages, so
feature status is identical unless noted. Differences are only in the shell
(tray, native window, installers).

## Core writing

| Feature | Web | Windows | Shared core | Persistence | Test | Gaps |
| ------- | --- | ------- | ----------- | ----------- | ---- | ---- |
| Projects (create/list/open/delete) | COMPLETE | COMPLETE | writer-store + local-api | IndexedDB | browser ✓ | — |
| Cloud restore ("From the cloud") | COMPLETE | COMPLETE | github-sync | remote repo | mock suite ✓ | real-account round-trip UNVERIFIED |
| Chapters / Scenes CRUD | COMPLETE | COMPLETE | services.ts | IndexedDB | browser ✓ | — |
| Rich text editor (TipTap) | COMPLETE | COMPLETE | rich-text-editor | IndexedDB | browser ✓ | — |
| Autosave (1.5 s debounce) | COMPLETE | COMPLETE | editor-area | IndexedDB | browser ✓ | — |
| Auto-versioning (5-min throttle) | COMPLETE | COMPLETE | services.ts | versions store | browser ✓ | — |
| Focus / typewriter / word counts | COMPLETE | COMPLETE | page.tsx + editor | settings | browser ✓ | — |

## Story intelligence

| Feature | Web | Windows | Shared core | Persistence | Test | Gaps |
| ------- | --- | ------- | ----------- | ----------- | ---- | ---- |
| Characters (incl. knowledge/appearances) | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Locations (incl. ownership, parent select) | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Objects | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| World-building | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Timeline (cause/consequence) | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Notes | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Relationships (10 spec types + strength/delete) | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Comments (create/edit/resolve/delete) | COMPLETE | COMPLETE | local-api | IndexedDB | browser ✓ | — |
| Continuity engine (evidence-based findings) | COMPLETE | COMPLETE | continuity.ts | computed | browser ✓ | — |
| Project health (dangling refs, contradictions) | COMPLETE | COMPLETE | health-panel | computed | browser ✓ | — |
| Global search (opens entity) | COMPLETE | COMPLETE | global-search | computed | browser ✓ | — |

## Productivity

| Feature | Web | Windows | Shared core | Persistence | Test | Gaps |
| ------- | --- | ------- | ----------- | ----------- | ---- | ---- |
| Analytics (sessions, streak, words) | COMPLETE | COMPLETE | analytics-panel | sessions store | browser ✓ | — |
| Versions (milestones + restore) | COMPLETE | COMPLETE | versions-panel | versions store | browser ✓ | — |
| Goals | COMPLETE | COMPLETE | goals-panel | IndexedDB | browser ✓ | — |
| Sprints (timer, WPM, targets) | COMPLETE | COMPLETE | sprint-panel | IndexedDB | browser ✓ | — |
| Writing sessions (flow widget) | COMPLETE | COMPLETE | use-writing-session | sessions store | browser ✓ | — |
| Command palette | COMPLETE | COMPLETE | command-palette | — | browser ✓ | — |
| Docs panel (built-in help) | COMPLETE | COMPLETE | docs-panel | static | browser ✓ | — |

## Data portability

| Feature | Web | Windows | Shared core | Persistence | Test | Gaps |
| ------- | --- | ------- | ----------- | ----------- | ---- | ---- |
| Export Markdown | COMPLETE | COMPLETE | exports.ts | download | browser ✓ | — |
| Export JSON (archive) | COMPLETE | COMPLETE | exports.ts | download | browser ✓ | — |
| Export DOCX | COMPLETE | COMPLETE | exports.ts | download | browser ✓ | — |
| Export EPUB | COMPLETE | COMPLETE | exports.ts (self-contained writer) | download | browser ✓ | — |
| Export HTML / TXT | COMPLETE | COMPLETE | exports.ts | download | browser ✓ | — |
| Import Markdown / JSON / TXT | COMPLETE | COMPLETE | imports.ts | IndexedDB | browser ✓ | — |
| Import DOCX (browser ZIP/deflate) | COMPLETE | COMPLETE | imports.ts | IndexedDB | round-trip ✓ | — |
| Backup (create/list/get/delete) | COMPLETE | COMPLETE | services.ts | IndexedDB | browser ✓ | — |
| Backup restore (verified wipe) | COMPLETE | COMPLETE | services.ts + replaceStore | IndexedDB | browser ✓ | — |
| Backup download | COMPLETE | COMPLETE | backup-panel | blob | browser ✓ | — |
| Import preview dialog | MISSING | MISSING | — | — | — | low-priority gap |

## Settings (11 tabs)

| Tab | Web | Windows | Runtime effect | Gaps |
| --- | --- | ------- | -------------- | ---- |
| Editor (font, size, line-height, width, spacing) | COMPLETE | COMPLETE | editor + page layout | — |
| Writing (status, autosave interval, version retention) | COMPLETE | COMPLETE | services + chapter-tree | — |
| Goals (daily goal, deadline) | COMPLETE | COMPLETE | goals-panel | — |
| Appearance (theme, accent, focus default) | COMPLETE | COMPLETE | theme-sync + page | — |
| AI (provider, model, temp, base URL, key, scope, permission) | COMPLETE | COMPLETE | ai.ts + agent-panel | live calls UNVERIFIED |
| Privacy (transmission, local-only) | COMPLETE | COMPLETE | enforced in ai.ts | — |
| Shortcuts | COMPLETE | COMPLETE | command palette | — |
| Export | COMPLETE | COMPLETE | export panel | — |
| Import | COMPLETE | COMPLETE | import panel | — |
| Storage (GitHub sync) | COMPLETE | COMPLETE | github-sync engine | — |
| Backup | COMPLETE | COMPLETE | backup panel | — |

## AI + Agent

| Feature | Web | Windows | Shared core | Test | Gaps |
| ------- | --- | ------- | ----------- | ---- | ---- |
| Provider abstraction + deterministic fallback | COMPLETE | COMPLETE | local-api/ai.ts | unit ✓ | — |
| AI chat (OpenAI-compatible endpoint) | COMPLETE | COMPLETE | chatWithAI | contract ✓ | live key needed |
| Ollama support (local) | COMPLETE (config) | COMPLETE | chatWithAI | — | needs running Ollama |
| Z.ai support | COMPLETE (config) | COMPLETE | chatWithAI | — | needs credentials |
| Agent panel + task view | COMPLETE | COMPLETE | agent-panel + router | UI ✓ | live AI UNVERIFIED |
| Local-only mode enforcement | COMPLETE | COMPLETE | ai.ts | — | — |

## Cloud sync (GitHub)

| Feature | Web | Windows | Shared core | Test | Gaps |
| ------- | --- | ------- | ----------- | ---- | ---- |
| Device-flow one-click connect | COMPLETE | COMPLETE | auth.ts | mock ✓ + live endpoint ✓ | first real authorization is a one-time user step |
| Automatic private repo creation | COMPLETE | COMPLETE | repo.ts | mock ✓ | — |
| Chunked dedup sync | COMPLETE | COMPLETE | snapshot/chunk-index | mock ✓ | — |
| Cross-device restore | COMPLETE | COMPLETE | engine.ts | mock ✓ | real-account UNVERIFIED |
| Conflicts (keep/merge/save-both) | COMPLETE | COMPLETE | engine.ts | mock ✓ | — |
| Encryption (AES-256-GCM) | COMPLETE | COMPLETE | crypto.ts | mock ✓ | — |
| Offline-first + auto-sync | COMPLETE | COMPLETE | engine.ts | mock ✓ | — |
| Tray sync integration (Windows) | — (n/a) | COMPLETE | electron IPC | EXE ✓ | — |

## Platform shell

| Feature | Web | Windows | Test | Gaps |
| ------- | --- | ------- | ---- | ---- |
| Static export (Pages) | COMPLETE | — | build ✓ + live 200 | — |
| Deep links / refresh / 404 | COMPLETE | COMPLETE | earlier browser matrix ✓ | — |
| Electron window + loopback server | — | COMPLETE | EXE ✓ | — |
| Tray icon + menu | — | COMPLETE | EXE ✓ (visual icon needs human eyeball) | — |
| Hide-to-tray / second-instance show | — | COMPLETE | EXE ✓ | — |
| NSIS installer / portable | — | COMPLETE | silent install ✓ | — |
| PWA installability | MISSING | — | — | Medium gap |
| Offline web (no server) | COMPLETE | COMPLETE | static + IndexedDB | — |

## Verification status summary

- ✅ Green at audit time: typecheck, lint, static build, 30/30 sync tests,
  live Pages 200, deployed client id confirmed.
- 🔵 UNVERIFIED (credentials/runtime required): live Z.ai/Ollama inference;
  real GitHub-account sync round-trip.
- ⚪ Cleanup items: dead AI provider files, legacy `.zscripts/` and `tests/`
  scripts, empty `examples/` + `mini-services/`, stale `current-audit.md`.
