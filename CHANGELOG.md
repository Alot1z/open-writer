# Changelog

All notable changes to Open Writer will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-08-17

### Added

- **Local-first web app on GitHub Pages** — the full application runs client-side
  (IndexedDB), no server required; deployed at https://Alot1z.github.io/open-writer/
- **PWA** — manifest, icons, service worker, offline app shell; 11/11 offline checks
- **Windows desktop app** — Electron shell with tray (Sync now, Open storage),
  persisted loopback port, verified create→write→close→reopen persistence
- **GitHub storage** — one-click Connect (GitHub App device flow), auto private
  repo, content-addressed 48 KB chunks with dedup, background debounced sync,
  conflict resolution (keep local / keep remote / save both), optional encryption
- **Local AI** — Ollama / LM Studio / OpenAI-compatible / Z.ai providers,
  streaming, model detection, 7 context scopes, deterministic tiny-AI layer
  (classify, tags, metadata, duplicates, proofread, continuity, rerank, summarize),
  real agent executor with 13 permission-gated tools
- **Ink & Paper design system** — indigo brand, editorial typography, warm paper /
  cool ink palettes, `DESIGN.md` contract
- **Full feature set** — projects, chapters, scenes, rich text editor, versions,
  backups (checksummed), import/export (MD/TXT/HTML/JSON/DOCX/EPUB), search,
  characters, locations, objects, world, timeline, relationships, notes,
  comments, goals, sprints, analytics, project health, continuity, story index

### Fixed

- Desktop data loss: ephemeral loopback port changed the storage origin every
  launch (7 orphaned IndexedDB partitions found); port now persisted
- IndexedDB missing-store recovery: app now self-heals a partial/corrupt schema
  (version bump) instead of returning 500s forever
- Desktop build produced a non-basePath bundle the Electron server rejects —
  `build:desktop` now sets `NEXT_PUBLIC_BASE_PATH=/open-writer`
- Export crash on corrupt project data — `sanitizeBook()` defense-in-depth
- Fetch shim hijacked external `/api/*` URLs (Ollama/Z.ai) — same-origin only
- `detectAI` double-`/v1` suffix; empty agent result without AI; provider badge
  mislabeling; icon-only buttons without accessible names; missing
  `prefers-reduced-motion` guard
- Removed machine-path leak in docs and unused `next-intl` (2 advisories)

### Security

- GitHub App device flow (public client id only; no secrets in repo/bundle)
- Tokens in `sessionStorage` only; passphrase encryption optional
- Import sanitization; same-origin-only fetch interception; agent write tools
  gated by permission level

## [0.1.0] - 2024-12-01

### Added

- Three-panel resizable layout with sidebar, editor, and detail panel
- Rich text editor based on TipTap with formatting toolbar
- Chapter and scene management with drag-and-drop reordering
- Character profiles with traits, backstory, and arc tracking
- Location entries with descriptions and world-building context
- Object tracking with significance and associations
- World-building panel for lore, rules, and systems
- Timeline visualization for chronological event management
- Relationship mapping between characters, locations, and objects
- AI writing assistant with provider abstraction layer
- AI agent for automated writing tasks
- Version history with diff view and restore capability
- Export to DOCX, PDF, EPUB, Markdown, HTML, TXT, and JSON
- Import from Markdown, plain text, and JSON
- Full project backup and restore
- Focus mode for distraction-free writing
- Typewriter mode with centered current line
- Dark and light theme with system preference detection
- Writing goals with word count targets
- Writing sprints with timed sessions
- Project health monitor with progress tracking
- Global search across all project content
- Command palette for keyboard-driven navigation
- Comments and annotations system
- Notes panel for freeform writing and research
- Settings dialog for AI provider and application configuration
- Local-first SQLite storage via Prisma ORM
- Offline-capable -- no internet connection required for core features
- No telemetry, tracking, or data collection
