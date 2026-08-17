# GitHub Storage — Architecture

Open Writer's private cloud storage is an **optional, user-controlled layer**
on top of a fully local-first application. It is deliberately separate from
the public `Alot1z/open-writer` source repository: user data never touches the
source repo, and the source repo never touches user data.

```
Open Writer (Web on GitHub Pages / Windows desktop)
   │
   ├─ local-first domain + IndexedDB (always on, never blocked)
   │
   └─ optional: GitHub storage engine
        ├─ device-flow auth (public-client OAuth, no secret in frontend)
        ├─ automatic private repo (create / discover / marker-protected)
        ├─ snapshot manifest + content-addressed chunks
        ├─ background sync queue (debounce → dedup → compress → verify)
        └─ conflict + recovery handling
```

## 1. User experience model

The product language is "private cloud storage", never Git.

| User-facing | Never exposed by default |
|---|---|
| Private cloud storage | Repository, branch, commit |
| Synced / Syncing… | git push / pull |
| Storage is full for now | GitHub API quota / rate limit |
| Needs attention | Token expired / 401 |

Normal flow: `Settings → Storage → Connect GitHub → authorize → Done`.
Advanced diagnostics (repository name, chunk count, API calls) exist under
**Advanced** in the same panel.

## 2. Authorization (device flow, zero token entry)

- A GitHub App (**Open Writer Storage**, slug `open-writer-storage`, owned by
  `@Alot1z`) is registered with **Device Flow enabled** — see
  `docs/sync-github.md` for the full registration record.
- Only the **Client ID** is needed by a device-flow client; it is a public
  credential baked into the bundle via `NEXT_PUBLIC_SYNC_CLIENT_ID`
  (`.env.local`, gitignored, but safe to ship: the flow is a public-client
  OAuth flow with no secret).
- Flow: `POST /login/device/code` → show code + verification URL →
  poll `POST /login/oauth/access_token` → short-lived user token (8 h) +
  refresh token.
- **No secrets in the frontend** (no client secret, no private key, no PAT).
- Without a configured client id, Connect GitHub degrades to a one-time
  fine-grained token paste (still never stored in project data).
- Tokens live in memory + sessionStorage only — never localStorage, project
  data, backups, or logs.
- Minimum permissions: `contents: write`, `metadata: read`, scoped to the
  single private storage repository.

## 3. Automatic private repository

`src/lib/github-sync/repo.ts`:

1. List the user's repos and look for one whose description matches the
   marker `open-writer-storage-v1`.
2. If found → reuse (never attaches to an unrelated repo without the marker).
3. If missing → `POST /user/repos` with `private: true` and the marker in the
   description.
4. `meta.json` inside the repo records schema version + device id; the engine
   refuses repositories that do not carry the marker.

Decision (researched in Phase 1): **one private repo, many projects.** A
single repo keeps sync efficient (one chunk index, one manifest set, one
rate-limit budget), simplifies recovery, and avoids hitting GitHub's repo
limits. Per-project repos were rejected: they multiply API calls, orphan
easily, and complicate cross-device discovery.

## 4. Storage format

One private repo, content-addressed:

```
open-writer-storage/                 (private, created automatically)
├─ open-writer/meta.json              marker + schema + device id
├─ open-writer/projects/index.json    every project + latest version + checksum
├─ open-writer/snapshots/<projectId>/<version>.json   snapshot manifests
└─ open-writer/objects/<ab>/<sha256>.json             compressed chunks
```

- **Snapshot manifest** (`snapshot.ts`): ordered list of chunk ids +
  payload SHA-256 checksum + optional encryption metadata.
- **Chunks** (`chunk-index.ts`): gzip-compressed, **48 KB** target size,
  content-addressed by SHA-256 of the compressed bytes → deduplication is
  automatic and global.
- **Delta sync**: only chunks whose hash changed are uploaded; a second
  device merges the remote tree into its local chunk index first, so it
  never re-uploads what the first device stored.
- **Encryption** (optional, Settings → Advanced): AES-256-GCM, PBKDF2 key
  derivation with a salt derived deterministically from the content checksum.
  Only ciphertext ever leaves the device; the checksum covers the plaintext
  so integrity survives encryption.
