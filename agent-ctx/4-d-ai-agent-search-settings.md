# Task 4-d: Build AI Agent panel, Search/Command Palette, and Settings for Open Writer

## Summary
Created the AI agent system, command palette, global search, settings dialog, relationships panel, and integrated all components into the main page layout.

## Files Created

### AI Provider System
- `/src/lib/ai/provider.ts` — AIProvider interface, AIOptions, PermissionLevel types with labels/descriptions, AgentAction, AgentSuggestion types
- `/src/lib/ai/zai-provider.ts` — Z.ai provider class (server-side only, client uses /api/agent route)
- `/src/lib/ai/no-provider.ts` — Null provider for when AI is disabled
- `/src/lib/ai/use-ai-assistant.ts` — Client-side React hook for AI assistant functionality, communicates with /api/agent route

### UI Components
- `/src/components/writer/agent-panel.tsx` — Full AI writing assistant panel with:
  - 6 quick action buttons (Continue Writing, Rewrite Selection, Analyze Character, Check Continuity, Generate Synopsis, Suggest Dialogue)
  - Chat-like input at bottom
  - Permission level indicator (Read Only / Suggest / Write with Confirmation / Full Access)
  - AI suggestions with Apply/Dismiss buttons
  - Activity/action log with timestamps
  - Context indicator showing what data was sent
  - Privacy info banner when using remote AI (Z.ai)
  - Graceful degradation when AI unavailable

- `/src/components/writer/agent-task-view.tsx` — Detailed view of an agent task:
  - Task goal and status (pending/planning/running/completed/failed)
  - Plan steps with completion indicators
  - Tool calls log
  - Observations
  - Errors (highlighted)
  - Artifacts
  - Result display

- `/src/components/writer/command-palette.tsx` — Global command palette (Ctrl+K):
  - Uses shadcn Command component (cmdk)
  - Grouped commands: Navigation, Create, Actions, Editor
  - Fuzzy search through commands
  - Keyboard navigation (up/down arrows, enter to execute)
  - Keyboard shortcuts shown for applicable commands
  - Ctrl+K global shortcut registered

- `/src/components/writer/global-search.tsx` — Global search overlay (Ctrl+Shift+F):
  - Instant search with debounced API calls
  - Results grouped by type: Scenes, Characters, Locations, Objects, Notes, World Elements
  - Each result shows type icon, name, brief description
  - Click result → navigate to that entity panel
  - Keyboard navigation (↑↓ arrows, Enter select)
  - Fetches from /api/search?q=&projectId=

- `/src/components/writer/settings-dialog.tsx` — Settings dialog with 7 tabs:
  - **Editor**: Font family (serif/sans/mono), Font size, Line height, Max width, Paragraph spacing
  - **Writing**: Default scene status, Autosave interval, Version history retention
  - **Goals**: Daily word goal, Project deadline
  - **Appearance**: Theme (light/dark/system), Accent color, Focus mode defaults
  - **AI**: Provider (None/Z.ai/Ollama/Custom), Model, Temperature, Context scope, Permission level
  - **Privacy**: Show data transmission info, Default to local-only mode, Privacy notice
  - **Shortcuts**: Keyboard shortcuts reference
  - Settings saved to localStorage

- `/src/components/writer/relationships-panel.tsx` — Relationship visualization:
  - List of all relationships with source → type → target
  - Color-coded by relationship type (loves=rose, hates=zinc, knows=sky, owns=amber, etc.)
  - Strength indicator bar (1-10)
  - Filter by entity type and relationship type
  - Search filter
  - "Add Relationship" dialog with strength selector
  - Fetches from /api/relationships?projectId=

### Updated Files
- `/src/app/api/agent/route.ts` — Added `action: 'chat'` endpoint that uses Z.ai SDK on the server-side to process AI requests. Also preserves existing task creation functionality.
- `/src/app/page.tsx` — Complete integration:
  - Top bar with project picker, search, command palette, focus/typewriter mode toggles, word count
  - Icon sidebar navigation (chapters, characters, locations, objects, world, timeline, notes, relationships, agent, settings)
  - Collapsible left panel showing the selected panel content
  - Main editor area with sample content and word/char counting
  - Command palette, global search, and settings dialog overlays
  - Focus mode hides sidebars

## Key Design Decisions
- Z.ai SDK is ONLY used server-side (in API routes) due to `fs/promises` dependency
- Client components communicate with AI via `/api/agent` POST endpoint with `action: 'chat'`
- All AI suggestions are shown as suggestions with Apply/Dismiss, never auto-applied
- Permission levels control what the AI can do (read-only → suggest → write-confirm → full-access)
- Privacy info shown when using remote AI providers
- Settings use lazy useState initializers to load from localStorage without useEffect
- ESLint passes with no errors
