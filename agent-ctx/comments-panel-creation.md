# Comments Panel Creation — Work Record

## Task
Create a fully functional `CommentsPanel` component for the OPEN WRITER writing studio.

## Files Created/Modified

### Created
1. **`src/components/writer/comments-panel.tsx`** — Main panel component
2. **`src/app/api/comments/[id]/route.ts`** — API route for GET/PUT/DELETE individual comments

### Modified
1. **`src/app/api/comments/route.ts`** — Enhanced to support `chapterId` filtering and `author` via metadata JSON

## Design Decisions
- **Author storage**: The DB `Comment` model doesn't have an `author` column. Author is stored in the `metadata` JSON field (`{ author: "You" }`), parsed client-side by `parseComment()`.
- **chapterId filtering**: Added `chapterId` query param to the GET route; uses Prisma relation filter `where: { scene: { chapterId } }`.
- **Collapsible resolved section**: Uses shadcn/ui `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent` for the resolved comments group.
- **Filter tabs**: All / Open / Resolved — pill-style buttons with counts, matching the stone/amber color scheme.
- **Relative timestamps**: `formatRelativeTime()` shows "just now", "5m ago", "2h ago", "3d ago", or date.
- **Code style**: Followed patterns from `versions-panel.tsx` and `notes-panel.tsx` exactly — same header layout, ScrollArea, Skeleton patterns, toast usage, and border/stone color tokens.

## Comment Interface
```typescript
interface Comment {
  id: string
  projectId: string
  chapterId?: string
  sceneId?: string
  content: string
  author: string
  resolved: boolean
  createdAt: string
  updatedAt: string
}
```
