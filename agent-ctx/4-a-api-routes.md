# Task 4-a: Build all API routes for the Open Writer application

## Summary
Created 22 API route files with full CRUD operations for the Open Writer writing studio application.

## Files Created

### Projects
- `/src/app/api/projects/route.ts` — GET (list with chapter count, character count, total word count) + POST (create)
- `/src/app/api/projects/[id]/route.ts` — GET (single with counts) + PUT (update) + DELETE

### Chapters
- `/src/app/api/chapters/route.ts` — GET (list by projectId, include scenes) + POST (create with auto-order)
- `/src/app/api/chapters/[id]/route.ts` — GET (with scenes) + PUT + DELETE

### Scenes
- `/src/app/api/scenes/route.ts` — GET (list by chapterId) + POST (create with auto-order)
- `/src/app/api/scenes/[id]/route.ts` — GET + PUT (auto word count from HTML content) + DELETE

### Characters
- `/src/app/api/characters/route.ts` — GET (list by projectId) + POST (create)
- `/src/app/api/characters/[id]/route.ts` — GET (with relationships) + PUT + DELETE

### Locations
- `/src/app/api/locations/route.ts` — GET (list by projectId) + POST (create)
- `/src/app/api/locations/[id]/route.ts` — GET + PUT + DELETE

### Story Objects
- `/src/app/api/objects/route.ts` — GET (list by projectId) + POST (create)
- `/src/app/api/objects/[id]/route.ts` — GET + PUT + DELETE

### Timeline
- `/src/app/api/timeline/route.ts` — GET (list by projectId, ordered by date) + POST (create)
- `/src/app/api/timeline/[id]/route.ts` — GET + PUT + DELETE

### Notes
- `/src/app/api/notes/route.ts` — GET (list by projectId, optional category filter) + POST (create)
- `/src/app/api/notes/[id]/route.ts` — GET + PUT + DELETE

### Comments
- `/src/app/api/comments/route.ts` — GET (by projectId or sceneId) + POST (create)

### Versions
- `/src/app/api/versions/route.ts` — GET (by projectId, optional sceneId) + POST (create with auto word count)

### Goals
- `/src/app/api/goals/route.ts` — GET (list by projectId) + POST (create or update existing active goal of same type)

### Relationships
- `/src/app/api/relationships/route.ts` — GET (list by projectId) + POST (create)

### World Elements
- `/src/app/api/world/route.ts` — GET (list by projectId, optional category filter) + POST (create)

### Search
- `/src/app/api/search/route.ts` — GET (global search across characters, locations, notes, scenes, worldElements, storyObjects; query: q, projectId)

### Agent
- `/src/app/api/agent/route.ts` — POST (create agent task with goal and permission) + GET (list by projectId)

## Key Design Decisions
- All routes use `NextRequest` / `NextResponse` with App Router patterns
- Dynamic route params use `Promise<{ id: string }>` (Next.js 16 async params)
- Prisma "record not found" errors (P2025) are caught and return 404
- Word count auto-calculated from HTML content using `countWords()` utility
- Chapter/scene order auto-calculated when not provided
- Writing goals use upsert pattern: if an active goal of the same type exists, update it
- Search uses SQLite `contains` filter for text matching across all entity types
- ESLint passes with no errors
- All routes tested and working via curl
