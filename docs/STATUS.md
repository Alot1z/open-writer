# Open Writer — Project Status

**Last Updated:** 2026-08-16 (Phase 2 product core)

## Headline status ✅

- **Live:** https://Alot1z.github.io/open-writer/ — HTTP 200
- **CI + Pages:** green on every push (`ci.yml`, `deploy-pages.yml`)
- **Typecheck / lint / build / sync tests:** all green at audit time
  (`tsc --noEmit` 0 errors, `eslint .` clean, static export builds,
  **30/30** sync tests pass)
- **Windows:** NSIS installer + portable EXE built and verified
- **One-click Connect GitHub:** GitHub App "Open Writer Storage"
  (App ID `4612293`, Client ID `Iv23lizL3yc23wougOmX`) registered,
  Device Flow enabled and verified live; client id deployed in the bundle

## Architecture

```
GitHub Pages / Electron (same static bundle)
        ↓
    local-first domain/data layer (src/lib/local-api/, 77 routes)
        ↓
    IndexedDB (all manuscript data, per browser profile)
        ↓
    optional: GitHub sync (src/lib/github-sync/) — private repo backup/sync
    optional: AI (src/lib/local-api/ai.ts) — user-configured endpoint
```

- Static export (`output: "export"`, basePath `/open-writer`, trailingSlash)
- No server, no Prisma, no SQLite, no next-auth, no secrets in the bundle
- Electron desktop loads the identical `out/` bundle over a loopback server

## Verified at Phase 0 audit (code-level evidence)

| Area | Status |
| ---- | ------ |
| Projects / chapters / scenes CRUD + editor + autosave | COMPLETE (browser-verified earlier; code verified) |
| Entity panels: characters (knowledge/appearances), locations (ownership), objects, world, timeline, notes | COMPLETE |
| Relationships (10 spec types), comments (create/edit/resolve/delete), health, analytics, versions, goals, sprints | COMPLETE |
| Continuity engine (evidence-based findings: confidence, evidence, affected) | COMPLETE (browser-verified with real findings) |
| Global search, command palette, docs panel, flow widget | COMPLETE |
| Export (6 formats incl. self-contained EPUB) / Import (incl. DOCX) | COMPLETE (round-trip verified) |
| Backups: checksum + verified restore (replaceStore fix) | COMPLETE |
| Settings: 11 tabs, all wired to runtime effects, live updates | COMPLETE |
| GitHub sync: device flow, auto repo, dedup, conflicts, encryption, offline | COMPLETE (30/30 tests + browser mock flow; Device Flow live) |
| Electron: tray, IPC, hide-to-tray, installer, portable | COMPLETE (EXE verified) |
| GitHub App registration | COMPLETE (live) |

## PARTIAL / UNVERIFIED

| Item | Note |
| ---- | ---- |
| Live AI inference (Z.ai / Ollama) | Code follows verified OpenAI-compatible contract; needs the user's own key/endpoint |
| Real GitHub cross-device sync round-trip | Engine tested vs mock; needs one-time user authorization |

## Phase 2 (product core) — verified in browser

| Item | Evidence |
| ---- | ---- |
| Continuity panel (new) | Real findings rendered: severity, confidence %, evidence, affected IDs; re-run works |
| Character knowledge/appearances | UI fields persist end-to-end (input → debounced PUT → IndexedDB → reload) |
| Location ownership + parent select | Persists via API; select-based parent picker |
| Comments edit + delete | Edit dialog + delete confirm both persist to storage |
| Relationship types | All 10 spec types in the panel's type select |
| Router field whitelist bug (Phase 2) | `COLLECTION_FIELDS` dropped `knowledge`/`appearances`/`ownership` on PUT — fixed and re-verified |

## MISSING / open gaps (non-blocking)

- PWA manifest + service worker (app is already offline-capable)
- Mobile/tablet responsive audit; accessibility (screen-reader) audit
- Import preview dialog
- Large-project performance benchmark

## Cleanup items (from audit)

- Dead code: `src/lib/ai/zai-provider.ts`, `no-provider.ts` (nothing imports them; stale "server-side" comment)
- Legacy: `.zscripts/` and `tests/` scripts referencing removed subsystems
  (database-runtime / python-runtime / mini-services)
- Empty dirs: `examples/`, `mini-services/`
- Stale doc: `docs/status/current-audit.md` (2025, pre-migration; superseded by `docs/research/phase-0-audit.md`)

## Recent commits

```
314e5bb build: commit NEXT_PUBLIC_SYNC_CLIENT_ID so CI ships one-click Connect
2a61297 feat: register the Open Writer GitHub App — one-click Connect GitHub
b80b930 docs: record tray indicator work in worklog
49d152c feat: native tray indicator + Sync now / Open storage menu (Electron)
0731125 feat: private GitHub storage — zero-config cloud sync for projects
a5ad252 feat: add Electron Windows desktop app; fix replace-store wipe bug
424181b fix: wire six dead/misleading code paths found in line-by-line audit
5a81f05 feat: wire all settings tabs to real runtime behavior
ebcad4e fix: commit the local-api layer that .gitignore was silently excluding
9bf855e feat: migrate Open Writer to local-first static app for GitHub Pages
```

## History note

`refs/heads/experiment/zustand-localstore` preserves a parallel session's
Zustand/localStorage data-store approach (its typecheck failed and export
path was broken); `main` carries the verified local-api architecture.
