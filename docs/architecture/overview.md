# Open Writer — Architecture Overview

## Before (server-dependent)

```
Browser UI ──fetch('/api/*')──▶ Next.js API routes ──▶ Prisma ──▶ SQLite
```

- 41 route handlers in `src/app/api/`
- Prisma client + SQLite file database
- `output: "standalone"`, `typescript.ignoreBuildErrors: true`
- GitHub Pages workflow uploaded `./.next/static` (not a deployable site)

## After (local-first, fully static)

```
Browser UI ──fetch('/api/*')──▶ LocalApiBootstrap ──▶ router.ts (fetch shim)
                                                          │
                                          ┌───────────────┴────────────────┐
                                          │                               │
                                    services.ts (domain ops)      exports/imports/ai
                                          │                               │
                                    IndexedDB (open-writer DB, 15 stores) │
```

- `src/components/local-api-bootstrap.tsx` installs the shim at module
  scope before any component effect runs
- `router.ts` matches `METHOD /api/...` routes to handlers, returning real
  `Response` objects with identical status codes and JSON error bodies
- `services.ts` preserves the old route semantics: validations, ordering,
  cascade deletes, auto-versioning (5-min dedup), backup checksums,
  restore transactions
- `exports.ts` generates files fully in-browser (DOCX via `docx`,
  EPUB via a self-contained ZIP writer)
- `ai.ts` calls any OpenAI-compatible endpoint configured by the user;
  AI is disabled by default and never touches manuscript content unless
  the user sends it

## Data model

IndexedDB database `open-writer`, 15 object stores matching the former
Prisma models exactly: `projects`, `chapters`, `scenes`, `characters`,
`locations`, `storyObjects`, `worldElements`, `timelineEvents`,
`relationships`, `notes`, `comments`, `versions`, `goals`, `sessions`,
`agentTasks`. Dates are ISO-8601 strings (same shapes the old API returned).

## Deployment

- `next.config.ts`: `output: "export"`, `basePath` from
  `NEXT_PUBLIC_BASE_PATH` (empty locally, `/open-writer` on Pages),
  `trailingSlash: true`, `images.unoptimized: true`
- `out/` is the deployable artifact; the Pages workflow validates it
  before upload (index.html present, `_next` present, no bare `/_next`
  asset paths)
- Refresh/deep links: static export emits `404.html`; the app is a
  single page, so in-app state persists via IndexedDB + localStorage

## Server responsibilities (removed)

Everything that can run in the browser now does. Features that genuinely
need a server (sync, collaboration, auth, remote agent execution) are
out of scope for the static build and would be added as an optional
external service without touching the local-first core.

## Key files

| File | Role |
| ---- | ---- |
| `src/lib/local-api/storage.ts` | Promise IndexedDB wrapper |
| `src/lib/local-api/services.ts` | Domain services |
| `src/lib/local-api/router.ts` | Fetch shim + route table |
| `src/lib/local-api/exports.ts` | Export builders + ZIP/EPUB writer |
| `src/lib/local-api/imports.ts` | Markdown/JSON/text importers |
| `src/lib/local-api/ai.ts` | Opt-in AI chat client |
| `src/components/local-api-bootstrap.tsx` | Shim installer |
