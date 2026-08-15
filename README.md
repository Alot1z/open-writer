# Open Writer

**Local-first, open-source writing studio with story intelligence**

[![Open Source](https://img.shields.io/badge/Open_Source-Yes-21c55e?style=flat-square)](https://github.com/Alot1z/open-writer)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-0ea5e9?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square)](https://www.typescriptlang.org/)

> **Live app:** https://Alot1z.github.io/open-writer/ — the full writing
> application runs entirely in your browser on GitHub Pages.

## What this is

Open Writer is a **genuinely functional web application** — not a landing
page. The entire writing studio (projects, chapters, scenes, rich text
editing, story intelligence, versions, search, imports, exports, backups)
runs client-side and persists to **IndexedDB in your own browser**. There
is no server, no account, and no cloud dependency. Deploy it anywhere that
can serve static files: GitHub Pages, Netlify, Vercel, nginx, or a USB stick.

## Features

### Writing

- **Rich text editor** — TipTap with formatting, headings, links, images, tasks
- **Projects, chapters, scenes** — full CRUD with automatic ordering and word counts
- **Autosave** — 1.5s debounce with automatic version snapshots (5-minute dedup)
- **Version history** — autosaves, milestones, restore
- **Focus mode & typewriter mode**
- **Word/character counts**, writing sprints, session tracking, goals, analytics
- **Global search** across manuscript, characters, locations, notes, world, objects
- **Command palette** (Ctrl+K)

### Story intelligence

- Characters, locations, objects, world-building (10 categories)
- Timeline events (flexible dates, cause/consequence)
- Relationship graph, notes, comments
- Project health checks (deterministic)

### Import, export & backup

- **Export:** Markdown, JSON, DOCX, HTML, TXT, EPUB (self-contained generator)
- **Import:** Markdown, JSON, plain text
- **Backup & restore** — full project snapshot with SHA-256 checksum verification

### AI (optional, opt-in)

- Providers: Z.ai (OpenAI-compatible), Ollama (local), or any custom
  OpenAI-compatible endpoint
- AI is **disabled by default**; when enabled you configure the endpoint and
  key yourself in Settings → AI. Keys are stored only in your browser and
  sent only to the endpoint you configured
- Permission levels: read-only / suggest / write-with-confirmation / full access

### Design

- Warm stone/amber design system, dark/light/system themes
- Resizable 3-panel layout, responsive down to mobile
- Keyboard-driven: command palette, focus mode (Ctrl+\)

## Tech stack

| Category         | Technology                                                |
| ---------------- | --------------------------------------------------------- |
| Framework        | Next.js 16 (App Router, static export)                    |
| Language         | TypeScript 5 (strict, zero `ts-ignore`)                   |
| Editor           | TipTap 3                                                  |
| Persistence      | IndexedDB (browser-local, zero dependencies)              |
| State Management | Zustand                                                   |
| UI Components    | shadcn/ui + Radix                                         |
| Styling          | Tailwind CSS 4                                            |
| Deployment       | GitHub Pages (static `out/` artifact)                     |

There is **no server runtime**: no Node.js server, no Prisma, no SQLite on
the server. Every feature that used to run through API routes now runs
through `src/lib/local-api/` — a browser-local domain layer that serves the
same REST contracts (`GET/POST/PUT/DELETE /api/...`) from IndexedDB via a
fetch shim installed at startup. The UI components are unchanged.

## Getting started

Prerequisites: [Bun](https://bun.sh/) (or Node.js 20+).

```bash
git clone https://github.com/Alot1z/open-writer.git
cd open-writer
bun install
bun run dev
```

The application is available at `http://localhost:3000`. Data is stored in
your browser's IndexedDB.

## Building the static site

```bash
# Local build (root path)
bun run build            # outputs ./out

# GitHub Pages build (subpath)
NEXT_PUBLIC_BASE_PATH=/open-writer bun run build

# Preview the exported site exactly as Pages serves it
node scripts/serve-out.mjs 8791   # http://127.0.0.1:8791/open-writer/
```

## Architecture

- `src/lib/local-api/` — browser-local domain layer
  - `storage.ts` — minimal promise-based IndexedDB wrapper
  - `services.ts` — domain services (projects, chapters, scenes, entities,
    search, versions, backups, restore) with the same semantics as the
    former server API
  - `router.ts` — fetch shim that serves `/api/*` requests locally
  - `exports.ts` — Markdown/JSON/DOCX/HTML/TXT/EPUB generators (incl. a
    self-contained ZIP writer for EPUB)
  - `imports.ts` — Markdown/JSON/text importers
  - `ai.ts` — browser-side OpenAI-compatible chat client (opt-in)
- `src/store/writer-store.ts` — Zustand UI state (persisted to localStorage)
- `src/components/writer/` — all panels (editor, story intelligence, etc.)

## Deployment

GitHub Pages is the reference deployment:

- `.github/workflows/ci.yml` — typecheck, lint, static build, security audit
- `.github/workflows/deploy-pages.yml` — builds `out/` with
  `NEXT_PUBLIC_BASE_PATH=/open-writer` and deploys it to Pages

Self-hosting is equally simple: serve `out/` from any static host at any
path, setting `NEXT_PUBLIC_BASE_PATH` accordingly at build time.

## Documentation

- [Status](./docs/STATUS.md) — what works, what is verified, what remains
- [Project plan](./docs/PROJECT-PLAN.md)
- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

## License

Open Writer is licensed under the [GNU Affero General Public License v3.0](./LICENSE).
