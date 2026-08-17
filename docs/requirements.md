# Open Writer — Requirements Baseline

**Derived from:** the implemented, verified product (Phase 0 audit, 2026-08-16).
Requirements are written as acceptance statements; each maps to a verified
implementation or an explicit open gap.

## 1. Platform

- R1.1 The application is a **static web app** deployable to GitHub Pages
  (no server, no database server, no build-time API calls). ✅ `output: "export"`, live at `/open-writer/`.
- R1.2 The application works **fully offline** once loaded (local persistence). ✅ IndexedDB + static export.
- R1.3 The application runs as a **Windows desktop app** with an installer
  and a portable EXE, using the same codebase. ✅ Electron (NSIS + portable).
- R1.4 Deep links, refresh, and unknown routes resolve correctly on Pages. ✅ 404.html + trailingSlash.

## 2. Local-first data

- R2.1 All manuscript data persists in the browser (IndexedDB). ✅
- R2.2 Projects, chapters, scenes and all entity types support CRUD. ✅
- R2.3 Deleting a parent cascades to its children without orphans. ✅ `replaceStore` primitive (browser-verified).
- R2.4 A user can export and re-import their project without data loss
  (round-trip). ✅ Markdown/JSON/TXT/DOCX verified.
- R2.5 Backups include integrity checksums and verified restore. ✅ SHA-256 + restore test.

## 3. Writing

- R3.1 Rich text editing with a toolbar and word count. ✅ TipTap.
- R3.2 Autosave with visible save status and no data loss on reload. ✅ 1.5 s debounce, browser-verified.
- R3.3 Automatic version snapshots (deduplicated) plus manual milestones
  and restore. ✅ 5-minute throttle per scene.
- R3.4 Writing sessions are recorded (words written, duration, streak). ✅

## 4. Story intelligence

- R4.1 Panels for characters (knowledge/appearances fields), locations
  (ownership, parent-location select), objects, world-building, timeline,
  notes, relationships (10 spec types), comments (create/edit/resolve/
  delete). ✅ all CRUD, browser-verified in Phase 2.
- R4.2 Global search across entities that opens the found entity. ✅
- R4.3 Project health reporting with real checks (dangling references,
  timeline contradictions). ✅ computed, not hardcoded.
- R4.4 Analytics (words by day, streak, goals, sprints). ✅ sessions from real data.
- R4.5 Continuity engine: deterministic checks over the project's own data;
  every finding carries problem, confidence, evidence, affected entities.
  ✅ implemented (src/lib/local-api/continuity.ts) and browser-verified.

## 5. Portability

- R5.1 Exports: Markdown, JSON, DOCX, EPUB, HTML, TXT. ✅
- R5.2 Imports: Markdown, JSON, plain text, DOCX. ✅
- R5.3 Backups: create, list, get, restore, delete, download. ✅

## 6. Settings

- R6.1 Every setting has UI, persistence, and a runtime effect. ✅ 11 tabs wired.
- R6.2 Settings changes apply immediately (no reload required). ✅ `subscribeSettings` event.
- R6.3 No empty or placeholder settings tabs. ✅ (sweep verified).

## 7. AI (optional)

- R7.1 AI is optional; the app is fully functional without it. ✅ provider "none" default.
- R7.2 AI can call a user-configured OpenAI-compatible endpoint (Z.ai, Ollama,
  custom) with the key stored only in the user's browser. ✅
- R7.3 A "local-only" privacy mode blocks remote AI endpoints. ✅ enforced.
- R7.4 No AI credentials are shipped or committed. ✅
- GAP: live inference unverified without user credentials (by design).

## 8. Cloud sync (optional, GitHub)

- R8.1 One-click connect via GitHub device flow, no token entry. ✅ app registered, Device Flow enabled, verified live.
- R8.2 Automatic private storage repository creation/discovery. ✅
- R8.3 Background sync with dedup, compression, integrity checks, retries. ✅
- R8.4 Offline-first: writes always save locally; sync follows. ✅
- R8.5 Conflicts preserve both versions (keep local / keep remote / save both). ✅
- R8.6 Optional encryption before upload. ✅ AES-256-GCM.
- GAP: real-account cross-device round-trip not yet performed (engine verified against a mock).

## 9. Desktop (Windows)

- R9.1 Same features as web, identical static bundle. ✅
- R9.2 Installer (NSIS) + portable EXE. ✅
- R9.3 Tray indicator with Sync now / Open storage / Quit. ✅
- R9.4 Close hides to tray; relaunch shows the window. ✅

## 10. Quality gates

- R10.1 `tsc --noEmit` passes with zero errors. ✅
- R10.2 `eslint .` passes. ✅
- R10.3 `next build` produces a valid static export. ✅
- R10.4 CI runs on push and PR; Pages deploys the true artifact. ✅
- R10.5 Sync engine covered by an automated suite. ✅ 30/30.

## Open gaps (non-blocking — see docs/release/gap-analysis.md for the full list)

| Gap | Requirement impact |
| --- | ------------------ |
| PWA install-prompt drive test | R1.2 installability; manifest/SW/offline already verified (11/11) |
| Mobile/tablet responsive audit | R4/R5 on small screens |
| Screen-reader audit (axe/pa11y CI) | accessibility beyond code inspection |
| Import preview dialog | UX nicety |
| Live AI verification with a real remote key | requires user credentials |
| Real GitHub cross-device round-trip | requires user authorization (one-time) |
| Windows installer GUI click-through | requires interactive desktop session |
