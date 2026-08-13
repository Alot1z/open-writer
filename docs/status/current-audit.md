# Open Writer — Current Audit

**Date:** 2025-08-13  
**Auditor:** Autonomous Agent  
**Phase:** Initial Vertical Slice

## Environment

- **OS:** Debian 13 (trixie) on Kata Containers (kangaroo kernel 5.10.134)
- **Runtime:** Bun 1.3.14, Node 24.18.0
- **Framework:** Next.js 16 with App Router
- **Database:** SQLite via Prisma 6.x
- **Disk:** 9.9GB (7.7GB available)

## Feature Classification

### IMPLEMENTED ✅

| Feature | Component | Notes |
|---------|-----------|-------|
| Rich Text Editor | rich-text-editor.tsx | TipTap with 15+ extensions, toolbar, word count |
| Autosave | editor-area.tsx | 1.5s debounce, save status tracking |
| Chapter/Scene Tree | chapter-tree.tsx | Full CRUD, context menus, word counts |
| Project Picker | project-picker.tsx | List, create, animated entry |
| Top Bar | top-bar.tsx | Breadcrumbs, word counts, mode toggles |
| Left Sidebar | left-sidebar.tsx | 15-panel icon tab navigation |
| Status Bar | status-bar.tsx | Project info, save status, mode labels |
| Resizable Layout | page.tsx | 3-panel with collapsible right panel |
| Characters Panel | characters-panel.tsx | Search, filter, CRUD |
| Character Detail | character-detail.tsx | All fields, tags, relationships |
| Locations Panel | locations-panel.tsx | Search, filter, CRUD |
| Location Detail | location-detail.tsx | All fields, tags |
| Objects Panel | objects-panel.tsx | Search, filter, CRUD |
| Object Detail | object-detail.tsx | All fields, tags |
| World Panel | world-panel.tsx | Category grouping, 10 categories |
| World Detail | world-detail.tsx | All fields, tags |
| Timeline Panel | timeline-panel.tsx | Search, filter, CRUD |
| Timeline Detail | timeline-detail.tsx | All fields including cause/consequence |
| Notes Panel | notes-panel.tsx | Category filter, resolved toggle |
| Note Detail | note-detail.tsx | Content, linked entity, priority |
| Relationships Panel | relationships-panel.tsx | Type colors, strength, add dialog |
| Health Panel | health-panel.tsx | Real deterministic checks |
| Global Search | global-search.tsx | Cross-entity, grouped results |
| AI Chat Route | /api/ai/chat | Z.ai SDK server-side call |
| Agent Route | /api/agent | Real Z.ai SDK integration |

### PARTIALLY_IMPLEMENTED ⚠️

| Feature | Issue |
|---------|-------|
| Analytics Panel | Sessions never fetched; today/streak always 0 |
| Versions Panel | No auto-creation on save; no restore action |
| AI Agent Panel | Works but ZAIProvider class always throws |
| Agent Task View | Prop mismatch: expects `task` object, gets `taskId` string |
| Command Palette | Export/Backup commands are no-ops |
| Settings Dialog | Settings saved but not wired to runtime (font, theme, AI) |

### NOT_IMPLEMENTED ❌

| Feature | Priority |
|---------|----------|
| Export (DOCX, PDF, EPUB, Markdown) | HIGH |
| Import (DOCX, Markdown, TXT) | HIGH |
| Backup & Restore | HIGH |
| Auto-version on scene save | HIGH |
| Version restore | HIGH |
| Writing Sprints | MEDIUM |
| Comments Panel (real UI) | MEDIUM |
| Writing Session Tracking | MEDIUM |
| Goal Creation UI | MEDIUM |
| Scene Metadata Editing | MEDIUM |
| Typewriter Mode (scroll behavior) | MEDIUM |
| Indexed/FTS Search | MEDIUM |
| Drag-and-drop Reorder | MEDIUM |
| Zustand Persistence | MEDIUM |
| PWA / Offline Support | MEDIUM |
| Sync Engine | LOW |
| Collaboration | LOW |
| Sharing | LOW |
| Author Websites | LOW |

## Bugs Found

### Critical
1. **AgentTaskView prop mismatch** — Will crash if agent-detail right panel is opened
2. **Detail components ignore rightPanelEntityId** — Store entityId not synced to selected*Id fields

### Moderate
3. **Analytics fetches /api/goals twice** instead of /api/sessions — Today/streak broken
4. **No auto-version on scene save** — Version history essentially empty
5. **No version restore** — Can view but not apply old versions
6. **Settings not wired to runtime** — Font/theme/AI changes don't take effect
7. **Search is case-sensitive** — SQLite contains filter

### Minor
8. **TopBar settings button no-op**
9. **Command palette Export/Backup stubs**
10. **Relationships show entity IDs not names**
11. **Zustand store not persisted** — Lost on refresh
