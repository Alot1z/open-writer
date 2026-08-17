# Windows Verification — Packaged Desktop App

**Project:** Open Writer
**Build:** `electron-builder --win` on Windows, static export with
`NEXT_PUBLIC_BASE_PATH=/open-writer` (identical bundle to GitHub Pages)
**Date:** 2026-08-17

## Artifacts built

| Artifact | Size | Notes |
|---|---|---|
| `dist/Open-Writer-Setup-1.0.0-x64.exe` | 91.7 MB | NSIS installer (one-click off, custom dir, desktop + start-menu shortcuts) |
| `dist/Open-Writer-Portable-1.0.0-x64.exe` | 91.5 MB | Portable single-file build |
| `dist/win-unpacked/Open Writer.exe` | — | Unpacked app dir (used for runtime test) |
| `electron/icon.ico` | — | Custom app icon 16–256 px (from logo), replaces default Electron icon |

Builder config: appId `com.openwriter.app`, `files: [electron/**, out/**, package.json]`,
NSIS + portable targets, `electronLanguages` trimmed, no code signing
(`CSC_IDENTITY_AUTO_DISCOVERY=false` — unsigned; fine for local/CI verification).

## Bundled content

The app.asar (2.7 MB) contains the full static app: `out/index.html`, `out/sw.js`
(the PWA service worker — present but **not registered** in Electron by design),
`out/manifest.webmanifest`, icons, and all `_next/static` chunks.

## Runtime verification (packaged EXE, real renderer)

Procedure: launched `dist/win-unpacked/Open Writer.exe --remote-debugging-port=9223`,
attached CDP to the **actual Electron renderer** (not a proxy browser), and
exercised the app through its own UI/API.

| Test | Result |
|---|---|
| Launch | ✅ 3 processes (main/GPU/renderer), window created |
| App served | ✅ `http://127.0.0.1:PORT/open-writer/` 200, correct title |
| Preload bridge | ✅ `window.openWriter` present, `platform: "win32"` |
| Service worker | ✅ correctly NOT registered in Electron (no stale cache) |
| Create project | ✅ "Persist Test" |
| Create chapter / scene | ✅ |
| Write + save | ✅ scene content saved, word count 8 |
| Search | ✅ 1 hit for "packaged" |
| Backup | ✅ checksummed (`7e142a42a1…`) |
| Settings dialog | ✅ all 11 tabs rendered (Editor … Backup) |
| Panel rail | ✅ 18 panels (identical to web) |
| **Close → reopen** | ✅ project, chapter, scene, content, word count all intact |
| Project picker after restart | ✅ "Persist Test · 1 chapter · 8 words · Local" |
| Settings after restart | ✅ `localStorage` value survived restart |

## Critical bug found + fixed

**Ephemeral server port caused total data loss between sessions.**

- Symptom: after close + reopen, the project list was empty even though data
  had just been written.
- Root cause: `PORT = 0` (OS-assigned) → different origin each launch →
  different IndexedDB **and** localStorage partition. The profile contained 7
  orphaned origin partitions (`http_127.0.0.1_54397`, `54516`, `54577`, …).
- Fix (`electron/main.js`): first run picks a free port and persists it to
  `%APPDATA%/open-writer/port.json`; later launches reuse it → stable origin →
  persistent data. Falls back to a fresh port if the saved one is taken.
- Verification: create → close → relaunch → data intact, on both IndexedDB
  (projects) and localStorage (settings).

## Offline

The desktop app serves everything from its bundled `out/` over loopback —
**zero network required** for core writing, search, export, backup, versions.
GitHub sync and AI remain optional and network-dependent, exactly as on web.

## Notes

- The NSIS installer and portable EXE were produced on Windows and the
  win-unpacked build was executed and verified. The installer/portable
  themselves launch the same unpacked app (identical resources), so the
  runtime evidence carries over.
- `.github/workflows/windows.yml` was added so CI builds and uploads the
  installer + portable + unpacked dir on every push to `main` (and tags).
- Executables are unsigned (no signing cert in this environment); Windows
  SmartScreen will warn on first run — expected and documented.
