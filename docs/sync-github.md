# Private GitHub storage (cloud sync)

Open Writer's "private cloud storage" feature backs your projects up to a
**private GitHub repository** and synchronizes them across your devices —
while keeping the app fully local-first and working entirely on GitHub Pages
(no server, no secrets in the frontend).

The user experience is deliberately non-technical:

```
Settings → Storage → Connect GitHub → authorize → "Synced"
```

No Git commands, no repository setup, no branches. A new project is saved
locally the instant you create it; the cloud copy follows in the background.

## How it works

```
You type → saved locally (IndexedDB) immediately
        → 30s of quiet → export project → compress (gzip) → encrypt (optional)
        → content-addressed chunks (SHA-256) → upload only changed chunks
        → snapshot manifest + project index → verify → "Synced"
```

### Repository layout (one private repo, many projects)

```
open-writer-storage/            (private, created automatically)
├─ open-writer/meta.json         storage marker + schema + device id
├─ open-writer/projects/index.json  every project + latest version + checksum
├─ open-writer/snapshots/<projectId>/<version>.json   snapshot manifests
└─ open-writer/objects/<ab>/<sha256>.json             compressed chunks
```

- **Deduplication** — chunks are content-addressed, so editing one scene
  uploads only the chunks that changed. On a second device the remote tree is
  merged into the local chunk index first, so it never re-uploads what the
  first device already stored.
- **Integrity** — every snapshot carries a SHA-256 checksum verified on
  download; a corrupt or incomplete remote snapshot is never restored.
- **Encryption** — optional (Settings → Advanced) with a passphrase;
  AES-256-GCM, PBKDF2 key derivation, salt derived from the content checksum.
  Nothing but the ciphertext ever leaves the device.
- **Offline-first** — writing always works offline; changes sync automatically
  when the connection returns. Failures retry with exponential backoff and
  never touch your local data.
- **Conflicts** — if the same project changed on two devices, both versions
  are kept and you choose: *Keep this version*, *Keep the other version*, or
  *Save both versions* (the remote one becomes a new project).

### Authorization

- **Device flow (one click)** — no redirect URLs and no client secret needed,
  so it works on GitHub Pages. To enable it, register a GitHub App with the
  device flow enabled and rebuild with:
  ```
  NEXT_PUBLIC_SYNC_CLIENT_ID=Iv1_xxxx bun run build
  ```
  Tokens are short-lived (8 h) with a refresh token; they live only in memory
  and sessionStorage — never in localStorage, project data, or logs.
- **Token fallback** — without a client id, Connect GitHub offers a one-time
  fine-grained personal access token paste (Settings → Developer settings →
  Fine-grained tokens; scope: a single private repo you choose).

### Build-time overrides (optional)

| Env var | Default |
|---|---|
| `NEXT_PUBLIC_SYNC_CLIENT_ID` | *(empty → token fallback)* |
| `NEXT_PUBLIC_SYNC_API_BASE` | `https://api.github.com` |
| `NEXT_PUBLIC_SYNC_WEB_BASE` | `https://github.com` |
| `NEXT_PUBLIC_SYNC_REPO` | `open-writer-storage` |

### Status states (plain language)

`Local only` · `Syncing…` · `Synced` · `Offline — saved on this device` ·
`Sync paused` · `Needs attention` · `Conflict detected` · `Storage is full
for now`. Each state in Settings → Storage explains what happened, what it
means, what Open Writer is doing, and what you can do.

## Verification

Headless end-to-end suite (30 checks) against a local mock GitHub server:

```bash
node scripts/mock-github.mjs 9801 &   # mock GitHub API + OAuth
bun scripts/test-sync.ts              # device flow, repo creation, dedup,
                                      # delta sync, cross-device handoff,
                                      # conflict + 3 resolutions, encryption,
                                      # offline, disconnect
```

The suite covers: device-flow authorization, automatic private-repo creation,
initial verified backup, no-op sync, delta sync (only changed chunks), second
device discovery + restore, cross-device dedup, auto-pull, conflict detection
and resolution, encryption round-trip + integrity, offline behavior, and
disconnect semantics. The same flows were verified live in the browser against
the mock (connect → code → authorize → repo created → project synced → status
"Synced").

## Privacy & security notes

- The storage repository is **private** and identified by a marker; Open
  Writer refuses to touch a repository that isn't its own.
- Disconnecting stops sync on that device but never deletes the remote copy.
- Deleting the remote copy is a manual, deliberate GitHub action.
- Requests use the absolute minimum permissions (create + write a single
  private repo; contents + git trees only).
- Rate limits are respected (per-window counters, "Storage is full for now"
  state with automatic retry).
