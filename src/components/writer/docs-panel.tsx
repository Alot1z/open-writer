'use client'

import { useState } from 'react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  BookOpen,
  PenLine,
  Bot,
  Download,
  Settings,
  Keyboard,
  Lightbulb,
  MapPin,
  ChevronRight,
} from 'lucide-react'

// ── Page definitions ────────────────────────────────────────────────────────

interface DocPage {
  id: string
  title: string
  icon: React.ElementType
  badge?: string
}

const PAGES: DocPage[] = [
  { id: 'overview', title: 'Overview', icon: BookOpen },
  { id: 'getting-started', title: 'Getting Started', icon: PenLine, badge: 'Start here' },
  { id: 'editor', title: 'The Editor', icon: PenLine },
  { id: 'story-intelligence', title: 'Story Intelligence', icon: MapPin },
  { id: 'ai-agent', title: 'AI Agent', icon: Bot },
  { id: 'export-import', title: 'Export & Import', icon: Download },
  { id: 'settings', title: 'Settings Guide', icon: Settings },
  { id: 'shortcuts', title: 'Keyboard Shortcuts', icon: Keyboard },
  { id: 'tips', title: 'Tips & Tricks', icon: Lightbulb },
]

// ── Shared sub-components ───────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-100 mb-3">
      {children}
    </h2>
  )
}

function SubTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-200 mt-5 mb-2">
      {children}
    </h3>
  )
}

function P({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed mb-2">
      {children}
    </p>
  )
}

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center rounded border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[11px] font-mono text-stone-700 dark:text-stone-300 mx-0.5">
      {children}
    </kbd>
  )
}

function CodeBlock({ children }: { children: React.ReactNode }) {
  return (
    <pre className="rounded-md bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700 p-3 text-xs font-mono text-stone-700 dark:text-stone-300 overflow-x-auto mb-3">
      {children}
    </pre>
  )
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-amber-200 dark:border-amber-800 bg-amber-50/40 dark:bg-amber-950/20 mb-3">
      <CardContent className="p-3">
        <p className="text-xs font-semibold text-amber-700 dark:text-amber-400 mb-1">{title}</p>
        <div className="text-xs text-amber-600/90 dark:text-amber-300/80 leading-relaxed">
          {children}
        </div>
      </CardContent>
    </Card>
  )
}

// ── Page content renderers ──────────────────────────────────────────────────

function OverviewPage() {
  return (
    <>
      <SectionTitle>What is Open Writer?</SectionTitle>
      <P>
        Open Writer is a local-first creative writing studio designed for novelists, screenwriters,
        and world-builders. Everything lives on your machine — your words, your characters, your
        worlds — so you never depend on a server to write.
      </P>

      <SubTitle>Local-First Philosophy</SubTitle>
      <P>
        Your manuscript is stored in a local SQLite database via Prisma ORM. No cloud lock-in, no
        subscription walls, no &quot;server down&quot; interruptions. You own your data completely.
        Backups and exports are always under your control.
      </P>
      <InfoCard title="Why local-first?">
        Traditional writing apps tether your work to the cloud. If the service shuts down, raises
        prices, or suffers an outage, your creative flow stops. Open Writer keeps everything
        on-device so you can write anywhere, anytime — online or off.
      </InfoCard>

      <SubTitle>Core Features</SubTitle>
      <div className="space-y-2 mb-3">
        {[
          ['TipTap Rich Editor', 'Full formatting, focus mode, typewriter scrolling'],
          ['Story Intelligence', 'Characters, locations, objects, world building, timeline'],
          ['AI Writing Agent', 'Context-aware assistant with configurable permission levels'],
          ['Multi-format Export', 'DOCX, PDF, EPUB, Markdown, HTML, TXT, JSON'],
          ['Version History', 'Automatic snapshots with diff comparison'],
          ['Writing Sprints', 'Timed sessions with word-count goals and streaks'],
          ['Global Search', 'Search across all chapters, characters, and notes instantly'],
          ['Command Palette', 'Quick actions via Ctrl+K — navigate, format, and more'],
        ].map(([title, desc]) => (
          <div key={title} className="flex items-start gap-2">
            <ChevronRight className="size-3.5 text-amber-500 mt-1 shrink-0" />
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{title}</span>
              <span className="text-sm text-stone-500 dark:text-stone-400"> — {desc}</span>
            </div>
          </div>
        ))}
      </div>

      <SubTitle>Technology Stack</SubTitle>
      <P>
        Built with Next.js 16, TypeScript, TipTap, Prisma (SQLite), Zustand, and shadcn/ui.
        The entire app runs in a single process with no external database or caching server required.
      </P>
    </>
  )
}

