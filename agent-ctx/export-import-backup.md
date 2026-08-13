# Task: Export, Import, and Backup Features for Open Writer

## Summary

Built comprehensive export, import, and backup functionality for the Next.js 16 writing studio.

## Packages Installed
- `docx@9.7.1` — DOCX generation
- `epub-gen-memory@1.1.2` — EPUB generation

## Export API Routes (6 formats)
- `/api/export/markdown` — GET, exports project as Markdown with # chapter and ## scene headers
- `/api/export/json` — GET, exports full project archive as JSON (all entities)
- `/api/export/docx` — POST, generates Word document with docx package
- `/api/export/epub` — POST, generates EPUB e-book with epub-gen-memory
- `/api/export/html` — GET, generates clean HTML with embedded CSS
- `/api/export/txt` — GET, plain text with stripped HTML tags

## Import API Routes (3 formats)
- `/api/import/markdown` — POST, parses H1=Chapter, H2=Scene, creates chapters/scenes
- `/api/import/json` — POST, upserts all entities from JSON archive (characters, locations, objects, world elements, timeline events, chapters, scenes, notes, relationships)
- `/api/import/text` — POST, creates single chapter+scene from plain text

## Backup API Routes
- `/api/backup` — POST creates backup with SHA-256 checksum, GET lists backups
- `/api/backup/[id]` — GET retrieves backup, PUT restores (with checksum verification), DELETE removes

## UI Components
- `export-panel.tsx` — Format dropdown, export button, download via blob URL
- `import-panel.tsx` — Drag & drop file upload, preview, confirmation dialog
- `backup-panel.tsx` — Create/list/restore/download/delete backups with confirmations

## Integration
- Settings dialog: Added Export, Import, Backup tabs with new icons
- Command palette: Export, Import, Backup commands now open settings to specific tabs
- Writer store: Added `settingsTab` state and updated `setSettingsOpen` to accept optional tab parameter
