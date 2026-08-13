# Open Writer — Project Status

**Last Updated:** 2025-08-13  
**Phase:** Core Feature Completion

## Statistics
- **Source Files:** 134
- **Writer Components:** 34
- **API Routes:** 40
- **Prisma Models:** 15

## Completed ✅

### Core Writing
- [x] Rich text editor (TipTap, 15+ extensions)
- [x] Project/chapter/scene CRUD
- [x] Autosave (1.5s debounce)
- [x] Focus mode (Ctrl+\)
- [x] Typewriter mode (scroll-to-cursor)
- [x] Word/character count tracking
- [x] Chapter/scene tree with context menus

### Story Intelligence
- [x] Characters (full profiles, relationships, tags)
- [x] Locations (type, atmosphere, hierarchy)
- [x] Objects (owner, significance, history)
- [x] World building (10 categories)
- [x] Timeline (flexible dates, cause/consequence)
- [x] Relationships (typed edges, strength)
- [x] Project health (deterministic checks)
- [x] Notes (categories, priorities, resolved state)

### Writing Productivity
- [x] Writing sprints (time & word based)
- [x] Automatic session tracking
- [x] Goals (daily/weekly/monthly/project)
- [x] Analytics (words, streak, sessions)
- [x] Flow widget (compact metrics)

### Export & Import
- [x] Export: Markdown, JSON, DOCX, EPUB, HTML, TXT
- [x] Import: Markdown, JSON, plain text
- [x] Backup with SHA-256 checksum
- [x] Restore from backup with verification

### Version History
- [x] Auto-version on scene save (5-min dedup)
- [x] Manual milestone versions
- [x] Version restore with confirmation
- [x] Version preview

### AI & Agent
- [x] Z.ai SDK integration (server-side)
- [x] AI agent with 6 quick actions
- [x] Permission levels (read/suggest/write/full)
- [x] Privacy indicators
- [x] AI provider abstraction

### Navigation & Search
- [x] Command palette (Ctrl+K, 22+ commands)
- [x] Global search (cross-entity)
- [x] 15-panel sidebar navigation
- [x] Zustand persistence (localStorage)

### Design
- [x] Warm stone/amber design system
- [x] Dark/light/system themes
- [x] Resizable 3-panel layout
- [x] Settings dialog (9 tabs)

## In Progress 🔄
- [ ] Settings → runtime wiring (font/theme/AI)
- [ ] Comments panel (real UI)
- [ ] Case-insensitive search (FTS5)

## Not StartedF Started ❌
- [ ] PWA / Offline support (service worker, IndexedDB)
- [ ] Sync engine (cross-device)
- [ ] Collaboration (real-time)
- [ ] Sharing (public links)
- [ ] Author website generation
- [ ] Tauri desktop application
- [ ] Windows CI + installer
- [ ] CLI
- [ ] MCP tool server
- [ ] OpenSandbox integration
- [ ] Drag-and-drop reorder

## Known Issues
- Search is case-sensitive (SQLite contains)
- Settings UI exists but font/theme changes not yet applied to runtime
- Caddy gateway serves loading page (direct port 3000 works)

## Next Priorities
1. Wire settings → runtime (font, theme, AI provider)
2. Build real Comments panel
3. PWA / Offline support
4. Tauri desktop foundation
5. Sync engine
