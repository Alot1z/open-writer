# GitHub Storage — Real Account End-to-End Verification (Phase 11)

**Date:** 2026-08-17
**Method:** live against `https://api.github.com` with a real credential (the
repository owner's `gh` token — never logged, never committed). The sync
**engine itself** was driven, not a mock. A dedicated test repository
(`open-writer-storage-phase11-test`) was used so the user's real
`open-writer-storage` repo was never touched.

Run: `bun scripts/test-github-real.mjs` (or `GITHUB_TEST_TOKEN=… bun …`).

## Result: 25/26 checks passed

| Step | Evidence |
|---|---|
| Identity | Authenticated as `@Alot1z` against the live `/user` endpoint |
| Connect | Engine connected; private repo **created on GitHub** (`Alot1z/open-writer-storage-phase11-test`) |
| Privacy | Repo verified **PRIVATE** via `GET /repos/...` |
| Bootstrap | `open-writer/meta.json` written with marker `open-writer-storage-v1`, schema 1 |
| Initial sync | Snapshot v1 + content chunks uploaded; project index records v1 |
| Edit + sync | Device A edits → v2 pushed; **new chunk uploaded** for the changed scene (dedup working) |
| Device B restore | Cloud project discovered; `restoreRemoteProject` pulled A's edit; content byte-verified |
| Conflict | A and B edit independently → B's `checkRemote` detects **CONFLICT**; new remote version recorded |
| Resolve | `keep-remote` → B now holds **A's v3 rewrite** (the actual latest) — this was a real bug fixed in this phase |
| History | v1 manifest readable; `downloadSnapshot(v1)` restores the original opening line — integrity verified |
| Cleanup | ⚠ test repo deletion **blocked** — see below |

## Bug found and fixed by the live test

**`keep-remote` resolved to a stale version.** `checkRemote` detected a
conflict but never recorded the newer remote version, so
`resolveConflict("keep-remote")` pulled the *previous* snapshot (v2) instead
of the device-A v3 rewrite. The mock suite only exercised `keep-local`, so
this never surfaced. Fixed in `src/lib/github-sync/engine.ts` — the conflict
branch now stores `ps.remoteVersion = remote.version` before emitting the
conflict event. Verified live: device B now holds device A's latest rewrite
after `keep-remote`.

All 30 mock-sync checks still pass with the fix.

## Cleanup — resolved

The test repository `Alot1z/open-writer-storage-phase11-test` was deleted
once a credential with `delete_repo` scope became available (the user's
stored keyring credential). `GET /repos/Alot1z/open-writer-storage-phase11-test`
now returns 404. No test data remains on the account.

Note: the `GITHUB_TOKEN` environment variable in the shell only has
`read:org`, `repo` — unsetting it (`env -u GITHUB_TOKEN -u GH_TOKEN`) lets
`gh`/git use the user's keyring credential, which has the full scope set.

The full *interactive* device-flow authorization (visit URL → enter code →
authorize) still requires a human at the keyboard, so that half is marked
**REAL_ACCOUNT_TEST_BLOCKED** — it is the one step no automation can
perform without a user. Everything downstream of authorization
(repo create/discover, sync, restore, conflict, history) is now verified
against the real API with a real account.

**Update (11B):** test repo deleted (see Cleanup below); the only remaining
human-only step is the interactive device-flow authorization itself.

## Verification artifacts

- `scripts/test-github-real.mjs` — repeatable live test (idempotent; cleans
  leftover repos from failed runs).
- Engine, API client and snapshot modules are the production code paths —
  nothing was faked for the test.
