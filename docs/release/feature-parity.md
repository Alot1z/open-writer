# Feature Parity — Web (GitHub Pages) vs Windows Desktop

**Project:** Open Writer
**Date:** 2026-08-17

## Framework decision

The existing **Electron** desktop shell is retained — not migrated.

Rationale (consistent with ADR-0010):
- Electron loads the **byte-identical static bundle** that ships to GitHub
  Pages (`out/`, basePath `/open-writer`), served from a loopback HTTP server.
  Parity is therefore **by construction**: there is no second UI implementation
  to drift.
- The shell already provides the desktop-specific pieces that matter: tray
  indicator with Sync now / Open storage, sandboxed preload bridge
  (`window.openWriter`), single-instance lock, external-link handling, and
  offline operation.
- A migration (e.g., Tauri) would re-implement the tray/bridge for zero user
  benefit while throwing away verified work.

## Shared core

Both platforms use the **same domain services** (`src/lib/local-api/`):
the same IndexedDB-backed `storage.ts` (the ProjectStorageProvider), the same
77-route fetch shim, the same continuity/import/export/backup/version/search
services, and the same settings layer (`src/lib/settings.ts`). The renderer is
the same React app; only the shell differs.

## Storage — ProjectStorageProvider

| Layer | Web | Windows desktop |
|---|---|---|
| Storage provider | `src/lib/local-api/storage.ts` (IndexedDB) | **same module**, IndexedDB in the user profile |
| On-disk location | browser profile | `%APPDATA%/open-writer/IndexedDB/` |
| Settings | `localStorage` | `%APPDATA%/open-writer/Local Storage/` |
| Persistence model | browser-local | desktop local (survives restart — verified) |

**Bug found and fixed during this phase:** the desktop server used an
**ephemeral port** (`PORT = 0`). Because the browser origin
(`host:port`) is the storage key for IndexedDB *and* localStorage, every
launch allocated a new port → a new origin → an **empty storage partition**.
User projects and settings silently vanished between sessions (7 orphaned
IndexedDB partitions were found in the profile). Fix: `electron/main.js` now
picks a free port on first run, persists it to
`%APPDATA%/open-writer/port.json`, and reuses it on later launches, keeping
the origin (and therefore all data) stable. Verified: create → close → reopen
→ data intact.

## Feature parity matrix

Same bundle on both platforms → all features are shared; the "Windows status"
column reflects runtime verification in the packaged EXE.

| Feature | Web | Windows (packaged EXE, runtime-verified) |
|---|---|---|
| Projects (create/list/open) | ✅ | ✅ "Persist Test" created + reopened |
| Chapters / scenes | ✅ | ✅ created + listed |
| Editor + rich text | ✅ | ✅ contenteditable present |
| Autosave (debounced PUT) | ✅ | ✅ word count persisted |
| Versions + restore | ✅ | ✅ version snapshots created |
| Search | ✅ | ✅ "packaged" hit in scene |
| Characters / Locations / Objects / World | ✅ | ✅ same panel set (18 rail panels) |
| Timeline | ✅ | ✅ |
| Relationships | ✅ | ✅ |
| Notes / Comments | ✅ | ✅ |
| Analytics / Goals / Sprints | ✅ | ✅ |
| Import (MD/DOCX/JSON) | ✅ | ✅ |
| Export (MD/JSON/TXT/HTML/DOCX/EPUB) | ✅ | ✅ export route verified |
| Backup (checksummed) + restore | ✅ | ✅ checksum `7e142a42a1…` created |
| Health / Continuity | ✅ | ✅ |
| Settings — all 11 tabs | ✅ | ✅ **all 11 tabs rendered in dialog** |
| AI (optional, user-configured) | ✅ | ✅ same settings |
| Agent | ✅ | ✅ |
| GitHub sync (optional) | ✅ | ✅ tray "Sync now" wired via IPC |
| Offline | ✅ (SW) | ✅ (local server, no network needed) |
| Tray indicator | n/a | ✅ Show / Sync now / Open storage / Quit |

No unexplained gaps: the desktop runs the same code, and the only desktop-only
paths (tray, bridge) are additions, not divergences.

## Windows-specific verification evidence

- Packaged EXE launched (`dist/win-unpacked/Open Writer.exe`) with CDP attached
  to the **real renderer**: `window.openWriter` bridge present, platform
  `win32`, service worker correctly skipped (no stale-cache risk in Electron).
- Runtime API flow inside the packaged app: project → chapter → scene → save
  (8 words) → search (1 hit) → backup (checksum) — all via the app's own
  fetch shim.
- Close → relaunch: project, chapter, scene content, word count, and settings
  (`localStorage`) all intact at the stable origin.
- Project picker listed "Persist Test / 1 chapter / 8 words / Local" after
  restart — UI-level proof of persistence.

## Design

Web and Windows share the identical design system (same `out/` bundle, same
Tailwind/UI components, same light/dark theming). There is no separate
desktop theme to keep in sync.

## Artifacts (Windows CI)

- `.github/workflows/windows.yml` — builds on `windows-latest`: typecheck →
  static export → `electron-builder --win` → NSIS installer + portable +
  unpacked dir, all uploaded as artifacts.
- Local build produced: `Open-Writer-Setup-1.0.0-x64.exe`,
  `Open-Writer-Portable-1.0.0-x64.exe`, `win-unpacked/Open Writer.exe`, with a
  custom `electron/icon.ico` (16–256 px, generated from the logo).
