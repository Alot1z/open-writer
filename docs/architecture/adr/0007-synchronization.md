# ADR 0007 — Synchronization: optional GitHub-backed cloud storage

**Status:** Accepted (implemented)
**Date:** 2026-08-16

## Context

Users want projects backed up/synced across devices, but Open Writer is a
static app with no server. GitHub is the only zero-cost, zero-setup
service the user already has.

## Decision

- Sync is **optional and local-first**: writes always commit to IndexedDB
  first; a background engine then syncs to a **private** GitHub repository
  (`open-writer-storage`, auto-created) via the Contents/Trees APIs.
- **One-click connect** via GitHub device-flow OAuth (no secret in the
  frontend; short-lived token + refresh in memory/sessionStorage).
- Content-addressed snapshots: gzip + SHA-256 chunks, dedup, delta uploads,
  verified checksums, exponential backoff, per-window rate-limit handling.
- Conflicts preserve both versions (keep-local / keep-remote / save-both);
  cross-device restore via "From the cloud" in the project picker.
- No Git concept is exposed to users (plain-language states: Synced /
  Offline — saved on this device / Conflict detected).

## Consequences

- ✅ Zero-config backup/sync for every user with a GitHub account.
- ✅ Works offline; sync follows automatically.
- ✅ Verified: 30/30 mock-server tests + live device-flow endpoint check.
- ⚠️ Real-account cross-device round-trip still requires a one-time user
  authorization (by design).
- ⚠️ Multi-writer collaboration is out of scope (last-write-wins per
  snapshot; conflicts keep both versions).
