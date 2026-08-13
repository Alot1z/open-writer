# Task 4-b: Build the main page layout and rich text editor for Open Writer

## Summary
Created the complete main UI for the Open Writer writing studio application, including a rich text editor with TipTap, three-panel resizable layout, project picker, chapter tree navigation, and all supporting components.

## Files Created/Modified

### Core Components

1. **`/src/components/writer/rich-text-editor.tsx`** — Full TipTap rich text editor
   - StarterKit, Placeholder, CharacterCount, Typography, Link, Highlight, Underline, TextAlign, TaskList, TaskItem, Image extensions
   - Clean toolbar with Bold, Italic, Underline, Strike, Code, H1-H3, Text Align, Lists, Blockquote, Link, Highlight, Image
   - ToolbarButton component with Tooltip integration
   - Debounced onChange (300ms), word/character count tracking
   - External content update handling with isInternalUpdate guard
   - Serif typography for writing (Georgia/Merriweather), max-w-3xl centered content
   - Custom scrollbar styling, word count footer

2. **`/src/components/writer/chapter-tree.tsx`** — Chapter/Scene tree navigation
   - Fetches chapters with scenes from API, expandable/collapsible tree
   - Context menus for rename/delete operations on chapters and scenes
   - "Add Chapter" and "Add Scene" with dialog forms
   - Word count badges per chapter, active scene/chapter highlighting
   - Auto-expand when chapter is selected

3. **`/src/components/writer/top-bar.tsx`** — Top navigation bar
   - Editable project name (double-click to rename)
   - Chapter > Scene breadcrumb navigation
   - Word count badges (current scene + total project)
   - Typewriter mode toggle, Focus mode toggle
   - Search button, Theme toggle (light/dark), Settings button
   - All buttons have Tooltip labels

4. **`/src/components/writer/project-picker.tsx`** — Project selection overlay
   - Beautiful centered card with framer-motion animations
   - "Open Writer" elegant title with serif typography
   - Project list with name, genre, chapter count, word count
   - "Create New Project" dialog with name + genre fields
   - Loading skeleton states

5. **`/src/components/writer/left-sidebar.tsx`** — Left sidebar with icon tab navigation
   - Vertical icon tabs for all panel types (Chapters, Characters, Locations, Objects, World, Timeline, Notes, Comments, Analytics, Versions, Agent, Relationships, Health, Search, Settings)
   - Renders ChapterTree for chapters panel
   - Placeholder panels for other types ("coming soon")
   - Panel header with current panel label

6. **`/src/components/writer/editor-area.tsx`** — Center editor area
   - Renders RichTextEditor when scene is selected
   - Welcome/empty state when no scene selected
   - Autosave with 1.5 second debounce
   - Tracks word count changes via store
   - Focus mode variant (centered, full-width)
   - Loading skeleton while fetching scene data

7. **`/src/components/writer/status-bar.tsx`** — Bottom status bar
   - Project name, chapter > scene breadcrumb
   - Scene word/character count, total project word count
   - Save status6 status indicator (saved/saving/unsaved with colored dot)
   - Focus/Typewriter mode indicators

### Layout & Styling

8. **`/src/app/page.tsx`** — Main application page
   - Project picker overlay when no project selected
   - Three-panel resizable layout using react-resizable-panels (Left: 18%, Center: 60%, Right: 22%)
   - Focus mode: hides sidebars, shows only editor centered
   - Keyboard shortcuts: Ctrl+\ for focus mode
   - Total word count polling (every 10s)
   - Command Palette, Global Search, Settings overlays
   - Right panel placeholder for detail views

9. **`/src/app/globals.css`** — Warm stone color palette
   - Light mode: warm cream backgrounds (#faf9f7, #faf8f5), stone borders, amber accent (#d97706, #fef3c7)
   - Dark mode: dark stone backgrounds (#1c1917, #292524), amber accent preserved
   - Custom CSS variables: --writer-bg, --writer-surface, --writer-border, --writer-accent, --writer-accent-soft
   - TipTap editor styles (headings, paragraphs, lists, blockquotes, task lists, marks, links, images)
   - Custom scrollbar styling

10. **`/src/app/layout.tsx`** — Updated with ThemeProvider from next-themes
    - ThemeProvider with class-based dark mode, default "light"
    - Sonner toast notifications
    - Updated metadata: "Open Writer — Writing Studio"

### Bug Fixes

11. **`/src/lib/ai/zai-provider.ts`** — Fixed z-ai-web-dev-sdk client-side import
    - Changed from direct SDK import to API route call (`/api/ai/chat`)
    - SDK is now only used server-side in the API route

12. **`/src/app/api/ai/chat/route.ts`** — New API route for AI chat
    - Server-side only usage of z-ai-web-dev-sdk
    - Accepts messages, systemPrompt, temperature, model, maxTokens
    - Returns JSON with content field

13. **`/src/components/writer/settings-dialog.tsx`** — Fixed lint errors
    - Changed setState-in-effect to lazy useState initialization
    - Removed unused useEffect import

## Key Design Decisions
- **Warm neutral palette**: Stone/amber colors instead of default blue/indigo — creates a calm, focused writing atmosphere
- **Serif typography for editor**: Georgia/Merriweather fonts with 1.8 line height and max-w-3xl content width
- **Resizable panels**: react-resizable-panels for the 3-panel layout with drag handles
- **TipTap v3 compatibility**: Removed BubbleMenu (not available in v3), kept toolbar-based formatting
- **No blue/indigo**: All accent colors use amber/stone from the warm palette
- **Subtle borders, no heavy shadows**: Professional, calm writing environment
- **Autosave**: Debounced 1.5s save to API on content change
- **Client/Server split**: AI SDK only used server-side via API route

## Lint Status
✅ All ESLint errors fixed — clean lint pass
