# Writing Sprints, Session Tracking, Goals, Typewriter Mode & Flow Widget

## Task ID: writing-productivity-features

## Summary
Implemented comprehensive writing productivity features for the Next.js 16 writing studio:

### 1. Writing Sprint Panel (`/src/components/writer/sprint-panel.tsx`)
- Time-based and word-based sprint types
- Timer display with countdown/countup
- Start, Pause, Resume, Stop controls
- Duration presets (15, 25, 30, 45, 60 min) + custom input
- Live stats: words written, WPM, elapsed time
- Progress bar
- Completion screen with celebratory animation (framer-motion)
- Save session to API on completion

### 2. Writing Session Tracking (`/src/hooks/use-writing-session.ts`)
- Automatic tracking when a scene is focused
- Records start word count and start time
- Detects inactivity (5 min timeout) to end sessions
- Handles scene changes, tab visibility changes
- Debounced session creation to avoid noise
- POST to /api/sessions on session end

### 3. Sessions API (`/src/app/api/sessions/route.ts`)
- GET: List sessions for project (optional date filter)
- POST: Create new writing session

### 4. Goals API with CRUD (`/src/app/api/goals/[id]/route.ts`)
- GET/PUT/DELETE for individual goals

### 5. Goals Panel (`/src/components/writer/goals-panel.tsx`)
- Active goals list with progress bars
- Color-coded progress (green=on track, amber=behind, red=missed)
- Create goal form with type selector
- Edit target, toggle active/inactive, delete
- Goal types: daily_words, total_words, chapter_count, deadline, session_time

### 6. Typewriter Mode (`/src/components/writer/rich-text-editor.tsx`)
- Added `typewriterMode` prop to RichTextEditor
- Smooth scroll to keep cursor at 40% vertical position
- Uses `editor.view.coordsAtPos()` for cursor coordinates
- `requestAnimationFrame` for smooth scrolling
- Adds `typewriter-mode` CSS class to editor wrapper

### 7. Flow Widget (`/src/components/writer/flow-widget.tsx`)
- Compact floating widget in bottom-right
- Collapsible (minimize to icon)
- Shows: today's words, session duration, streak, active sprint
- Quick actions: Start Sprint, Focus Mode
- Real-time word count updates from store
- Semi-transparent backdrop-blur background

### 8. Zustand Store Updates (`/src/store/writer-store.ts`)
- Sprint state with type, status, target, elapsed, words
- Sprint actions: start, pause, resume, stop, complete, tick, updateWords
- Sprint panel and goals panel open state

### 9. Analytics Panel Updates (`/src/components/writer/analytics-panel.tsx`)
- Tabbed interface: Overview, Goals, Sprint
- "Start a Sprint" button
- Fixed sessions fetch to use /api/sessions
- 7-day writing history bar chart
- Date formatting for session list

### 10. Command Palette Updates
- Added "Start Sprint" command (Zap icon)
- Added "Create Goal" command (Target icon)

### 11. Page Updates (`/src/app/page.tsx`)
- Added FlowWidget to both focus mode and normal mode
- Initialized useWritingSession hook

### Files Created/Modified
- Created: `/src/app/api/sessions/route.ts`
- Created: `/src/app/api/goals/[id]/route.ts`
- Created: `/src/components/writer/sprint-panel.tsx`
- Created: `/src/components/writer/goals-panel.tsx`
- Created: `/src/components/writer/flow-widget.tsx`
- Created: `/src/hooks/use-writing-session.ts`
- Modified: `/src/store/writer-store.ts`
- Modified: `/src/components/writer/rich-text-editor.tsx`
- Modified: `/src/components/writer/editor-area.tsx`
- Modified: `/src/components/writer/analytics-panel.tsx`
- Modified: `/src/components/writer/command-palette.tsx`
- Modified: `/src/app/page.tsx`
