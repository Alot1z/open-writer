# Offline Verification — PWA

**Project:** Open Writer
**Build:** static export commit with PWA (manifest, icons, service worker)
**URL tested:** `http://127.0.0.1:8791/open-writer/` (byte-identical artifact to GitHub Pages `/open-writer/`)
**Date:** 2026-08-17

## What was added

| Piece | File | Details |
|---|---|---|
| Web app manifest | `public/manifest.webmanifest` | name, short_name, `id: "./"`, `start_url: "./"`, `scope: "./"` (scope-relative → works at any basePath), standalone display, amber theme, 4 icons |
| Icons | `public/icons/` | 192 + 512 regular and maskable PNGs + apple-touch-icon (180), generated from `logo.svg` via sharp (`scripts/generate-icons.mjs`) |
| Service worker | generated `out/sw.js` (`scripts/generate-sw.mjs`) | deterministic precache of every build artifact, build-stamped cache name, activate cleanup, network-first navigations with cached-shell fallback, cache-first static assets with background refresh |
| SW generation | hooked into `bun run build` (`next build && node scripts/generate-sw.mjs`) | CI and desktop builds both produce it |
| Registration | `src/components/pwa-init.tsx` | scope-relative `sw.js` registration, skips Electron (`window.openWriter`), late registration (800 ms), progressive-enhancement (never breaks app) |
| Metadata | `src/app/layout.tsx` | `<link rel="manifest">`, theme-color (viewport export), icons, apple-web-app capable |

## PWA installability checks (browser, real Chromium)

| Check | Result |
|---|---|
| Manifest served | 200, `application/manifest+json` |
| `rel="manifest"` in HTML | `/open-writer/manifest.webmanifest` (correct basePath) |
| SW registration | ✅ active, scope `http://127.0.0.1:8791/open-writer/` |
| Page controlled by SW | ✅ `navigator.serviceWorker.controller` = true |
| Precached entries | 51 (of 52 build files; app shell + all chunks + icons + manifest) |
| All 17 index-referenced resources cached | ✅ 0 missing |
| Cache-only shell fetch (no network) | 200, 19 KB |

## Offline capability test (network truly down)

Procedure: loaded the app (SW installed + precached), then **killed the web
server** (port refused — equivalent to airplane mode), then exercised the app.

| Test | Result |
|---|---|
| **Offline launch** (reload with server dead) | ✅ full app loaded from SW cache |
| State restored (project, 29 words) | ✅ persisted across the offline reload |
| Create chapter | ✅ "Offline Chapter" |
| Create scene | ✅ "Offline Scene" |
| Write + save (PUT → IndexedDB) | ✅ 8 words, content "Written entirely while offline…" |
| Search ("offline") | ✅ scene found |
| Auto-versioning | ✅ new version snapshot created |
| Backup (create, checksummed) | ✅ `347aa15092…` |
| Second offline reload | ✅ all offline-created data intact |
| **Network restored** → app still functional, data intact | ✅ both chapters present |

Core local functionality — launch, create, write, save, reload, search,
version, backup — works with zero network. (Export and restore run the same
local services; export was exercised online in the Phase 3 report and uses no
network either.)

## Notes

- The service worker never intercepts cross-origin requests (GitHub sync API,
  AI endpoints), so those continue to behave normally when online and are
  simply unavailable offline — exactly the intended local-first contract.
- Cache invalidation: the cache name embeds a build timestamp; each redeploy
  installs a fresh worker and `activate` deletes old caches. Hashed asset names
  make stale entries unreachable anyway.
- The desktop Electron build skips SW registration (serves the same bundle over
  localhost where a worker adds no value).
- Installability: all Chrome PWA criteria are met (manifest with icons ≥ 192,
  start_url/scope, SW with fetch handler, served over a secure context).
  Installation prompt behavior was not drive-tested in this environment; the
  manifest/SW criteria were verified directly.