function GettingStartedPage() {
  return (
    <>
      <SectionTitle>Getting Started</SectionTitle>

      <SubTitle>Creating a Project</SubTitle>
      <P>
        When you first open Open Writer, you&apos;ll see the Project Picker. Click <strong>&quot;New Project&quot;</strong> and
        give it a name — that&apos;s it. A project is a self-contained universe: it holds your chapters,
        characters, locations, objects, timeline, and notes. You can have multiple projects and switch
        between them anytime.
      </P>

      <SubTitle>Your First Chapter</SubTitle>
      <P>
        After creating a project, the left sidebar shows a chapter tree. Click the <strong>+</strong> button
        next to the project name to add your first chapter. Each chapter contains one or more <em>scenes</em> —
        think of scenes as the individual building blocks of your chapter. Add a scene inside a chapter
        and start writing.
      </P>
      <InfoCard title="Tip: Scene-based writing">
        Breaking chapters into scenes helps with reordering, per-scene word counts, and focused
        editing. You can drag scenes to rearrange them or move them between chapters.
      </InfoCard>

      <SubTitle>Writing Basics</SubTitle>
      <P>
        Click any scene in the chapter tree to open it in the editor. The TipTap editor provides
        a distraction-free writing experience with full rich-text formatting. Use the floating
        toolbar or keyboard shortcuts to format as you go.
      </P>
      <P>
        The status bar at the bottom shows your current word count, character count, and
        estimated reading time in real time.
      </P>

      <SubTitle>Auto-Save</SubTitle>
      <P>
        Your work is saved automatically as you type. There&apos;s no save button because
        you should never have to think about saving. Every keystroke is persisted to the
        local database within milliseconds. You can also press <Kbd>Ctrl</Kbd><Kbd>S</Kbd> to
        force a save at any time.
      </P>

      <SubTitle>Next Steps</SubTitle>
      <div className="space-y-1.5">
        {[
          'Define your main characters in the Characters panel',
          'Set up key locations in the Locations panel',
          'Create timeline events to track your story chronology',
          'Try the AI Agent for writing suggestions',
          'Customize editor settings to match your workflow',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span>{step}</span>
          </div>
        ))}
      </div>
    </>
  )
}

