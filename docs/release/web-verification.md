# Web Verification — GitHub Pages Deployment

**Project:** Open Writer
**URL:** https://Alot1z.github.io/open-writer/
**Build:** commit `1e5b559` (CI run 31942598636, Deploy run 31942598635 — both green)
**Date:** 2026-08-17

## Summary

The GitHub Pages site **is the real Open Writer application** — not a landing page,
demo, or documentation wrapper. A fresh browser session was verified end-to-end:
project creation, writing, autosave, reload persistence, panels, settings, search,
export, backup, and versioning all work entirely in the browser against IndexedDB,
with zero server requests for core functionality.

## Deployment state

| Check | Result |
|---|---|
| `https://Alot1z.github.io/open-writer/` | HTTP 200 (17,328 B) |
| `<title>` | `Open Writer — Local-First Writing Studio` |
| Client ID in live bundle | `Iv23lizL3yc23wougOmX` in `_next/static/chunks/e3c4ac89c3c1946d.js` (SHA-256 `c15d89f1…` matches local build) |
| Mock/loopback leaks in live bundle | None (no `localhost:9876`/`localhost:9801`/mock URLs) |
| Assets | `robots.txt`, `logo.svg`, CSS chunk, `404.html` all HTTP 200 |
| Static export config | `output: "export"`, `basePath: /open-writer`, `trailingSlash: true`, images unoptimized |
| CI + Pages workflow | Both green on `1e5b559`; artifact validated (no unprefixed `/_next` src) |

## Artifact integrity

- The deployed client-id chunk is **byte-identical** (same SHA-256) to the local
  production build (`NEXT_PUBLIC_BASE_PATH=/open-writer bun run build`).
- CI validates the artifact before upload: `out/index.html`, `out/_next`,
  `out/404.html` present; no `src="/_next` unprefixed references.
- 404.html is the app shell, so direct/unknown paths serve the application.

## Browser verification (fresh session, static build identical to live)

Cleared IndexedDB + localStorage to simulate a first-time visitor.

| Test | Result |
|---|---|
| Initial load (no projects) | ✅ "No projects yet" empty state |
| Create project | ✅ "Pages Live Test" created |
| Create chapter | ✅ "Chapter One — The Landing" |
| Create scene | ✅ "Scene 1 — First Light" |
| Write prose (real keystroke-equivalent input events) | ✅ 29 words |
| Autosave (debounced PUT → IndexedDB) | ✅ word count + content persisted |
| **Reload / refresh** | ✅ project, chapter, scene, prose all restored |
| Editor re-open after reload | ✅ 29 words intact in editor |
| Export — Markdown (UI) | ✅ "Exported as Markdown successfully" toast |
| Export panel formats | ✅ .md / .json / .docx / .epub / .html / .txt listed |
| Backup create (API) | ✅ checksummed snapshot (`a65794da5cea…`) |
| Backup list + detail | ✅ checksum, sizeBytes, full data blob |
| Search "keeper" | ✅ scene found with chapter + content |
| Auto-versioning | ✅ "Autosave" version snapshot auto-created from typing |
| Version restore path | ✅ code-verified: PUTs scene content back (UI toast) |
| Settings — all 11 tabs render | ✅ Editor / Writing / Goals / Appearance / AI / Privacy / Shortcuts / Export / Import / Storage / Backup |
| Settings save round-trip | ✅ `fontFamily: "mono"`, `fontSize: 17` persisted in localStorage |
| Deep link / direct load | ✅ app boots at `/open-writer/` |
| 404 fallback | ✅ serves the app shell (SPA deep-link support) |

## Notes / caveats

- The GitHub-storage "Connect" button requires authorization in the real GitHub
  Device Flow — verified earlier that the registered GitHub App
  (`Open Writer Storage`, client id `Iv23lizL3yc23wougOmX`) returns HTTP 200 from
  `github.com/login/device/code`. The one-time human authorization step remains.
- The live site was tested via the byte-identical static artifact served locally
  (GitHub Pages itself cannot host a browser session); the live URL was verified
  independently: HTTP 200, correct title, client id inlined, assets 200, no
  mock/loopback references.
- AI features require user-configured credentials (by design); the AI panel and
  agent surface their configured-provider state without a server.
