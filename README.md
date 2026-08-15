# Open Writer

**Local-first, open-source writing studio with story intelligence**

[![Open Source](https://img.shields.io/badge/Open_Source-Yes-21c55e?style=flat-square)](https://github.com/open-writer/open-writer)
[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL--3.0-0ea5e9?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![Next.js 16](https://img.shields.io/badge/Next.js-16-000000?style=flat-square)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?style=flat-square)](https://www.typescriptlang.org/)

---

## Features

### Local-First & Offline

- **Local-first storage** -- Your data stays on your machine by default
- **Offline-capable** -- Write anywhere, anytime, without an internet connection
- **No account required** -- Start writing immediately, no sign-up or cloud dependency

### Story Intelligence

- **Characters** -- Create and manage detailed character profiles with traits, backstory, and arcs
- **Locations** -- Build your world with rich location entries and descriptions
- **Objects** -- Track important items, artifacts, and their significance
- **World-building** -- Organize lore, rules, and systems for your fictional universe
- **Timeline** -- Visualize and manage the chronological sequence of events
- **Relationships** -- Map connections between characters, locations, and objects

### Writing Tools

- **AI Writing Assistant** -- Optional AI-powered suggestions, continuation, and analysis
- **Rich Text Editor** -- Full-featured editor based on TipTap with formatting, headings, and more
- **Version History** -- Track every change and restore previous versions
- **Focus & Typewriter Mode** -- Distraction-free writing with typewriter-style scrolling
- **Writing Goals & Sprints** -- Set word count targets and timed writing sessions

### Export & Import

- **Export formats** -- DOCX, PDF, EPUB, Markdown, HTML, TXT, JSON
- **Import support** -- Markdown, plain text, JSON
- **Backup & Restore** -- Full project backup with one-click restore

### Customization

- **Dark/Light Theme** -- System-aware theme with manual toggle
- **Project Health Monitor** -- Track writing progress, consistency, and project completeness
- **3-Panel Layout** -- Resizable sidebar, editor, and detail panels for efficient workflow

---

## Tech Stack

| Category         | Technology                                          |
| ---------------- | --------------------------------------------------- |
| Framework        | [Next.js 16](https://nextjs.org/) (App Router)      |
| Language         | [TypeScript 5](https://www.typescriptlang.org/)      |
| Editor           | [TipTap](https://tiptap.dev/)                       |
| Database         | [Prisma](https://www.prisma.io/) / SQLite            |
| State Management | [Zustand](https://zustand-demo.pmnd.rs/)             |
| UI Components    | [shadcn/ui](https://ui.shadcn.com/)                  |
| Styling          | [Tailwind CSS 4](https://tailwindcss.com/)           |
| Theming          | [next-themes](https://github.com/nextauthjs/next-themes) |

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 18 or later
- [Bun](https://bun.sh/) runtime

### Installation

```bash
# Clone the repository
git clone https://github.com/open-writer/open-writer.git
cd open-writer

# Install dependencies
bun install

# Push database schema
bun run db:push

# Start the development server
bun run dev
```

The application will be available at `http://localhost:3000`.

### Build for Production

```bash
bun run build
bun start
```

---

## Architecture

### Three-Panel Layout

Open Writer uses a resizable three-panel layout optimized for long-form writing:

1. **Left Sidebar** -- Project navigation, chapter tree, entity panels, search
2. **Center Editor** -- Rich text editor with toolbar, focus mode, and typewriter mode
3. **Right Detail Panel** -- Character details, location info, AI assistant, comments

### Local-First Storage

All project data is stored locally using SQLite via Prisma ORM. There is no cloud dependency. Your writing data remains on your machine at all times. Optional AI features make network requests only when explicitly invoked by the user.

### AI Provider Abstraction

The AI assistant uses a provider abstraction layer, allowing integration with different AI backends. The default provider can be swapped without changing application code. AI features are strictly opt-in -- no data is sent anywhere unless you explicitly request it.

---

## Documentation

- [Contributing Guide](./CONTRIBUTING.md) -- How to contribute to Open Writer
- [Security Policy](./SECURITY.md) -- Reporting vulnerabilities and security practices
- [Changelog](./CHANGELOG.md) -- Release history and changes

---

## License

Open Writer is licensed under the [GNU Affero General Public License v3.0](./LICENSE).

This means you can freely use, modify, and distribute Open Writer, but any modified versions that are network-accessible must also make their source code available under the same license.

---

## Contributing

We welcome contributions of all kinds. Please read our [Contributing Guide](./CONTRIBUTING.md) to get started.

Whether you are fixing a bug, adding a feature, improving documentation, or sharing feedback -- your help makes Open Writer better for everyone.
