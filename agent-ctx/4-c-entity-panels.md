# Task 4-c: Entity Panel Components for Open Writer

## Summary
Built all 15 entity management panel components for the Open Writer writing studio application, plus created the missing `world/[id]` API route.

## Files Created

### API Route (Missing)
- `/src/app/api/world/[id]/route.ts` — GET, PUT, DELETE for world elements

### Left Sidebar Panels (7 files)
1. **`characters-panel.tsx`** — Character list with search, role filter (protagonist/antagonist/supporting/minor), avatar initial, role badge, "Add Character" button
2. **`locations-panel.tsx`** — Location list with search, type filter (city/town/village/building/room/landscape/region/country/other), MapPin icon, type badge
3. **`objects-panel.tsx`** — Story objects list with search, type filter (weapon/artifact/tool/clothing/vehicle/food/document/treasure/other), owner display
4. **`world-panel.tsx`** — World elements grouped by category (faction/culture/religion/organization/government/technology/magic/species/rule/concept) with collapsible sections, category selector on add
5. **`timeline-panel.tsx`** — Chronological events list with date display, event type filter (birth/death/battle/meeting/discovery/journey/political/romantic/mystery/custom), date + type badges
6. **`notes-panel.tsx`** — Notes list with category filter (general/research/idea/todo/continuity/worldbuilding), resolved/unresolved toggle, priority indicator, resolved checkmark
7. **`versions-panel.tsx`** — Version history grouped by date, milestone star, autosave badge, word count, "Create Milestone" button, preview dialog

### Right Detail Panels (5 files)
8. **`character-detail.tsx`** — Editable: name, role (select), age, occupation, description, personality, appearance, backstory, motivation, goals, fears; tags section; relationships list; delete with confirmation; debounced auto-save
9. **`location-detail.tsx`** — Editable: name, type (select), description, atmosphere, history, features, parent location; tags; delete confirmation
10. **`object-detail.tsx`** — Editable: name, type, owner, location, description, appearance, history, significance; tags; delete confirmation
11. **`world-detail.tsx`** — Editable: name, category, description, parent, rules, history; tags; delete confirmation
12. **`timeline-detail.tsx`** — Editable: title, eventType, date/time/duration, location, description, characters (list), objects (list), cause, consequence; tags; delete confirmation
13. **`note-detail.tsx`** — Editable: title, content (large textarea), category, linked entity (type+id), priority (select), resolved toggle; tags; delete confirmation

### Dashboard Panels (2 files)
14. **`analytics-panel.tsx`** — Key metrics (total words, today's words, streak, active goals), goal progress bars, chapter status badges (draft/writing/revision/final), recent writing sessions
15. **`health-panel.tsx`** — Project health checks: manuscript word count ✓, characters count ✓, timeline contradictions ⚠, unresolved threads ⚠, orphaned notes ⚠, dangling references ⚠; status summary badges

## Design Patterns
- All components use `'use client'` directive
- **Zustand store** (`useWriterStore`) for shared state (project ID, selected entities, panel navigation)
- **shadcn/ui components**: Button, Input, Textarea, Select, Badge, Card, ScrollArea, Separator, AlertDialog, Dialog, Skeleton, Switch, Label, Collapsible, Progress
- **Lucide React icons** throughout
- **Stone/amber color scheme** — no indigo/blue primary colors
- **Debounced auto-save** (800ms) on field changes with toast notifications
- **Skeleton loading states** for all panels
- **Empty states** with descriptive messages
- **Delete confirmation dialogs** on all detail panels
- **Tag management** with Enter-to-add pattern
- All list panels support **search filtering** and **type/category filters**
- Selected entity highlighted with **amber accent border**
