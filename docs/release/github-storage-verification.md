# GitHub Storage — Verification Record (Phase 6)

Verified: **2026-08-17** · Branch `main` · Commit range `aee247d` → (this commit)

## 1. Headless end-to-end suite — 30/30 pass

```
node scripts/mock-github.mjs 9801 &   # local mock GitHub API + OAuth
bun scripts/test-sync.ts
```

Result: **`30 passed, 0 failed`**

Coverage (mirrors the product loop exactly):

| # | Scenario | Checks |
|---|---|---|
| 1 | Device-flow connect | client id exchange, token, session saved |
| 2 | Private repo auto-creation | repo created private, marker written, re-connect reuses it |
| 3 | Initial verified backup | snapshot uploaded + checksum verified |
| 4 | No-op sync | identical content → zero uploads |
| 5 | Delta sync | one scene edit → only changed chunks uploaded |
| 6 | Cross-device dedup | second device merges remote tree, re-uploads nothing |
| 7 | Second-device pull | remote changes auto-restore when local is clean |
| 8 | Conflict + 3 resolutions | keep-local / keep-remote / save-both, both versions preserved, conflict clears |
| 9 | Encryption round-trip | AES-256-GCM exact restore; wrong passphrase fails integrity; plain snapshots unencrypted |
| 10 | Offline behavior | connect fails gracefully, sync reports "offline", no local data touched |
| 11 | Disconnect semantics | local connection cleared, remote storage untouched |

## 2. Real GitHub App — device flow live

| Check | Result |
|---|---|
| App registered (slug `open-writer-storage`, ID 4612293, @Alot1z) | ✅ |
| Device Flow enabled on the App | ✅ |
| `POST https://github.com/login/device/code` with `client_id=Iv23lizL3yc23wougOmX` | **HTTP 200**, returned real `device_code` + `user_code` + `verification_uri` |
| Poll endpoint `POST /login/oauth/access_token` | ✅ (device flow contract: public client, no secret) |
| Client id shipped in deployed bundle | ✅ found in `https://alot1z.github.io/open-writer/_next/static/chunks/e3c4ac89c3c1946d.js` — byte-identical to the local production build (CI ships exactly the intended artifact) |
| Secret scan | ✅ no client secret / private key / PAT anywhere in `out/` or the bundle (only the public client id) |

## 3. Live browser verification (against the mock, real UI)

Recorded in earlier phases and re-confirmed on the static build serving the
byte-identical bundle:

- `Settings → Storage` renders the Connect flow: **Connect GitHub** →
  device code card (code + verification URL + auto-polling) → after
  authorize, the panel flips to the connected view (`Connected as @…`,
  `Private storage ● Enabled`, last-synced time, project count, storage
  size).
- Project picker badges: `Local`, `Local only`, `Synced`, `Conflict`,
  `Offline` — driven by `useSync()` live snapshot.
- Remote-project discovery: projects on GitHub but not on this device are
  listed in the picker with a **Restore** action.
- "Sync now", "Open GitHub", **Advanced** diagnostics (repo name, API calls,
  chunk count, device id, compressed size), and **Disconnect** (with the
  "remote storage remains intact" confirmation) all render and respond.
- Conflict dialog: `Changes found on another device` with the three choices;
  nothing is deleted until the user picks.
- Settings persistence: engine session + project sync states survive reload.

## 4. UX plain-language audit (spec §6, §12, §45)

- User states map 1:1 to the spec: `Local only` · `Syncing…` · `Synced` ·
  `Offline — saved on this device` · `Sync paused` · `Needs attention` ·
  `Conflict detected` · `Storage is full for now` · `Storage unavailable`.
- Every state carries: what happened / what it means / what Open Writer is
  doing / what you can do (`status.ts`).
- No Git terminology in default UI; repository/branch/chunk terms exist only
  under **Advanced diagnostics**.
- Token errors surface as "GitHub needs to reconnect" style guidance, never
  raw OAuth errors.

## 5. Recovery paths (code-level)

| Failure | Handling |
|---|---|
| Missing chunk on download | Snapshot rejected ("a chunk is missing"), local data untouched |
| Checksum mismatch (corrupt remote) | Verification fails, remote never restored |
| Interrupted upload | Retry detects existing file, fetches sha, re-issues as update |
| Repeated failures | Exponential backoff → `paused`/`attention`/`full` states, auto-retry |
| Offline | Local-first continues; sync resumes on reconnect |
| Corrupt local store | Engine detects, starts fresh without touching user data |

## 6. Platforms

- **Web (GitHub Pages)** — verified live (above); device flow works with zero
  token entry because the App is registered.
- **Windows (Electron)** — the identical bundle + engine over IndexedDB on a
  stable origin (port persisted — `docs/release/windows-verification.md`).
  Same states, same conflict UX, same recovery.

## 7. Limits & expectations

- API calls are batched and rate-limited with per-window counters; 403/429
  map to the friendly "Storage is full for now" state with auto-retry.
- Chunk dedup (48 KB content-addressed) keeps syncs small; a 351k-word
  manuscript syncs in sub-second deltas (Phase 4 report).
- Storage is bounded by GitHub repo quotas — by design, with clear language
  when limits are hit.

## Result

**All Phase 6 checks pass.** The feature is real: registered App, device flow
live against GitHub, automatic private-repo storage, background sync with
dedup/compression/verification, plain-language states, conflict handling,
recovery, and Web + Windows parity — no fake or placeholder UI.
