# Open Writer — Security Model

## Threat model

Open Writer is a **static client-side application**. There is no server,
no database, no accounts. The attack surface is therefore the browser and
the user's own data.

## Data handling

- All manuscript data is stored in the browser's IndexedDB
  (database `open-writer`). It never leaves the browser except when the
  user explicitly exports/backs up, or explicitly invokes AI.
- UI state persists in `localStorage` (`openwriter-*` keys).
- AI is disabled by default. When enabled, the user provides the endpoint
  and optional API key in Settings → AI. The key is stored in
  `localStorage` (same trust level as any web app) and is sent **only** to
  the configured endpoint as a `Bearer` token. It is never sent to
  Open Writer infrastructure (there is none).
- Privacy indicator text in the AI panel reflects the configured provider.

## No secrets in the repository

- `.env` is untracked (was removed; history contains only a sandbox SQLite
  path, no credentials).
- No API keys, tokens, or credentials exist in the working tree or in git
  history (scanned with grep for `sk-`, `ghp_`, `AIza`, Bearer tokens,
  private keys — zero matches).
- The Pages workflow does not require secrets.

## Client-side input handling

- Imported archives (Markdown/JSON/text) are parsed with plain text
  parsers; no executable content is ever run. There is no path traversal
  surface (no file writes).
- Export content is escaped for HTML outputs; scene HTML content is
  rendered as authored (TipTap output), consistent with any rich-text app.

## Supply chain

- Dependencies are audited in CI (`bun audit`; non-blocking).
- Dependencies were trimmed: `prisma`, `@prisma/client`, `next-auth`,
  `z-ai-web-dev-sdk` (Node-only), `epub-gen-memory`, `sharp` removed.
- `bun.lock` is committed and CI installs with `--frozen-lockfile`.

## Known risks

1. `localStorage` AI keys are readable by any script running on the same
   origin. On GitHub Pages the origin is shared only with this app.
2. Rich text content is rendered as HTML in the editor (TipTap sanitizes
   by default); exported HTML files are user-owned.
3. No CSP headers are set (static hosting limitation; acceptable for an
   app with no remote content loading).

## Sanitization gate

Release gate question: *"Would it be safe for an unknown person to inspect
every file, asset, commit, workflow and artifact in this repository?"*
— Yes, verified by the secret scans described above.
