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

### Phase 5 — AI (COMPLETE ✅)
- [x] Provider abstraction (none / ollama / lm-studio / openai / custom)
- [x] Settings UI: endpoint, key (browser-only), model, temperature,
      context scope, permission levels, Detect models
- [x] Disabled by default; app fully usable without AI (deterministic fallback)
- [x] Local-only privacy mode blocks remote providers
- [x] Deterministic tiny-AI layer: classify, tags, metadata, duplicates,
      proofread, continuity, rerank, summarize (no model required)
- [x] Real agent executor: plan → 13 permission-gated tools → artifacts,
      with LLM-compose fallback to the deterministic report
- [x] 7 context scopes (selection/scene/chapter/related/timeline/summary/
      full/custom), streaming, model detection — 55/55 automated checks
- [ ] Live verification with a real remote key (requires user credentials
      by design; contract verified via mock + real Ollama detection)

### Phase 6 — GitHub cloud sync (COMPLETE ✅)
- [x] Zero-config private GitHub storage: one-click device-flow connect
- [x] GitHub App "Open Writer Storage" registered (App ID 4612293,
      Client ID Iv23lizL3yc23wougOmX), Device Flow enabled + verified live
- [x] Automatic private repo creation/discovery
- [x] Chunked, deduplicated, compressed sync with integrity checks
      (0 new chunks on no-op, 1 chunk on single-scene edit @ 250k words)
- [x] Offline-first background sync, conflicts keep both versions,
      optional AES-256-GCM encryption
- [x] Cross-device restore ("From the cloud") and status UI everywhere
- [x] 30/30 automated tests against a mock GitHub server
- [ ] Real-account cross-device round-trip (one-time user authorization)

### Phase 7 — Windows desktop (COMPLETE ✅)
- [x] Electron shell loading the identical static bundle
- [x] NSIS installer + portable EXE (all verified, rebuilt at final gate)
- [x] Tray indicator: Show / Sync now / Open storage on GitHub / Quit
- [x] Hide-to-tray, second-instance re-show
- [x] Persisted loopback port (fixed the per-launch storage-origin data loss)
- [x] Rebuilt with `NEXT_PUBLIC_BASE_PATH=/open-writer` so the packaged EXE
      serves its own assets (fixed at Phase 10)
- [ ] Installer GUI click-through (built; headless environment ran the
      unpacked EXE instead)

### Phase 8 — Hardening (COMPLETE ✅)
- [x] PWA: manifest, icons, service worker, offline app shell — 11/11
      offline checks (kill server → reload → data survives → write offline)
- [x] 100k/250k performance: all ops < 500 ms @ 351k words, heap 35 MB
- [x] Security audit: no secrets in repo/bundle/history; import sanitizer;
      same-origin-only fetch shim; unused next-intl removed
- [x] Accessibility: icon-only buttons labeled, reduced-motion guard,
      dialog/focus/semantics audited
- [x] Recovery: 21/21 checks; export corrupt-data sanitization;
      IndexedDB missing-store self-heal
- [x] Continuity engine, agent, tiny-AI (all above)
- [ ] Mobile + screen-reader audits (documented in gap-analysis)
- [ ] Import preview dialog (UX nicety, documented)

### Phase 9 — Release gate (COMPLETE ✅)
- [x] Live Pages URL verified (byte-identical bundle, 200)
- [x] Full browser runtime flow: project → chapter → scene → write → reload →
      search → entities → timeline → relationship → notes → comments →
      settings → version → backup → restore
- [x] PWA offline gate (11/11)
- [x] Rebuilt Windows EXE runtime + close/reopen persistence
- [x] All suites green: 55 AI + 30 sync + 21 recovery
- [x] Final docs: feature-parity, gap-analysis, release reports

## Working principles

- Browser-local first; a server is only ever an optional layer
- Never silently discard user data (format versioning, checksums,
  restore confirmation)
- Evidence over claims: every feature is tested in the browser, and
  STATUS.md records what was verified
- Public repository is sanitized; no secrets, no private paths