- **No giant `project.json` rewrite**: a single keystroke uploads at most the
  changed 48 KB chunk(s) + one small manifest, after a debounce.

## 5. Sync pipeline

```
local save immediately (IndexedDB, never blocked)
        ↓
background queue + debounce (default 30 s of quiet)
        ↓
export project → compress → chunk → hash → diff against chunk index
        ↓
upload only changed chunks → write manifest → update project index
        ↓
verify (remote checksums + local re-read) → mark synced
```

- Editor typing is never blocked; the queue is fire-and-forget.
- Retries use exponential backoff (`backoffBaseMs` × 2^n, capped by
  `maxRetries`); repeated failures surface the friendly `paused` /
  `attention` / `full` states with plain-language explanations
  (`status.ts`).
- Rate limits are respected: per-window API counters, and a 403/429 maps to
  "Storage is full for now" with automatic retry — never a raw error.

## 6. Conflicts

Detected when the remote manifest checksum differs from the local synced
checksum **and** the local project changed since the last sync. Nothing is
ever overwritten silently:

- **Keep this version** — local wins, remote is replaced.
- **Keep the other device's version** — remote wins, local content is saved
  aside.
- **Save both versions** — the remote version is restored as a new project;
  both survive.
- Both versions are preserved until the user chooses (dialog in the Storage
  panel; `engine.resolveConflict(projectId, choice)`).

## 7. Recovery

- **Missing chunk** → download fails with "Remote snapshot is incomplete —
  a chunk is missing"; the snapshot is never restored, local data untouched.
- **Bad manifest / checksum mismatch** → verification fails; corrupt remote
  snapshots are rejected (snapshot.ts checksum check).
- **Interrupted upload** → on retry the engine checks whether the file
  already exists, fetches its sha, and retries as an update (api.ts).
- **Interrupted authorization / token expiry** → "GitHub needs to reconnect"
  state; local data preserved throughout; `Reconnect GitHub` restarts the
  device flow.
- **Offline** → everything continues on device; sync resumes automatically
  when the connection returns.
- **Corrupt local state** → engine detects and starts fresh without touching
  user data outside its own store.

## 8. Limits & expectations

- GitHub API rate limits are real; the engine budgets calls, batches writes,
  and never polls aggressively.
- Storage is bounded by GitHub repository quotas — the friendly `full` state
  communicates this; local writing is never affected.
- 48 KB chunks + gzip + global dedup keep a long manuscript (100k–250k+
  words, measured) to a small object set with sub-second syncs.

## 9. Web + Windows parity

The sync engine is pure TypeScript over a small `DataProvider` interface:
- **Web** → `IndexedDBDataProvider` (browser IndexedDB).
- **Windows (Electron)** → the identical bundle + IndexedDB backed by the
  user profile on disk, on a stable origin (port persisted — see
  `docs/release/windows-verification.md` for the port-persistence fix).

Same code, same repo layout, same states, same conflict UX on both platforms.

## 10. Components

| Module | Responsibility |
|---|---|
| `engine.ts` | orchestration, sync queue, debounce, conflict, retry, states |
| `auth.ts` | device flow + token exchange + refresh |
| `api.ts` | GitHub REST client (repos, contents, trees), 403/429 mapping |
| `repo.ts` | discover / create / marker-protect the storage repo |
| `snapshot.ts` | manifest build/download, checksum + encryption verify |
| `chunk-index.ts` | content-addressed chunk store, dedup |
| `crypto.ts` | AES-256-GCM + PBKDF2 (optional encryption) |
| `status.ts` | plain-language states |
| `data-provider.ts` | storage abstraction (IndexedDB / memory / test) |
| `config.ts` | build-time config, all overridable via `NEXT_PUBLIC_SYNC_*` |
| `use-sync.ts` | React hook (live snapshot + project badges) |
| `storage-panel.tsx` | Settings → Storage UI (connect, states, conflicts, advanced) |
| `sync-init.tsx` | app-start session restore + background sync |
