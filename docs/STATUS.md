# Open Writer — Project Status

**Last Updated:** 2026-08-16
**Phase:** Local-First Migration Complete (GitHub Pages live)

## Deployment (2026-08-16) ✅

- **Live:** https://Alot1z.github.io/open-writer/ — HTTP 200, all 13 assets
  return 200, bundle verified to contain the IndexedDB layer
  (`indexedDB.open`, DB name `open-writer`), JS chunks identical to the
  locally browser-verified build
- CI green + Pages deploy green on commit `ebcad4e`
- **Reconciliation note:** remote `main` had been force-replaced by a
  parallel session's Zustand/localStorage data-store approach whose CI
  typecheck fails and whose export path was broken (fetch to deleted
  routes). That work is preserved at
  `refs/heads/experiment/zustand-localstore`; `main` carries the
  verified local-api architecture (documented in worklog.md).
- The first migration commit was missing the local-api files because the
  pre-existing `.gitignore` rule `local-*` matched them; fixed with
  explicit un-ignore rules in commit `ebcad4e`.

## Architecture

Open Writer is now a **fully static, local-first web application**.

- `next build` produces `out/` (static export, `output: "export"`)
- All data lives in **IndexedDB** in the user's browser
- All 41 former server API routes are re-implemented client-side in
  `src/lib/local-api/` with identical REST semantics, served through a
  fetch shim — the UI components were not changed
- No server, no Prisma, no SQLite on the server, no next-auth
- TypeScript strict — `tsc --noEmit` passes with **zero errors**
  (the previous `typescript.ignoreBuildErrors = true` is gone)

## Verified ✅ (browser-tested on the static build)

| Feature | Evidence |
| ------- | -------- |
| Project create/list | Browser test: created "The Lighthouse Keeper" |
| Chapter create | Browser test: "The Storm" with auto-order |
| Scene create | Browser test: "The Keeper Watches" |
| Rich text editing + autosave | Typed text via ProseMirror; IndexedDB shows content, wordCount 21 |
| Auto-version (5-min dedup) | IndexedDB `versions` store: Autosave snapshot created |
| Persistence across reload | Reload kept project, chapters, scenes, word counts, session |
| Search | `/api/search?q=Elara` returned the matching scene |
| Export Markdown/JSON/DOCX/EPUB | All returned valid artifacts; EPUB validated with `unzip` (6 entries, mimetype first) |
| Backup create/list/get/restore/delete | Checksum created + verified; restore wiped and recreated data |
| Character CRUD | POST created "Elara Voss", list returned it |
| Session tracking | Flow widget showed today's words and streak after writing |
| Static artifact | `out/` has index.html, 404.html, `_next` with basePath-prefixed assets |
| Console | Zero errors, zero failed requests during testing |

## Implemented in this migration

- `src/lib/local-api/` — storage (IndexedDB), services, router (fetch
  shim), exports (incl. self-contained EPUB/ZIP writer), imports, AI client
- `next.config.ts` — `output: "export"`, configurable `basePath`,
  `trailingSlash`, unoptimized images, no ignored type errors
- `.github/workflows/ci.yml` — typecheck (real), lint, static build, artifact
  validation, security audit
- `.github/workflows/deploy-pages.yml` — builds `out/` with
  `NEXT_PUBLIC_BASE_PATH=/open-writer` and deploys the real artifact
- Settings → AI: provider, model, **API Base URL**, **API Key (browser-only)**,
  temperature, context scope, permission level. AI disabled by default.
- Dependencies removed: `prisma`, `@prisma/client`, `next-auth`,
  `z-ai-web-dev-sdk` (Node-only), `epub-gen-memory`, `sharp`
- Repo sanitized: removed stale `dev.pid`, debug screenshot, pasted prompt
  file; `.env` no longer tracked

## Partially implemented ⚠️

| Item | Note |
| ---- | ---- |
| Local AI (Ollama) | Configurable; needs a running Ollama server to verify |
| Z.ai AI chat | Configurable endpoint+key; not verified against a live key (no credentials available) |
| Comments panel | UI + API exist; not browser-tested end-to-end |
| Analytics accuracy | Sessions/streak now computed from IndexedDB data; chart types fixed |

## Not started ❌

- PWA / offline service worker (the app is inherently offline-capable —
  static files + IndexedDB — but no installable PWA manifest yet)
- Sync / collaboration / cloud
- Windows desktop build (Tauri)
- Sandboxed agent execution
- Continuity engine (deterministic checks beyond project health)

## Remaining gaps

1. **AI live verification** — needs a user-provided key (by design, keys are
   never committed)
2. **Large-project performance** — not benchmarked (100 chapters / 1000 scenes)
3. **Mobile responsiveness** — desktop verified; tablet/mobile not yet audited
4. **Accessibility audit** — not yet performed with screen readers
5. **Windows desktop** — out of scope for this migration (see PROJECT-PLAN)
6. **Import preview** — importer works, but no pre-import preview dialog
7. **PWA** — manifest/service worker not implemented
8. **Comments** — API verified via router unit paths; UI flow untested
