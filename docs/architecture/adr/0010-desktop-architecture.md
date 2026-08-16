# ADR 0010 — Desktop architecture (Electron)

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

Open Writer must ship as a native Windows app (installer + portable) with
system integration (tray), reusing the web codebase.

## Decision

- **Electron** (43) + **electron-builder** (26), packaging NSIS +
  portable artifacts for Windows x64.
- The main process runs a loopback static server rooted at the same
  `out/` bundle (see ADR-0003/0006); `sandbox` + `contextIsolation` with a
  minimal `preload.js` bridge (`window.openWriter`: sync commands,
  status, open-external).
- Tray icon + menu (Show / Sync now / Open storage on GitHub / Quit),
  hide-to-tray on close, second-instance re-show.
- Tauri 2 was considered; rejected because Electron reuses the verified
  bundle with zero re-architecture (cost: ~90 MB EXE vs ~15 MB).

## Consequences

- ✅ Same features as web, identical bundle, fully offline.
- ✅ Tray/sync integration verified on the packaged EXE.
- ✅ Installer + portable verified (silent `/S` install → AppData).
- ⚠️ Larger binary; WebView2-free (Electron bundles Chromium).
- 🔄 Migration to Tauri later would not touch the web layer (shared core
  is the bundle), only the shell.