function EditorPage() {
  return (
    <>
      <SectionTitle>The Editor</SectionTitle>
      <P>
        The heart of Open Writer is the TipTap-based rich-text editor. It supports full formatting,
        drag-and-drop, and several modes designed to help you stay in the zone.
      </P>

      <SubTitle>Formatting Options</SubTitle>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          ['Bold', 'Ctrl+B'],
          ['Italic', 'Ctrl+I'],
          ['Strikethrough', 'Ctrl+Shift+X'],
          ['Underline', 'Ctrl+U'],
          ['Heading 1–3', '# ## ###'],
          ['Blockquote', '> prefix'],
          ['Bullet list', '- prefix'],
          ['Ordered list', '1. prefix'],
          ['Code block', '``` prefix'],
          ['Horizontal rule', '--- prefix'],
        ].map(([label, key]) => (
          <div key={label} className="flex items-center justify-between rounded-md border border-stone-200 dark:border-stone-700 px-2 py-1.5 text-xs">
            <span className="text-stone-700 dark:text-stone-300">{label}</span>
            <span className="font-mono text-stone-500 dark:text-stone-400">{key}</span>
          </div>
        ))}
      </div>

      <SubTitle>Focus Mode</SubTitle>
      <P>
        Toggle focus mode to dim everything except the current paragraph. This is ideal for
        first-draft writing where you want to silence the inner editor. Activate it from
        the editor toolbar or press <Kbd>Ctrl</Kbd><Kbd>Shift</Kbd><Kbd>F</Kbd>.
      </P>

      <SubTitle>Typewriter Mode</SubTitle>
      <P>
        In typewriter mode, the line you&apos;re typing stays vertically centered on screen — just
        like a real typewriter. This reduces eye movement and creates a satisfying, rhythmic
        writing experience. Toggle it in Editor Settings.
      </P>

      <SubTitle>Floating Toolbar</SubTitle>
      <P>
        Select any text to reveal the floating toolbar with quick formatting actions: bold, italic,
        strikethrough, link, and heading conversion. The toolbar appears contextually and never
        blocks your view.
      </P>

      <SubTitle>Word Targets</SubTitle>
      <P>
        Set a daily or session word-count target in the Goals panel. Open Writer tracks your progress
        and shows a visual indicator in the status bar. Hit your target and keep the streak alive!
      </P>

      <SubTitle>Distraction-Free Fullscreen</SubTitle>
      <P>
        Press <Kbd>F11</Kbd> to enter browser fullscreen, or use the sidebar collapse button to
        hide navigation. Combine with focus mode and typewriter mode for maximum immersion.
      </P>
    </>
  )
}

function StoryIntelligencePage() {
  return (
    <>
      <SectionTitle>Story Intelligence</SectionTitle>
      <P>
        Story Intelligence is Open Writer&apos;s system for tracking the people, places, and things
        that make up your fictional world. All of these entities are interconnected and searchable.
      </P>

      <SubTitle>Characters</SubTitle>
      <P>
        Create character profiles with name, role (protagonist, antagonist, supporting, minor),
        description, and a detailed backstory. Characters can be linked to timeline events and
        locations. The Relationships panel lets you define how characters relate to each other
        (ally, rival, family, mentor, etc.).
      </P>

      <SubTitle>Locations</SubTitle>
      <P>
        Define the places in your world — cities, rooms, landscapes, planets. Each location
        has a description and can be linked to scenes and timeline events. Use locations to
        maintain spatial consistency and avoid continuity errors.
      </P>

      <SubTitle>Objects</SubTitle>
      <P>
        Track important items: the hero&apos;s sword, the mysterious letter, the stolen artifact.
        Objects have descriptions and can be linked to characters (who possesses them) and
        timeline events (when they appear or change hands).
      </P>

      <SubTitle>World Building</SubTitle>
      <P>
        The Worlds panel is for larger-scale world-building notes: magic systems, political
        structures, historical eras, cultural norms. Create named worlds and attach freeform
        notes to each one. This is your encyclopedia.
      </P>

      <SubTitle>Timeline</SubTitle>
      <P>
        The timeline provides a chronological view of your story events. Add events with dates,
        descriptions, and linked characters/locations. The timeline automatically sorts by date
        and helps you spot anachronisms and plot holes. Use it for both in-story chronology and
        backstory events.
      </P>

      <InfoCard title="Cross-referencing">
        Every entity — character, location, object, event — can reference any other entity. This
        web of relationships is what makes Story Intelligence powerful. When you write a scene,
        you can quickly look up which characters are present and where they are in the timeline.
      </InfoCard>

      <SubTitle>Notes</SubTitle>
      <P>
        Attach freeform notes to any entity or to the project itself. Notes support rich text
        and can be marked as resolved (for tracking plot threads and TODOs). The Notes panel
        aggregates all notes in one place for easy review.
      </P>
    </>
  )
}

