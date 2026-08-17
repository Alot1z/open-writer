# Recovery Report — Phase 9

**Project:** Open Writer
**Date:** 2026-08-17
**Scope:** crash, failed save/sync, broken snapshot, missing chunk, corrupted project, failed export — no silent data loss

## Summary

**21/21 recovery checks pass** (`scripts/test-recovery.ts`). The audit found and
fixed **one real silent-failure path**: export functions crashed on partially
corrupted project data instead of exporting what they could. Every other recovery
path (failed writes, missing chunks, checksum mismatch, tampered backups) already
failed loudly and preserved data.

## 1. Fixed this phase: export crash on corrupt data

**Before:** `buildMarkdown/buildTxt/buildHtml/buildJson` crashed with `TypeError`
when project data was partially corrupt (`chapters` non-array, `project` null,
null scene rows). An export button on a damaged project would have thrown instead
of producing output.

**Fix:** `sanitizeBook()` in `exports.ts` — a defense-in-depth normalizer applied
at the top of every export builder. It coerces corrupt shapes to safe values and
drops damaged rows while preserving everything else. `sceneListForChapter` also
guards null scene rows.

**Verification:** 8 corrupt-input shapes × 4 export formats no longer crash
(md/txt/html fully; json is exercised through the same path up to its IndexedDB
entity reads).

## 2. Verified recovery paths (21 checks)

| Scenario | Result |
|---|---|
| **Failed save** — write error (e.g. quota) | Error surfaces; never a silent 200. Editor keeps its local content (autosave is a debounced PUT; content stays in the editor until the write succeeds) |
| **Failed export** — corrupt/malformed project data | No crash; exports degrade gracefully (see §1) |
| **Corrupted project** — malformed JSON rows | Health panel's try/catch surfaces cleanly; exports sanitize |
| **Broken GitHub snapshot** — missing chunk | `downloadSnapshot` throws "Remote snapshot is incomplete — a chunk is missing"; no partial restore |
| **Checksum mismatch** — tampered manifest | Throws "failed its integrity check"; restore aborts before writing anything |
| **Wrong passphrase on encrypted snapshot** | Integrity check fails; no decryption of garbage |
| **Failed sync / offline** | Engine reports `offline` / `local-only`; local data untouched; retries with backoff (30/30 sync suite) |
| **Interrupted upload** | Retried as an update against the existing remote snapshot (sync suite) |
| **Tampered backup** (checksum) | `restoreBackup` rejects: "Backup checksum verification failed" |
| **Corrupt backup payload** (unparseable JSON) | Rejected: "Backup data is corrupted and cannot be restored" |
| **Version snapshot parse** | All malformed snapshots rejected or parsed without crash |
| **Process termination / crash** | IndexedDB is transactional; Phase 5 verified create → close → relaunch data survival; localStorage flush race only in the probe harness, not the app |

## 3. Silent data-loss sweep

- No `catch {}` swallowing in the storage layer or the router's write handlers.
- PUT handlers propagate errors to the caller (fetch shim returns them as error
  responses).
- Backup restore requires explicit `confirm: true` (400 otherwise).
- Sync never deletes local changes on failure; conflicts offer keep-local /
  keep-remote / save-both.

## Verdict

No silent data-loss path found after the export fix. The local-first design
(IndexedDB transactions + checksummed backups + verified sync) means a crash at
any point leaves the last committed local state intact.
