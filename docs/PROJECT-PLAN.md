# Open Writer — Project Plan

## Mission

A genuinely functional, local-first writing studio that runs as a static
web application on GitHub Pages, with story intelligence, versions,
imports/exports/backups, optional AI, and no server dependency.

## Phases

### Phase 1 — Core writing (COMPLETE ✅)
- Projects / chapters / scenes CRUD, rich text editor, autosave,
  focus/typewriter modes, word counts
- **Verified in browser on the static build** (vertical slice passed)

### Phase 2 — Story intelligence (COMPLETE ✅)
- Characters, locations, objects, world-building, timeline, relationships,
  notes, comments, project health, global search
- Migrated to IndexedDB; CRUD + search verified

### Phase 3 — Data portability (COMPLETE ✅)
- Exports: Markdown, JSON, DOCX, HTML, TXT, EPUB (self-contained)
- Imports: Markdown, JSON, plain text
- Backups with SHA-256 checksums, restore with verification
- **Verified in browser** (EPUB validated with `unzip`)

### Phase 4 — Local-first re-architecture (COMPLETE ✅)
- All 41 API routes re-implemented client-side (`src/lib/local-api/`)
- Static export (`output: "export"`), basePath, real typechecking
- CI + Pages workflows deploy the true artifact
- **Live at https://Alot1z.github.io/open-writer/**

### Phase 5 — AI (PARTIAL ⚠️)
- [x] Provider abstraction (none / zai / ollama / custom)
- [x] Settings UI: endpoint, key (browser-only), model, temperature,
      context scope, permission levels
- [x] Disabled by default; app fully usable without AI
- [x] Local-only privacy mode blocks remote providers
- [ ] Live verification with a real key (requires user-provided credentials
      by design)

### Phase 6 — GitHub cloud sync (COMPLETE ✅)
- [x] Zero-config private GitHub storage: one-click device-flow connect
- [x] GitHub App "Open Writer Storage" registered (App ID 4612293,
      Client ID Iv23lizL3yc23wougOmX), Device Flow enabled + verified live
- [x] Automatic private repo creation/discovery
- [x] Chunked, deduplicated, compressed sync with integrity checks
- [x] Offline-first background sync, conflicts keep both versions,
      optional AES-256-GCM encryption
- [x] Cross-device restore ("From the cloud") and status UI everywhere
- [x] 30/30 automated tests against a mock GitHub server
- [ ] Real-account cross-device round-trip (one-time user authorization)

### Phase 7 — Windows desktop (COMPLETE ✅)
- [x] Electron shell loading the identical static bundle
- [x] NSIS installer + portable EXE (all verified)
- [x] Tray indicator: Show / Sync now / Open storage on GitHub / Quit
- [x] Hide-to-tray, second-instance re-show

### Phase 8 — Harden & extend (PARTIAL 🔶)
- [ ] PWA manifest + service worker (offline installability)
- [ ] Large-project benchmark (100 chapters / 1000 scenes)
- [ ] Mobile + accessibility audits
- [ ] Import preview dialog
- [ ] Continuity engine (deterministic contradiction checks)
- [ ] Sandboxed agent execution (optional)
- [ ] Comments panel UI e2e re-verification

## Working principles

- Browser-local first; a server is only ever an optional layer
- Never silently discard user data (format versioning, checksums,
  restore confirmation)
- Evidence over claims: every feature is tested in the browser, and
  STATUS.md records what was verified
- Public repository is sanitized; no secrets, no private paths