function AIAgentPage() {
  return (
    <>
      <SectionTitle>AI Writing Agent</SectionTitle>
      <P>
        The AI Agent is your context-aware writing assistant. It understands your characters,
        locations, and current scene to provide relevant suggestions — not generic filler.
      </P>

      <SubTitle>How It Works</SubTitle>
      <P>
        When you send a prompt or use a quick action, the agent receives: your current scene text,
        the characters in your project, relevant timeline context, and your instructions. It then
        generates a response tailored to your story. Suggestions appear in the Agent panel and can
        be applied directly to the editor or dismissed.
      </P>

      <SubTitle>Quick Actions</SubTitle>
      <div className="space-y-2 mb-3">
        {[
          ['Continue Writing', 'Extends your scene in the same voice and style'],
          ['Rewrite Selection', 'Improves clarity, flow, and impact of selected text'],
          ['Analyze Character', 'Examines a character\'s arc, motivations, and development'],
          ['Check Continuity', 'Flags plot holes, contradictions, and inconsistencies'],
          ['Generate Synopsis', 'Summarizes the current chapter or scene'],
          ['Suggest Dialogue', 'Proposes dialogue that fits characters and situation'],
        ].map(([action, desc]) => (
          <div key={action} className="flex items-start gap-2">
            <ChevronRight className="size-3.5 text-emerald-500 mt-1 shrink-0" />
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{action}</span>
              <span className="text-sm text-stone-500 dark:text-stone-400"> — {desc}</span>
            </div>
          </div>
        ))}
      </div>

      <SubTitle>Permission Levels</SubTitle>
      <P>
        You control what the AI can do. Three permission levels keep you in charge:
      </P>
      <div className="space-y-2 mb-3">
        {[
          ['Read-Only', 'The agent can read your manuscript but cannot modify it. Suggestions appear for review.', 'border-stone-300 dark:border-stone-600'],
          ['Suggest', 'The agent can propose edits. You choose whether to apply each suggestion.', 'border-amber-300 dark:border-amber-700'],
          ['Write', 'The agent can directly insert text into the editor. Use with caution.', 'border-rose-300 dark:border-rose-700'],
        ].map(([level, desc, border]) => (
          <Card key={level} className={`border ${border}`}>
            <CardContent className="p-3">
              <Badge variant="outline" className="text-[10px] mb-1">{level}</Badge>
              <p className="text-xs text-stone-600 dark:text-stone-400">{desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SubTitle>Privacy</SubTitle>
      <P>
        When using a remote AI provider (e.g. Z.ai), your text is sent to the provider for processing.
        An amber indicator appears at the bottom of the Agent panel when this is the case. All data
        transmission uses encrypted connections. You can switch to a local provider or disable AI
        entirely in Settings.
      </P>
    </>
  )
}

function ExportImportPage() {
  return (
    <>
      <SectionTitle>Export & Import</SectionTitle>
      <P>
        Open Writer supports a wide range of formats for both export and import, ensuring
        you can move your work in and out freely.
      </P>

      <SubTitle>Supported Export Formats</SubTitle>
      <div className="grid grid-cols-1 gap-2 mb-3">
        {[
          ['DOCX', 'Microsoft Word format. Best for sharing with editors and publishers.'],
          ['PDF', 'Portable Document Format. Ideal for print-ready output and sharing read-only copies.'],
          ['EPUB', 'Electronic publication format. Read on Kindle, Apple Books, Kobo, and other e-readers.'],
          ['Markdown', 'Plain text with formatting syntax. Perfect for blogs, GitHub, and version control.'],
          ['HTML', 'Web-ready formatted output. Use for web publishing or further styling.'],
          ['TXT', 'Plain text with no formatting. Maximum compatibility.'],
          ['JSON', 'Structured data export. Includes chapters, characters, and all story intelligence data.'],
        ].map(([fmt, desc]) => (
          <div key={fmt} className="flex items-start gap-3 rounded-md border border-stone-200 dark:border-stone-700 p-2.5">
            <Badge variant="secondary" className="text-[10px] font-mono shrink-0 mt-0.5">{fmt}</Badge>
            <span className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed">{desc}</span>
          </div>
        ))}
      </div>

      <SubTitle>How to Export</SubTitle>
      <P>
        Click the <strong>Export</strong> button in the top bar or use the Export panel in the
        right sidebar. Choose your format, configure any options (page size for PDF, metadata for
        EPUB), and click export. The file downloads to your default downloads folder.
      </P>

      <SubTitle>Import</SubTitle>
      <P>
        The Import panel accepts Markdown, TXT, and DOCX files. When you import a document,
        Open Writer creates a new chapter with the file content. For DOCX, basic formatting
        (bold, italic, headings) is preserved. You can also paste text directly into a new scene.
      </P>

      <InfoCard title="JSON export is a full backup">
        The JSON format exports your entire project — all chapters, scenes, characters, locations,
        objects, timeline events, notes, and world-building data. You can use this as a portable
        backup or to migrate between machines.
      </InfoCard>
    </>
  )
}

function SettingsPage() {
  return (
    <>
      <SectionTitle>Settings Guide</SectionTitle>

      <SubTitle>Editor Settings</SubTitle>
      <P>
        Configure the writing experience to match your preferences:
      </P>
      <div className="space-y-2 mb-3">
        {[
          ['Font family', 'Choose from a curated list of writing-optimized fonts (Merriweather, Lora, Georgia, etc.)'],
          ['Font size', 'Adjust from 12px to 24px. Default is 16px.'],
          ['Line height', 'Set line spacing from 1.2 to 2.0. Default is 1.75 for comfortable reading.'],
          ['Focus mode', 'Toggle paragraph-level focus dimming.'],
          ['Typewriter mode', 'Keep the active line centered on screen.'],
          ['Spell check', 'Enable or disable browser-native spell checking.'],
        ].map(([setting, desc]) => (
          <div key={setting} className="flex items-start gap-2">
            <ChevronRight className="size-3.5 text-amber-500 mt-1 shrink-0" />
            <div>
              <span className="text-sm font-medium text-stone-800 dark:text-stone-200">{setting}</span>
              <span className="text-sm text-stone-500 dark:text-stone-400"> — {desc}</span>
            </div>
          </div>
        ))}
      </div>

      <SubTitle>Theme</SubTitle>
      <P>
        Switch between Light, Dark, and System themes. The theme applies instantly to all panels,
        the editor, and the sidebar. Dark mode uses a warm stone palette to reduce eye strain
        during long writing sessions.
      </P>

      <SubTitle>AI Provider</SubTitle>
      <P>
        Configure which AI service the writing agent uses. Options include:
      </P>
      <div className="space-y-1.5 mb-3">
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">Z.ai</Badge>
          <span className="text-xs text-stone-600 dark:text-stone-400">Cloud-based, high-quality suggestions. Requires internet.</span>
        </div>
        <div className="flex items-start gap-2">
          <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">None</Badge>
          <span className="text-xs text-stone-600 dark:text-stone-400">Disable AI features entirely. All writing stays offline.</span>
        </div>
      </div>

      <SubTitle>Storage</SubTitle>
      <P>
        All project data is stored in a local SQLite database managed by Prisma. You can find
        the database file at the project root. Use the Backup panel to create manual snapshots
        or restore from a previous backup. The Versions panel tracks scene-level edit history
        with automatic snapshots.
      </P>
    </>
  )
}

function ShortcutsPage() {
  const shortcuts = [
    { category: 'General', items: [
      ['Ctrl + K', 'Open command palette'],
      ['Ctrl + \\', 'Toggle sidebar'],
      ['Ctrl + S', 'Force save'],
      ['Ctrl + ,', 'Open settings'],
      ['Ctrl + P', 'Quick switch project'],
      ['Ctrl + F', 'Find in scene'],
      ['Ctrl + H', 'Find and replace'],
    ]},
    { category: 'Editor', items: [
      ['Ctrl + B', 'Bold'],
      ['Ctrl + I', 'Italic'],
      ['Ctrl + U', 'Underline'],
      ['Ctrl + Shift + X', 'Strikethrough'],
      ['Ctrl + Z', 'Undo'],
      ['Ctrl + Shift + Z', 'Redo'],
      ['Ctrl + Shift + 1–3', 'Heading level 1–3'],
      ['Ctrl + Shift + F', 'Toggle focus mode'],
    ]},
    { category: 'Navigation', items: [
      ['Ctrl + G', 'Go to chapter/scene'],
      ['Ctrl + Shift + K', 'Search all content'],
      ['Alt + ↑ / ↓', 'Move scene up/down'],
    ]},
    { category: 'Panels', items: [
      ['Ctrl + Shift + C', 'Toggle characters panel'],
      ['Ctrl + Shift + L', 'Toggle locations panel'],
      ['Ctrl + Shift + T', 'Toggle timeline panel'],
      ['Ctrl + Shift + A', 'Toggle AI agent panel'],
    ]},
    { category: 'Writing', items: [
      ['Ctrl + Enter', 'Start writing sprint'],
      ['Ctrl + Shift + E', 'Export current project'],
      ['F11', 'Browser fullscreen'],
    ]},
  ]

  return (
    <>
      <SectionTitle>Keyboard Shortcuts</SectionTitle>
      <P>
        Master these shortcuts to navigate and write without reaching for the mouse.
        All shortcuts work across the application.
      </P>

      <div className="space-y-4">
        {shortcuts.map(({ category, items }) => (
          <div key={category}>
            <SubTitle>{category}</SubTitle>
            <div className="space-y-1">
              {items.map(([key, desc]) => (
                <div
                  key={key}
                  className="flex items-center justify-between rounded-md border border-stone-200 dark:border-stone-700 px-3 py-1.5"
                >
                  <span className="text-xs text-stone-600 dark:text-stone-400">{desc}</span>
                  <div className="flex items-center gap-0.5">
                    {key.split(' + ').map((part, i) => (
                      <span key={i} className="flex items-center gap-0.5">
                        {i > 0 && <span className="text-stone-400 dark:text-stone-500 text-[10px]">+</span>}
                        <kbd className="inline-flex items-center rounded border border-stone-300 dark:border-stone-600 bg-stone-100 dark:bg-stone-800 px-1.5 py-0.5 text-[10px] font-mono text-stone-700 dark:text-stone-300">
                          {part}
                        </kbd>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}

function TipsPage() {
  return (
    <>
      <SectionTitle>Tips & Tricks</SectionTitle>

      <SubTitle>Writing Flow</SubTitle>
      <div className="space-y-2 mb-3">
        {[
          'Start every session with a writing sprint (5–10 minutes, no editing) to warm up.',
          'Use typewriter mode + focus mode together for maximum immersion.',
          'Set a daily word goal that\'s slightly ambitious — stretch goals build habits.',
          'Don\'t edit while writing first drafts. Use the AI agent\'s "Continue Writing" to keep momentum.',
          'Write out of order. If a later scene is clearer in your mind, write it first.',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{tip}</span>
          </div>
        ))}
      </div>

      <SubTitle>Organization</SubTitle>
      <div className="space-y-2 mb-3">
        {[
          'Define characters before writing their first scene — the AI agent uses character data for better suggestions.',
          'Use timeline events as chapter milestones. This creates a natural outline you can reference.',
          'Link every note to an entity. Orphaned notes get lost; linked notes stay discoverable.',
          'Use the "Check Continuity" AI action after major edits to catch accidental contradictions.',
          'Tag locations with sensory details (smells, sounds, lighting) for richer scene descriptions.',
        ].map((tip, i) => (
          <div key={i} className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-flex items-center justify-center size-5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold shrink-0 mt-0.5">
              {i + 1}
            </span>
            <span className="leading-relaxed">{tip}</span>
          </div>
        ))}
      </div>

      <SubTitle>Workflow Suggestions</SubTitle>
      <div className="space-y-2 mb-3">
        {[
          'The Outliner: Create all chapters and scenes as empty containers first, then fill them in any order.',
          'The Sprinter: Set 25-minute sprints with 5-minute breaks (Pomodoro). Track streaks to build consistency.',
          'The World-Builder: Fill out characters, locations, and timeline before writing a single scene.',
          'The Pantser: Just write. Use the AI agent and Story Intelligence retroactively to organize later.',
          'The Editor: Write in focus mode, then switch to normal mode for revision passes.',
        ].map(([label, desc], i) => (
          <div key={i} className="rounded-md border border-stone-200 dark:border-stone-700 p-2.5">
            <span className="text-xs font-semibold text-stone-800 dark:text-stone-200">{label}</span>
            <span className="text-xs text-stone-500 dark:text-stone-400"> — {desc}</span>
          </div>
        ))}
      </div>

      <SubTitle>Keyboard Power Moves</SubTitle>
      <P>
        Press <Kbd>Ctrl</Kbd><Kbd>K</Kbd> to open the command palette — from here you can
        navigate to any chapter, toggle panels, change settings, and execute AI actions
        without touching the mouse. Combine with <Kbd>Ctrl</Kbd><Kbd>\\</Kbd> to toggle the sidebar
        for a fast, keyboard-only workflow.
      </P>

      <InfoCard title="The most important tip">
        The best writing app is the one that gets out of your way. Configure your environment
        once — font, theme, focus mode — then let muscle memory take over. Open Writer is
        designed to disappear so your story is all that remains.
      </InfoCard>
    </>
  )
}

// ── Page content map ────────────────────────────────────────────────────────

const PAGE_CONTENT: Record<string, () => React.ReactNode> = {
  'overview': OverviewPage,
  'getting-started': GettingStartedPage,
  'editor': EditorPage,
  'story-intelligence': StoryIntelligencePage,
  'ai-agent': AIAgentPage,
  'export-import': ExportImportPage,
  'settings': SettingsPage,
  'shortcuts': ShortcutsPage,
  'tips': TipsPage,
}

// ── Main component ──────────────────────────────────────────────────────────

export function DocsPanel() {
  const [selected, setSelected] = useState('overview')

  const ContentComponent = PAGE_CONTENT[selected]

  return (
    <div className="flex h-full bg-background">
      {/* Left navigation */}
      <div className="w-48 shrink-0 border-r">
        <div className="px-3 py-2.5 border-b">
          <div className="flex items-center gap-2">
            <BookOpen className="size-4 text-amber-600" />
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              Documentation
            </span>
          </div>
        </div>
        <ScrollArea className="h-[calc(100%-41px)]">
          <nav className="p-2 space-y-0.5">
            {PAGES.map((page) => {
              const isActive = selected === page.id
              return (
                <button
                  key={page.id}
                  onClick={() => setSelected(page.id)}
                  className={`w-full flex items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs transition-colors ${
                    isActive
                      ? 'bg-amber-100/80 dark:bg-amber-900/30 text-amber-900 dark:text-amber-200 font-medium'
                      : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800/50 hover:text-stone-900 dark:hover:text-stone-200'
                  }`}
                >
                  <page.icon className={`size-3.5 shrink-0 ${isActive ? 'text-amber-600' : ''}`} />
                  <span className="truncate">{page.title}</span>
                  {page.badge && (
                    <Badge
                      variant="secondary"
                      className="text-[9px] px-1 py-0 ml-auto shrink-0 bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 border-0"
                    >
                      {page.badge}
                    </Badge>
                  )}
                </button>
              )
            })}
          </nav>
        </ScrollArea>
      </div>

      {/* Right content area */}
      <ScrollArea className="flex-1">
        <div className="p-5 max-w-2xl">
          {ContentComponent && <ContentComponent />}
        </div>
      </ScrollArea>
    </div>
  )
}
